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
  const isNbhCatalogPlan = metadata.ownership === 'catalog' && (plan.id === NBH_FAMILY_ID || metadata.familyId === NBH_FAMILY_ID);
  const personalCopyInheritsCatalogIdentity = metadata.ownership === 'personal'
    && (metadata.familyId ?? plan.familyId) === NBH_FAMILY_ID
    && (metadata.variantId ?? plan.variantId) === NBH_VARIANT_ID
    && (metadata.revisionId ?? plan.revisionId) === NBH_REVISION_ID;
  const familyId = personalCopyInheritsCatalogIdentity
    ? undefined
    : metadata.familyId ?? plan.familyId ?? (isNbhCatalogPlan ? NBH_FAMILY_ID : undefined);
  const variantId = personalCopyInheritsCatalogIdentity
    ? undefined
    : metadata.variantId ?? plan.variantId ?? (isNbhCatalogPlan ? NBH_VARIANT_ID : undefined);
  const revision = metadata.revision ?? plan.revision ?? 1;
  const routeId = metadata.ownership === 'personal' && plan.id === NBH_FAMILY_ID
    ? `personal-${plan.id}-r${revision}`
    : plan.id;
  const revisionId = personalCopyInheritsCatalogIdentity
    ? undefined
    : metadata.revisionId ?? plan.revisionId ?? (isNbhCatalogPlan && revision === 1 ? NBH_REVISION_ID : undefined);
  const corridor = metadata.corridor ?? (personalCopyInheritsCatalogIdentity ? undefined : isNbhCatalogPlan ? plan.corridor : undefined);
  assertKnownIdentityLinkage(familyId, variantId, revisionId, revision);
  assertCorridorLinkage(corridor, variantId, revisionId);
  const hasExplicitGeometry = plan.geometry !== undefined;
  const explicitReadyRoad = metadata.geometry.status === 'ready' && metadata.geometry.kind === 'road_matched';
  const geometryCoordinates = plan.geometry?.map(clone) ?? (explicitReadyRoad ? [] : corridor?.coordinates.map(clone) ?? plan.points.map(toCoordinate));
  const geometrySource = metadata.geometry.source ?? plan.geometrySource;
  const geometryDistancesKm = normalizeDistanceIndex(
    plan.geometryDistancesKm
      ?? (!plan.geometry && !explicitReadyRoad ? corridor?.distancesKm : undefined)
      ?? (plan.geometry && geometryMatchesPoints(geometryCoordinates, plan.points) ? plan.points.map((point) => point.distanceKm) : undefined),
    geometryCoordinates.length,
  );
  const legDistancesKm = plan.legDistancesKm !== undefined
    ? clone(plan.legDistancesKm)
    : deriveLegDistances(plan.points);
  const routedDistanceKm = explicitReadyRoad
    ? plan.routedDistanceKm !== undefined ? plan.routedDistanceKm : finiteNonNegative(plan.distanceKm) ?? undefined
    : plan.routedDistanceKm !== undefined ? plan.routedDistanceKm : undefined;
  const distanceKm = (!plan.geometry && !explicitReadyRoad ? corridor?.distancesKm.at(-1) : undefined) ?? plan.distanceKm;
  const name = isNbhCatalogPlan ? 'NBH Loop' : plan.name;
  const nameAr = isNbhCatalogPlan ? 'حلقة ناصر بن حمد' : plan.nameAr;
  const carriesAnalysis = metadata.geometry.status === 'ready' && metadata.geometry.kind !== 'waypoint_trace';
  const analysis: RouteAnalysisSnapshot | undefined = carriesAnalysis ? {
    distanceKm,
    // Canonical records keep instants as the source of truth. Empty labels are
    // retained only to satisfy the legacy RoutePlan/RouteAnalysis shape.
    departureLabel: plan.departureAt ? '' : plan.departureLabel,
    arrivalLabel: plan.arrivalAt ? '' : plan.arrivalLabel,
    durationMinutes: plan.durationMinutes,
    recommendation: plan.recommendation,
    segments: clone(plan.segments),
    windSummary: clone(plan.windSummary),
    ...(routeId ? { routeId } : {}),
    ...(revision ? { routeRevision: revision } : {}),
    ...(plan.departureAt ? { departureAt: plan.departureAt } : {}),
    ...(plan.arrivalAt ? { arrivalAt: plan.arrivalAt } : {}),
  } : undefined;
  const shouldStoreProvisionalDistance = metadata.geometry.status !== 'ready'
    || metadata.geometry.kind !== 'road_matched'
    || (metadata.geometry.kind === 'road_matched' && geometryDistancesKm?.at(-1) === undefined);
  const traceDistanceKm = metadata.geometry.kind === 'recorded_trace'
    ? geometryDistancesKm?.at(-1) ?? corridor?.distancesKm.at(-1) ?? finiteNonNegative(plan.distanceKm) ?? pointDistanceKm(plan.points)
    : pointDistanceKm(plan.points);
  const provisionalDistanceKm = plan.provisionalDistanceKm ?? (
    shouldStoreProvisionalDistance ? traceDistanceKm : undefined
  );
  const record: RouteRecord = {
    id: routeId,
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
    ...(provisionalDistanceKm !== undefined ? { provisionalDistanceKm } : {}),
    ...(legDistancesKm ? { legDistancesKm: clone(legDistancesKm) } : {}),
    ...(routedDistanceKm !== undefined ? { routedDistanceKm } : {}),
    ...(analysis ? { analysis } : {}),
  };
  if (record.geometry.status === 'ready' && record.geometry.kind === 'road_matched' && !routeRecordHasAuthoritativeGeometry(record)) {
    record.geometry = {
      kind: 'waypoint_trace',
      status: 'unavailable',
      coordinates: record.points.map(toCoordinate),
    };
    record.legDistancesKm = undefined;
    record.routedDistanceKm = undefined;
    record.corridor = undefined;
    record.provisionalDistanceKm = record.provisionalDistanceKm ?? pointDistanceKm(record.points);
    if (hasExplicitGeometry) record.analysis = undefined;
  }
  return record;
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
  const authoritative = routeRecordHasAuthoritativeGeometry(record);
  const invalidReadyRoad = record.geometry.status === 'ready' && record.geometry.kind === 'road_matched' && !authoritative;
  const geometryKind = invalidReadyRoad ? 'waypoint_trace' : record.geometry.kind;
  const geometryStatus = invalidReadyRoad ? 'unavailable' : record.geometry.status;
  const currentAnalysis = isCurrentAnalysis(record) ? record.analysis : undefined;
  // Final metrics are scoped to the exact authoritative road revision. A
  // recorded/matching preview may retain a legacy scalar distance below, but
  // it must never carry ETA, wind ranking, or analysis sections forward.
  const analysis = authoritative ? currentAnalysis : undefined;
  const legacyPreviewDistance = !authoritative
    && record.geometry.kind === 'recorded_trace'
    && record.geometry.status === 'matching'
    ? currentAnalysis?.distanceKm
    : undefined;
  const fallbackDistance = invalidReadyRoad
    ? record.provisionalDistanceKm ?? record.points.at(-1)?.distanceKm ?? 0
    : record.geometry.status === 'ready'
    ? record.geometry.distancesKm?.at(-1) ?? record.corridor?.distancesKm.at(-1) ?? record.points.at(-1)?.distanceKm ?? record.provisionalDistanceKm ?? 0
    : record.geometry.kind === 'waypoint_trace' && record.geometry.status === 'unavailable'
      ? record.provisionalDistanceKm ?? record.geometry.distancesKm?.at(-1) ?? record.corridor?.distancesKm.at(-1) ?? record.points.at(-1)?.distanceKm ?? 0
      : record.geometry.distancesKm?.at(-1) ?? record.corridor?.distancesKm.at(-1) ?? record.points.at(-1)?.distanceKm ?? record.provisionalDistanceKm ?? 0;
  const distanceKm = authoritative
    ? record.routedDistanceKm ?? record.geometry.distancesKm?.at(-1) ?? 0
    : analysis?.distanceKm ?? legacyPreviewDistance ?? fallbackDistance;
  const renderedGeometry = geometryStatus === 'ready' ? record.geometry.coordinates : undefined;
  return {
    id: record.id,
    ...(record.familyId ? { familyId: record.familyId } : {}),
    ...(record.variantId ? { variantId: record.variantId } : {}),
    ...(record.revisionId ? { revisionId: record.revisionId } : {}),
    revision: record.revision,
    name: record.name,
    ...(record.nameAr ? { nameAr: record.nameAr } : {}),
    source: record.provenance.source,
    geometryKind,
    geometryStatus,
    origin: record.origin,
    ownership: record.ownership,
    provenance: clone(record.provenance),
    distanceStatus: authoritative ? 'authoritative' : 'provisional',
    ...(record.provisionalDistanceKm !== undefined ? { provisionalDistanceKm: record.provisionalDistanceKm } : {}),
    points: clone(record.points),
    ...(renderedGeometry?.length ? { geometry: clone(renderedGeometry) } : {}),
    ...(renderedGeometry && record.geometry.distancesKm?.length === renderedGeometry.length ? { geometryDistancesKm: clone(record.geometry.distancesKm) } : {}),
    ...(authoritative && record.legDistancesKm?.length === Math.max(0, record.points.length - 1) ? { legDistancesKm: clone(record.legDistancesKm) } : {}),
    ...(authoritative && record.routedDistanceKm !== undefined ? { routedDistanceKm: record.routedDistanceKm } : {}),
    ...(renderedGeometry && record.geometry.source ? { geometrySource: record.geometry.source } : {}),
    ...(record.corridor && !invalidReadyRoad ? { corridor: clone(record.corridor) } : {}),
    distanceKm,
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

/** A plan is matchable only when all readiness and distance evidence is explicit. */
export function routePlanHasAuthoritativeGeometry(route: RoutePlan): boolean {
  const geometry = route.geometry;
  if (route.geometryStatus !== 'ready'
    || route.geometryKind !== 'road_matched'
    || route.distanceStatus !== 'authoritative'
    || typeof route.geometrySource !== 'string'
    || route.geometrySource.trim().length === 0
    || route.points.length < 2
    || !hasFiniteCoordinates(route.points)
    || !hasValidPointDistanceIndex(route.points)
    || !hasFiniteCoordinates(geometry)
    || !endpointsCorrespond(geometry!, route.points)
    || !hasValidDistanceIndex(route.geometryDistancesKm, geometry?.length ?? 0)
    || geometry!.length < 2
    || !distanceEvidenceIsCanonical(route.points, geometry!, route.geometryDistancesKm!, route.legDistancesKm, route.routedDistanceKm ?? route.distanceKm)) return false;
  return true;
}

/** Canonical readiness gate shared by lifecycle and repository consumers. */
export function routeRecordHasAuthoritativeGeometry(record: RouteRecord): boolean {
  if (record.geometry.status !== 'ready'
    || record.geometry.kind !== 'road_matched'
    || typeof record.geometry.source !== 'string'
    || record.geometry.source.trim().length === 0
    || record.points.length < 2
    || !hasFiniteCoordinates(record.points)
    || !hasValidPointDistanceIndex(record.points)
    || !hasFiniteCoordinates(record.geometry.coordinates)
    || !endpointsCorrespond(record.geometry.coordinates, record.points)
    || !hasValidDistanceIndex(record.geometry.distancesKm, record.geometry.coordinates.length)) return false;
  const geometryDistancesKm = record.geometry.distancesKm!;
  const routedDistanceKm = record.routedDistanceKm !== undefined ? finiteNonNegative(record.routedDistanceKm) : geometryDistancesKm.at(-1)!;
  return routedDistanceKm !== null
    && distanceEvidenceIsCanonical(record.points, record.geometry.coordinates, geometryDistancesKm, record.legDistancesKm, routedDistanceKm);
}

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
  const routeIdentities = new Map<string, RouteRecord>();
  initialRoutes.forEach((route) => {
    const existing = routes.get(route.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(route)) throw new Error(`Catalog and personal routes must use a distinct route identity: ${route.id}.`);
    if (!existing) {
      assertRouteIdentityAvailable(route, routeIdentities);
      const stored = clone(route);
      routes.set(route.id, stored);
      const identity = routeIdentityKey(route);
      if (identity) routeIdentities.set(identity, stored);
    }
  });
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
    if (existing && existing.ownership !== route.ownership) throw new Error(`Catalog and personal routes must use a distinct route identity: ${route.id}.`);
    if (existing && existing.familyId !== route.familyId) throw new Error(`Cannot relink route ${route.id} to another family.`);
    if (existing && existing.variantId !== route.variantId) throw new Error(`Cannot relink route ${route.id} to another variant.`);
    if (existing && existing.revisionId !== route.revisionId) throw new Error(`Cannot relink route ${route.id} to another revision identity.`);
    assertRouteIdentityAvailable(route, routeIdentities, route.id);
    const stored = clone(route);
    routes.set(route.id, stored);
    const identity = routeIdentityKey(route);
    if (identity) routeIdentities.set(identity, stored);
    return clone(stored);
  };

  const savePersonal = (route: RouteRecord) => {
    const next = clone(route);
    if (next.ownership !== 'personal') {
      const nextRevision = next.revision + 1;
      if (next.ownership === 'catalog') {
        next.id = `${next.id}-personal-r${nextRevision}`;
        next.familyId = undefined;
        next.variantId = undefined;
        next.revisionId = undefined;
        next.corridor = undefined;
        next.provenance = { ...next.provenance, sourceId: next.id };
      }
      next.ownership = 'personal';
      next.revision = nextRevision;
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
      return deepFreeze(clone(activeRide));
    },
    getActiveRide: () => activeRide ? deepFreeze(clone(activeRide)) : undefined,
    clearActiveRide: () => { activeRide = undefined; },
    analysisKey: (route, departureAt) => routeAnalysisKey(route, departureAt),
  };
}

