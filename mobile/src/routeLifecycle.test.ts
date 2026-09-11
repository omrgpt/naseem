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
  routeIsNavigable,
  routeMatchingFailed,
  routeMatchingSucceeded,
  savePersonalRoute,
  selectRoute,
  startActiveRide,
  traceReady,
  validateRouteLifecycle,
} from './routeLifecycle';
import { createRouteRepository, routeAnalysisKey, routePlanHasAuthoritativeGeometry, routeRecordFromPlan } from './routeRepository';
import { routePlanFromRecord } from './routeRepository';
import * as routeLifecycle from './routeLifecycle';

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

  const matchedPlan = { ...NBH_LOOP, id: draft.id, familyId: undefined, variantId: undefined, revisionId: undefined, revision: matching.route.revision, name: draft.name, points: draft.points.map((point, index) => ({ ...point, distanceKm: index === 0 ? 0 : 1.4 })), geometryKind: 'road_matched' as const, geometryStatus: 'ready' as const, distanceStatus: 'authoritative' as const, geometry: [start, { latitude: 26.105, longitude: 50.505 }, finish], geometryDistancesKm: [0, 0.7, 1.4], geometrySource: 'licensed road matcher', distanceKm: 1.4 };
  const ready = routeMatchingSucceeded(matching.route, matchedPlan);
  assert.equal(ready.state, 'trace-ready');
  if (ready.state !== 'trace-ready') throw new Error('Expected trace-ready state');
  assert.equal(ready.route.origin, 'drawn');
  assert.equal(ready.route.geometry.kind, 'road_matched');
  assert.equal(ready.route.geometry.status, 'ready');
  assert.equal(ready.route.analysis, undefined);

  const invalidPointIndex = {
    ...matchedPlan,
    points: matchedPlan.points.map((point) => ({ ...point, distanceKm: 0 })),
  };
  const invalidReady = routeMatchingSucceeded(matching.route, invalidPointIndex);
  assert.equal(invalidReady.state, 'matching-failed');

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

  const revalidated = validateRouteLifecycle(failed.route);
  assert.equal(revalidated.state, 'matching-failed');
  assert.equal(revalidated.route.revision, failed.route.revision);
  const reselected = selectRoute(failed.route);
  assert.equal(reselected.state, 'matching-failed');
  assert.equal(reselected.route.revision, failed.route.revision);

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
  assert.equal(routeIsNavigable(recordedTrace), false);

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
    assert.equal(routeIsNavigable(nonReadyRoadGeometry), false);
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

test('matching failure clears stale final metrics while preserving provisional waypoint distance', () => {
  const matching = beginRouteMatching(routeRecord());
  if (matching.state !== 'matching') throw new Error('Expected matching state');
  const withStaleMetrics = {
    ...matching.route,
    analysis: {
      distanceKm: 12,
      departureLabel: '17:40',
      arrivalLabel: '18:10',
      durationMinutes: 30,
      recommendation: 'Use this route',
      segments: [],
      windSummary: { tailwindPercent: 50, headwindPercent: 25, crosswindPercent: 25 },
    },
  };

  const failed = routeMatchingFailed(withStaleMetrics, 'noRoute');
  const plan = routePlanFromRecord(failed.route);

  assert.equal(failed.route.analysis, undefined);
  assert.equal(plan.distanceStatus, 'provisional');
  assert.equal(plan.provisionalDistanceKm, failed.route.provisionalDistanceKm);
  assert.equal(plan.durationMinutes, 0);
  assert.equal(plan.departureAt, undefined);
  assert.equal(plan.arrivalAt, undefined);
  assert.deepEqual(plan.segments, []);
  assert.deepEqual(plan.windSummary, { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 });
});

