import {
  BAHRAIN_TIME_ZONE,
  NBH_FAMILY_ID,
  NBH_REVISION_ID,
  NBH_VARIANT_ID,
} from './domain';
import type {
  ActiveRideSnapshot,
  Coordinate,
  RouteCatalog,
  RouteCorridor,
  RouteFamily,
  RouteAnalysisSnapshot,
  RouteGeometry,
  RoutePlan,
  RouteRecord,
  RouteProvenance,
  RouteOrigin,
  RouteOwnership,
  RouteRevision,
  RouteVariant,
  RoadEvidenceStatus,
} from './domain';

export type RouteRecordMetadata = {
  origin: RouteOrigin;
  ownership: RouteOwnership;
  geometry: Pick<RouteGeometry, 'kind' | 'status'> & { source?: string };
  roadEvidenceStatus: RoadEvidenceStatus;
  provenance: RouteProvenance;
  revision?: number;
  familyId?: string;
  variantId?: string;
  revisionId?: string;
  corridor?: RouteCorridor;
};

export type RouteRevisionRecordMetadata = Omit<RouteRecordMetadata, 'revision' | 'familyId' | 'variantId' | 'revisionId' | 'corridor'>;

/**
 * Convert the legacy/render view model into a canonical record when the
 * caller already knows the route's identity. The one stable NBH catalog ID
 * also gets its known linkage when reading an older pre-catalog plan; other
 * legacy routes keep their existing identity unchanged.
 */
export function routeRecordFromPlan(plan: RoutePlan, metadata: RouteRecordMetadata): RouteRecord {
  const isNbhCatalogPlan = plan.id === NBH_FAMILY_ID || metadata.familyId === NBH_FAMILY_ID;
  const familyId = metadata.familyId ?? plan.familyId ?? (isNbhCatalogPlan ? NBH_FAMILY_ID : undefined);
  const variantId = metadata.variantId ?? plan.variantId ?? (isNbhCatalogPlan ? NBH_VARIANT_ID : undefined);
  const revision = metadata.revision ?? plan.revision ?? 1;
  const revisionId = metadata.revisionId ?? plan.revisionId ?? (isNbhCatalogPlan && revision === 1 ? NBH_REVISION_ID : undefined);
  const corridor = metadata.corridor ?? (plan.id === NBH_FAMILY_ID ? plan.corridor : undefined);
  assertCorridorLinkage(corridor, variantId, revisionId);
  const geometryCoordinates = plan.geometry?.map(clone) ?? corridor?.coordinates.map(clone) ?? plan.points.map(toCoordinate);
  const geometrySource = metadata.geometry.source ?? plan.geometrySource;
  const geometryDistancesKm = plan.geometryDistancesKm ?? corridor?.distancesKm;
  const distanceKm = corridor?.distancesKm.at(-1) ?? plan.distanceKm;
  const name = isNbhCatalogPlan ? 'NBH Loop' : plan.name;
  const nameAr = isNbhCatalogPlan ? 'حلقة ناصر بن حمد' : plan.nameAr;
  const analysis: RouteAnalysisSnapshot = {
    distanceKm,
    // Canonical records keep instants as the source of truth. Empty labels are
    // retained only to satisfy the legacy RoutePlan/RouteAnalysis shape.
    departureLabel: plan.departureAt ? '' : plan.departureLabel,
    arrivalLabel: plan.arrivalAt ? '' : plan.arrivalLabel,
    durationMinutes: plan.durationMinutes,
    recommendation: plan.recommendation,
    segments: clone(plan.segments),
    windSummary: clone(plan.windSummary),
    ...(plan.id ? { routeId: plan.id } : {}),
    ...(revision ? { routeRevision: revision } : {}),
    ...(plan.departureAt ? { departureAt: plan.departureAt } : {}),
    ...(plan.arrivalAt ? { arrivalAt: plan.arrivalAt } : {}),
  };
  return {
    id: plan.id,
    ...(familyId ? { familyId } : {}),
    ...(variantId ? { variantId } : {}),
    ...(revisionId ? { revisionId } : {}),
    name,
    ...(nameAr ? { nameAr } : {}),
    origin: metadata.origin,
    ownership: metadata.ownership,
    points: clone(plan.points),
    geometry: {
      kind: metadata.geometry.kind,
      status: metadata.geometry.status,
      coordinates: geometryCoordinates,
      ...(geometryDistancesKm ? { distancesKm: clone(geometryDistancesKm) } : {}),
      ...(geometrySource ? { source: geometrySource } : {}),
    },
    ...(corridor ? { corridor: clone(corridor) } : {}),
    roadEvidenceStatus: metadata.roadEvidenceStatus,
    revision,
    provenance: clone(metadata.provenance),
    analysis,
  };
}

