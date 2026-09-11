import type { ActivityDraft } from "./domain";

export const ACTIVITY_STORAGE_VERSION = 1;

export type StoredActivities = {
  version: typeof ACTIVITY_STORAGE_VERSION;
  activities: ActivityDraft[];
};

export function serializeActivities(activities: readonly ActivityDraft[]) {
  return JSON.stringify({
    version: ACTIVITY_STORAGE_VERSION,
    activities: activities.filter(isActivityDraft).map(clone),
  } satisfies StoredActivities);
}

export function parseActivities(raw: string | null): ActivityDraft[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== ACTIVITY_STORAGE_VERSION ||
      !Array.isArray(parsed.activities)
    )
      return [];
    return parsed.activities.filter(isActivityDraft).map(clone);
  } catch {
    return [];
  }
}

/** A draft stays local and recoverable until the rider saves or discards it. */
export function isRecoverableActivity(
  activity: Pick<ActivityDraft, "completionState">,
) {
  return (
    activity.completionState === "draft" ||
    activity.completionState === "save_failed"
  );
}

export function serializePendingActivity(activity: ActivityDraft) {
  return serializeActivities([activity]);
}

export function parsePendingActivity(raw: string | null): ActivityDraft | null {
  return parseActivities(raw).find(isRecoverableActivity) ?? null;
}

/** Return a defensive copy so opening a saved ride cannot mutate its history. */
export function openSavedActivity(
  activities: readonly ActivityDraft[],
  id: string,
): ActivityDraft | null {
  const activity = activities.find(
    (candidate) => candidate.id === id && candidate.completionState === "saved",
  );
  return activity ? clone(activity) : null;
}

export const findSavedActivity = openSavedActivity;

export function upsertActivity(
  activities: readonly ActivityDraft[],
  activity: ActivityDraft,
) {
  return [
    ...activities.filter((candidate) => candidate.id !== activity.id),
    clone(activity),
  ];
}

function isActivityDraft(value: unknown): value is ActivityDraft {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    (typeof value.plannedRouteId !== "string" &&
      value.plannedRouteId !== null) ||
    (value.plannedRouteRevision !== null &&
      !Number.isInteger(value.plannedRouteRevision)) ||
    typeof value.startedAt !== "string" ||
    typeof value.endedAt !== "string" ||
    !isFiniteDate(value.startedAt) ||
    !isFiniteDate(value.endedAt)
  )
    return false;
  if (
    (value.routeSnapshot !== null && !isRecord(value.routeSnapshot)) ||
    !Array.isArray(value.observedSamples) ||
    !Array.isArray(value.matchHistory)
  )
    return false;
  if (
    typeof value.elapsedSeconds !== "number" ||
    !Number.isFinite(value.elapsedSeconds) ||
    typeof value.distanceMeters !== "number" ||
    !Number.isFinite(value.distanceMeters) ||
    typeof value.gaps !== "number" ||
    !Number.isFinite(value.gaps)
  )
    return false;
  const validMatchQuality =
    value.matchQuality === "high" ||
    value.matchQuality === "medium" ||
    value.matchQuality === "low" ||
    value.matchQuality === "unknown";
  const validCompletionState =
    value.completionState === "draft" ||
    value.completionState === "saved" ||
    value.completionState === "save_failed" ||
    value.completionState === "discarded";
  const validExportState =
    value.exportState === "not_exported" || value.exportState === "exported";
  return validMatchQuality && validCompletionState && validExportState;
}

function isFiniteDate(value: string) {
  return Number.isFinite(new Date(value).getTime());
}
function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
