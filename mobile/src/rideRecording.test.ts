import assert from "node:assert/strict";
import test from "node:test";
import { countLocationGaps, createRecordingOnlyCompletionDraft, createRecordingOnlySnapshot } from "./rideRecording";

test("countLocationGaps ignores normal watcher intervals and counts sparse samples", () => {
  const samples = [
    { coordinate: { latitude: 26.1, longitude: 50.5 }, timestamp: "2026-09-10T14:00:00.000Z" },
    { coordinate: { latitude: 26.101, longitude: 50.501 }, timestamp: "2026-09-10T14:00:15.000Z" },
    { coordinate: { latitude: 26.102, longitude: 50.502 }, timestamp: "2026-09-10T14:01:30.000Z" },
    { coordinate: { latitude: 26.103, longitude: 50.503 }, timestamp: "2026-09-10T14:01:46.000Z" },
  ];
  assert.equal(countLocationGaps(samples), 1);
});

test("recording-only completion keeps route context empty", () => {
  const snapshot = createRecordingOnlySnapshot("2026-09-10T14:00:00.000Z", "recording-test");
  const draft = createRecordingOnlyCompletionDraft(snapshot, {
    endedAt: "2026-09-10T14:10:00.000Z",
    samples: [],
    matchHistory: [],
  });
  assert.equal(draft.routeSnapshot, null);
  assert.equal(draft.plannedRouteId, null);
});
