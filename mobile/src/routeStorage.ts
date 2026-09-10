import type {
  Coordinate,
  RoadKind,
  RouteGeometryKind,
  RouteGeometryStatus,
  RoutePlan,
  RouteRecord,
  RoadEvidenceStatus,
  RoadSuitability,
  RouteOrigin,
  RouteOwnership,
  SegmentCondition,
  WindKind,
} from './domain';
import { routePlanFromRecord, routeRecordFromPlan } from './routeRepository';

export const ROUTE_STORAGE_VERSION = 2;
export const LEGACY_ROUTE_STORAGE_VERSION = 1;
/** Retained for callers that use the old advisory constant; migration does not truncate routes. */
export const ROUTE_STORAGE_MAX_ROUTES = 25;
export const ROUTE_STORAGE_MAX_BYTES = 512_000;

const roadKinds: RoadKind[] = ['dedicated', 'mixed', 'restricted', 'unknown'];
const windKinds: WindKind[] = ['headwind', 'tailwind', 'crosswind'];
const routeOrigins: RouteOrigin[] = ['pilot', 'gpx', 'drawn', 'generated'];
const routeOwnerships: RouteOwnership[] = ['catalog', 'personal'];
const geometryKinds: RouteGeometryKind[] = ['road_matched', 'recorded_trace', 'waypoint_trace'];
const geometryStatuses: RouteGeometryStatus[] = ['draft', 'matching', 'ready', 'unavailable'];
const roadEvidenceStatuses: RoadEvidenceStatus[] = ['pilot_pending', 'unknown', 'sourced'];
const confidences = ['high', 'medium', 'low'] as const;
const BAHRAIN_BOUNDS = { minLatitude: 25.5, maxLatitude: 26.5, minLongitude: 50.3, maxLongitude: 50.9 };
const DEFAULT_CATALOG_ROUTE_IDS = new Set(['nbh-loop', 'coastal-loop']);
const parsedPlanRecords = new WeakMap<object, RouteRecord>();

export type StoredRoutesV2 = { version: typeof ROUTE_STORAGE_VERSION; routes: RouteRecord[] };
export type RouteStorageSourceVersion = 0 | 1 | 2 | null;
export type RouteStorageMigrationOptions = { catalogRouteIds?: readonly string[]; catalogSources?: readonly string[] };
export type RouteStorageReadResult = { routes: RouteRecord[]; migrated: boolean; sourceVersion: RouteStorageSourceVersion };

/**
 * Read canonical records. A legacy array and a v1 envelope are migrated only
 * on this branch; a v2 envelope is validated as-is and never reclassified by
 * its source or ID.
 */
export function readStoredRouteRecords(raw: string | null, options: RouteStorageMigrationOptions = {}): RouteStorageReadResult {
  if (!raw) return { routes: [], migrated: false, sourceVersion: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return { routes: migrateLegacyRoutes(parsed, 'legacy-array', options), migrated: true, sourceVersion: 0 };
    if (!isRecord(parsed)) return { routes: [], migrated: false, sourceVersion: null };
    if (parsed.version === LEGACY_ROUTE_STORAGE_VERSION) return { routes: migrateLegacyRoutes(parsed.routes, 'v1-envelope', options), migrated: true, sourceVersion: 1 };
    if (parsed.version === ROUTE_STORAGE_VERSION) return { routes: parseV2Routes(parsed.routes), migrated: false, sourceVersion: 2 };
    return { routes: [], migrated: false, sourceVersion: null };
  } catch {
    return { routes: [], migrated: false, sourceVersion: null };
  }
}

export function parseStoredRouteRecords(raw: string | null, options: RouteStorageMigrationOptions = {}): RouteRecord[] {
  return readStoredRouteRecords(raw, options).routes;
}

/** Existing callers continue to receive the render/analysis view model. */
export function parseStoredRoutes(raw: string | null, options: RouteStorageMigrationOptions = {}): RoutePlan[] {
  return readStoredRouteRecords(raw, options).routes.map((record) => {
    const plan = routePlanFromRecord(record);
    parsedPlanRecords.set(plan, record);
    return plan;
  });
}

