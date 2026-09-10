import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGpx, parseGpxDetailed, routeFromCoordinates, validateRouteCoordinates } from './routeBuilder';

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