/** Bind a render plan to one immutable catalog revision and its corridor. */
export function routeRecordFromRevision(plan: RoutePlan, revision: RouteRevision, metadata: RouteRevisionRecordMetadata): RouteRecord {
  assertCorridorLinkage(revision.corridor, revision.variantId, revision.id);
  const geometrySource = metadata.geometry.source ?? revision.geometry.source;
  return routeRecordFromPlan(
    {
      ...plan,
      familyId: revision.familyId,
      variantId: revision.variantId,
      revisionId: revision.id,
      revision: revision.revision,
      distanceKm: revision.distanceKm,
      geometry: clone(revision.geometry.coordinates),
      geometryDistancesKm: clone(revision.corridor.distancesKm),
      corridor: revision.corridor,
    },
    {
      ...metadata,
      geometry: { ...metadata.geometry, ...(geometrySource ? { source: geometrySource } : {}) },
      familyId: revision.familyId,
      variantId: revision.variantId,
      revisionId: revision.id,
      revision: revision.revision,
      corridor: revision.corridor,
    },
  );
}

export const createRouteRecord = routeRecordFromPlan;
export const canonicalRouteFromPlan = routeRecordFromPlan;
export const createRouteRecordFromRevision = routeRecordFromRevision;

/** Convert a canonical record back to the existing renderer/analysis shape. */
export function routePlanFromRecord(record: RouteRecord): RoutePlan {
  const analysis = record.geometry.kind === 'waypoint_trace' ? undefined : record.analysis;
  const fallbackDistance = record.geometry.distancesKm?.at(-1) ?? record.corridor?.distancesKm.at(-1) ?? record.points.at(-1)?.distanceKm ?? 0;
  const renderedGeometry = record.geometry.status === 'ready' ? record.geometry.coordinates : undefined;
  return {
    id: record.id,
    ...(record.familyId ? { familyId: record.familyId } : {}),
    ...(record.variantId ? { variantId: record.variantId } : {}),
    ...(record.revisionId ? { revisionId: record.revisionId } : {}),
    revision: record.revision,
    name: record.name,
    ...(record.nameAr ? { nameAr: record.nameAr } : {}),
    source: record.provenance.source,
    points: clone(record.points),
    ...(renderedGeometry?.length ? { geometry: clone(renderedGeometry) } : {}),
    ...(renderedGeometry && record.geometry.distancesKm ? { geometryDistancesKm: clone(record.geometry.distancesKm) } : {}),
    ...(renderedGeometry && record.geometry.source ? { geometrySource: record.geometry.source } : {}),
    ...(record.corridor ? { corridor: clone(record.corridor) } : {}),
    distanceKm: analysis?.distanceKm ?? fallbackDistance,
    ...(analysis?.departureAt ? { departureAt: analysis.departureAt } : {}),
    ...(analysis?.arrivalAt ? { arrivalAt: analysis.arrivalAt } : {}),
    departureLabel: analysis?.departureLabel ?? '',
    arrivalLabel: analysis?.arrivalLabel ?? '',
    durationMinutes: analysis?.durationMinutes ?? 0,
    recommendation: analysis?.recommendation ?? '',
    segments: analysis ? clone(analysis.segments) : [],
    windSummary: analysis ? clone(analysis.windSummary) : { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 },
  };
}

export const planFromRouteRecord = routePlanFromRecord;

export type RouteAnalysisKeyInput = Pick<RouteRecord, 'id' | 'revision'>;

/**
 * Analysis is keyed by the reviewed route revision and an instant, while the
 * display zone stays fixed to Bahrain. ISO normalization makes equivalent
 * offsets resolve to one cache key without changing the underlying instant.
 */
