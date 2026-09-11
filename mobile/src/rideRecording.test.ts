import assert from "node:assert/strict";
import test from "node:test";
import * as recording from "./rideRecording";
import {
  countLocationGaps,
  createRecordingOnlyCompletionDraft,
  createRecordingOnlySnapshot,
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
