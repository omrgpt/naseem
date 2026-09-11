import assert from "node:assert/strict";
import test from "node:test";
import * as recording from "./rideRecording";
import {
  countLocationGaps,
  createRecordingOnlyCompletionDraft,
  createRecordingOnlySnapshot,
  recordedDistanceMeters,
} from "./rideRecording";

test("countLocationGaps ignores normal watcher intervals and counts sparse samples", () => {
  const samples = [
    { coordinate: { latitude: 26.1, longitude: 50.5 }, timestamp: "2026-09-10T14:00:00.000Z" },
    { coordinate: { latitude: 26.101, longitude: 50.501 }, timestamp: "2026-09-10T14:00:15.000Z" },
    { coordinate: { latitude: 26.102, longitude: 50.502 }, timestamp: "2026-09-10T14:01:30.000Z" },
    { coordinate: { latitude: 26.103, longitude: 50.503 }, timestamp: "2026-09-10T14:01:46.000Z" },
  ];
  assert.equal(countLocationGaps(samples), 1);
});

test("recording-only completion keeps route context empty", () => {
  const snapshot = createRecordingOnlySnapshot("2026-09-10T14:00:00.000Z", "recording-test");
  const draft = createRecordingOnlyCompletionDraft(snapshot, {
    endedAt: "2026-09-10T14:10:00.000Z",
    samples: [],
    matchHistory: [],
  });
  assert.equal(draft.routeSnapshot, null);
  assert.equal(draft.plannedRouteId, null);
});

test("live ride state transitions expose every permission and completion outcome", () => {
  const transition = (recording as unknown as Record<string, unknown>)
    .transitionLiveRideState as
    | ((state: string, event: string) => string)
    | undefined;
  assert.equal(typeof transition, "function");
  assert.equal(transition?.("ready", "explain"), "explanation");
  assert.equal(transition?.("explanation", "request"), "requesting");
  assert.equal(
    transition?.("requesting", "permission-denied"),
    "denied",
  );
  assert.equal(
    transition?.("requesting", "location-unavailable"),
    "unavailable",
  );
  assert.equal(transition?.("active", "end-requested"), "ending");
  assert.equal(transition?.("ending", "completed"), "completed-draft");
  assert.equal(
    transition?.("completed-draft", "save-failed"),
    "save-failed",
  );
  assert.equal(transition?.("save-failed", "saved"), "saved");
  assert.equal(transition?.("saved", "discarded"), "discarded");
  assert.equal(transition?.("saved", "exported"), "exported");
});

test("location failure classification distinguishes browser denial from unavailability", () => {
  const classify = (recording as unknown as Record<string, unknown>)
    .classifyLocationFailure as
    | ((error: unknown, platform?: string) => string)
    | undefined;
  assert.equal(typeof classify, "function");
  assert.equal(classify?.({ message: "User denied Geolocation" }, "web"), "denied");
  assert.equal(classify?.({ message: "Position unavailable" }, "web"), "unavailable");
  assert.equal(classify?.(undefined, "web"), "unavailable");
});

test("permission responses require an explicit granted flag", () => {
  const getPermissionState = (recording as unknown as Record<string, unknown>)
    .permissionStateFromResult as
    | ((result: unknown, platform?: string, browserLocationAvailable?: boolean) => string)
    | undefined;
  assert.equal(typeof getPermissionState, "function");
  assert.equal(
    getPermissionState?.({ status: "granted", granted: true }, "web"),
    "granted",
  );
  assert.equal(
    getPermissionState?.({ status: "granted", granted: false }, "web"),
    "unavailable",
  );
  assert.equal(
    getPermissionState?.({ status: "denied", granted: false }, "web"),
    "denied",
  );
  assert.equal(
    getPermissionState?.({ status: "undetermined", granted: false }, "web"),
    "undetermined",
  );
  assert.equal(
    getPermissionState?.({ status: "granted", granted: true }, "web", false),
    "unavailable",
  );
});

test("the location watchdog becomes stale without a new fix but pauses stay healthy", () => {
  const getWatchdogState = (recording as unknown as Record<string, unknown>)
    .locationWatchdogState as
    | ((input: {
        nowMs: number;
        startedAtMs: number;
        lastFixAtMs?: number;
        paused?: boolean;
        timeoutMs?: number;
      }) => string)
    | undefined;
  assert.equal(typeof getWatchdogState, "function");
  assert.equal(
    getWatchdogState?.({ nowMs: 90_001, startedAtMs: 0, timeoutMs: 90_000 }),
    "stale",
  );
  assert.equal(
    getWatchdogState?.({
      nowMs: 190_001,
      startedAtMs: 0,
      lastFixAtMs: 100_000,
      timeoutMs: 90_000,
    }),
    "stale",
  );
  assert.equal(
    getWatchdogState?.({
      nowMs: 180_001,
      startedAtMs: 0,
      lastFixAtMs: 100_000,
      paused: true,
      timeoutMs: 90_000,
    }),
    "healthy",
  );
  const shouldMarkStale = (recording as unknown as Record<string, unknown>)
    .shouldMarkLocationStale as
    | ((input: {
        activePlan: boolean;
        watchdogState: string;
        currentMatchState?: string;
      }) => boolean)
    | undefined;
  assert.equal(typeof shouldMarkStale, "function");
  assert.equal(
    shouldMarkStale?.({
      activePlan: true,
      watchdogState: "stale",
      currentMatchState: "off-corridor",
    }),
    true,
  );
  assert.equal(
    shouldMarkStale?.({
      activePlan: false,
      watchdogState: "stale",
    }),
    false,
  );
});

