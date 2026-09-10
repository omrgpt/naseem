import assert from "node:assert/strict";
import test from "node:test";
import type { AnalysisRun, RouteRecord } from "./domain";
import { buildRouteLayers, confidenceLabel } from "./routeConditions";

const route: RouteRecord = {
  id: "preview-route",
  name: "Preview route",
  origin: "pilot",
  ownership: "catalog",
  points: [],
  geometry: {
    kind: "recorded_trace",
    status: "ready",
    coordinates: [
      { latitude: 26.1, longitude: 50.5 },
      { latitude: 26.11, longitude: 50.51 },
    ],
  },
  roadEvidenceStatus: "pilot_pending",
  revision: 1,
  provenance: { source: "Test source" },
};

const analysis = {
  forecastConfidence: "medium",
  segments: [
    {
      wind: { kind: "headwind" },
      startDistanceKm: 0,
      endDistanceKm: 2,
    },
  ],
} as AnalysisRun;

test("route layers use plain route-line language without internal geometry or NBH IDs", () => {
  const layers = buildRouteLayers({
    route,
    analysis,
    match: {
      routeDistanceKm: 0,
      progress: 0,
      confidence: "low",
      state: "approaching",
      candidateCount: 1,
      timestamp: "2026-09-10T00:00:00.000Z",
      offCorridorKm: 0,
    },
  });
  const english = layers
    .map((layer) => `${layer.label} ${layer.detail} ${layer.accessibleLabel}`)
    .join(" ");
  const arabic = layers
    .map((layer) => `${layer.labelAr} ${layer.detailAr} ${layer.accessibleLabelAr}`)
    .join(" ");

  assert.doesNotMatch(english, /geometry|\bNBH\b/iu);
  assert.doesNotMatch(arabic, /هندسة|\bNBH\b/u);
  assert.match(english, /route line|route preview/iu);
  assert.match(arabic, /خط مسار|معاينة المسار/u);
  assert.match(english, /route progress has not started/iu);
  assert.match(arabic, /لم يبدأ تقدم المسار/u);
  assert.match(english, /Medium confidence/iu);
  assert.match(arabic, /ثقة متوسطة/u);
});

test("route layer confidence labels are rider-facing", () => {
  assert.equal(confidenceLabel("high"), "High confidence");
  assert.equal(confidenceLabel("medium"), "Medium confidence");
  assert.equal(confidenceLabel("low", true), "ثقة منخفضة");
});