export function routeAnalysisKey(route: RouteAnalysisKeyInput, departureAt: string | Date): string;
export function routeAnalysisKey(routeId: string, revision: number, departureAt: string | Date): string;
export function routeAnalysisKey(routeOrId: RouteAnalysisKeyInput | string, revisionOrDeparture: number | string | Date, maybeDeparture?: string | Date): string {
  const routeId = typeof routeOrId === 'string' ? routeOrId : routeOrId.id;
  const revision = typeof routeOrId === 'string' ? revisionOrDeparture as number : routeOrId.revision;
  const departureAt = typeof routeOrId === 'string' ? maybeDeparture : revisionOrDeparture as string | Date;
  if (!Number.isInteger(revision) || revision < 1) throw new RangeError('Route revision must be a positive integer.');
  const instant = normalizeInstant(departureAt);
  return JSON.stringify({ routeId, routeRevision: revision, departureAt: instant, timeZone: BAHRAIN_TIME_ZONE });
}

export const makeRouteAnalysisKey = routeAnalysisKey;

export type ActiveRideSnapshotOptions = { id?: string; analysisKey?: string };

/** Create a deep, frozen snapshot so later route edits cannot retarget a ride. */
export function createActiveRideSnapshot(route: RouteRecord, startedAt: string | Date, options: ActiveRideSnapshotOptions = {}): ActiveRideSnapshot {
  const instant = normalizeInstant(startedAt);
  const snapshot = {
    id: options.id ?? `ride-${route.id}-${route.revision}-${instant}`,
    routeId: route.id,
    ...(route.familyId ? { familyId: route.familyId } : {}),
    ...(route.variantId ? { variantId: route.variantId } : {}),
    ...(route.revisionId ? { revisionId: route.revisionId } : {}),
    routeRevision: route.revision,
    startedAt: instant,
    route: clone(route),
    ...(options.analysisKey ? { analysisKey: options.analysisKey } : {}),
  } satisfies ActiveRideSnapshot;
  return deepFreeze(snapshot);
}

export const activeRideSnapshotFromRoute = createActiveRideSnapshot;

export type RouteRepository = {
  list: () => RouteRecord[];
  get: (routeId: string) => RouteRecord | undefined;
  getByIdentity: (familyId: string, variantId: string, revisionId: string) => RouteRecord | undefined;
  upsert: (route: RouteRecord) => RouteRecord;
  savePersonal: (route: RouteRecord) => RouteRecord;
  select: (routeId: string) => RouteRecord | undefined;
  selectVariant: (familyId: string, variantId: string, revisionId?: string) => RouteRecord | undefined;
  getSelected: () => RouteRecord | undefined;
  listFamilies: () => RouteFamily[];
  getFamily: (familyId: string) => RouteFamily | undefined;
  getVariant: (familyId: string, variantId: string) => RouteVariant | undefined;
  getRevision: (familyId: string, variantId: string, revisionId?: string) => RouteRevision | undefined;
  setActiveRide: (routeOrSnapshot: RouteRecord | ActiveRideSnapshot, startedAt?: string | Date, options?: ActiveRideSnapshotOptions) => ActiveRideSnapshot;
  getActiveRide: () => ActiveRideSnapshot | undefined;
  clearActiveRide: () => void;
  analysisKey: (route: RouteAnalysisKeyInput, departureAt: string | Date) => string;
};

export type RouteRepositoryCatalog = Partial<Pick<RouteCatalog, 'families' | 'corridors'>>;