test("paused intervals are removed from moving time and location gaps", () => {
  const getMovingDuration = (recording as unknown as Record<string, unknown>)
    .movingDurationSeconds as
    | ((startedAt: string, endedAt: string, pausedIntervals: unknown[]) => number)
    | undefined;
  assert.equal(typeof getMovingDuration, "function");
  const pausedIntervals = [
    {
      startedAt: "2026-09-10T14:10:00.000Z",
      endedAt: "2026-09-10T14:25:00.000Z",
    },
  ];
  assert.equal(
    getMovingDuration?.(
      "2026-09-10T14:00:00.000Z",
      "2026-09-10T15:00:00.000Z",
      pausedIntervals,
    ),
    2_700,
  );
  const samples = [
    {
      coordinate: { latitude: 26.1, longitude: 50.5 },
      timestamp: "2026-09-10T14:00:00.000Z",
    },
    {
      coordinate: { latitude: 26.101, longitude: 50.501 },
      timestamp: "2026-09-10T14:02:00.000Z",
    },
  ];
  assert.equal(
    countLocationGaps(samples, 45, [
      {
        startedAt: "2026-09-10T14:00:10.000Z",
        endedAt: "2026-09-10T14:01:50.000Z",
      },
    ]),
    0,
  );
  assert.ok(recordedDistanceMeters(samples) > 0);
  assert.equal(
    recordedDistanceMeters(samples, [
      {
        startedAt: "2026-09-10T14:00:10.000Z",
        endedAt: "2026-09-10T14:01:50.000Z",
      },
    ]),
    0,
  );
});

test("browser watcher forwards provider errors and remains removable", () => {
  const watchBrowser = (recording as unknown as Record<string, unknown>)
    .watchBrowserLocation as
    | ((
        geolocation: unknown,
        onLocation: (location: unknown) => void,
        onError: (error: unknown) => void,
      ) => { remove: () => void } | null)
    | undefined;
  assert.equal(typeof watchBrowser, "function");
  let errorCallback: ((error: unknown) => void) | undefined;
  let clearedWatchId: number | undefined;
  const errors: unknown[] = [];
  const subscription = watchBrowser?.(
    {
      watchPosition: (
        _onLocation: (location: unknown) => void,
        onError: (error: unknown) => void,
      ) => {
        errorCallback = onError;
        return 27;
      },
      clearWatch: (watchId: number) => {
        clearedWatchId = watchId;
      },
    },
    () => undefined,
    (error) => errors.push(error),
  );
  const providerError = { code: 2, message: "Position unavailable" };
  errorCallback?.(providerError);
  assert.deepEqual(errors, [providerError]);
  assert.equal(clearedWatchId, undefined);
  assert.ok(subscription);
  subscription?.remove();
  assert.equal(clearedWatchId, 27);
});

test("unavailable copy is platform-neutral while preserving browser wording", () => {
  const getCopy = (recording as unknown as Record<string, unknown>)
    .locationUnavailableCopy as
    | ((platform: string, arabic?: boolean) => string)
    | undefined;
  const getTitle = (recording as unknown as Record<string, unknown>)
    .locationUnavailableTitle as
    | ((platform: string, arabic?: boolean) => string)
    | undefined;
  assert.equal(typeof getCopy, "function");
  assert.equal(typeof getTitle, "function");
  assert.match(getCopy?.("web") ?? "", /in this browser/);
  assert.doesNotMatch(getCopy?.("ios") ?? "", /browser/);
  assert.equal(getTitle?.("web"), "Location unavailable in this browser");
  assert.equal(getTitle?.("android"), "Location unavailable");
});

test("recording-only labels never promise route progress", () => {
  const getLabels = (recording as unknown as Record<string, unknown>)
    .recordingOnlyLabels as (() => Record<string, string>) | undefined;
  assert.equal(typeof getLabels, "function");
  const labels = getLabels?.();
  assert.deepEqual(labels, {
    start: "Start recording",
    active: "Recording active",
    end: "End recording",
  });
  assert.ok(labels && Object.values(labels).every((label) => !/route progress|live ride/i.test(label)));
});

