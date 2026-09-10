import assert from 'node:assert/strict';
import test from 'node:test';
import { NBH_LOOP } from './seed';
import {
  analyseSelectedRoute,
  beginRouteMatching,
  endActiveRide,
  liveRidePolicyGate,
  navigationPolicyGate,
  PHASE_0_DECISION_GATES,
  routeMatchingFailed,
  routeMatchingSucceeded,
  savePersonalRoute,
  selectRoute,
  startActiveRide,
  traceReady,
  validateRouteLifecycle,
} from './routeLifecycle';
import { createRouteRepository, routeAnalysisKey, routeRecordFromPlan } from './routeRepository';

const start = { latitude: 26.1, longitude: 50.5 };
const finish = { latitude: 26.11, longitude: 50.51 };

function routeRecord(overrides: Partial<Parameters<typeof routeRecordFromPlan>[1]> = {}) {
  return routeRecordFromPlan({ ...NBH_LOOP, id: 'drawn-test', name: 'Test route', points: [{ ...NBH_LOOP.points[0], ...start }, { ...NBH_LOOP.points[1], ...finish }], geometry: undefined, geometryDistancesKm: undefined, geometrySource: undefined }, {
    origin: 'drawn',
    ownership: 'personal',
    geometry: { kind: 'waypoint_trace', status: 'draft' },
    roadEvidenceStatus: 'unknown',
    provenance: { source: 'Drawn on device' },
    ...overrides,
  });
}

test('route lifecycle makes matching, saving, selection, analysis, snapshot, and end explicit', () => {
  const draft = routeRecord();
  assert.equal(validateRouteLifecycle(draft).state, 'validated');
  const matching = beginRouteMatching(draft);
  assert.equal(matching.state, 'matching');
  if (matching.state !== 'matching') throw new Error('Expected matching state');
  assert.deepEqual(matching.route.geometry.coordinates, []);

  const matchedPlan = { ...NBH_LOOP, id: draft.id, name: draft.name, points: draft.points, geometry: [start, { latitude: 26.105, longitude: 50.505 }, finish], geometryDistancesKm: [0, 0.7, 1.4], geometrySource: 'licensed road matcher' };
  const ready = routeMatchingSucceeded(matching.route, matchedPlan);
  assert.equal(ready.state, 'trace-ready');
  if (ready.state !== 'trace-ready') throw new Error('Expected trace-ready state');
  assert.equal(ready.route.origin, 'drawn');
  assert.equal(ready.route.geometry.kind, 'road_matched');
  assert.equal(ready.route.geometry.status, 'ready');
  assert.equal(ready.route.analysis, undefined);

  const saved = savePersonalRoute(ready.route);
  assert.equal(saved.state, 'saved-personal');
  if (saved.state !== 'saved-personal') throw new Error('Expected saved-personal state');
  const selected = selectRoute(saved.route);
  assert.equal(selected.state, 'selected');
  if (selected.state !== 'selected') throw new Error('Expected selected state');
  const analysed = analyseSelectedRoute(selected, '2026-09-09T14:40:00Z');
  assert.equal(analysed.state, 'analysis');

  const started = startActiveRide(analysed, '2026-09-09T14:41:00Z');
  assert.equal(started.ok, true);
  if (!started.ok) throw new Error('Expected active snapshot');
  assert.equal(started.state, 'active-snapshot');
  assert.equal(started.snapshot.routeRevision, analysed.route.revision);
  assert.equal(started.snapshot.route.geometry.coordinates.length, 3);
  assert.equal(started.snapshot.analysisKey, analysed.analysisKey);

  const explicitlyKeyed = startActiveRide(ready.route, '2026-09-09T14:42:00Z', undefined, { analysisKey: analysed.analysisKey });
  assert.equal(explicitlyKeyed.ok, true);
  if (!explicitlyKeyed.ok) throw new Error('Expected explicitly keyed active snapshot');
  assert.equal(explicitlyKeyed.snapshot.analysisKey, analysed.analysisKey);

  const ended = endActiveRide(started.snapshot, '2026-09-09T15:30:00Z');
  assert.equal(ended.state, 'ended');
  assert.equal(ended.snapshot.routeId, draft.id);
  assert.equal(ended.endedAt, '2026-09-09T15:30:00.000Z');
});

test('matching failure remains a recoverable waypoint trace and cannot enter Live Ride', () => {
  const matching = beginRouteMatching(routeRecord());
  if (matching.state !== 'matching') throw new Error('Expected matching state');
  const failed = routeMatchingFailed(matching.route, 'noRoute');
  assert.equal(failed.state, 'matching-failed');
  if (failed.state !== 'matching-failed') throw new Error('Expected matching failure');
  assert.equal(failed.reason, 'noRoute');
  assert.equal(failed.recoverable, true);
  assert.deepEqual(failed.recoveryActions, ['retry', 'edit-points']);
  assert.equal(failed.route.geometry.kind, 'waypoint_trace');
  assert.equal(failed.route.geometry.status, 'unavailable');
  assert.equal(savePersonalRoute(failed.route).state, 'matching-failed');
  assert.equal(liveRidePolicyGate(failed.route).allowed, false);
  assert.equal(navigationPolicyGate(failed.route).allowed, false);

  const reviewedOffGrid = traceReady(failed.route);
  assert.equal(reviewedOffGrid.route.geometry.status, 'ready');
  const unresolved = liveRidePolicyGate(reviewedOffGrid.route);
  assert.deepEqual(unresolved, { allowed: false, decision: 'blocked', reason: 'geometry_not_road_matched' });
  assert.equal(startActiveRide(reviewedOffGrid.route, '2026-09-09T14:40:00Z').ok, false);
  assert.equal(liveRidePolicyGate(reviewedOffGrid.route, 'deny').decision, 'blocked');
  assert.equal(liveRidePolicyGate(reviewedOffGrid.route, 'allow').allowed, false);
  assert.equal(navigationPolicyGate(reviewedOffGrid.route).allowed, false);
});

