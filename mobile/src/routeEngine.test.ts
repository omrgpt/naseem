import assert from 'node:assert/strict';
import test from 'node:test';
import { adjustedSpeedKph, analyseRoute, windComponents } from './routeEngine';
import type { RoutePlan } from './domain';

const suitability = { kind: 'unknown' as const, label: 'Unknown', evidence: 'No validation', source: 'test', confidence: 'low' as const };
const route: RoutePlan = { id: 'test', name: 'Test', source: 'test', distanceKm: 10, geometryKind: 'road_matched', geometryStatus: 'ready', distanceStatus: 'authoritative', geometrySource: 'reviewed road geometry', geometry: [
  { latitude: 26.1, longitude: 50.5 },
  { latitude: 26.145, longitude: 50.5 },
  { latitude: 26.19, longitude: 50.5 },
], geometryDistancesKm: [0, 5, 10], departureLabel: '17:40', arrivalLabel: '18:05', durationMinutes: 25, recommendation: '', windSummary: { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 }, segments: [], points: [
  { name: 'Start', latitude: 26.1, longitude: 50.5, distanceKm: 0, headingDegrees: 0, suitability },
  { name: 'Middle', latitude: 26.145, longitude: 50.5, distanceKm: 5, headingDegrees: 180, suitability },
  { name: 'Finish', latitude: 26.19, longitude: 50.5, distanceKm: 10, headingDegrees: 180, suitability },
] };

test('wind vector identifies cardinal headwind and tailwind without double penalty', () => {
  const components = windComponents(0, { speed: 20, directionFrom: 0 });
  assert.equal(Math.round(components.headwindKph), 20);
  assert.equal(Math.round(adjustedSpeedKph(26, components)), 22);
});

test('route analysis selects a new hourly wind snapshot for a later segment', () => {
  const today = new Date();
  today.setHours(17, 40, 0, 0);
  const nextHour = new Date(today.getTime() + 20 * 60_000);
  const result = analyseRoute(route, 26, 0, undefined, [
    { time: today.toISOString(), speed: 20, directionFrom: 0, gusts: 20 },
    { time: nextHour.toISOString(), speed: 20, directionFrom: 0, gusts: 20 },
  ]);
  assert.notEqual(result.segments[0].wind.kind, result.segments[1].wind.kind);
});

test('unavailable waypoint traces keep only provisional distance and no final metrics', () => {
  const unresolved = {
    ...route,
    geometryKind: 'waypoint_trace' as const,
    geometryStatus: 'unavailable' as const,
    distanceStatus: 'provisional' as const,
    provisionalDistanceKm: 10,
  };

  const result = analyseRoute(unresolved, 26, 0, undefined, [], new Date('2026-09-10T14:40:00Z'));

  assert.equal(result.distanceStatus, 'provisional');
  assert.equal(result.provisionalDistanceKm, 10);
  assert.equal(result.durationMinutes, 0);
  assert.equal(result.departureAt, undefined);
  assert.equal(result.arrivalAt, undefined);
  assert.deepEqual(result.segments, []);
  assert.deepEqual(result.windSummary, { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 });
});

test('road analysis requires explicit authoritative readiness metadata', () => {
  const incomplete = { ...route, distanceStatus: undefined };

  const result = analyseRoute(incomplete, 26, 0, undefined, [], new Date('2026-09-10T14:40:00Z'));

  assert.equal(result.durationMinutes, 0);
  assert.equal(result.departureAt, undefined);
  assert.deepEqual(result.segments, []);
  assert.equal(result.distanceStatus, 'provisional');
});

test('invalid ready-road geometry is downgraded when final metrics are removed', () => {
  const invalidReadyRoad = {
    ...route,
    geometry: [
      { latitude: 26.4, longitude: 50.8 },
      { latitude: 26.41, longitude: 50.81 },
    ],
    geometryDistancesKm: [0, 10],
  };

  const result = analyseRoute(invalidReadyRoad, 26, 0, undefined, [], new Date('2026-09-10T14:40:00Z'));

  assert.equal(result.geometryKind, 'waypoint_trace');
  assert.equal(result.geometryStatus, 'unavailable');
  assert.equal(result.distanceStatus, 'provisional');
  assert.equal(result.geometry, undefined);
  assert.equal(result.geometryDistancesKm, undefined);
  assert.equal(result.geometrySource, undefined);
  assert.equal(result.durationMinutes, 0);
  assert.equal(result.departureAt, undefined);
  assert.equal(result.arrivalAt, undefined);
});

test('recorded traces retain named preview sections but suppress final ETA and wind split', () => {
  const recorded = {
    ...route,
    geometryKind: 'recorded_trace' as const,
    distanceStatus: 'provisional' as const,
  };

  const result = analyseRoute(recorded, 26, 0, undefined, [], new Date('2026-09-10T14:40:00Z'));

  assert.ok(result.segments.length > 0);
  assert.equal(result.durationMinutes, 0);
  assert.equal(result.departureAt, undefined);
  assert.equal(result.arrivalAt, undefined);
  assert.deepEqual(result.windSummary, { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 });
  assert.equal(result.distanceStatus, 'provisional');
});
