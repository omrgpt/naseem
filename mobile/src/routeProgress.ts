import type { Coordinate, RoutePlan } from './domain';

export type RoutePosition = { progress: number; offRouteKm: number };

/** Project a GPS fix onto the nearest route segment in local metres.
 * Previous progress breaks ties at a loop's shared start/finish. Stateful
 * callers apply any monotonic/reverse hysteresis around this projection.
 */
export function routeProgress(route: RoutePlan, location: Coordinate, previousProgress = 0): RoutePosition {
  const line = route.geometry?.length && route.geometryDistancesKm?.length === route.geometry.length ? route.geometry : route.points;
  const distances = line === route.points ? route.points.map((point) => point.distanceKm) : route.geometryDistancesKm!;
  if (line.length < 2) return { progress: 0, offRouteKm: 0 };
  const latitudeScale = 110.574;
  const longitudeScale = 111.32 * Math.cos((location.latitude * Math.PI) / 180);
  const candidates: Array<{ distance: number; alongKm: number }> = [];
  for (let index = 1; index < line.length; index += 1) {
    const from = line[index - 1];
    const to = line[index];
    const ax = (from.longitude - location.longitude) * longitudeScale;
    const ay = (from.latitude - location.latitude) * latitudeScale;
    const bx = (to.longitude - location.longitude) * longitudeScale;
    const by = (to.latitude - location.latitude) * latitudeScale;
    const dx = bx - ax;
    const dy = by - ay;
    const denominator = dx * dx + dy * dy;
    const fraction = denominator === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denominator));
    const distance = Math.sqrt((ax + dx * fraction) ** 2 + (ay + dy * fraction) ** 2);
    candidates.push({ distance, alongKm: distances[index - 1] + (distances[index] - distances[index - 1]) * fraction });
  }
  const nearestDistance = Math.min(...candidates.map((candidate) => candidate.distance));
  const tieCandidates = candidates.filter((candidate) => candidate.distance <= nearestDistance + 0.03);
  const minimumForwardKm = previousProgress * route.distanceKm - 0.05;
  const forward = tieCandidates.filter((candidate) => candidate.alongKm >= minimumForwardKm);
  const selected = (forward.length ? forward : tieCandidates).sort((a, b) => Math.abs(a.alongKm - previousProgress * route.distanceKm) - Math.abs(b.alongKm - previousProgress * route.distanceKm))[0] ?? candidates[0];
  // The local projection scales degrees to kilometres, so the nearest
  // distance already matches the `offRouteKm` contract used by the live UI.
  return { progress: Math.max(0, Math.min(1, selected.alongKm / Math.max(route.distanceKm, 1))), offRouteKm: selected.distance };
}

export function segmentIndexForProgress(route: RoutePlan, progress: number) {
  if (!route.segments.length) return -1;
  const travelledKm = progress * route.distanceKm;
  const next = route.points.slice(1).findIndex((point) => point.distanceKm > travelledKm);
  return next === -1 ? route.segments.length - 1 : Math.max(0, next);
}
