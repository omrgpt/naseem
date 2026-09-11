import assert from 'node:assert/strict';
import test from 'node:test';
import type { RoutePlan } from './domain';
import * as mapModel from './mapModel';
import * as mapPreviewContract from './mapPreviewContract';
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
  const route = {
    ...baseRoute,
    geometry,
    geometryKind: 'road_matched' as const,
    geometryStatus: 'ready' as const,
  };

  assert.deepEqual(mapLinePoints(route), geometry);
  assert.notDeepEqual(mapLinePoints(route), route.points);
  assert.equal(mapLineModel(route).roadMatched, true);
  assert.equal(mapLineModel(route).status, 'matched');
});

test('metadata-less geometry stays a dashed preview instead of becoming road truth', () => {
  const route = {
    ...baseRoute,
    geometry: [
      { latitude: 26.1, longitude: 50.5 },
      { latitude: 26.105, longitude: 50.51 },
    ],
  };
  const model = mapLineModel(route, 'matched');

  assert.equal(model.roadMatched, false);
  assert.equal((model as { lineStyle?: string }).lineStyle, 'dashed');
  assert.equal(model.status, 'pilot');
});

test('metadata-less geometry never promotes the legacy status to matched', () => {
  const route = {
    ...baseRoute,
    geometry: [
      { latitude: 26.1, longitude: 50.5 },
      { latitude: 26.105, longitude: 50.51 },
    ],
  };

  assert.equal(mapGeometryStatus(route, 'pilot'), 'pilot');
});

test('unavailable geometry renders named points without any route line', () => {
  const route = {
    ...baseRoute,
    geometry: [
      { latitude: 26.1, longitude: 50.5 },
      { latitude: 26.105, longitude: 50.51 },
    ],
    geometryKind: 'waypoint_trace' as const,
    geometryStatus: 'unavailable' as const,
  };
  const model = mapLineModel(route);

  assert.deepEqual(model.linePoints, []);
  assert.equal((model as { lineStyle?: string }).lineStyle, 'none');
  assert.equal(model.roadMatched, false);
  assert.deepEqual(
    mapMarkerPoints(route, model.linePoints, model.roadMatched).map(
      (marker) => marker.routePoint.name,
    ),
    ['Start', 'Turn'],
  );
});

test('empty or missing geometry does not fall back to a straight route line', () => {
  assert.deepEqual(mapLinePoints({ ...baseRoute, geometry: [] }), []);
  assert.deepEqual(mapLinePoints(baseRoute), []);
  assert.equal(
    (mapLineModel({ ...baseRoute, geometry: [] }) as { lineStyle?: string })
      .lineStyle,
    'none',
  );
});

test('non-finite geometry coordinates cannot become a rendered line', () => {
  const route = {
    ...baseRoute,
    geometry: [
      { latitude: Number.NaN, longitude: 50.5 },
      { latitude: 26.105, longitude: Number.POSITIVE_INFINITY },
    ],
    geometryKind: 'road_matched' as const,
    geometryStatus: 'ready' as const,
  };
  const model = mapLineModel(route);

  assert.deepEqual(model.linePoints, []);
  assert.equal((model as { lineStyle?: string }).lineStyle, 'none');
  assert.equal(model.roadMatched, false);
});

test('malformed route points including null do not throw or become marker coordinates', () => {
  const validPoint = baseRoute.points[1];
  const route = {
    ...baseRoute,
    points: [
      null,
      { ...validPoint, latitude: 90 },
      validPoint,
    ] as unknown as RoutePlan['points'],
    geometry: [null, { latitude: 90, longitude: 50.5 }] as unknown as RoutePlan['geometry'],
  };

  assert.doesNotThrow(() => mapLineModel(route));
  const model = mapLineModel(route);
  assert.deepEqual(model.linePoints, []);
  assert.deepEqual(
    mapMarkerPoints(route, model.linePoints, model.roadMatched).map(
      (marker) => marker.routePoint.name,
    ),
    [validPoint.name],
  );
});

