import assert from "node:assert/strict";
import test from "node:test";
import * as repository from "./activityRepository";
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

test("pending draft hydration keeps draft and save-failed rides recoverable", () => {
  const parsePending = (repository as unknown as Record<string, unknown>)
    .parsePendingActivity as ((raw: string | null) => ActivityDraftLike | null) | undefined;
  const serializePending = (repository as unknown as Record<string, unknown>)
    .serializePendingActivity as ((draft: ActivityDraftLike) => string) | undefined;
  assert.equal(typeof parsePending, "function");
  assert.equal(typeof serializePending, "function");
  const snapshot = createRecordingOnlySnapshot("2026-09-10T14:00:00.000Z", "pending-test");
  const draft = createRecordingOnlyCompletionDraft(snapshot, {
    endedAt: "2026-09-10T14:10:00.000Z",
  });
  const failed = { ...draft, completionState: "save_failed" as const };
  assert.equal(parsePending?.(serializePending?.(draft) ?? "")?.id, draft.id);
  assert.equal(parsePending?.(serializePending?.(failed) ?? "")?.id, draft.id);
  assert.equal(
    parsePending?.(serializeActivities([markActivitySaved(draft)])),
    null,
  );
});

test("discarded drafts leave the temporary local recovery inbox", () => {
  const isRecoverable = (repository as unknown as Record<string, unknown>)
    .isRecoverableActivity as ((activity: { completionState: string }) => boolean) | undefined;
  assert.equal(typeof isRecoverable, "function");
  const snapshot = createRecordingOnlySnapshot("2026-09-10T14:00:00.000Z", "discard-test");
  const draft = createRecordingOnlyCompletionDraft(snapshot, {
    endedAt: "2026-09-10T14:10:00.000Z",
  });
  assert.equal(isRecoverable?.(draft), true);
  assert.equal(isRecoverable?.({ ...draft, completionState: "save_failed" }), true);
  assert.equal(isRecoverable?.({ ...draft, completionState: "discarded" }), false);
  assert.equal(isRecoverable?.({ ...draft, completionState: "saved" }), false);
});

test("saved rides can be opened by id without exposing mutable stored snapshots", () => {
  const openSaved = (repository as unknown as Record<string, unknown>)
    .openSavedActivity as
    | ((activities: ActivityDraftLike[], id: string) => ActivityDraftLike | null)
    | undefined;
  assert.equal(typeof openSaved, "function");
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
  const draft = markActivitySaved(
    createCompletionDraft(snapshot, {
      endedAt: "2026-09-10T16:10:00Z",
      analysisSnapshot: route.analysis,
    }),
  );
  const opened = openSaved?.([draft], draft.id);
  assert.equal(opened?.id, draft.id);
  assert.notEqual(opened, draft);
  assert.notEqual(opened?.routeSnapshot, draft.routeSnapshot);
  if (opened?.routeSnapshot) opened.routeSnapshot.name = "Changed after open";
  assert.equal(draft.routeSnapshot?.name, "NBH Loop");
  assert.equal(openSaved?.([draft], "missing"), null);
});

test("activity hydration rejects unknown lifecycle states instead of showing a broken draft", () => {
  const snapshot = createRecordingOnlySnapshot("2026-09-10T14:00:00.000Z", "invalid-state-test");
  const draft = createRecordingOnlyCompletionDraft(snapshot, {
    endedAt: "2026-09-10T14:10:00.000Z",
  });
  const raw = JSON.stringify({
    version: 1,
    activities: [{ ...draft, completionState: "unknown" }],
  });
  assert.deepEqual(parseActivities(raw), []);
});

type ActivityDraftLike = ReturnType<typeof createRecordingOnlyCompletionDraft>;