test('a stale match from before endpoint editing cannot promote the edited route', () => {
  const original = routeRecord();
  const matching = beginRouteMatching(original);
  if (matching.state !== 'matching') throw new Error('Expected matching state');
  const edited = beginRouteMatching({
    ...matching.route,
    revision: matching.route.revision + 1,
    points: [
      { ...matching.route.points[0], latitude: 26.2, longitude: 50.6 },
      { ...matching.route.points[1], latitude: 26.21, longitude: 50.61 },
    ],
  });
  if (edited.state !== 'matching') throw new Error('Expected edited route to be matching');

  const stalePlan = {
    ...NBH_LOOP,
    id: original.id,
    familyId: undefined,
    variantId: undefined,
    revisionId: undefined,
    revision: matching.route.revision,
    geometryKind: 'road_matched' as const,
    geometryStatus: 'ready' as const,
    distanceStatus: 'authoritative' as const,
    points: matching.route.points,
    geometry: [start, { latitude: 26.105, longitude: 50.505 }, finish],
    geometryDistancesKm: [0, 0.7, 1.4],
    geometrySource: 'licensed road matcher',
    distanceKm: 1.4,
  };

  const result = routeMatchingSucceeded(edited.route, stalePlan);
  assert.equal(result.state, 'matching-failed');
  if (result.state !== 'matching-failed') throw new Error('Expected stale match rejection');
  assert.equal(result.reason, 'invalidResponse');
  assert.equal(result.route.geometry.kind, 'waypoint_trace');
  assert.equal(result.route.geometry.status, 'unavailable');
  assert.equal(result.route.analysis, undefined);

  const foreignPlan = {
    ...stalePlan,
    id: 'another-route',
    points: edited.route.points,
    geometry: [
      { latitude: 26.2, longitude: 50.6 },
      { latitude: 26.205, longitude: 50.605 },
      { latitude: 26.21, longitude: 50.61 },
    ],
  };
  const foreignResult = routeMatchingSucceeded(edited.route, foreignPlan);
  assert.equal(foreignResult.state, 'matching-failed');
  if (foreignResult.state !== 'matching-failed') throw new Error('Expected foreign match rejection');
  assert.equal(foreignResult.reason, 'invalidResponse');
});

test('active snapshot reads are defensive and stay pinned to the reviewed revision', () => {
  const route = routeRecordFromPlan({ ...NBH_LOOP, id: 'snapshot-route', geometry: [start, finish], geometryDistancesKm: [0, 1.4], geometrySource: 'licensed road matcher' }, {
    origin: 'generated',
    ownership: 'personal',
    geometry: { kind: 'road_matched', status: 'ready', source: 'licensed road matcher' },
    roadEvidenceStatus: 'sourced',
    provenance: { source: 'Generated candidate' },
  });
  const repository = createRouteRepository([route]);
  const returned = repository.setActiveRide(route, '2026-09-09T14:40:00Z');
  const read = repository.getActiveRide();

  assert.ok(read);
  assert.notEqual(read, returned);
  assert.notEqual(read?.route, returned.route);
  assert.equal(Object.isFrozen(read?.route), true);
  assert.equal(Object.isFrozen(read?.route.points), true);
  assert.equal(read?.routeRevision, route.revision);
  assert.equal(read?.route.name, route.name);
});

test('selection keeps personal route identity separate from the NBH catalog identity', () => {
  const personal = routeRecordFromPlan({ ...NBH_LOOP, id: 'personal-nbh', name: 'My NBH draft', nameAr: 'مسودة حلقتي', familyId: NBH_LOOP.familyId, variantId: NBH_LOOP.variantId, revisionId: 'personal-nbh-r2' }, {
    origin: 'drawn',
    ownership: 'personal',
    geometry: { kind: 'waypoint_trace', status: 'draft' },
    roadEvidenceStatus: 'unknown',
    provenance: { source: 'Drawn on device', sourceId: 'personal-nbh' },
    familyId: NBH_LOOP.familyId,
    variantId: NBH_LOOP.variantId,
    revisionId: 'personal-nbh-r2',
    revision: 2,
  });
  const repository = createRouteRepository([personal]);
  const selected = repository.select(personal.id);

  assert.equal(selected?.id, 'personal-nbh');
  assert.equal(selected?.name, 'My NBH draft');
  assert.equal(selected?.origin, 'drawn');
  assert.equal(selected?.ownership, 'personal');
  assert.equal(selected?.provenance.sourceId, 'personal-nbh');
  assert.equal(selected?.revision, 2);
  assert.equal(selected?.revisionId, 'personal-nbh-r2');
  const selectedPlan = routePlanFromRecord(selected!);
  assert.equal(selectedPlan.origin, 'drawn');
  assert.equal(selectedPlan.ownership, 'personal');
  assert.equal(selectedPlan.provenance?.sourceId, 'personal-nbh');
  assert.equal(selectedPlan.revision, 2);
  assert.equal(selectedPlan.revisionId, 'personal-nbh-r2');
});

test('route plan does not expose analysis from an older route revision', () => {
  const current = routeRecordFromPlan({
    ...NBH_LOOP,
    id: 'stale-analysis-route',
    geometry: NBH_LOOP.points.map(({ latitude, longitude }) => ({ latitude, longitude })),
    geometryDistancesKm: NBH_LOOP.points.map((point) => point.distanceKm),
    geometrySource: 'reviewed road geometry',
  }, {
    origin: 'generated',
    ownership: 'personal',
    geometry: { kind: 'road_matched', status: 'ready', source: 'reviewed road geometry' },
    roadEvidenceStatus: 'sourced',
    provenance: { source: 'Reviewed route evidence' },
    revision: 1,
  });
  const stale = {
    ...current,
    revision: 2,
    analysis: { ...current.analysis!, routeRevision: 1 },
  };

  const plan = routePlanFromRecord(stale);

  assert.equal(plan.durationMinutes, 0);
  assert.equal(plan.departureAt, undefined);
  assert.deepEqual(plan.segments, []);
});

