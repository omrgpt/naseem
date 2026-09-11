import assert from "node:assert/strict";
import test from "node:test";
import { COASTAL_LOOP } from "./seed";
import { routePlanHasAuthoritativeGeometry } from "./routeRepository";
import {
  routeGeometryKind,
  routeGeometryStatus,
  routeIsNavigable,
} from "./screenTypes";

test("bare legacy geometry stays unverified and cannot enable navigation", () => {
  const legacyPlan = {
    ...COASTAL_LOOP,
    id: "generated-legacy-geometry",
    source: "Generated route",
    geometry: [
      COASTAL_LOOP.points[0],
      COASTAL_LOOP.points.at(-1)!,
    ],
  };

  assert.equal(routeGeometryKind(legacyPlan), "waypoint_trace");
  assert.equal(routeGeometryStatus(legacyPlan), "draft");
  assert.equal(routeIsNavigable(legacyPlan), false);
});

test("road-ready labels without canonical evidence cannot enable navigation", () => {
  const incompleteRoadPlan = {
    ...COASTAL_LOOP,
    id: "generated-incomplete-road",
    source: "Generated route",
    geometry: [
      COASTAL_LOOP.points[0],
      COASTAL_LOOP.points.at(-1)!,
    ],
    geometryKind: "road_matched" as const,
    geometryStatus: "ready" as const,
  };

  assert.equal(routePlanHasAuthoritativeGeometry(incompleteRoadPlan), false);
  assert.equal(routeGeometryKind(incompleteRoadPlan), "waypoint_trace");
  assert.equal(routeGeometryStatus(incompleteRoadPlan), "unavailable");
  assert.equal(routeIsNavigable(incompleteRoadPlan), false);
});

test("explicit canonical evidence keeps a valid road plan navigable", () => {
  const points = [
    {
      ...COASTAL_LOOP.points[0],
      latitude: 26.1,
      longitude: 50.5,
      distanceKm: 0,
    },
    {
      ...COASTAL_LOOP.points[1],
      latitude: 26.11,
      longitude: 50.51,
      distanceKm: 1.4,
    },
  ];
  const readyRoadPlan = {
    ...COASTAL_LOOP,
    id: "generated-authoritative-road",
    source: "Generated route",
    points,
    geometry: points.map(({ latitude, longitude }) => ({ latitude, longitude })),
    geometryDistancesKm: [0, 1.4],
    legDistancesKm: [1.4],
    routedDistanceKm: 1.4,
    distanceKm: 1.4,
    geometrySource: "licensed road matcher",
    geometryKind: "road_matched" as const,
    geometryStatus: "ready" as const,
    distanceStatus: "authoritative" as const,
  };

  assert.equal(routePlanHasAuthoritativeGeometry(readyRoadPlan), true);
  assert.equal(routeIsNavigable(readyRoadPlan), true);
});
