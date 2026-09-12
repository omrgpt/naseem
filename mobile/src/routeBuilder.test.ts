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

test('typed endpoint text clears the committed point until it is explicitly recommitted', () => {
  const empty = createPlannerInputState();
  const selectedStart = commitPlannerPoint(empty, 'start', start);
  const edited = updatePlannerTextState(selectedStart, 'start', 'Seef pier');

  assert.equal(edited.start, null);
  assert.equal(edited.startText, 'Seef pier');
  assert.equal(plannerEndpointIsCommitted(edited, 'start'), false);
  assert.equal(plannerInputCanMatch(edited), false);
  assert.equal(edited.suggestionsOpen, 'start');

  const recommittedStart = commitPlannerPoint(edited, 'start', start);
  const committedDestination = commitPlannerPoint(recommittedStart, 'destination', destination);
  assert.equal(plannerInputCanMatch(committedDestination), true);
  assert.equal(committedDestination.suggestionsOpen, null);
});

test('planner match preparation rejects stale text and accepts a confirmed map point', async () => {
  const builder = await import('./routeBuilder');
  assert.equal(typeof builder.preparePlannerMatch, 'function');
  const selected = builder.commitPlannerPoint(
    builder.commitPlannerPoint(builder.createPlannerInputState(), 'start', start),
    'destination',
    destination,
  );
  const edited = builder.updatePlannerTextState(selected, 'start', 'Typed place');
  const rejected = builder.preparePlannerMatch(edited);
  assert.equal(rejected.ok, false);
  if (rejected.ok) throw new Error('Expected stale endpoint rejection');
  assert.equal(rejected.error, 'emptyStart');

  const recommitted = builder.commitPlannerPoint(edited, 'start', {
    ...start,
    name: 'Map start',
    nameAr: 'البداية',
  });
  const accepted = builder.preparePlannerMatch(recommitted, [
    recommitted.start!,
    recommitted.destination!,
  ]);
  assert.equal(accepted.ok, true);
  if (!accepted.ok) throw new Error('Expected confirmed endpoint match');
  assert.equal(accepted.points.length, 2);
  assert.equal(accepted.points[0].nameAr, 'البداية');
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
  assert.equal(done.route?.geometryKind, 'waypoint_trace');
  assert.equal(done.route?.geometryStatus, 'draft');
});

test('loop matching failure returns deterministic retry and edit recovery without losing Start', () => {
  const recovery = recoverLoopGenerationFailure(start, 'matchingFailed');

  assert.deepEqual(recovery.recoveryActions, ['retry', 'edit-start']);
  assert.equal(recovery.preservesStart, true);
  assert.equal(recovery.start, start);
  assert.equal(recovery.failure, 'matchingFailed');
});

test('freehand routing payload preserves endpoints while simplifying only the payload', async () => {
  const builder = await import('./routeBuilder');
  assert.equal(typeof builder.simplifyCoordinatesForRouting, 'function');
  const points = Array.from({ length: 60 }, (_, index) => ({
    latitude: 26.1 + index * 0.001,
    longitude: 50.5 + Math.sin(index / 2) * 0.001,
  }));
  const simplified = builder.simplifyCoordinatesForRouting(points, 12);

  assert.ok(simplified.length <= 12);
  assert.deepEqual(simplified[0], points[0]);
  assert.deepEqual(simplified.at(-1), points.at(-1));
  assert.equal(points.length, 60);
});

test('undo and redo operate on complete manual strokes', async () => {
  const builder = await import('./routeBuilder');
  assert.equal(typeof builder.createManualSketchState, 'function');
  const firstStroke = [
    { latitude: 26.24, longitude: 50.53 },
    { latitude: 26.23, longitude: 50.54 },
  ];
  const secondStroke = [
    { latitude: 26.22, longitude: 50.55 },
    { latitude: 26.21, longitude: 50.56 },
  ];
  let state = builder.createManualSketchState();
  state = builder.appendManualStroke(state, firstStroke);
  state = builder.appendManualStroke(state, secondStroke);
  assert.deepEqual(builder.manualSketchCoordinates(state), [...firstStroke, ...secondStroke]);

  state = builder.undoManualStroke(state);
  assert.deepEqual(builder.manualSketchCoordinates(state), firstStroke);
  state = builder.redoManualStroke(state);
  assert.deepEqual(builder.manualSketchCoordinates(state), [...firstStroke, ...secondStroke]);
});