test('canonical readiness reconciles point, leg, geometry, and routed distance evidence', () => {
  const valid = {
    ...NBH_LOOP,
    id: 'distance-evidence-route',
    points: [
      { ...NBH_LOOP.points[0], ...start, distanceKm: 0 },
      { ...NBH_LOOP.points[1], ...finish, distanceKm: 1.4 },
    ],
    geometryKind: 'road_matched' as const,
    geometryStatus: 'ready' as const,
    distanceStatus: 'authoritative' as const,
    geometry: [start, { latitude: 26.105, longitude: 50.505 }, finish],
    geometryDistancesKm: [0, 0.7, 1.4],
    geometrySource: 'licensed road matcher',
    distanceKm: 1.4,
  };
  assert.equal(routePlanHasAuthoritativeGeometry(valid), true);

  assert.equal(routePlanHasAuthoritativeGeometry({ ...valid, geometryDistancesKm: [0, 0.2, 1.4] }), false);
  assert.equal(routePlanHasAuthoritativeGeometry({ ...valid, points: valid.points.map((point, index) => ({ ...point, distanceKm: index === 0 ? 0 : 2 })) }), false);
  assert.equal(routePlanHasAuthoritativeGeometry({ ...valid, legDistancesKm: [2] } as typeof valid & { legDistancesKm: number[] }), false);
  assert.equal(routePlanHasAuthoritativeGeometry({ ...valid, routedDistanceKm: 2 } as typeof valid & { routedDistanceKm: number }), false);
});

test('incomplete ready road metadata is downgraded to an unavailable waypoint trace', () => {
  const record = routeRecordFromPlan({
    ...NBH_LOOP,
    id: 'invalid-ready-route',
    points: [
      { ...NBH_LOOP.points[0], ...start },
      { ...NBH_LOOP.points[1], ...finish },
    ],
    geometry: [
      { latitude: 26.4, longitude: 50.8 },
      { latitude: 26.41, longitude: 50.81 },
    ],
    geometryDistancesKm: [0, 1],
    geometrySource: 'reviewed road geometry',
  }, {
    origin: 'generated',
    ownership: 'personal',
    geometry: { kind: 'road_matched', status: 'ready', source: 'reviewed road geometry' },
    roadEvidenceStatus: 'sourced',
    provenance: { source: 'Generated candidate' },
  });

  assert.equal(record.geometry.kind, 'waypoint_trace');
  assert.equal(record.geometry.status, 'unavailable');
  assert.equal(record.analysis, undefined);
  const plan = routePlanFromRecord(record);
  assert.equal(plan.geometryKind, 'waypoint_trace');
  assert.equal(plan.geometryStatus, 'unavailable');
  assert.equal(plan.distanceStatus, 'provisional');
});

test('reverse returns a clear unavailable result for a shared-start loop and a new draft for distinct endpoints', () => {
  const reverse = (routeLifecycle as unknown as { reverseRoute?: (route: ReturnType<typeof routeRecord>) => any }).reverseRoute;
  assert.equal(typeof reverse, 'function');
  if (!reverse) throw new Error('Expected reverse route helper');
  const loopBase = routeRecord();
  const loop = { ...loopBase, points: [loopBase.points[0], { ...loopBase.points[0], name: 'Finish', nameAr: 'النهاية' }] };
  const loopResult = reverse(loop);
  assert.equal(loopResult.ok, false);
  assert.equal(loopResult.reason, 'shared-start-finish');
  assert.equal(loopResult.route, undefined);

  const distinct = routeRecord();
  const distinctResult = reverse({ ...distinct, points: [distinct.points[0], { ...distinct.points[1], latitude: 26.12, longitude: 50.52 }] });
  assert.equal(distinctResult.ok, true);
  if (!distinctResult.ok) throw new Error('Expected reverse draft');
  assert.equal(distinctResult.state, 'draft');
  assert.equal(distinctResult.route.geometry.status, 'draft');
  assert.equal(distinctResult.route.revision, distinct.revision + 1);
  assert.notDeepEqual(distinctResult.route.points, distinct.points);
  assert.notDeepEqual(distinctResult.route.points[0], distinctResult.route.points.at(-1));
  assert.equal(distinctResult.route.corridor, undefined);
  assert.equal(distinctResult.route.analysis, undefined);
});