export function serializeStoredRouteRecords(routes: readonly RouteRecord[]): string {
  const payload: StoredRoutesV2 = { version: ROUTE_STORAGE_VERSION, routes: routes.filter(isRouteRecord).map(clone) };
  return JSON.stringify(payload);
}

/**
 * Compatibility serializer for the existing RoutePlan callers. RoutePlan
 * inputs represent pre-canonical data and therefore pass through the same
 * one-time legacy adapter; canonical inputs are serialized without inference.
 */
export function serializeStoredRoutes(routes: readonly (RoutePlan | RouteRecord)[]): string {
  const records = routes.flatMap((route) => {
    if (isRouteRecord(route)) return [clone(route)];
    const parsedRecord = parsedPlanRecords.get(route);
    return [parsedRecord ?? migrateLegacyRoute(route, 'legacy-array')].filter((candidate): candidate is RouteRecord => Boolean(candidate));
  });
  return serializeStoredRouteRecords(records);
}

export function migrateLegacyRouteData(raw: string | null, options: RouteStorageMigrationOptions = {}): RouteStorageReadResult {
  return readStoredRouteRecords(raw, options);
}

function migrateLegacyRoutes(value: unknown, migration: 'legacy-array' | 'v1-envelope', options: RouteStorageMigrationOptions): RouteRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const route = migrateLegacyRoute(candidate, migration, options);
    return route ? [route] : [];
  });
}

function migrateLegacyRoute(value: unknown, migration: 'legacy-array' | 'v1-envelope', options: RouteStorageMigrationOptions = {}): RouteRecord | null {
  if (!isRoutePlan(value)) return null;
  const origin = inferLegacyOrigin(value);
  const ownership = inferLegacyOwnership(value, options);
  const geometry = inferLegacyGeometry(value, origin);
  return routeRecordFromPlan(value, {
    origin,
    ownership,
    geometry,
    roadEvidenceStatus: inferLegacyRoadEvidence(value, ownership),
    provenance: {
      source: value.source,
      sourceId: value.id,
      ...(migration === 'v1-envelope' ? { migratedFrom: 'v1-envelope' as const } : { migratedFrom: 'legacy-array' as const }),
    },
    revision: 1,
  });
}

/** ID/source inference is intentionally scoped to legacy migration only. */
function inferLegacyOrigin(route: RoutePlan): RouteOrigin {
  const id = route.id.toLowerCase();
  const source = route.source.toLowerCase();
  if (DEFAULT_CATALOG_ROUTE_IDS.has(route.id) || source.includes('pilot') || source.includes('bahrain tourism')) return 'pilot';
  if (id.startsWith('gpx-') || source.includes('gpx') || source.includes('import')) return 'gpx';
  if (id.startsWith('drawn-') || source.includes('draw')) return 'drawn';
  if (id.startsWith('generated-') || source.includes('generat')) return 'generated';
  return 'drawn';
}

function inferLegacyOwnership(route: RoutePlan, options: RouteStorageMigrationOptions): RouteOwnership {
  const catalogIds = new Set([...DEFAULT_CATALOG_ROUTE_IDS, ...(options.catalogRouteIds ?? [])]);
  const catalogSources = new Set((options.catalogSources ?? []).map((source) => source.toLowerCase()));
  return catalogIds.has(route.id) || catalogSources.has(route.source.toLowerCase()) ? 'catalog' : 'personal';
}

function inferLegacyGeometry(route: RoutePlan, origin: RouteOrigin): { kind: RouteGeometryKind; status: RouteGeometryStatus; source?: string } {
  if (route.geometry?.length && isRoutedGeometrySource(route.geometrySource)) return { kind: 'road_matched', status: 'ready', ...(route.geometrySource ? { source: route.geometrySource } : {}) };
  if (origin === 'gpx' || origin === 'pilot') return { kind: 'recorded_trace', status: 'ready', ...(route.geometrySource ? { source: route.geometrySource } : {}) };
  return { kind: 'waypoint_trace', status: 'unavailable', ...(route.geometrySource ? { source: route.geometrySource } : {}) };
}