function isActiveRideSnapshot(value: RouteRecord | ActiveRideSnapshot): value is ActiveRideSnapshot {
  return 'routeId' in value && 'routeRevision' in value && 'startedAt' in value && 'route' in value;
}

function routeIdentityKey(route: Pick<RouteRecord, 'familyId' | 'variantId' | 'revisionId'>) {
  if (route.familyId === undefined && route.variantId === undefined && route.revisionId === undefined) return undefined;
  return JSON.stringify([route.familyId ?? null, route.variantId ?? null, route.revisionId ?? null]);
}

function assertRouteIdentityAvailable(route: RouteRecord, identities: Map<string, RouteRecord>, replacingId?: string) {
  const identity = routeIdentityKey(route);
  if (!identity) return;
  const existing = identities.get(identity);
  if (existing && existing.id !== replacingId) throw new Error(`Catalog and personal routes must use a distinct route identity: ${route.id}.`);
}

function assertKnownIdentityLinkage(familyId: string | undefined, variantId: string | undefined, revisionId: string | undefined, revision: number) {
  if (familyId === NBH_FAMILY_ID && variantId !== undefined && variantId !== NBH_VARIANT_ID) throw new Error('Route family/variant/revision linkage is inconsistent.');
  if (variantId === NBH_VARIANT_ID && familyId !== undefined && familyId !== NBH_FAMILY_ID) throw new Error('Route family/variant/revision linkage is inconsistent.');
  if (revisionId === NBH_REVISION_ID && (familyId !== NBH_FAMILY_ID || variantId !== NBH_VARIANT_ID || revision !== 1)) throw new Error('Route family/variant/revision linkage is inconsistent.');
}

