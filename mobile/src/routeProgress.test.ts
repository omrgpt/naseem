import assert from 'node:assert/strict';
import test from 'node:test';
import type { RoutePlan } from './domain';
import { routeProgress, segmentIndexForProgress } from './routeProgress';

const suitability = { kind: 'unknown' as const, label: 'Unknown', evidence: 'No validation', source: 'test', confidence: 'low' as const };
const route: RoutePlan = { id: 'loop', name: 'Loop', source: 'test', distanceKm: 10, departureLabel: '17:40', arrivalLabel: '18:05', durationMinutes: 25, recommendation: '', windSummary: { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 }, segments: [
  { id: '1', name: 'north', arrivalLabel: '17:50', wind: { kind: 'headwind', magnitudeKph: 10, headwindKph: 10, crosswindKph: 0 }, suitability, insight: '' },
  { id: '2', name: 'south', arrivalLabel: '18:00', wind: { kind: 'tailwind', magnitudeKph: 10, headwindKph: 0, crosswindKph: 0 }, suitability, insight: '' },
], points: [
  { name: 'Start', latitude: 26.1, longitude: 50.5, distanceKm: 0, headingDegrees: 0, suitability },
  { name: 'Turn', latitude: 26.15, longitude: 50.5, distanceKm: 5, headingDegrees: 180, suitability },
  { name: 'Finish', latitude: 26.1, longitude: 50.5, distanceKm: 10, headingDegrees: 180, suitability },
] };

test('loop completion chooses the finish, not the equally-close start', () => {
  const position = routeProgress(route, { latitude: 26.1, longitude: 50.5 }, 0.9);
  assert.equal(position.progress, 1);
});

test('live projection remains monotonic and finds the cumulative segment', () => {
  const position = routeProgress(route, { latitude: 26.125, longitude: 50.5 }, 0.2);
  assert.ok(position.progress >= 0.2);
  assert.equal(segmentIndexForProgress(route, 0.8), 1);
  assert.equal(segmentIndexForProgress(route, 1), 1);
});

test('live projection prefers the detailed road geometry when it is available', () => {
  const roadRoute: RoutePlan = {
    ...route,
    geometry: [
      { latitude: 26.1, longitude: 50.5 },
      { latitude: 26.1, longitude: 50.53 },
      { latitude: 26.13, longitude: 50.53 },
      { latitude: 26.1, longitude: 50.5 },
    ],
    geometryDistancesKm: [0, 3, 6, 10],
  };
  const position = routeProgress(roadRoute, { latitude: 26.13, longitude: 50.53 }, 0.15);
  assert.ok(position.progress > 0.5 && position.progress < 0.8);
  assert.ok(position.offRouteKm < 0.05);
});

test('off-route distance is returned in kilometres for the live threshold', () => {
  const position = routeProgress(route, { latitude: 26.125, longitude: 50.54 }, 0.2);
  assert.ok(position.offRouteKm > 0.25);
});
