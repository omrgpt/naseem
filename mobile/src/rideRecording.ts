import type {
  ActivityDraft,
  ActiveRideSnapshot,
  PositionMatch,
  RecordedSample,
  RecordingOnlySnapshot,
  RouteAnalysisSnapshot,
  RouteRecord,
} from "./domain";

export type LiveRideStateName =
  | "no-route"
  | "ready"
  | "explanation"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "ending"
  | "completed-draft"
  | "save-failed"
  | "saved"
  | "discarded"
  | "exported";

export type LiveRideStateEvent =
  | "explain"
  | "request"
  | "permission-granted"
  | "permission-denied"
  | "location-unavailable"
  | "location-recovered"
  | "end-requested"
  | "completed"
  | "save-failed"
  | "save-retry"
  | "saved"
  | "discarded"
  | "exported";

export type LiveRideLocationFailure = "denied" | "unavailable";

export type RecordingOnlyLabels = Readonly<{
  start: string;
  active: string;
  end: string;
}>;

export type RecordingControlLabels = Readonly<{
  pause: string;
  resume: string;
  continue: string;
}>;

export type BrowserDownloadEnvironment = {
  Blob?: new (parts: unknown[], options?: { type?: string }) => unknown;
  URL?: {
    createObjectURL: (value: unknown) => string;
    revokeObjectURL?: (value: string) => void;
  };
  document?: {
    createElement: (tagName: "a") => {
      href: string;
      download: string;
      click: () => void;
    };
    body?: {
      appendChild: (element: unknown) => void;
      removeChild: (element: unknown) => void;
    };
  };
};

/**
 * Keep the user-visible ride lifecycle finite and explicit. The hook owns the
 * side effects; this reducer-like helper keeps transitions testable without
 * loading React Native or Expo in the Node test runner.
 */
export function transitionLiveRideState(
  state: LiveRideStateName | string,
  event: LiveRideStateEvent,
): LiveRideStateName {
  switch (event) {
    case "explain":
      return "explanation";
    case "request":
      return "requesting";
    case "permission-granted":
    case "location-recovered":
      return "active";
    case "permission-denied":
      return "denied";
    case "location-unavailable":
      return "unavailable";
    case "end-requested":
      return "ending";
    case "completed":
      return "completed-draft";
    case "save-failed":
      return "save-failed";
    case "save-retry":
      return "completed-draft";
    case "saved":
      return "saved";
    case "discarded":
      return "discarded";
    case "exported":
      return "exported";
    default:
      return state as LiveRideStateName;
  }
}

export function classifyLocationFailure(
  error: unknown,
  _platform: string = "native",
): LiveRideLocationFailure {
  const record =
    error && typeof error === "object"
      ? (error as { code?: unknown; message?: unknown })
      : undefined;
  const code = String(record?.code ?? "").toLowerCase();
  const message = String(record?.message ?? error ?? "").toLowerCase();
  if (
    code === "1" ||
    code.includes("permission_denied") ||
    /permission|denied|not allowed|authorization/.test(message)
  )
    return "denied";
  return "unavailable";
}

export function isBrowserLocationAvailable(environment?: {
  geolocation?: unknown;
}) {
  if (environment) return Boolean(environment.geolocation);
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

export function recordingOnlyLabels(arabic = false): RecordingOnlyLabels {
  return arabic
    ? { start: "ابدأ التسجيل", active: "التسجيل نشط", end: "إنهاء التسجيل" }
    : { start: "Start recording", active: "Recording active", end: "End recording" };
}

export function recordingControlLabels(arabic = false): RecordingControlLabels {
  return arabic
    ? {
        pause: "إيقاف التسجيل مؤقتاً",
        resume: "استئناف التسجيل",
        continue: "متابعة التسجيل",
      }
    : {
        pause: "Pause recording",
        resume: "Resume recording",
        continue: "Continue recording",
      };
}

export type LiveRideCompletionState = Exclude<
  LiveRideStateName,
  "no-route" | "ready" | "explanation" | "requesting" | "active" | "denied" | "unavailable" | "ending"
>;

export function completionStateForDraft(
  draft: Pick<ActivityDraft, "completionState" | "exportState">,
): LiveRideCompletionState {
  if (draft.exportState === "exported") return "exported";
  if (draft.completionState === "save_failed") return "save-failed";
  if (draft.completionState === "saved") return "saved";
  if (draft.completionState === "discarded") return "discarded";
  return "completed-draft";
}

export const activityCompletionState = completionStateForDraft;

export type CompletionDraftInput = {
  endedAt: string | Date;
  samples?: RecordedSample[];
  matchHistory?: PositionMatch[];
  analysisSnapshot?: RouteAnalysisSnapshot;
  gaps?: number;
};

export function createCompletionDraft(
  snapshot: ActiveRideSnapshot,
  input: CompletionDraftInput,
): ActivityDraft {
  const endedAt = toIso(input.endedAt);
  const startedAt = toIso(snapshot.startedAt);
  const samples = clone(input.samples ?? []);
  const matchHistory = clone(input.matchHistory ?? []);
  const elapsedSeconds = Math.max(
    0,
    Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1_000,
    ),
  );
  const distanceMeters = recordedDistanceMeters(samples);
  return {
    id: `activity-${snapshot.id}-${endedAt}`,
    plannedRouteId: snapshot.routeId,
    plannedRouteRevision: snapshot.routeRevision,
    routeSnapshot: clone(snapshot.route),
    startedAt,
    endedAt,
    observedSamples: samples,
    matchHistory,
    elapsedSeconds,
    distanceMeters,
    matchQuality: qualityFromHistory(matchHistory),
    gaps: Math.max(0, input.gaps ?? 0),
    ...(input.analysisSnapshot
      ? { forecastSnapshot: clone(input.analysisSnapshot) }
      : snapshot.route.analysis
        ? { forecastSnapshot: clone(snapshot.route.analysis) }
        : {}),
    completionState: "draft",
    exportState: "not_exported",
  };
}

