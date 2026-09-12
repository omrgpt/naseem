import type {
  ActivityDraft,
  ActiveRideSnapshot,
  PositionMatch,
  PositionMatchState,
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

export type LiveRidePermissionState =
  | "granted"
  | "denied"
  | "unavailable"
  | "undetermined";

export type RidePauseInterval = Readonly<{
  startedAt: string;
  endedAt: string;
}>;

export type LocationWatchdogState = "healthy" | "stale";

export const LIVE_RIDE_LOCATION_WATCHDOG_TIMEOUT_MS = 90_000;

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

export type LiveRideLocationState =
  | "away"
  | "near"
  | "waiting"
  | "uncertain"
  | "stale";

export function liveRideLocationState(
  matchState?: PositionMatchState,
  hasFix = false,
): LiveRideLocationState {
  if (!hasFix) return "waiting";
  if (matchState === "off-corridor") return "away";
  if (matchState === "stale") return "stale";
  if (matchState === "approaching" || matchState === "matched") return "near";
  return "uncertain";
}

export type LiveRideRecoveryAction =
  | "retryLocation"
  | "pause"
  | "resume"
  | "end";

export function liveRideRecoveryActions({
  active,
  locationState,
  isPaused,
}: {
  active: boolean;
  locationState: LiveRideLocationState;
  isPaused: boolean;
}): LiveRideRecoveryAction[] {
  if (!active) return [];
  const actions: LiveRideRecoveryAction[] = [];
  if (
    locationState === "waiting" ||
    locationState === "away" ||
    locationState === "stale"
  )
    actions.push("retryLocation");
  actions.push(isPaused ? "resume" : "pause", "end");
  return actions;
}

export type LiveRideRecoveryLabels = Readonly<{
  waiting: string;
  near: string;
  away: string;
  uncertain: string;
  stale: string;
  retry: string;
  lastFix: string;
  noFix: string;
  recovery: string;
  progressPaused: string;
  noTrack: string;
  exporting: string;
  exportFailed: string;
  saving: string;
  fixCount: string;
}>;

export function liveRideRecoveryLabels(arabic = false): LiveRideRecoveryLabels {
  return arabic
    ? {
        waiting: "بانتظار أول إشارة إلى الموقع",
        near: "تم التقاط موقعك الحالي",
        away: "أنت بعيد عن المسار",
        uncertain: "الموقع غير مؤكد",
        stale: "تحديث الموقع قديم",
        retry: "إعادة محاولة تحديد الموقع",
        lastFix: "آخر إشارة",
        noFix: "لم تُلتقط إشارة موقع بعد",
        recovery:
          "راجع الخريطة وما حولك. سيبقى التقدم متوقفاً حتى تصل إشارة موثوقة. يمكنك إعادة المحاولة أو الإيقاف المؤقت أو المتابعة أو إنهاء الرحلة والاحتفاظ بالتسجيل.",
        progressPaused: "تم إيقاف التقدم حتى تتم مطابقة المسار بثقة.",
        noTrack:
          "لم تُلتقط أي إشارات للموقع، لذلك لا يوجد مسار لعرضه. يمكنك حفظ هذا السجل أو حذفه.",
        exporting: "جارٍ تصدير الرحلة…",
        exportFailed: "تعذر تصدير الرحلة. حاول مرة أخرى.",
        saving: "جارٍ حفظ الرحلة…",
        fixCount: "إشارات الموقع",
      }
    : {
        waiting: "Waiting for your first location fix",
        near: "Current position captured",
        away: "Away from route",
        uncertain: "Location uncertain",
        stale: "Location update is stale",
        retry: "Retry location",
        lastFix: "Last fix",
        noFix: "No location fix yet",
        recovery:
          "Check the map and surroundings. Progress stays paused until the next confident fix. You can retry, pause, continue, or end and keep this recording.",
        progressPaused: "Progress is paused until the route match is confident.",
        noTrack:
          "No location fixes were captured, so there is no track to show. You can save this record or discard it.",
        exporting: "Exporting ride…",
        exportFailed: "The ride could not be exported. Try again.",
        saving: "Saving ride…",
        fixCount: "Location fixes",
      };
}

export type RecordingTelemetryLabels = Readonly<{
  distance: string;
  time: string;
  fixes: string;
  lastFix: string;
  waiting: string;
}>;

export function recordingOnlyTelemetryLabels(
  arabic = false,
): RecordingTelemetryLabels {
  return arabic
    ? {
        distance: "المسافة المسجلة",
        time: "وقت الحركة",
        fixes: "إشارات الموقع",
        lastFix: "آخر إشارة",
        waiting: "بانتظار أول إشارة إلى الموقع",
      }
    : {
        distance: "Recorded distance",
        time: "Moving time",
        fixes: "Location fixes",
        lastFix: "Last fix",
        waiting: "Waiting for your first location fix",
      };
}

export type RecordingTelemetry = Readonly<{
  distanceMeters: number;
  elapsedSeconds: number;
  fixCount: number;
  lastFixAt?: string;
}>;

export function recordingTelemetry({
  startedAt,
  now,
  samples,
  pausedIntervals = [],
}: {
  startedAt: string | Date;
  now: string | Date;
  samples: readonly RecordedSample[];
  pausedIntervals?: readonly Readonly<{
    startedAt: string;
    endedAt?: string;
  }>[];
}): RecordingTelemetry {
  const endedAt = toIso(now);
  const closedPauseIntervals = closePauseIntervals(pausedIntervals, endedAt);
  const capturedSamples = [...samples];
  return {
    distanceMeters: recordedDistanceMeters(
      capturedSamples,
      closedPauseIntervals,
    ),
    elapsedSeconds: movingDurationSeconds(
      startedAt,
      endedAt,
      closedPauseIntervals,
    ),
    fixCount: capturedSamples.length,
    ...(capturedSamples.at(-1)
      ? { lastFixAt: capturedSamples.at(-1)!.timestamp }
      : {}),
  };
}

export function remainingRideDurationMinutes(
  totalMinutes: number,
  progress: number,
): number {
  const safeTotalMinutes = Number.isFinite(totalMinutes)
    ? Math.max(0, totalMinutes)
    : 0;
  const safeProgress = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  return Math.max(0, Math.round(safeTotalMinutes * (1 - safeProgress)));
}

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

export type BrowserLocationPosition = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    heading: number | null;
  };
  timestamp: number;
};