test("recording-only pause and resume controls are explicit", () => {
  const getLabels = (recording as unknown as Record<string, unknown>)
    .recordingControlLabels as (() => Record<string, string>) | undefined;
  assert.equal(typeof getLabels, "function");
  assert.deepEqual(getLabels?.(), {
    pause: "Pause recording",
    resume: "Resume recording",
    continue: "Continue recording",
  });
});

test("browser export fallback creates a downloadable JSON payload", () => {
  const download = (recording as unknown as Record<string, unknown>)
    .downloadActivityDraft as
    | ((draft: unknown, environment: unknown) => boolean)
    | undefined;
  assert.equal(typeof download, "function");
  const snapshot = createRecordingOnlySnapshot("2026-09-10T14:00:00.000Z", "export-test");
  const draft = createRecordingOnlyCompletionDraft(snapshot, {
    endedAt: "2026-09-10T14:10:00.000Z",
  });
  const clicks: Array<{ download: string; href: string }> = [];
  const revoked: string[] = [];
  class FakeBlob {
    constructor(
      readonly parts: unknown[],
      readonly options?: { type?: string },
    ) {}
  }
  const environment = {
    Blob: FakeBlob,
    URL: {
      createObjectURL: (value: unknown) => {
        assert.ok(value instanceof FakeBlob);
        return "blob:ride";
      },
      revokeObjectURL: (value: string) => revoked.push(value),
    },
    document: {
      createElement: () => {
        const link = {
          download: "",
          href: "",
          click: () => clicks.push({ download: link.download, href: link.href }),
        };
        return link;
      },
    },
  };
  assert.equal(download?.(draft, environment), true);
  assert.match(
    clicks[0]?.download ?? "",
    /^ride-activity-export-test-2026-09-10T14-10-00-000Z\.json$/,
  );
  assert.equal(clicks[0]?.href, "blob:ride");
  assert.deepEqual(revoked, ["blob:ride"]);
});

test("browser export returns a cloned exported draft through the common completion path", () => {
  const exportDraft = (recording as unknown as Record<string, unknown>)
    .exportActivityDraft as
    | ((
        draft: unknown,
        environment: unknown,
      ) => ReturnType<typeof createRecordingOnlyCompletionDraft> | null)
    | undefined;
  assert.equal(typeof exportDraft, "function");
  const snapshot = createRecordingOnlySnapshot("2026-09-10T14:00:00.000Z", "export-state-test");
  const draft = createRecordingOnlyCompletionDraft(snapshot, {
    endedAt: "2026-09-10T14:10:00.000Z",
  });
  let payload = "";
  class FakeBlob {
    constructor(
      readonly parts: unknown[],
      readonly options?: { type?: string },
    ) {
      payload = String(parts[0] ?? "");
    }
  }
  const environment = {
    Blob: FakeBlob,
    URL: {
      createObjectURL: () => "blob:export-state",
      revokeObjectURL: () => undefined,
    },
    document: {
      createElement: () => ({
        download: "",
        href: "",
        click: () => undefined,
      }),
    },
  };
  const exported = exportDraft?.(draft, environment);
  assert.equal(exported?.exportState, "exported");
  assert.notEqual(exported, draft);
  assert.equal(draft.exportState, "not_exported");
  assert.match(payload, /"exportState": "exported"/);
});

test("completion state maps a retained draft to an explicit completed-draft state", () => {
  const getState = (recording as unknown as Record<string, unknown>)
    .completionStateForDraft as ((draft: unknown) => string) | undefined;
  assert.equal(typeof getState, "function");
  const snapshot = createRecordingOnlySnapshot("2026-09-10T14:00:00.000Z", "state-test");
  const draft = createRecordingOnlyCompletionDraft(snapshot, {
    endedAt: "2026-09-10T14:10:00.000Z",
  });
  assert.equal(getState?.(draft), "completed-draft");
});

test("save failure remains primary when an export flag is also present", () => {
  const getState = (recording as unknown as Record<string, unknown>)
    .completionStateForDraft as ((draft: unknown) => string) | undefined;
  assert.equal(typeof getState, "function");
  const snapshot = createRecordingOnlySnapshot("2026-09-10T14:00:00.000Z", "state-priority-test");
  const draft = createRecordingOnlyCompletionDraft(snapshot, {
    endedAt: "2026-09-10T14:10:00.000Z",
  });
  draft.completionState = "save_failed";
  draft.exportState = "exported";
  assert.equal(getState?.(draft), "save-failed");
});

test("a failed save can be returned to a draft for an explicit retry", () => {
  const retry = (recording as unknown as Record<string, unknown>)
    .markActivitySaveRetry as ((draft: unknown) => { completionState: string }) | undefined;
  assert.equal(typeof retry, "function");
  const snapshot = createRecordingOnlySnapshot("2026-09-10T14:00:00.000Z", "retry-test");
  const failed = createRecordingOnlyCompletionDraft(snapshot, {
    endedAt: "2026-09-10T14:10:00.000Z",
  });
  failed.completionState = "save_failed";
  assert.equal(retry?.(failed).completionState, "draft");
});
