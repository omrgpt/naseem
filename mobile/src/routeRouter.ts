import { ROUTE_MATCHING_MAX_WAYPOINTS } from './domain';
import type { Coordinate, RoutePlan } from './domain';

/**
 * The private preview uses the community-hosted OSM routed-bike service for a
 * road-following geometry. It is deliberately configurable so a licensed,
 * authenticated GraphHopper/OSRM deployment can replace it before launch.
 */
const ROUTER_BASE_URL = process.env.EXPO_PUBLIC_ROUTER_URL ?? 'https://routing.openstreetmap.de/routed-bike/route/v1/driving';
const BAHRAIN_BOUNDS = { minLatitude: 25.5, maxLatitude: 26.5, minLongitude: 50.3, maxLongitude: 50.9 };
const MAX_WAYPOINTS = ROUTE_MATCHING_MAX_WAYPOINTS;
const MAX_GEOMETRY_POINTS = 700;
const MAX_ROUTED_DISTANCE_KM = 160;
const ROUTER_CACHE_TTL_MS = 5 * 60_000;
const ROUTER_CACHE_MAX_ENTRIES = 64;
const ROUTER_CALLS_PER_MINUTE = 20;

type RouterResponse = {
  code?: string;
  waypoints?: Array<{ location?: unknown }>;
  routes?: Array<{
    distance?: number;
    geometry?: { coordinates?: unknown };
    legs?: Array<{ distance?: number }>;
  }>;
};

export type RouteMatchFailureCode = 'tooFewWaypoints' | 'tooManyWaypoints' | 'outsideCoverage' | 'routerUnavailable' | 'noRoute' | 'invalidResponse' | 'rateLimited';
export type RouteGeometryResolution = { ok: true; route: RoutePlan } | { ok: false; reason: RouteMatchFailureCode };

export async function resolveRoadGeometry(route: RoutePlan): Promise<RoutePlan | null> {
  const result = await resolveRoadGeometryDetailed(route);
  return result.ok ? result.route : null;
}

/** Preserve failure semantics for the route lifecycle instead of collapsing every failure to null. */
export async function resolveRoadGeometryDetailed(route: RoutePlan): Promise<RouteGeometryResolution> {
  const key = routeFingerprint(route);
  const cached = geometryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { ok: true, route: rebaseCachedGeometry(cached.value, route) };
  if (cached) geometryCache.delete(key);
  const pending = geometryInFlight.get(key);
  if (pending) return pending.then((resolved) => resolved.ok ? { ok: true, route: rebaseCachedGeometry(resolved.route, route) } : resolved);
  if (!takeRouterBudget()) return { ok: false, reason: 'rateLimited' };
  const request = resolveRoadGeometryUncached(route).then((resolved) => {
    if (resolved.ok) {
      while (geometryCache.size >= ROUTER_CACHE_MAX_ENTRIES) geometryCache.delete(geometryCache.keys().next().value as string);
      geometryCache.set(key, { value: resolved.route, expiresAt: Date.now() + ROUTER_CACHE_TTL_MS });
    }
    return resolved;
  }).finally(() => geometryInFlight.delete(key));
  geometryInFlight.set(key, request);
  return request;
}

