import assert from "node:assert/strict";
import test from "node:test";
import {
  parseActivities,
  serializeActivities,
  upsertActivity,
} from "./activityRepository";
import {
  createCompletionDraft,
  createRecordingOnlyCompletionDraft,
  createRecordingOnlySnapshot,
  markActivitySaved,
} from "./rideRecording";
import {
  createActiveRideSnapshot,
  routeRecordFromPlan,
} from "./routeRepository";
import { NBH_LOOP } from "./seed";

test("completion draft keeps route and forecast snapshots separate from later catalog edits", () => {
  const route = routeRecordFromPlan(
    { ...NBH_LOOP, departureAt: "2026-09-10T14:40:00Z" },
    {
      origin: "drawn",
      ownership: "personal",
      geometry: { kind: "road_matched", status: "ready" },
      roadEvidenceStatus: "sourced",
      provenance: { source: "Reviewed evidence" },
      familyId: "nbh-loop",
      variantId: "nbh-loop-standard-clockwise",
    },
  );
  const snapshot = createActiveRideSnapshot(route, "2026-09-10T14:40:00Z", {
    analysisKey: "analysis-key",
  });
  const draft = createCompletionDraft(snapshot, {
    endedAt: "2026-09-10T16:10:00Z",
    samples: [
      { coordinate: NBH_LOOP.points[0], timestamp: "2026-09-10T14:40:00Z" },
      { coordinate: NBH_LOOP.points[1], timestamp: "2026-09-10T14:50:00Z" },
    ],
    analysisSnapshot: route.analysis,
  });
  assert.equal(draft.plannedRouteRevision, route.revision);
  assert.equal(draft.completionState, "draft");
  assert.equal(draft.forecastSnapshot?.routeId, route.id);
  const saved = markActivitySaved(draft);
  assert.ok(saved.routeSnapshot);
  const changed = { ...saved.routeSnapshot, name: "Changed catalog name" };
  assert.equal(saved.routeSnapshot.name, "NBH Loop");
  assert.equal(changed.name, "Changed catalog name");
  const reloaded = parseActivities(
    serializeActivities(upsertActivity([], saved)),
  );
  assert.equal(reloaded[0].completionState, "saved");
  assert.ok(reloaded[0].routeSnapshot);
  assert.equal(reloaded[0].routeSnapshot.name, "NBH Loop");
});

test("recording-only completion does not invent a planned route", () => {
  const snapshot = createRecordingOnlySnapshot(
    "2026-09-10T14:40:00Z",
    "recording-only-test",
  );
  const draft = createRecordingOnlyCompletionDraft(snapshot, {
    endedAt: "2026-09-10T15:10:00Z",
    samples: [
      { coordinate: NBH_LOOP.points[0], timestamp: "2026-09-10T14:40:00Z" },
    ],
  });
  assert.equal(draft.plannedRouteId, null);
  assert.equal(draft.plannedRouteRevision, null);
  assert.equal(draft.routeSnapshot, null);
  assert.equal(
    parseActivities(serializeActivities([markActivitySaved(draft)])).at(0)
      ?.completionState,
    "saved",
  );
});