export function createRecordingOnlySnapshot(
  startedAt: string | Date,
  id?: string,
): RecordingOnlySnapshot {
  const instant = toIso(startedAt);
  return {
    id: id ?? `recording-${instant}`,
    mode: "recording-only",
    startedAt: instant,
  };
}

export function createRecordingOnlyCompletionDraft(
  snapshot: RecordingOnlySnapshot,
  input: CompletionDraftInput,
): ActivityDraft {
  const endedAt = toIso(input.endedAt);
  const startedAt = toIso(snapshot.startedAt);
  const samples = clone(input.samples ?? []);
  const matchHistory = clone(input.matchHistory ?? []);
  return {
    id: `activity-${snapshot.id}-${endedAt}`,
    plannedRouteId: null,
    plannedRouteRevision: null,
    routeSnapshot: null,
    startedAt,
    endedAt,
    observedSamples: samples,
    matchHistory,
    elapsedSeconds: Math.max(
      0,
      Math.round(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1_000,
      ),
    ),
    distanceMeters: recordedDistanceMeters(samples),
    matchQuality: qualityFromHistory(matchHistory),
    gaps: Math.max(0, input.gaps ?? 0),
    completionState: "draft",
    exportState: "not_exported",
  };
}

export function markActivitySaved(draft: ActivityDraft): ActivityDraft {
  return { ...clone(draft), completionState: "saved" };
}
export function markActivitySaveFailed(draft: ActivityDraft): ActivityDraft {
  return { ...clone(draft), completionState: "save_failed" };
}
export function markActivitySaveRetry(draft: ActivityDraft): ActivityDraft {
  return { ...clone(draft), completionState: "draft" };
}
export function markActivityDiscarded(draft: ActivityDraft): ActivityDraft {
  return { ...clone(draft), completionState: "discarded" };
}
export function markActivityExported(draft: ActivityDraft): ActivityDraft {
  return { ...clone(draft), exportState: "exported" };
}

export function downloadActivityDraft(
  draft: ActivityDraft,
  environment: BrowserDownloadEnvironment = browserDownloadEnvironment(),
) {
  if (
    !environment.Blob ||
    !environment.URL?.createObjectURL ||
    !environment.document
  )
    return false;

  const payload = JSON.stringify(clone(draft), null, 2);
  const blob = new environment.Blob([payload], { type: "application/json" });
  const href = environment.URL.createObjectURL(blob);
  const link = environment.document.createElement("a");
  link.href = href;
  link.download = `ride-${safeFilePart(draft.id)}.json`;
  try {
    environment.document.body?.appendChild(link);
    link.click();
    environment.document.body?.removeChild(link);
    return true;
  } catch {
    return false;
  } finally {
    environment.URL.revokeObjectURL?.(href);
  }
}

export const exportActivityDraft = downloadActivityDraft;

export function recordedDistanceMeters(samples: RecordedSample[]): number {
  let total = 0;
  for (let index = 1; index < samples.length; index += 1)
    total += distanceMeters(
      samples[index - 1].coordinate,
      samples[index].coordinate,
    );
  return Math.round(total);
}

/** Count meaningful gaps in the watcher trace without treating the normal
 * 15-second watcher interval as a problem. The completion screen can report
 * sparse GPS honestly while keeping the raw samples intact. */
export function countLocationGaps(
  samples: RecordedSample[],
  thresholdSeconds = 45,
): number {
  if (samples.length < 2) return 0;
  let gaps = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = new Date(samples[index - 1].timestamp).getTime();
    const current = new Date(samples[index].timestamp).getTime();
    if (
      Number.isFinite(previous) &&
      Number.isFinite(current) &&
      current - previous > thresholdSeconds * 1_000
    )
      gaps += 1;
  }
  return gaps;
}

export function qualityFromHistory(
  history: PositionMatch[],
): ActivityDraft["matchQuality"] {
  if (!history.length) return "unknown";
  const average =
    history.reduce(
      (total, item) =>
        total +
        (item.confidence === "high" ? 2 : item.confidence === "medium" ? 1 : 0),
      0,
    ) / history.length;
  return average >= 1.5 ? "high" : average >= 0.75 ? "medium" : "low";
}

function distanceMeters(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
) {
  const latitudeScale = 110_574;
  const longitudeScale = 111_320 * Math.cos((first.latitude * Math.PI) / 180);
  return Math.hypot(
    (first.latitude - second.latitude) * latitudeScale,
    (first.longitude - second.longitude) * longitudeScale,
  );
}

function toIso(value: string | Date) {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new RangeError("Expected a valid ride instant.");
  return date.toISOString();
}

function browserDownloadEnvironment(): BrowserDownloadEnvironment {
  return {
    Blob:
      typeof Blob === "undefined"
        ? undefined
        : (Blob as unknown as BrowserDownloadEnvironment["Blob"]),
    URL:
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
        ? undefined
        : {
            createObjectURL: (value) => URL.createObjectURL(value as Blob),
            revokeObjectURL: (value) => URL.revokeObjectURL(value),
          },
    document:
      typeof document === "undefined"
        ? undefined
        : {
            createElement: (tagName) => document.createElement(tagName),
            body: document.body
              ? {
                  appendChild: (element) => document.body.appendChild(element as Node),
                  removeChild: (element) => document.body.removeChild(element as Node),
                }
              : undefined,
          },
  };
}

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "ride";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
