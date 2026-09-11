import assert from 'node:assert/strict';
import test from 'node:test';
import type { BuilderRouteState, PlannerPoint } from './screenTypes';
import {
  applyManualSketchDecision,
  builderStateAfterEdit,
  builderStateForRetry,
  commitPlannerPoint,
  createManualSketchResult,
  createPlannerInputState,
  parseGpx,
  parseGpxDetailed,
  plannerEndpointIsCommitted,
  plannerInputCanMatch,
  plannerValidationMessage,
  recoverLoopGenerationFailure,
  routeFromCoordinates,
  selectSampleRoute,
  updatePlannerTextState,
  validateRouteCoordinates,
  validatePlannerEndpoints,
} from './routeBuilder';
import { NBH_LOOP } from './seed';

const start: PlannerPoint = {
  name: 'Seef',
  nameAr: 'السيف',
  latitude: 26.24,
  longitude: 50.53,
};
const destination: PlannerPoint = {
  name: 'Zallaq',
  nameAr: 'الزلاق',
  latitude: 25.99,
  longitude: 50.5,
};

test('GPX parser accepts either attribute order and drops invalid points', () => {
  const points = parseGpx('<trkpt lon="50.50" lat="26.10"/><trkpt lat="999" lon="50.51"/><rtept lat="26.11" lon="50.51"/>');
  assert.deepEqual(points, [{ latitude: 26.1, longitude: 50.5 }, { latitude: 26.11, longitude: 50.51 }]);
});

test('route builder uses cumulative geodesic distance and removes consecutive duplicates', () => {
  const route = routeFromCoordinates('test', 'Test', [{ latitude: 26.1, longitude: 50.5 }, { latitude: 26.1, longitude: 50.5 }, { latitude: 26.11, longitude: 50.5 }]);
  if (!route) throw new Error('Expected route');
  assert.equal(route.points.length, 2);
  assert.equal(route.distanceKm, Number(route.points.at(-1)!.distanceKm.toFixed(1)));
  assert.ok(route.distanceKm > 1);
});

test('GPX import exposes invalid-point and size diagnostics', () => {
  const parsed = parseGpxDetailed('<trkpt lat="bad" lon="50.5"/><rtept lat="26.1" lon="50.5"/>');
  assert.equal(parsed.invalidCount, 1);
  assert.equal(parsed.pointCount, 2);
  assert.equal(parseGpx('<rtept lat="26.1" lon="50.5"/>').length, 1);
  assert.equal(parseGpxDetailed('x'.repeat(2_000_001)).error, 'tooLarge');
});

test('route builder keeps private-pilot routes inside Bahrain and within review limits', () => {
  assert.equal(validateRouteCoordinates([{ latitude: 26.1, longitude: 50.5 }, { latitude: 26.1, longitude: 50.95 }]), 'outsideCoverage');
  assert.equal(validateRouteCoordinates([{ latitude: 26.1, longitude: 50.5 }, { latitude: 26.5, longitude: 50.5 }]), 'legTooLong');
  assert.equal(routeFromCoordinates('too-far', 'Too far', [{ latitude: 26.1, longitude: 50.5 }, { latitude: 26.5, longitude: 50.5 }]), null);
});

test('typed endpoint text stays uncommitted while the previously selected point is retained', () => {
  const empty = createPlannerInputState();
  const selectedStart = commitPlannerPoint(empty, 'start', start);
  const edited = updatePlannerTextState(selectedStart, 'start', 'Seef pier');

  assert.deepEqual(edited.start, start);
  assert.equal(edited.startText, 'Seef pier');
  assert.equal(plannerEndpointIsCommitted(edited, 'start'), false);
  assert.equal(plannerInputCanMatch(edited), false);
  assert.equal(edited.suggestionsOpen, 'start');

  const recommittedStart = commitPlannerPoint(edited, 'start', start);
  const committedDestination = commitPlannerPoint(recommittedStart, 'destination', destination);
  assert.equal(plannerInputCanMatch(committedDestination), true);
  assert.equal(committedDestination.suggestionsOpen, null);
});

test('planner validation rejects empty and identical endpoints before routing', () => {
  assert.equal(validatePlannerEndpoints(null, destination), 'emptyStart');
  assert.equal(validatePlannerEndpoints(start, null), 'emptyDestination');
  assert.equal(validatePlannerEndpoints(start, { ...start }), 'sameEndpoints');
  assert.equal(validatePlannerEndpoints(start, destination), null);
  assert.match(plannerValidationMessage('sameEndpoints', 'en'), /different Destination/);
  assert.match(plannerValidationMessage('sameEndpoints', 'ar'), /مختلفة/);
});

test('editing and retrying preserve both committed endpoints while clearing only route output', () => {
  const failed: BuilderRouteState = {
    status: 'failed',
    start,
    destination,
    route: NBH_LOOP,
    error: 'The route service failed',
  };

  const edited = builderStateAfterEdit(failed);
  assert.equal(edited.start, start);
  assert.equal(edited.destination, destination);
  assert.equal(edited.route, null);
  assert.equal(edited.status, 'start-selected');

  const retrying = builderStateForRetry(edited);
  assert.equal(retrying.start, start);
  assert.equal(retrying.destination, destination);
  assert.equal(retrying.route, null);
  assert.equal(retrying.status, 'matching');
});

test('manual Done retains every sketch point and decisions do not silently lose the result', () => {
  const points = [
    { latitude: 26.24, longitude: 50.53 },
    { latitude: 26.2, longitude: 50.57 },
    { latitude: 26.16, longitude: 50.55 },
  ];
  const done = createManualSketchResult(points, 'sketch-1', 'Morning sketch');

  assert.equal(done.status, 'done');
  assert.deepEqual(
    done.route?.points.map(({ latitude, longitude }) => ({ latitude, longitude })),
    points,
  );
  assert.equal(applyManualSketchDecision(done, 'use').route, done.route);
  assert.equal(applyManualSketchDecision(done, 'save').route, done.route);
  assert.equal(applyManualSketchDecision(done, 'edit').route, done.route);
  assert.equal(applyManualSketchDecision(done, 'edit').status, 'editing');
  assert.equal(applyManualSketchDecision(done, 'discard').route, null);
  assert.deepEqual(applyManualSketchDecision(done, 'discard').points, []);
});

test('loop matching failure returns deterministic retry and edit recovery without losing Start', () => {
  const recovery = recoverLoopGenerationFailure(start, 'matchingFailed');

  assert.deepEqual(recovery.recoveryActions, ['retry', 'edit-start']);
  assert.equal(recovery.preservesStart, true);
  assert.equal(recovery.start, start);
  assert.equal(recovery.failure, 'matchingFailed');
});