test('personal copies do not inherit catalog identity and catalog/personal ID collisions are rejected', () => {
  const personalCopy = routeRecordFromPlan({ ...NBH_LOOP, id: 'personal-copy', name: 'My copy' }, {
    origin: 'drawn',
    ownership: 'personal',
    geometry: { kind: 'waypoint_trace', status: 'draft' },
    roadEvidenceStatus: 'unknown',
    provenance: { source: 'Drawn on device' },
  });
  assert.equal(personalCopy.familyId, undefined);
  assert.equal(personalCopy.variantId, undefined);
  assert.equal(personalCopy.revisionId, undefined);
  assert.equal(personalCopy.corridor, undefined);

  const sameIdPersonalCopy = routeRecordFromPlan(NBH_LOOP, {
    origin: 'drawn',
    ownership: 'personal',
    geometry: { kind: 'waypoint_trace', status: 'draft' },
    roadEvidenceStatus: 'unknown',
    provenance: { source: 'Drawn on device' },
  });
  assert.notEqual(sameIdPersonalCopy.id, NBH_LOOP.id);

  const explicitCatalogIdentityCopy = routeRecordFromPlan({ ...NBH_LOOP, id: 'personal-explicit-catalog-identity' }, {
    origin: 'drawn',
    ownership: 'personal',
    geometry: { kind: 'waypoint_trace', status: 'draft' },
    roadEvidenceStatus: 'unknown',
    provenance: { source: 'Drawn on device' },
    familyId: NBH_LOOP.familyId,
    variantId: NBH_LOOP.variantId,
    revisionId: NBH_LOOP.revisionId,
  });
  assert.equal(explicitCatalogIdentityCopy.familyId, undefined);
  assert.equal(explicitCatalogIdentityCopy.variantId, undefined);
  assert.equal(explicitCatalogIdentityCopy.revisionId, undefined);
  assert.throws(() => routeRecordFromPlan({ ...NBH_LOOP, corridor: undefined }, {
    origin: 'pilot',
    ownership: 'catalog',
    geometry: { kind: 'recorded_trace', status: 'ready' },
    roadEvidenceStatus: 'pilot_pending',
    provenance: { source: 'Catalog' },
    familyId: NBH_LOOP.familyId,
    variantId: 'wrong-variant',
    revisionId: NBH_LOOP.revisionId,
  }), /family\/variant\/revision/);

  const catalog = routeRecordFromPlan(NBH_LOOP, {
    origin: 'pilot',
    ownership: 'catalog',
    geometry: { kind: 'recorded_trace', status: 'ready' },
    roadEvidenceStatus: 'pilot_pending',
    provenance: { source: 'Catalog' },
  });
  const collision = { ...catalog, ownership: 'personal' as const, origin: 'drawn' as const };
  assert.throws(() => createRouteRepository([catalog, collision]), /distinct route identity/);
  const identityCollision = { ...catalog, id: 'another-route-id' };
  assert.throws(() => createRouteRepository([catalog, identityCollision]), /distinct route identity/);
});

test('reversing a catalog route creates a personal draft with a fresh identity', () => {
  const reverse = (routeLifecycle as unknown as { reverseRoute?: (route: ReturnType<typeof routeRecord>) => any }).reverseRoute;
  assert.equal(typeof reverse, 'function');
  if (!reverse) throw new Error('Expected reverse route helper');
  const catalog = routeRecordFromPlan({
    ...NBH_LOOP,
    id: 'catalog-reverse-source',
    points: [
      { ...NBH_LOOP.points[0], latitude: 26.1, longitude: 50.5, distanceKm: 0 },
      { ...NBH_LOOP.points[1], latitude: 26.12, longitude: 50.52, distanceKm: 2.9 },
    ],
  }, {
    origin: 'pilot',
    ownership: 'catalog',
    geometry: { kind: 'recorded_trace', status: 'ready' },
    roadEvidenceStatus: 'pilot_pending',
    provenance: { source: 'Catalog' },
    familyId: NBH_LOOP.familyId,
    variantId: NBH_LOOP.variantId,
    revisionId: NBH_LOOP.revisionId,
    revision: 1,
    corridor: NBH_LOOP.corridor,
  });
  const result = reverse(catalog);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('Expected reversed draft');
  assert.equal(result.route.ownership, 'personal');
  assert.notEqual(result.route.id, catalog.id);
  assert.equal(result.route.familyId, undefined);
  assert.equal(result.route.variantId, undefined);
  assert.equal(result.route.corridor, undefined);
  assert.equal(result.route.geometry.kind, 'waypoint_trace');
  assert.equal(result.route.geometry.status, 'draft');
  assert.equal(result.route.provisionalDistanceKm, result.route.points.at(-1)?.distanceKm);
});