export type BrowserLocationWatchOptions = {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
};

export type BrowserLocationGeolocation = {
  watchPosition: (
    onLocation: (location: BrowserLocationPosition) => void,
    onError?: (error: unknown) => void,
    options?: BrowserLocationWatchOptions,
  ) => number;
  clearWatch: (watchId: number) => void;
};

export type BrowserLocationSubscription = {
  remove: () => void;
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

/** Expo can report a granted status while its explicit granted flag is false. */
export function permissionStateFromResult(
  result: unknown,
  _platform: string = "native",
  browserLocationAvailable = true,
): LiveRidePermissionState {
  const record =
    result && typeof result === "object"
      ? (result as { status?: unknown; granted?: unknown })
      : undefined;
  const status = String(record?.status ?? "").toLowerCase();
  if (status === "denied") return "denied";
  if (status === "granted")
    return record?.granted === true &&
      (_platform !== "web" || browserLocationAvailable)
      ? "granted"
      : "unavailable";
  if (status === "undetermined") return "undetermined";
  return "unavailable";
}

export function locationWatchdogState({
  nowMs,
  startedAtMs,
  lastFixAtMs,
  paused = false,
  timeoutMs = LIVE_RIDE_LOCATION_WATCHDOG_TIMEOUT_MS,
}: {
  nowMs: number;
  startedAtMs: number;
  lastFixAtMs?: number;
  paused?: boolean;
  timeoutMs?: number;
}): LocationWatchdogState {
  if (paused) return "healthy";
  const referenceAt = Number.isFinite(lastFixAtMs) ? lastFixAtMs! : startedAtMs;
  return nowMs - referenceAt >= timeoutMs ? "stale" : "healthy";
}

export function locationUnavailableCopy(platform = "native", arabic = false) {
  if (arabic)
    return platform === "web"
      ? "الموقع غير متاح في هذا المتصفح. حاول مرة أخرى أو افتح الإعدادات أو تابع بدون موقع."
      : "الموقع غير متاح. حاول مرة أخرى أو افتح الإعدادات أو تابع بدون موقع.";
  return platform === "web"
    ? "Location unavailable in this browser. Try again, open settings where supported, or continue without location."
    : "Location unavailable. Try again, open settings, or continue without location.";
}

export function locationUnavailableTitle(platform = "native", arabic = false) {
  if (arabic)
    return platform === "web" ? "الموقع غير متاح في هذا المتصفح" : "الموقع غير متاح";
  return platform === "web" ? "Location unavailable in this browser" : "Location unavailable";
}

export function isBrowserLocationAvailable(environment?: {
  geolocation?: unknown;
}) {
  if (environment) return Boolean(environment.geolocation);
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

/**
 * Expo's web Location adapter does not pass an error callback to the browser
 * watcher. Use the browser watcher directly on web so provider errors reach
 * the live-session recovery path.
 */
export function watchBrowserLocation(
  geolocation: unknown,
  onLocation: (location: BrowserLocationPosition) => void,
  onError: (error: unknown) => void,
  options?: BrowserLocationWatchOptions,
): BrowserLocationSubscription | null {
  const provider = geolocation as Partial<BrowserLocationGeolocation> | null;
  if (
    !provider ||
    typeof provider.watchPosition !== "function" ||
    typeof provider.clearWatch !== "function"
  )
    return null;
  let watchId: number | null = null;
  try {
    watchId = provider.watchPosition(onLocation, onError, options);
  } catch (error) {
    onError(error);
  }
  return {
    remove: () => {
      if (watchId === null) return;
      const currentWatchId = watchId;
      watchId = null;
      provider.clearWatch?.(currentWatchId);
    },
  };
}

export function shouldMarkLocationStale({
  activePlan,
  watchdogState,
  currentMatchState,
}: {
  activePlan: boolean;
  watchdogState: LocationWatchdogState;
  currentMatchState?: PositionMatchState;
}) {
  return (
    activePlan &&
    watchdogState === "stale" &&
    currentMatchState !== "stale"
  );
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
  if (draft.completionState === "save_failed") return "save-failed";
  if (draft.exportState === "exported") return "exported";
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
  pausedIntervals?: readonly RidePauseInterval[];
};

export function createCompletionDraft(
  snapshot: ActiveRideSnapshot,
  input: CompletionDraftInput,
): ActivityDraft {
  const endedAt = toIso(input.endedAt);
  const startedAt = toIso(snapshot.startedAt);
  const samples = clone(input.samples ?? []);
  const matchHistory = clone(input.matchHistory ?? []);
  const pausedIntervals = input.pausedIntervals ?? [];
  const elapsedSeconds = movingDurationSeconds(
    startedAt,
    endedAt,
    pausedIntervals,
  );
  const distanceMeters = recordedDistanceMeters(samples, pausedIntervals);
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
    gaps: Math.max(0, input.gaps ?? countLocationGaps(samples, 45, pausedIntervals)),
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
  const pausedIntervals = input.pausedIntervals ?? [];
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
    elapsedSeconds: movingDurationSeconds(startedAt, endedAt, pausedIntervals),
    distanceMeters: recordedDistanceMeters(samples, pausedIntervals),
    matchQuality: qualityFromHistory(matchHistory),
    gaps: Math.max(0, input.gaps ?? countLocationGaps(samples, 45, pausedIntervals)),
    completionState: "draft",
    exportState: "not_exported",
  };
}

export function createActiveDraftCheckpoint(
  snapshot: ActiveRideSnapshot | RecordingOnlySnapshot,
  input: CompletionDraftInput,
): ActivityDraft {
  return "route" in snapshot
    ? createCompletionDraft(snapshot, input)
    : createRecordingOnlyCompletionDraft(snapshot, input);
}

export type CompletionTrackState = "no-fix" | "captured";

export function completionTrackState(
  draft: Pick<ActivityDraft, "observedSamples">,
): CompletionTrackState {
  return draft.observedSamples.length ? "captured" : "no-fix";
}

export type CompletionActionState = "idle" | "busy" | "error" | "done";

export function completionActionStates(
  draft: Pick<ActivityDraft, "completionState" | "exportState">,
  {
    saving = false,
    exporting = false,
    exportError = false,
  }: {
    saving?: boolean;
    exporting?: boolean;
    exportError?: boolean;
  } = {},
): { save: CompletionActionState; export: CompletionActionState } {
  return {
    save: saving
      ? "busy"
      : draft.completionState === "save_failed"
        ? "error"
        : draft.completionState === "saved"
          ? "done"
          : "idle",
    export: exporting
      ? "busy"
      : exportError
        ? "error"
        : draft.exportState === "exported"
          ? "done"
          : "idle",
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

export function exportActivityDraft(
  draft: ActivityDraft,
  environment: BrowserDownloadEnvironment = browserDownloadEnvironment(),
): ActivityDraft | null {
  if (
    !environment.Blob ||
    !environment.URL?.createObjectURL ||
    !environment.document
  )
    return null;
  let href: string | undefined;
  try {
    const exportedDraft = markActivityExported(draft);
    const payload = JSON.stringify(exportedDraft, null, 2);
    const blob = new environment.Blob([payload], { type: "application/json" });
    href = environment.URL.createObjectURL(blob);
    const link = environment.document.createElement("a");
    link.href = href;
    link.download = `ride-${safeFilePart(draft.id)}.json`;
    environment.document.body?.appendChild(link);
    link.click();
    environment.document.body?.removeChild(link);
    return exportedDraft;
  } catch {
    return null;
  } finally {
    if (href !== undefined) environment.URL.revokeObjectURL?.(href);
  }
}

export function downloadActivityDraft(
  draft: ActivityDraft,
  environment: BrowserDownloadEnvironment = browserDownloadEnvironment(),
) {
  return exportActivityDraft(draft, environment) !== null;
}

export function recordedDistanceMeters(
  samples: RecordedSample[],
  pausedIntervals: readonly RidePauseInterval[] = [],
): number {
  let total = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = new Date(samples[index - 1].timestamp).getTime();
    const current = new Date(samples[index].timestamp).getTime();
    if (
      Number.isFinite(previous) &&
      Number.isFinite(current) &&
      pausedMilliseconds(previous, current, pausedIntervals) > 0
    )
      continue;
    total += distanceMeters(
      samples[index - 1].coordinate,
      samples[index].coordinate,
    );
  }
  return Math.round(total);
}

/** Count meaningful gaps in the watcher trace without treating the normal
 * 15-second watcher interval as a problem. The completion screen can report
 * sparse GPS honestly while keeping the raw samples intact. */
export function countLocationGaps(
  samples: RecordedSample[],
  thresholdSeconds = 45,
  pausedIntervals: readonly RidePauseInterval[] = [],
): number {
  if (samples.length < 2) return 0;
  let gaps = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = new Date(samples[index - 1].timestamp).getTime();
    const current = new Date(samples[index].timestamp).getTime();
    if (
      Number.isFinite(previous) &&
      Number.isFinite(current) &&
      current - previous -
          pausedMilliseconds(previous, current, pausedIntervals) >
        thresholdSeconds * 1_000
    )
      gaps += 1;
  }
  return gaps;
}

export function movingDurationSeconds(
  startedAt: string | Date,
  endedAt: string | Date,
  pausedIntervals: readonly RidePauseInterval[] = [],
) {
  const startedMs = new Date(toIso(startedAt)).getTime();
  const endedMs = new Date(toIso(endedAt)).getTime();
  if (endedMs <= startedMs) return 0;
  return Math.max(
    0,
    Math.round(
      (endedMs -
        startedMs -
        pausedMilliseconds(startedMs, endedMs, pausedIntervals)) /
        1_000,
    ),
  );
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

function closePauseIntervals(
  intervals: readonly Readonly<{ startedAt: string; endedAt?: string }>[],
  endedAt: string,
): RidePauseInterval[] {
  return intervals.map((interval) => ({
    startedAt: interval.startedAt,
    endedAt: interval.endedAt ?? endedAt,
  }));
}

function pausedMilliseconds(
  startMs: number,
  endMs: number,
  intervals: readonly RidePauseInterval[],
) {
  if (endMs <= startMs) return 0;
  const ranges = intervals
    .map((interval) => [
      new Date(interval.startedAt).getTime(),
      new Date(interval.endedAt).getTime(),
    ] as const)
    .filter(
      ([intervalStart, intervalEnd]) =>
        Number.isFinite(intervalStart) &&
        Number.isFinite(intervalEnd) &&
        intervalEnd > intervalStart,
    )
    .map(([intervalStart, intervalEnd]) => [
      Math.max(startMs, intervalStart),
      Math.min(endMs, intervalEnd),
    ] as const)
    .filter(([intervalStart, intervalEnd]) => intervalEnd > intervalStart)
    .sort(([firstStart], [secondStart]) => firstStart - secondStart);
  let coveredMs = 0;
  let coveredUntil = startMs;
  for (const [intervalStart, intervalEnd] of ranges) {
    if (intervalEnd <= coveredUntil) continue;
    coveredMs += intervalEnd - Math.max(intervalStart, coveredUntil);
    coveredUntil = intervalEnd;
  }
  return coveredMs;
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
