import type {
  ActivityDraft,
  ActiveRideSnapshot,
  PositionMatch,
  RecordedSample,
  RecordingOnlySnapshot,
  RouteAnalysisSnapshot,
  RouteRecord,
} from "./domain";

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
export function markActivityDiscarded(draft: ActivityDraft): ActivityDraft {
  return { ...clone(draft), completionState: "discarded" };
}
export function markActivityExported(draft: ActivityDraft): ActivityDraft {
  return { ...clone(draft), exportState: "exported" };
}

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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