test('pointer/touch stroke capture collects ordered movement and ends on lift', async () => {
  const builder = await import('./routeBuilder');
  assert.equal(typeof builder.beginManualStrokeCapture, 'function');
  const first = { latitude: 26.24, longitude: 50.53 };
  const second = { latitude: 26.235, longitude: 50.535 };
  const third = { latitude: 26.23, longitude: 50.54 };
  let capture = builder.beginManualStrokeCapture(first);
  capture = builder.extendManualStrokeCapture(capture, second);
  capture = builder.extendManualStrokeCapture(capture, third);
  const ended = builder.endManualStrokeCapture(capture);

  assert.deepEqual(ended.stroke, [first, second, third]);
  assert.equal(ended.capture.active, false);
  assert.deepEqual(builder.extendManualStrokeCapture(ended.capture, first).points, []);
});

test('manual map surface points stay inside the supplied geographic bounds', async () => {
  const builder = await import('./routeBuilder');
  assert.equal(typeof builder.coordinateFromMapSurface, 'function');
  const coordinate = builder.coordinateFromMapSurface(
    { x: 100, y: 25 },
    { width: 200, height: 100 },
    {
      center: { latitude: 26.2, longitude: 50.5 },
      latitudeDelta: 0.2,
      longitudeDelta: 0.4,
    },
  );

  assert.deepEqual(coordinate, { latitude: 26.25, longitude: 50.5 });
});

test('manual routing artifacts retain raw points separately from simplified payload', async () => {
  const builder = await import('./routeBuilder');
  assert.equal(typeof builder.createManualSketchMatchArtifact, 'function');
  const rawPoints = Array.from({ length: 60 }, (_, index) => ({
    latitude: 26.1 + index * 0.001,
    longitude: 50.5 + Math.sin(index / 2) * 0.001,
  }));
  const artifact = builder.createManualSketchMatchArtifact(rawPoints, 12);

  assert.deepEqual(artifact.rawPoints, rawPoints);
  assert.ok(artifact.routingPoints.length <= 12);
  assert.notEqual(artifact.rawPoints, artifact.routingPoints);
  assert.deepEqual(artifact.routingPoints[0], rawPoints[0]);
  assert.deepEqual(artifact.routingPoints.at(-1), rawPoints.at(-1));
});

test('move and remove preserve manual stroke boundaries', async () => {
  const builder = await import('./routeBuilder');
  assert.equal(typeof builder.moveManualPointInSketch, 'function');
  const a = { latitude: 26.24, longitude: 50.53 };
  const b = { latitude: 26.23, longitude: 50.54 };
  const c = { latitude: 26.22, longitude: 50.55 };
  const d = { latitude: 26.21, longitude: 50.56 };
  let state = builder.createManualSketchState();
  state = builder.appendManualStroke(state, [a, b]);
  state = builder.appendManualStroke(state, [c, d]);

  const moved = builder.moveManualPointInSketch(state, 1, 1);
  assert.deepEqual(moved.strokes, [[a, c], [b, d]]);
  const removed = builder.removeManualPointFromSketch(moved, 0);
  assert.deepEqual(removed.strokes, [[c], [b, d]]);
  assert.deepEqual(removed.redo, []);
});

test('manual match session invalidation makes a late result stale', async () => {
  const builder = await import('./routeBuilder');
  assert.equal(typeof builder.createManualMatchSession, 'function');
  const raw = [
    { latitude: 26.24, longitude: 50.53 },
    { latitude: 26.23, longitude: 50.54 },
  ];
  const session = builder.createManualMatchSession(raw);
  const matching = builder.beginManualMatchSession(session, raw, [raw[0], raw[1]]);
  const edited = builder.invalidateManualMatchSession(matching, [
    ...raw,
    { latitude: 26.22, longitude: 50.55 },
  ]);

  assert.equal(builder.manualMatchSessionIsCurrent(matching, matching.revision), true);
  assert.equal(builder.manualMatchSessionIsCurrent(edited, matching.revision), false);
  assert.equal(edited.status, 'draft');
  assert.equal(edited.rawPoints.length, 3);
});