test('Live Ride requires explicitly ready road-matched geometry', () => {
  const recordedTrace = routeRecord({
    geometry: {
      kind: 'recorded_trace',
      status: 'ready',
    },
  });
  assert.deepEqual(liveRidePolicyGate(recordedTrace), {
    allowed: false,
    decision: 'blocked',
    reason: 'geometry_not_road_matched',
  });
  assert.equal(startActiveRide(recordedTrace, '2026-09-09T14:40:00Z').ok, false);

  const nonReadyStatuses = ['draft', 'matching', 'unavailable'] as const;
  for (const status of nonReadyStatuses) {
    const nonReadyRoadGeometry = routeRecord({
      geometry: {
        kind: 'road_matched',
        status,
      },
    });
    assert.deepEqual(liveRidePolicyGate(nonReadyRoadGeometry), {
      allowed: false,
      decision: 'blocked',
      reason: 'route_not_ready',
    });
    assert.equal(startActiveRide(nonReadyRoadGeometry, '2026-09-09T14:40:00Z').ok, false);
  }
});

test('more than 25 route waypoints returns an explicit edit/reduce recovery state', () => {
  const points = Array.from({ length: 26 }, (_, index) => ({ ...NBH_LOOP.points[index % NBH_LOOP.points.length], name: `Waypoint ${index}`, distanceKm: index }));
  const overloaded = routeRecordFromPlan({ ...NBH_LOOP, id: 'drawn-too-many', points, geometry: undefined, geometryDistancesKm: undefined, geometrySource: undefined }, {
    origin: 'drawn',
    ownership: 'personal',
    geometry: { kind: 'waypoint_trace', status: 'draft' },
    roadEvidenceStatus: 'unknown',
    provenance: { source: 'Drawn on device' },
  });
  const recovery = beginRouteMatching(overloaded);
  assert.equal(recovery.state, 'waypoint-limit-exceeded');
  if (recovery.state !== 'waypoint-limit-exceeded') throw new Error('Expected waypoint recovery');
  assert.equal(recovery.waypointCount, 26);
  assert.equal(recovery.maxWaypoints, 25);
  assert.deepEqual(recovery.recoveryActions, ['reduce-points', 'edit-points']);
  assert.equal(recovery.route.geometry.kind, 'waypoint_trace');
  assert.equal(recovery.route.geometry.status, 'unavailable');
  assert.equal(startActiveRide(recovery.route, '2026-09-09T14:40:00Z').ok, false);
});

test('repository selection and active snapshots are isolated from later route edits', () => {
  const route = routeRecordFromPlan({ ...NBH_LOOP, id: 'matched-repository', geometry: [start, finish], geometrySource: 'licensed road matcher' }, {
    origin: 'generated',
    ownership: 'personal',
    geometry: { kind: 'road_matched', status: 'ready', source: 'licensed road matcher' },
    roadEvidenceStatus: 'unknown',
    provenance: { source: 'Generated candidate' },
  });
  const repository = createRouteRepository([route]);
  const selected = repository.select(route.id);
  assert.equal(selected?.id, route.id);
  const snapshot = repository.setActiveRide(route, '2026-09-09T14:40:00Z');
  const edited = { ...route, revision: route.revision + 1, name: 'Edited route' };
  repository.upsert(edited);
  assert.equal(repository.getActiveRide()?.route.name, route.name);
  assert.equal(repository.getSelected()?.name, 'Edited route');
  assert.equal(snapshot.routeRevision, route.revision);
});

test('analysis key normalizes equivalent instants but changes with revision and keeps Bahrain zone', () => {
  const first = routeAnalysisKey('route', 1, '2026-09-09T14:40:00Z');
  const sameInstant = routeAnalysisKey('route', 1, '2026-09-09T17:40:00+03:00');
  const nextRevision = routeAnalysisKey('route', 2, '2026-09-09T14:40:00Z');
  assert.equal(first, sameInstant);
  assert.notEqual(first, nextRevision);
  assert.match(first, /Asia\/Bahrain/);
  assert.match(first, /2026-09-09T14:40:00\.000Z/);
});

test('phase 0 keeps unresolved owner policies as explicit decision gates', () => {
  assert.equal(PHASE_0_DECISION_GATES.arabicTypeface.status, 'decision_required');
  assert.equal(PHASE_0_DECISION_GATES.waypointTraceLiveRide.status, 'decision_required');
  assert.equal(PHASE_0_DECISION_GATES.bahrainTimePolicy.status, 'decision_required');
});