test('marker-only previews expose separate validated viewport points and bounds', () => {
  const mapDisplayPoints = (
    mapModel as typeof mapModel & {
      mapDisplayPoints?: (route: RoutePlan) => Array<{ latitude: number; longitude: number }>;
      mapViewportPoints?: (
        route: RoutePlan,
        linePoints?: Array<{ latitude: number; longitude: number }>,
      ) => Array<{ latitude: number; longitude: number }>;
    }
  ).mapDisplayPoints;
  const mapViewportPoints = (
    mapModel as typeof mapModel & {
      mapViewportPoints?: (
        route: RoutePlan,
        linePoints?: Array<{ latitude: number; longitude: number }>,
      ) => Array<{ latitude: number; longitude: number }>;
    }
  ).mapViewportPoints;
  const mapDisplayBounds = (
    mapPreviewContract as typeof mapPreviewContract & {
      mapDisplayBounds?: (points: readonly unknown[]) => {
        coordinates: Array<{ latitude: number; longitude: number }>;
        center: { latitude: number; longitude: number };
        latitudeDelta: number;
        longitudeDelta: number;
      };
    }
  ).mapDisplayBounds;
  assert.equal(typeof mapDisplayPoints, 'function');
  assert.equal(typeof mapViewportPoints, 'function');
  assert.equal(typeof mapDisplayBounds, 'function');
  if (!mapDisplayPoints || !mapViewportPoints || !mapDisplayBounds) return;

  const route = {
    ...baseRoute,
    geometry: undefined,
    points: [
      { ...baseRoute.points[0], latitude: 26.1, longitude: 50.4 },
      { ...baseRoute.points[1], latitude: 26.2, longitude: 50.7 },
    ],
  };
  const linePoints = mapLineModel(route).linePoints;
  const displayPoints = mapDisplayPoints(route);
  const viewportPoints = mapViewportPoints(route, linePoints);
  const bounds = mapDisplayBounds(viewportPoints);

  assert.deepEqual(linePoints, []);
  assert.deepEqual(viewportPoints, displayPoints);
  assert.deepEqual(bounds.coordinates, displayPoints);
  assert.deepEqual(bounds.center, { latitude: 26.15, longitude: 50.55 });
  assert.ok(Number.isFinite(bounds.latitudeDelta));
  assert.ok(Number.isFinite(bounds.longitudeDelta));
  assert.ok(bounds.latitudeDelta > 0);
  assert.ok(bounds.longitudeDelta > 0);
});

test('geometry status keeps unavailable, draft, matching, and empty states distinct', () => {
  const unavailable = mapLineModel({
    ...baseRoute,
    geometryKind: 'waypoint_trace' as const,
    geometryStatus: 'unavailable' as const,
  } as RoutePlan & { geometryKind: 'waypoint_trace'; geometryStatus: 'unavailable' });
  const draft = mapLineModel({
    ...baseRoute,
    geometry: [baseRoute.points[0], baseRoute.points[1]],
    geometryKind: 'road_matched' as const,
    geometryStatus: 'draft' as const,
  } as RoutePlan & { geometryKind: 'road_matched'; geometryStatus: 'draft' });
  const matching = mapLineModel({
    ...baseRoute,
    geometryKind: 'road_matched' as const,
    geometryStatus: 'matching' as const,
  } as RoutePlan & { geometryKind: 'road_matched'; geometryStatus: 'matching' });
  const empty = mapLineModel({ ...baseRoute, geometry: [] });

  assert.equal(unavailable.status as string, 'unavailable');
  assert.equal(draft.status as string, 'draft');
  assert.equal(matching.status as string, 'loading');
  assert.equal(empty.status as string, 'empty');
});

test('a stale matched request stays a preview when dense geometry is absent', () => {
  assert.equal(mapGeometryStatus(baseRoute, 'matched'), 'pilot');
  assert.equal(mapLineModel({ ...baseRoute }, 'matched').status, 'empty');
});

test('recorded geometry stays a dashed preview even when it has coordinates', () => {
  const route = {
    ...baseRoute,
    geometry: [
      { latitude: 26.2, longitude: 50.6 },
      { latitude: 26.22, longitude: 50.61 },
      { latitude: 26.2, longitude: 50.6 },
    ],
    geometryKind: 'recorded_trace' as const,
  };

  assert.equal(mapLineModel(route, 'matched').roadMatched, false);
  assert.equal(mapLineModel(route, 'matched').lineStyle, 'dashed');
  assert.equal(mapLineModel(route, 'matched').status, 'pilot');
  assert.deepEqual(mapMarkerPoints(route)[0]?.coordinate, route.points[0]);
});

test('point-only drawn previews stay dashed without becoming road geometry', () => {
  const route = {
    ...baseRoute,
    source: 'Drawn on device',
    geometry: undefined,
  };
  const model = mapLineModel(route);

  assert.deepEqual(
    model.linePoints,
    baseRoute.points.map(({ latitude, longitude }) => ({ latitude, longitude })),
  );
  assert.equal(model.lineStyle, 'dashed');
  assert.equal(model.roadMatched, false);
});

test('non-ready road geometry cannot render as a solid route', () => {
  const route = {
    ...baseRoute,
    geometry: [
      { latitude: 26.2, longitude: 50.6 },
      { latitude: 26.22, longitude: 50.61 },
    ],
    geometryKind: 'road_matched' as const,
    geometryStatus: 'matching' as const,
  };

  assert.equal(mapLineModel(route, 'matched').roadMatched, false);
  assert.equal(mapLineModel(route, 'matched').lineStyle, 'dashed');
  assert.equal(mapLineModel(route, 'matched').status, 'loading');
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