async function resolveRoadGeometryUncached(route: RoutePlan): Promise<RouteGeometryResolution> {
  if (route.points.length < 2) return { ok: false, reason: 'tooFewWaypoints' };
  if (route.points.length > MAX_WAYPOINTS) return { ok: false, reason: 'tooManyWaypoints' };
  if (route.points.some((point) => !isBahrainCoordinate(point))) return { ok: false, reason: 'outsideCoverage' };

  const coordinates = route.points.map((point) => `${point.longitude.toFixed(6)},${point.latitude.toFixed(6)}`).join(';');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${ROUTER_BASE_URL}/${coordinates}?overview=full&geometries=geojson&steps=false`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: 'routerUnavailable' };
    const payload = await response.json() as RouterResponse;
    const result = payload.routes?.[0];
    const rawGeometry = result?.geometry?.coordinates;
    const rawLegs = result?.legs;
    if (payload.code !== 'Ok' || !result) return { ok: false, reason: payload.code === 'NoRoute' ? 'noRoute' : 'invalidResponse' };
    if (!Array.isArray(rawGeometry) || !Array.isArray(rawLegs) || rawLegs.length !== route.points.length - 1) return { ok: false, reason: 'invalidResponse' };

    const geometry = simplifyGeometry(rawGeometry.map(toCoordinate).filter((point): point is Coordinate => point !== null), MAX_GEOMETRY_POINTS);
    const snapped = payload.waypoints?.map((waypoint) => toCoordinate(waypoint.location)).filter((point): point is Coordinate => point !== null) ?? [];
    const legs = rawLegs.map((leg) => Number(leg.distance));
    const totalDistanceM = Number(result.distance);
    if (geometry.length < 2 || legs.some((distance) => !Number.isFinite(distance) || distance <= 0) || !Number.isFinite(totalDistanceM) || totalDistanceM <= 0 || totalDistanceM / 1_000 > MAX_ROUTED_DISTANCE_KM) return { ok: false, reason: 'invalidResponse' };
    const geometryDistancesKm = cumulativeDistances(geometry);
    geometryDistancesKm[geometryDistancesKm.length - 1] = totalDistanceM / 1_000;

    let cumulativeM = 0;
    const anchoredPoints = snapped.length === route.points.length ? route.points.map((point, index) => ({ ...point, ...snapped[index] })) : route.points;
    const points = anchoredPoints.map((point, index) => {
      const next = index < anchoredPoints.length - 1 ? anchoredPoints[index + 1] : anchoredPoints[index - 1] ?? point;
      const distanceKm = index === 0 ? 0 : cumulativeM / 1_000;
      if (index < legs.length) cumulativeM += legs[index];
      return { ...point, distanceKm, headingDegrees: bearingDegrees(point, next) };
    });
    // The router's total is authoritative for the road-following trace. Keep
    // the final waypoint exactly aligned with it after any rounding.
    points[points.length - 1] = { ...points[points.length - 1], distanceKm: totalDistanceM / 1_000 };
    return { ok: true, route: {
        ...route,
        points,
        geometry,
        geometryDistancesKm,
        geometrySource: 'OpenStreetMap routed-bike preview · suitability audit pending',
        distanceKm: totalDistanceM / 1_000,
      } };
  } catch {
    return { ok: false, reason: 'routerUnavailable' };
  } finally {
    clearTimeout(timeout);
  }
}

const geometryCache = new Map<string, { expiresAt: number; value: RoutePlan }>();
const geometryInFlight = new Map<string, Promise<RouteGeometryResolution>>();
let routerWindowStartedAt = 0;
let routerWindowCalls = 0;

function takeRouterBudget(now = Date.now()) {
  if (now - routerWindowStartedAt >= 60_000) { routerWindowStartedAt = now; routerWindowCalls = 0; }
  if (routerWindowCalls >= ROUTER_CALLS_PER_MINUTE) return false;
  routerWindowCalls += 1;
  return true;
}

function routeFingerprint(route: RoutePlan) {
  return JSON.stringify({
    id: route.id,
    revision: route.revision ?? null,
    familyId: route.familyId ?? null,
    variantId: route.variantId ?? null,
    revisionId: route.revisionId ?? null,
    points: route.points.map((point) => `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`),
  });
}

function cumulativeDistances(points: Coordinate[]) {
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) distances.push(distances[index - 1] + coordinateDistanceKm(points[index - 1], points[index]));
  return distances;
}

function toCoordinate(value: unknown): Coordinate | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isBahrainCoordinate({ latitude, longitude })) return null;
  return { latitude, longitude };
}

function isBahrainCoordinate(point: Coordinate) {
  return point.latitude >= BAHRAIN_BOUNDS.minLatitude && point.latitude <= BAHRAIN_BOUNDS.maxLatitude && point.longitude >= BAHRAIN_BOUNDS.minLongitude && point.longitude <= BAHRAIN_BOUNDS.maxLongitude;
}

function bearingDegrees(from: Coordinate, to: Coordinate) {
  const y = Math.sin(radians(to.longitude - from.longitude)) * Math.cos(radians(to.latitude));
  const x = Math.cos(radians(from.latitude)) * Math.sin(radians(to.latitude)) - Math.sin(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.cos(radians(to.longitude - from.longitude));
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

const radians = (value: number) => (value * Math.PI) / 180;
const degrees = (value: number) => (value * 180) / Math.PI;
function coordinateDistanceKm(a: Coordinate, b: Coordinate) {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

/** Douglas–Peucker with a small geographic tolerance, capped for native/web rendering. */
function simplifyGeometry(points: Coordinate[], maxPoints: number) {
  if (points.length <= maxPoints) return points;
  const simplified = douglasPeucker(points, 0.000035);
  if (simplified.length <= maxPoints) return simplified;
  const stride = Math.ceil((simplified.length - 1) / (maxPoints - 1));
  return simplified.filter((_, index) => index === 0 || index === simplified.length - 1 || index % stride === 0);
}

function douglasPeucker(points: Coordinate[], tolerance: number): Coordinate[] {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maximum = tolerance;
    let index = -1;
    for (let cursor = start + 1; cursor < end; cursor += 1) {
      const distance = perpendicularDistance(points[cursor], points[start], points[end]);
      if (distance > maximum) { maximum = distance; index = cursor; }
    }
    if (index >= 0) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, index) => keep[index] === 1);
}

function perpendicularDistance(point: Coordinate, start: Coordinate, end: Coordinate) {
  const dx = end.longitude - start.longitude;
  const dy = end.latitude - start.latitude;
  if (dx === 0 && dy === 0) return Math.hypot(point.longitude - start.longitude, point.latitude - start.latitude);
  return Math.abs(dy * point.longitude - dx * point.latitude + end.longitude * start.latitude - end.latitude * start.longitude) / Math.hypot(dx, dy);
}

export const routerConfig = { baseUrl: ROUTER_BASE_URL, maxWaypoints: MAX_WAYPOINTS, maxGeometryPoints: MAX_GEOMETRY_POINTS, maxDistanceKm: MAX_ROUTED_DISTANCE_KM, cacheTtlMs: ROUTER_CACHE_TTL_MS, callsPerMinute: ROUTER_CALLS_PER_MINUTE };

export function clearRouteGeometryCache() { geometryCache.clear(); geometryInFlight.clear(); routerWindowStartedAt = 0; routerWindowCalls = 0; }

// Geometry is cacheable by coordinates, but route names, sources and evidence
// belong to the caller. Rebase those fields when a second route shares a shape
// so a cached candidate can never appear under another route's identity.
function rebaseCachedGeometry(cached: RoutePlan, route: RoutePlan): RoutePlan {
  return {
    ...route,
    points: route.points.map((point, index) => {
      const snapped = cached.points[index];
      return snapped ? { ...point, latitude: snapped.latitude, longitude: snapped.longitude, distanceKm: snapped.distanceKm, headingDegrees: snapped.headingDegrees } : point;
    }),
    geometry: cached.geometry,
    geometryDistancesKm: cached.geometryDistancesKm,
    geometrySource: cached.geometrySource,
    distanceKm: cached.distanceKm,
  };
}