function isCurrentAnalysis(record: RouteRecord): record is RouteRecord & { analysis: RouteAnalysisSnapshot } {
  const analysis = record.analysis;
  return Boolean(analysis
    && analysis.routeId === record.id
    && analysis.routeRevision === record.revision);
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
function normalizeDistanceIndex(value: number[] | undefined, expectedLength: number) {
  return value && hasValidDistanceIndex(value, expectedLength) ? clone(value) : undefined;
}
function normalizeLegDistanceIndex(value: number[] | undefined, expectedLength: number) {
  return value && hasValidLegDistanceIndex(value, expectedLength) ? clone(value) : undefined;
}
function hasValidDistanceIndex(value: number[] | undefined, expectedLength: number) {
  return Boolean(value && value.length === expectedLength && value.length >= 2 && value[0] === 0 && value.at(-1)! > 0 && value.every((distance, index) => Number.isFinite(distance) && distance >= 0 && (index === 0 || distance >= value[index - 1])));
}
function hasValidLegDistanceIndex(value: number[] | undefined, expectedLength: number) {
  return Boolean(value && value.length === expectedLength && value.length >= 1 && value.every((distance) => Number.isFinite(distance) && distance > 0));
}
function deriveLegDistances(points: Array<Coordinate & { distanceKm: number }>) {
  if (!hasValidPointDistanceIndex(points)) return undefined;
  const distances = points.slice(1).map((point, index) => point.distanceKm - points[index].distanceKm);
  return hasValidLegDistanceIndex(distances, points.length - 1) ? distances : undefined;
}
function hasFiniteCoordinates(value: Array<Coordinate> | undefined): value is Array<Coordinate> {
  return Boolean(value && value.length >= 2 && value.every((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)));
}
function geometryMatchesPoints(geometry: Coordinate[], points: Coordinate[]) {
  return geometry.length === points.length && geometry.every((point, index) => point.latitude === points[index].latitude && point.longitude === points[index].longitude);
}
function hasValidPointDistanceIndex(points: Array<Coordinate & { distanceKm: number }>) {
  return points.length >= 2
    && points[0].distanceKm === 0
    && points.at(-1)!.distanceKm > 0
    && points.every((point, index) => Number.isFinite(point.distanceKm) && point.distanceKm >= 0 && (index === 0 || point.distanceKm >= points[index - 1].distanceKm));
}
function endpointsCorrespond(geometry: Coordinate[], points: Coordinate[]) {
  return coordinateDistanceKm(geometry[0], points[0]) <= 2
    && coordinateDistanceKm(geometry.at(-1)!, points.at(-1)!) <= 2;
}
/** Reconcile every cumulative distance source before a route can be authoritative. */
function distanceEvidenceIsCanonical(
  points: Array<Coordinate & { distanceKm: number }>,
  geometry: Coordinate[],
  geometryDistancesKm: number[],
  suppliedLegDistancesKm: number[] | undefined,
  routedDistanceValue: number,
) {
  const legDistancesKm = suppliedLegDistancesKm ?? deriveLegDistances(points);
  const routedDistanceKm = finiteNonNegative(routedDistanceValue);
  if (!legDistancesKm || routedDistanceKm === null || routedDistanceKm <= 0) return false;
  if (!hasValidLegDistanceIndex(legDistancesKm, points.length - 1)) return false;
  const legCumulativeKm = [0];
  for (const distanceKm of legDistancesKm) legCumulativeKm.push((legCumulativeKm.at(-1) ?? 0) + distanceKm);
  const recomputedGeometryKm = cumulativeDistances(geometry);
  if (!recomputedGeometryKm.every((distanceKm, index) => distanceEvidenceMatches(distanceKm, geometryDistancesKm[index]))) return false;
  if (!points.every((point, index) => distanceEvidenceMatches(point.distanceKm, legCumulativeKm[index]))) return false;
  return distanceTotalsAgree([
    points.at(-1)!.distanceKm,
    legCumulativeKm.at(-1)!,
    geometryDistancesKm.at(-1)!,
    recomputedGeometryKm.at(-1)!,
    routedDistanceKm,
  ]);
}

function distanceTotalsAgree(values: number[]) {
  if (!values.length || values.some((value) => !Number.isFinite(value) || value <= 0)) return false;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return maximum - minimum <= distanceEvidenceToleranceKm(maximum, minimum);
}

/** Documented canonical distance tolerance: 150 m minimum, otherwise 2% of evidence. */
function distanceEvidenceMatches(firstKm: number, secondKm: number) {
  return Number.isFinite(firstKm)
    && Number.isFinite(secondKm)
    && Math.abs(firstKm - secondKm) <= distanceEvidenceToleranceKm(firstKm, secondKm);
}

function distanceEvidenceToleranceKm(firstKm: number, secondKm: number) {
  return Math.max(0.15, Math.max(Math.abs(firstKm), Math.abs(secondKm)) * 0.02);
}
function finiteNonNegative(value: number | undefined) { return value !== undefined && Number.isFinite(value) && value >= 0 ? value : null; }
function pointDistanceKm(points: Array<Coordinate & { distanceKm?: number }>) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += coordinateDistanceKm(points[index - 1], points[index]);
  return Number.isFinite(total) ? total : 0;
}
function cumulativeDistances(points: Coordinate[]) {
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) distances.push(distances[index - 1] + coordinateDistanceKm(points[index - 1], points[index]));
  return distances;
}
function coordinateDistanceKm(first: Coordinate, second: Coordinate) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(second.latitude - first.latitude);
  const dLon = radians(second.longitude - first.longitude);
  const lat1 = radians(first.latitude);
  const lat2 = radians(second.latitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}