function inferLegacyRoadEvidence(route: RoutePlan, ownership: RouteOwnership): RoadEvidenceStatus {
  if (ownership === 'catalog' || route.source.toLowerCase().includes('pilot')) return 'pilot_pending';
  if (route.geometrySource?.toLowerCase().includes('evidence')) return 'sourced';
  return 'unknown';
}

function isRoutedGeometrySource(value: string | undefined) {
  const source = value?.toLowerCase() ?? '';
  return source.includes('routed') || source.includes('road-match') || source.includes('road matched');
}

function parseV2Routes(value: unknown): RouteRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRouteRecord).map(clone);
}

function isRoutePlan(value: unknown): value is RoutePlan {
  if (!isRecord(value) || !boundedString(value.id, 128) || !boundedString(value.name, 160) || !boundedString(value.source, 160)) return false;
  if (value.nameAr !== undefined && !boundedString(value.nameAr, 160)) return false;
  if (!Array.isArray(value.points) || value.points.length < 2 || value.points.length > 2_000 || !value.points.every(isRoutePoint)) return false;
  if (value.geometry !== undefined && (!Array.isArray(value.geometry) || value.geometry.length < 2 || value.geometry.length > 4_000 || !value.geometry.every(isCoordinate))) return false;
  if (value.geometryDistancesKm !== undefined && (!Array.isArray(value.geometryDistancesKm) || value.geometryDistancesKm.length > 4_000 || !value.geometryDistancesKm.every((item) => boundedNumber(item, 0, 500)))) return false;
  if (!boundedNumber(value.distanceKm, 0, 500) || !boundedText(value.departureLabel, 32) || !boundedText(value.arrivalLabel, 32) || !boundedNumber(value.durationMinutes, 0, 2_000) || !boundedText(value.recommendation, 500) || !optionalDate(value.departureAt) || !optionalDate(value.arrivalAt)) return false;
  if (!Array.isArray(value.segments) || value.segments.length > 2_000 || !value.segments.every(isSegment)) return false;
  return isRecord(value.windSummary) && boundedNumber(value.windSummary.tailwindPercent, 0, 100) && boundedNumber(value.windSummary.headwindPercent, 0, 100) && boundedNumber(value.windSummary.crosswindPercent, 0, 100);
}

function isRouteRecord(value: unknown): value is RouteRecord {
  if (!isRecord(value) || !boundedString(value.id, 128) || !boundedString(value.name, 160) || (value.nameAr !== undefined && !boundedString(value.nameAr, 160))) return false;
  if (!routeOrigins.includes(value.origin as RouteOrigin) || !routeOwnerships.includes(value.ownership as RouteOwnership) || !roadEvidenceStatuses.includes(value.roadEvidenceStatus as RoadEvidenceStatus) || !Number.isInteger(value.revision) || !boundedNumber(value.revision, 1, 1_000_000)) return false;
  if (!Array.isArray(value.points) || value.points.length < 1 || value.points.length > 2_000 || !value.points.every(isRoutePoint)) return false;
  if (!isRouteGeometry(value.geometry)) return false;
  if (!isProvenance(value.provenance)) return false;
  return value.analysis === undefined || isAnalysisSnapshot(value.analysis);
}

function isRouteGeometry(value: unknown): value is RouteRecord['geometry'] {
  if (!isRecord(value) || !geometryKinds.includes(value.kind as RouteGeometryKind) || !geometryStatuses.includes(value.status as RouteGeometryStatus)) return false;
  if (!Array.isArray(value.coordinates) || value.coordinates.length > 4_000 || !value.coordinates.every(isCoordinate)) return false;
  if (value.distancesKm !== undefined && (!Array.isArray(value.distancesKm) || value.distancesKm.length > 4_000 || !value.distancesKm.every((item) => boundedNumber(item, 0, 500)))) return false;
  return value.source === undefined || boundedString(value.source, 500);
}

function isProvenance(value: unknown): value is RouteRecord['provenance'] {
  if (!isRecord(value) || !boundedString(value.source, 160)) return false;
  if (value.sourceId !== undefined && !boundedString(value.sourceId, 160)) return false;
  if (value.sourceUrl !== undefined && !boundedString(value.sourceUrl, 500)) return false;
  if (value.createdAt !== undefined && !boundedString(value.createdAt, 64)) return false;
  if (value.importedAt !== undefined && !boundedString(value.importedAt, 64)) return false;
  return value.migratedFrom === undefined || value.migratedFrom === 'legacy-array' || value.migratedFrom === 'v1-envelope';
}

