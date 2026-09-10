import assert from 'node:assert/strict';
import test from 'node:test';
import { createStatefulRouteMatcher, distanceToRouteEntryKm, matchRoutePosition } from './routeMatcher';
import { NBH_LOOP } from './seed';

test('a rider away from NBH is never treated as matched to the corridor', () => {
  const coordinate = { latitude: 26.2235, longitude: 50.5876 };
  const result = matchRoutePosition(NBH_LOOP, coordinate, { accuracyMeters: 12, timestamp: '2026-09-10T14:40:00Z', referenceAt: '2026-09-10T14:40:00Z' });
  assert.ok(distanceToRouteEntryKm(NBH_LOOP, coordinate) > 20);
  assert.equal(result.state, 'off-corridor');
  assert.equal(result.progress, 0);
});

test('shared loop start-finish geometry preserves ambiguity', () => {
  const result = matchRoutePosition(NBH_LOOP, NBH_LOOP.points[0], { accuracyMeters: 10, timestamp: '2026-09-10T14:40:00Z', referenceAt: '2026-09-10T14:40:00Z' });
  assert.equal(result.state, 'uncertain');
  assert.equal(result.candidateCount, 2);
  assert.equal(result.progress, 0);
});

test('stateful matcher holds reverse movement until sustained evidence', () => {
  const matcher = createStatefulRouteMatcher(NBH_LOOP);
  const forward = matcher.update(NBH_LOOP.points[2], { accuracyMeters: 10, timestamp: '2026-09-10T14:40:00Z' });
  const firstBack = matcher.update(NBH_LOOP.points[1], { accuracyMeters: 10, timestamp: '2026-09-10T14:41:00Z' });
  const secondBack = matcher.update(NBH_LOOP.points[1], { accuracyMeters: 10, timestamp: '2026-09-10T14:42:00Z' });
  const sustainedBack = matcher.update(NBH_LOOP.points[1], { accuracyMeters: 10, timestamp: '2026-09-10T14:43:00Z' });
  assert.equal(forward.progress, firstBack.progress);
  assert.equal(firstBack.state, 'uncertain');
  assert.equal(secondBack.state, 'uncertain');
  assert.ok(sustainedBack.progress < forward.progress);
});

test('stale location is explicit', () => {
  const result = matchRoutePosition(NBH_LOOP, NBH_LOOP.points[1], { accuracyMeters: 10, timestamp: '2026-09-10T14:40:00Z', referenceAt: '2026-09-10T14:42:00Z' });
  assert.equal(result.state, 'stale');
  assert.equal(result.confidence, 'low');
});
