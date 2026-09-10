import assert from 'node:assert/strict';
import test from 'node:test';
import type { RoutePlan } from './domain';
import {
  mapGeometryStatus,
  mapLineModel,
  mapLinePoints,
  mapMarkerPoints,
  mapSegmentIndexForLine,
  normalizeSelectedSegment,
} from './mapModel';

const suitability = { kind: 'unknown' as const, label: 'Unknown', evidence: 'No validation', source: 'test', confidence: 'low' as const };
const baseRoute: RoutePlan = {
  id: 'map-test', name: 'Map test', source: 'test', distanceKm: 10, departureLabel: '17:40', arrivalLabel: '18:05', durationMinutes: 25,
  recommendation: '', windSummary: { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 },
  segments: [], points: [
    { name: 'Start', latitude: 26.1, longitude: 50.5, distanceKm: 0, headingDegrees: 0, suitability },
    { name: 'Turn', latitude: 26.15, longitude: 50.5, distanceKm: 5, headingDegrees: 180, suitability },
    { name: 'Finish', latitude: 26.1, longitude: 50.5, distanceKm: 10, headingDegrees: 180, suitability },
  ],
};

test('road geometry maps by cumulative distance rather than point count', () => {
  const route = { ...baseRoute, geometryDistancesKm: [0, 1, 4, 6, 9, 10] };
  assert.equal(mapSegmentIndexForLine(route, 0, 6), 0);
  assert.equal(mapSegmentIndexForLine(route, 2, 6), 0);
  assert.equal(mapSegmentIndexForLine(route, 3, 6), 1);
  assert.equal(mapSegmentIndexForLine(route, 4, 6), 1);
});

test('dense route geometry is the map line instead of review points', () => {
  const geometry = [
    { latitude: 26.1, longitude: 50.5 },
    { latitude: 26.105, longitude: 50.51 },
    { latitude: 26.11, longitude: 50.5 },
  ];
  const route = { ...baseRoute, geometry };

  assert.deepEqual(mapLinePoints(route), geometry);
  assert.notDeepEqual(mapLinePoints(route), route.points);
  assert.equal(mapLineModel(route).roadMatched, true);
  assert.equal(mapLineModel(route).status, 'matched');
});

test('a stale matched request stays a preview when dense geometry is absent', () => {
  assert.equal(mapGeometryStatus(baseRoute, 'matched'), 'pilot');
  assert.equal(mapLineModel({ ...baseRoute }, 'matched').status, 'pilot');
});

test('loop markers represent the shared start and finish once', () => {
  const markers = mapMarkerPoints(baseRoute, baseRoute.points, false, 8);
  const startCoordinate = baseRoute.points[0];

  assert.equal(markers.filter((marker) => marker.isStart).length, 1);
  assert.equal(
    markers.filter(
      (marker) =>
        marker.coordinate.latitude === startCoordinate.latitude &&
        marker.coordinate.longitude === startCoordinate.longitude,
    ).length,
    1,
  );
  assert.equal(markers.some((marker) => marker.isEnd), false);
});

test('marker sampling preserves endpoints and representative dense-route points', () => {
  const points = Array.from({ length: 9 }, (_, index) => ({
    ...baseRoute.points[0],
    name: `Point ${index}`,
    latitude: 26.1 + index / 100,
    distanceKm: index / 2,
  }));
  const route = { ...baseRoute, points };
  const markers = mapMarkerPoints(route, points, false, 5);

  assert.deepEqual(
    markers.map((marker) => marker.sourceIndex),
    [0, 2, 4, 6, 8],
  );
});

test('focused segment mapping does not rewrite route or access evidence', () => {
  const route = {
    ...baseRoute,
    geometry: [
      { latitude: 26.1, longitude: 50.5 },
      { latitude: 26.12, longitude: 50.51 },
      { latitude: 26.15, longitude: 50.5 },
      { latitude: 26.1, longitude: 50.5 },
    ],
    geometryDistancesKm: [0, 2, 7, 10],
    points: [
      { ...baseRoute.points[0], suitability: { ...suitability, kind: 'dedicated' as const } },
      { ...baseRoute.points[1], suitability: { ...suitability, kind: 'mixed' as const } },
      { ...baseRoute.points[2], suitability: { ...suitability, kind: 'restricted' as const } },
    ],
  };
  const accessKindsBefore = route.points.map((point) => point.suitability.kind);
  const line = mapLinePoints(route);

  assert.equal(normalizeSelectedSegment(1), 1);
  assert.equal(mapSegmentIndexForLine(route, 1, line.length), 0);
  assert.deepEqual(route.points.map((point) => point.suitability.kind), accessKindsBefore);
  assert.deepEqual(mapLinePoints(route), line);
});

test('invalid focus indexes behave like no selection', () => {
  assert.equal(normalizeSelectedSegment(undefined), undefined);
  assert.equal(normalizeSelectedSegment(-1), undefined);
  assert.equal(normalizeSelectedSegment(2), 2);
});
