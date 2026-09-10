import assert from 'node:assert/strict';
import test from 'node:test';
import { adjustedSpeedKph, analyseRoute, windComponents } from './routeEngine';
import type { RoutePlan } from './domain';

const suitability = { kind: 'unknown' as const, label: 'Unknown', evidence: 'No validation', source: 'test', confidence: 'low' as const };
const route: RoutePlan = { id: 'test', name: 'Test', source: 'test', distanceKm: 10, departureLabel: '17:40', arrivalLabel: '18:05', durationMinutes: 25, recommendation: '', windSummary: { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 }, segments: [], points: [
  { name: 'Start', latitude: 26.1, longitude: 50.5, distanceKm: 0, headingDegrees: 0, suitability },
  { name: 'Middle', latitude: 26.11, longitude: 50.5, distanceKm: 5, headingDegrees: 180, suitability },
  { name: 'Finish', latitude: 26.1, longitude: 50.5, distanceKm: 10, headingDegrees: 180, suitability },
] };

test('wind vector identifies cardinal headwind and tailwind without double penalty', () => {
  const components = windComponents(0, { speed: 20, directionFrom: 0 });
  assert.equal(Math.round(components.headwindKph), 20);
  assert.equal(Math.round(adjustedSpeedKph(26, components)), 22);
});

test('route analysis selects a new hourly wind snapshot for a later segment', () => {
  const today = new Date();
  today.setHours(17, 40, 0, 0);
  const nextHour = new Date(today.getTime() + 20 * 60_000);
  const result = analyseRoute(route, 26, 0, undefined, [
    { time: today.toISOString(), speed: 20, directionFrom: 0, gusts: 20 },
    { time: nextHour.toISOString(), speed: 20, directionFrom: 0, gusts: 20 },
  ]);
  assert.notEqual(result.segments[0].wind.kind, result.segments[1].wind.kind);
});