/** Small in-memory boundary for explicit selection and active-ride ownership. */
export function createRouteRepository(initialRoutes: readonly RouteRecord[] = [], catalog: RouteRepositoryCatalog = {}): RouteRepository {
  const routes = new Map<string, RouteRecord>();
  initialRoutes.forEach((route) => routes.set(route.id, clone(route)));
  const families = (catalog.families ?? []).map(clone);
  const corridors = (catalog.corridors ?? []).map(clone);
  let selectedRouteId: string | undefined;
  let activeRide: ActiveRideSnapshot | undefined;

  const get = (routeId: string) => {
    const route = routes.get(routeId);
    return route ? clone(route) : undefined;
  };

  const getByIdentity = (familyId: string, variantId: string, revisionId: string) => {
    const route = [...routes.values()].find((candidate) => candidate.familyId === familyId && candidate.variantId === variantId && candidate.revisionId === revisionId);
    return route ? clone(route) : undefined;
  };

  const getFamily = (familyId: string) => {
    const family = families.find((candidate) => candidate.id === familyId);
    return family ? clone(family) : undefined;
  };

  const getVariant = (familyId: string, variantId: string) => {
    const family = families.find((candidate) => candidate.id === familyId);
    const variant = family?.variants.find((candidate) => candidate.id === variantId && candidate.familyId === familyId);
    return variant ? clone(variant) : undefined;
  };

  const getRevision = (familyId: string, variantId: string, revisionId?: string) => {
    const variant = getVariant(familyId, variantId);
    if (!variant) return undefined;
    const revision = variant.currentRevision;
    const expectedRevisionId = revisionId ?? variant.currentRevisionId ?? revision.id;
    if (revision.id !== expectedRevisionId || revision.familyId !== familyId || revision.variantId !== variantId) return undefined;
    const corridor = corridors.find((candidate) => candidate.variantId === variantId && candidate.revisionId === revision.id) ?? revision.corridor;
    assertCorridorLinkage(corridor, variantId, revision.id);
    return clone({ ...revision, corridor });
  };

  const upsert = (route: RouteRecord) => {
    const existing = routes.get(route.id);
    if (existing && route.revision < existing.revision) throw new Error(`Cannot replace route ${route.id} with an older revision.`);
    if (existing && route.revision === existing.revision && JSON.stringify(route) !== JSON.stringify(existing)) throw new Error(`Cannot replace route ${route.id} without a new revision.`);
    if (existing && existing.familyId && route.familyId && existing.familyId !== route.familyId) throw new Error(`Cannot relink route ${route.id} to another family.`);
    if (existing && existing.variantId && route.variantId && existing.variantId !== route.variantId) throw new Error(`Cannot relink route ${route.id} to another variant.`);
    const stored = clone(route);
    routes.set(route.id, stored);
    return clone(stored);
  };

  const savePersonal = (route: RouteRecord) => {
    const next = clone(route);
    if (next.ownership !== 'personal') {
      next.ownership = 'personal';
      next.revision += 1;
      next.analysis = undefined;
    }
    return upsert(next);
  };

  return {
    list: () => [...routes.values()].map(clone),
    get,
    getByIdentity,
    upsert,
    savePersonal,
    select: (routeId) => {
      if (!routes.has(routeId)) return undefined;
      selectedRouteId = routeId;
      return get(routeId);
    },
    selectVariant: (familyId, variantId, revisionId) => {
      const revision = getRevision(familyId, variantId, revisionId);
      if (!revision) return undefined;
      const selected = getByIdentity(familyId, variantId, revision.id);
      if (!selected) return undefined;
      selectedRouteId = selected.id;
      return selected;
    },
    getSelected: () => selectedRouteId ? get(selectedRouteId) : undefined,
    listFamilies: () => families.map(clone),
    getFamily,
    getVariant,
    getRevision,
    setActiveRide: (routeOrSnapshot, startedAt, options = {}) => {
      const snapshot = isActiveRideSnapshot(routeOrSnapshot)
        ? routeOrSnapshot
        : createActiveRideSnapshot(routeOrSnapshot, startedAt ?? new Date(), options);
      activeRide = deepFreeze(clone(snapshot));
      return activeRide;
    },
    getActiveRide: () => activeRide,
    clearActiveRide: () => { activeRide = undefined; },
    analysisKey: (route, departureAt) => routeAnalysisKey(route, departureAt),
  };
}

function isActiveRideSnapshot(value: RouteRecord | ActiveRideSnapshot): value is ActiveRideSnapshot {
  return 'routeId' in value && 'routeRevision' in value && 'startedAt' in value && 'route' in value;
}

function assertCorridorLinkage(
  corridor: RouteCorridor | undefined,
  variantId: string | undefined,
  revisionId: string | undefined,
) {
  if (!corridor) return;
  if (variantId && corridor.variantId !== variantId) throw new Error('A route corridor must belong to the selected variant revision.');
  if (revisionId && corridor.revisionId !== revisionId) throw new Error('A route corridor must belong to the selected variant revision.');
  if (corridor.coordinates.length !== corridor.distancesKm.length) throw new Error('Route corridor coordinates and distance index must have the same length.');
  if (corridor.distancesKm.some((distance, index, distances) => !Number.isFinite(distance) || distance < 0 || (index > 0 && distance < distances[index - 1]))) throw new Error('Route corridor distance index must be ordered and non-negative.');
}

function normalizeInstant(value: string | Date | undefined): string {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value ?? Number.NaN);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Expected a valid departure or start instant.');
  return date.toISOString();
}

function toCoordinate(point: Coordinate): Coordinate { return { latitude: point.latitude, longitude: point.longitude }; }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}
