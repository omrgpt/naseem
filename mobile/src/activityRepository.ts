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
  return (
    value.matchQuality === "high" ||
    value.matchQuality === "medium" ||
    value.matchQuality === "low" ||
    value.matchQuality === "unknown"
  );
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