function isAnalysisSnapshot(value: unknown): value is NonNullable<RouteRecord['analysis']> {
  if (!isRecord(value) || !boundedNumber(value.distanceKm, 0, 500) || !boundedText(value.departureLabel, 32) || !boundedText(value.arrivalLabel, 32) || !boundedNumber(value.durationMinutes, 0, 2_000) || !boundedText(value.recommendation, 500) || !optionalDate(value.departureAt) || !optionalDate(value.arrivalAt) || !Array.isArray(value.segments) || value.segments.length > 2_000 || !value.segments.every(isSegment)) return false;
  return isRecord(value.windSummary) && boundedNumber(value.windSummary.tailwindPercent, 0, 100) && boundedNumber(value.windSummary.headwindPercent, 0, 100) && boundedNumber(value.windSummary.crosswindPercent, 0, 100);
}

function isRoutePoint(value: unknown) {
  if (!isRecord(value) || !isCoordinate(value)) return false;
  const point = value as Record<string, unknown>;
  return boundedString(point.name, 160) && (point.nameAr === undefined || boundedString(point.nameAr, 160)) && boundedNumber(point.distanceKm, 0, 500) && boundedNumber(point.headingDegrees, 0, 360) && isSuitability(point.suitability);
}

function isSegment(value: unknown): value is SegmentCondition {
  if (!isRecord(value) || !boundedString(value.id, 128) || !boundedString(value.name, 160) || (value.nameAr !== undefined && !boundedString(value.nameAr, 160)) || !optionalDate(value.arrivalAt) || !boundedText(value.arrivalLabel, 32) || !boundedText(value.insight, 500) || !isSuitability(value.suitability)) return false;
  const wind = value.wind;
  return isRecord(wind) && isWindKind(wind.kind) && boundedNumber(wind.magnitudeKph, 0, 200) && boundedNumber(wind.headwindKph, -200, 200) && boundedNumber(wind.crosswindKph, 0, 200) && (wind.gustsKph === undefined || boundedNumber(wind.gustsKph, 0, 300)) && (wind.forecastTime === undefined || boundedString(wind.forecastTime, 64)) && (wind.source === undefined || boundedString(wind.source, 160)) && (wind.gridCell === undefined || boundedString(wind.gridCell, 160));
}

function isSuitability(value: unknown): value is RoadSuitability {
  return isRecord(value) && isRoadKind(value.kind) && boundedString(value.label, 120) && boundedString(value.evidence, 300) && (value.evidenceAr === undefined || boundedString(value.evidenceAr, 300)) && boundedString(value.source, 160) && confidences.includes(value.confidence as typeof confidences[number]) && (value.sourceUrl === undefined || boundedString(value.sourceUrl, 500));
}

function isCoordinate(value: unknown): value is Coordinate {
  return isRecord(value) && typeof value.latitude === 'number' && typeof value.longitude === 'number' && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && value.latitude >= BAHRAIN_BOUNDS.minLatitude && value.latitude <= BAHRAIN_BOUNDS.maxLatitude && value.longitude >= BAHRAIN_BOUNDS.minLongitude && value.longitude <= BAHRAIN_BOUNDS.maxLongitude;
}

function isRoadKind(value: unknown): value is RoadKind { return roadKinds.includes(value as RoadKind); }
function isWindKind(value: unknown): value is WindKind { return windKinds.includes(value as WindKind); }
function boundedNumber(value: unknown, minimum: number, maximum: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum; }
function boundedText(value: unknown, maxLength: number): value is string { return typeof value === 'string' && value.length <= maxLength; }
function boundedString(value: unknown, maxLength: number): value is string { return typeof value === 'string' && value.length > 0 && value.length <= maxLength; }
function optionalDate(value: unknown): value is string | undefined { return value === undefined || (typeof value === 'string' && Number.isFinite(new Date(value).getTime()) && value.length <= 64); }
function isRecord(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
