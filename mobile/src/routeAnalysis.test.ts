import assert from "node:assert/strict";
import test from "node:test";
import {
  aheadWindow,
  analyseRouteRevision,
  compareDepartures,
  explainRun,
  remainingOrderedSegments,
} from "./routeAnalysis";
import { routeRecordFromPlan } from "./routeRepository";
import { NBH_LOOP } from "./seed";

test("NBH analysis keeps family, variant, revision, named segments, and suppresses low-confidence ranking", () => {
  const route = routeRecordFromPlan(NBH_LOOP, {
    origin: "pilot",
    ownership: "catalog",
    geometry: { kind: "recorded_trace", status: "ready" },
    roadEvidenceStatus: "pilot_pending",
    provenance: { source: "Bahrain Tourism" },
    familyId: "nbh-loop",
    variantId: "nbh-loop-standard-clockwise",
    revisionId: "nbh-loop-standard-clockwise-r1",
  });
  const result = analyseRouteRevision({
    route,
    departureAt: "2026-09-10T14:40:00Z",
    wind: { speed: 18, directionFrom: 330, gusts: 29 },
    hourlyWind: [
      {
        time: "2026-09-10T14:40:00Z",
        speed: 18,
        directionFrom: 330,
        gusts: 29,
      },
    ],
    forecastRunAt: "2026-09-10T12:00:00Z",
  });
  assert.equal(result.plan.name, "NBH Loop");
  assert.equal(result.plan.distanceKm, 21.8);
  assert.equal(result.run.variantId, "nbh-loop-standard-clockwise");
  assert.equal(result.run.routeRevision, route.revision);
  assert.equal(result.run.ranking, "suppressed");
  assert.ok(
    result.run.segments.every(
      (segment) =>
        segment.endDistanceKm >= segment.startDistanceKm && segment.name,
    ),
  );
  assert.match(explainRun(result.run), /paused/i);
});

test("departure comparison only marks a winner when route and forecast evidence support ranking", () => {
  const route = routeRecordFromPlan(
    {
      ...NBH_LOOP,
      geometry: NBH_LOOP.points.map(({ latitude, longitude }) => ({
        latitude,
        longitude,
      })),
    },
    {
      origin: "drawn",
      ownership: "personal",
      geometry: {
        kind: "road_matched",
        status: "ready",
        source: "reviewed router",
      },
      roadEvidenceStatus: "sourced",
      provenance: { source: "Reviewed route evidence" },
      familyId: "nbh-loop",
      variantId: "nbh-loop-standard-clockwise",
    },
  );
  const options = {
    wind: { speed: 18, directionFrom: 330, gusts: 29 },
    hourlyWind: [
      {
        time: "2026-09-10T14:40:00Z",
        speed: 18,
        directionFrom: 330,
        gusts: 29,
      },
      {
        time: "2026-09-10T15:40:00Z",
        speed: 12,
        directionFrom: 150,
        gusts: 18,
      },
    ],
    forecastRunAt: "2026-09-10T12:00:00Z",
  };
  const comparison = compareDepartures(
    route,
    ["2026-09-10T14:40:00Z", "2026-09-10T15:40:00Z"],
    options,
  );
  assert.equal(comparison.filter((item) => item.selected).length, 1);
  assert.ok(comparison.every((item) => item.run.ranking === "enabled"));
  assert.doesNotMatch(explainRun(comparison[0].run), /return/i);
});

test("ahead and remaining windows follow ordered route distance", () => {
  const route = routeRecordFromPlan(NBH_LOOP, {
    origin: "pilot",
    ownership: "catalog",
    geometry: { kind: "recorded_trace", status: "ready" },
    roadEvidenceStatus: "pilot_pending",
    provenance: { source: "Bahrain Tourism" },
    familyId: "nbh-loop",
    variantId: "nbh-loop-standard-clockwise",
    revisionId: "nbh-loop-standard-clockwise-r1",
  });
  const { run } = analyseRouteRevision({
    route,
    departureAt: "2026-09-10T14:40:00Z",
  });
  assert.equal(aheadWindow(run, 4.4, 3)[0]?.name, "Eastern turn");
  const remaining = remainingOrderedSegments(run, 4.4);
  assert.equal(remaining[0]?.name, "Eastern turn");
  assert.equal(remaining.at(-1)?.name, "Finish · Zallaq");
});
