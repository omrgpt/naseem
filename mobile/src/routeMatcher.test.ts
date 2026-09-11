import assert from 'node:assert/strict';
import test from 'node:test';
import { createStatefulRouteMatcher, distanceToRouteEntryKm, matchRoutePosition } from './routeMatcher';
import { NBH_LOOP } from './seed';

function readyRoadRoute() {
  return {
    ...NBH_LOOP,
    geometryKind: 'road_matched' as const,
    geometryStatus: 'ready' as const,
    distanceStatus: 'authoritative' as const,
    geometrySource: 'reviewed road geometry',
    geometry: NBH_LOOP.points.map(({ latitude, longitude }) => ({ latitude, longitude })),
    geometryDistancesKm: NBH_LOOP.points.map((point) => point.distanceKm),
  };
}

test('a rider away from NBH is never treated as matched to the corridor', () => {
  const coordinate = { latitude: 26.2235, longitude: 50.5876 };
  const route = readyRoadRoute();
  const result = matchRoutePosition(route, coordinate, { accuracyMeters: 12, timestamp: '2026-09-10T14:40:00Z', referenceAt: '2026-09-10T14:40:00Z' });
  assert.ok(distanceToRouteEntryKm(route, coordinate) > 20);
  assert.equal(result.state, 'off-corridor');
  assert.equal(result.progress, 0);
});

test('shared loop start-finish geometry preserves ambiguity', () => {
  const route = readyRoadRoute();
  const result = matchRoutePosition(route, route.points[0], { accuracyMeters: 10, timestamp: '2026-09-10T14:40:00Z', referenceAt: '2026-09-10T14:40:00Z' });
  assert.equal(result.state, 'uncertain');
  assert.equal(result.candidateCount, 2);
  assert.equal(result.progress, 0);
});

test('stateful matcher holds reverse movement until sustained evidence', () => {
  const route = readyRoadRoute();
  const matcher = createStatefulRouteMatcher(route);
  const forward = matcher.update(route.points[2], { accuracyMeters: 10, timestamp: '2026-09-10T14:40:00Z' });
  const firstBack = matcher.update(route.points[1], { accuracyMeters: 10, timestamp: '2026-09-10T14:41:00Z' });
  const secondBack = matcher.update(route.points[1], { accuracyMeters: 10, timestamp: '2026-09-10T14:42:00Z' });
  const sustainedBack = matcher.update(route.points[1], { accuracyMeters: 10, timestamp: '2026-09-10T14:43:00Z' });
  assert.equal(forward.progress, firstBack.progress);
  assert.equal(firstBack.state, 'uncertain');
  assert.equal(secondBack.state, 'uncertain');
  assert.ok(sustainedBack.progress < forward.progress);
});

test('stale location is explicit', () => {
  const route = readyRoadRoute();
  const result = matchRoutePosition(route, route.points[1], { accuracyMeters: 10, timestamp: '2026-09-10T14:40:00Z', referenceAt: '2026-09-10T14:42:00Z' });
  assert.equal(result.state, 'stale');
  assert.equal(result.confidence, 'low');
});

test('unavailable waypoint traces cannot produce a route position match', () => {
  const route = {
    ...readyRoadRoute(),
    geometryKind: 'waypoint_trace' as const,
    geometryStatus: 'unavailable' as const,
    distanceStatus: 'provisional' as const,
  };

  const result = matchRoutePosition(route, route.points[1], { accuracyMeters: 10, timestamp: '2026-09-10T14:40:00Z' });

  assert.equal(result.state, 'uncertain');
  assert.equal(result.confidence, 'low');
  assert.equal(result.candidateCount, 0);
  assert.equal(result.progress, 0);
  assert.equal(result.routeDistanceKm, 0);
});

test('stateful matcher keeps the reviewed route when the caller edits its plan object', () => {
  const route = readyRoadRoute();
  const matcher = createStatefulRouteMatcher(route);
  const first = matcher.update(route.points[2], { accuracyMeters: 10, timestamp: '2026-09-10T14:40:00Z' });
  route.geometry = [{ latitude: 26.4, longitude: 50.8 }, { latitude: 26.41, longitude: 50.81 }];
  route.geometryDistancesKm = [0, 1];
  route.distanceKm = 1;

  const afterEdit = matcher.update(route.points[2], { accuracyMeters: 10, timestamp: '2026-09-10T14:41:00Z' });

  assert.equal(afterEdit.state, 'matched');
  assert.equal(afterEdit.progress, first.progress);
});

test('ready road metadata with invalid geometry endpoints cannot produce a position match', () => {
  const route = {
    ...readyRoadRoute(),
    geometry: [
      { latitude: 26.4, longitude: 50.8 },
      { latitude: 26.41, longitude: 50.81 },
    ],
    geometryDistancesKm: [0, 21.8],
  };

  const result = matchRoutePosition(route, route.points[1], { accuracyMeters: 10, timestamp: '2026-09-10T14:40:00Z' });

  assert.equal(result.state, 'uncertain');
  assert.equal(result.candidateCount, 0);
  assert.equal(result.routeDistanceKm, 0);
});

test('position matcher uses the routed total as the canonical progress distance', () => {
  const base = readyRoadRoute();
  const route = {
    ...base,
    points: base.points.slice(0, 4),
    geometry: base.geometry?.slice(0, 4),
    geometryDistancesKm: base.geometryDistancesKm?.slice(0, 4),
    distanceKm: 17.4,
    routedDistanceKm: 17.499,
  };

  const result = matchRoutePosition(route, route.points.at(-1)!, { accuracyMeters: 10, timestamp: '2026-09-10T14:40:00Z' });

  assert.equal(result.state, 'matched');
  assert.equal(result.progress, 1);
  assert.equal(result.routeDistanceKm, 17.499);
});
