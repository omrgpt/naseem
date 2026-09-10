import assert from 'node:assert/strict';
import test from 'node:test';
import type { RoutePlan } from './domain';
import { mapGeometryStatus } from './mapModel';

const suitability = { kind: 'unknown' as const, label: 'Unknown', evidence: 'Test', source: 'test', confidence: 'low' as const };
const route: RoutePlan = {
  id: 'map-accessibility-test',
  name: 'Map accessibility test',
  source: 'test',
  distanceKm: 2,
  departureLabel: '17:40',
  arrivalLabel: '17:50',
  durationMinutes: 10,
  recommendation: '',
  windSummary: { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 },
  segments: [],
  points: [
    { name: 'Start', latitude: 26.1, longitude: 50.5, distanceKm: 0, headingDegrees: 0, suitability },
    { name: 'Destination', latitude: 26.11, longitude: 50.5, distanceKm: 2, headingDegrees: 180, suitability },
  ],
};

test('map status cannot announce road matching without displayed geometry', () => {
  assert.equal(mapGeometryStatus(route, 'loading'), 'loading');
  assert.equal(mapGeometryStatus(route, 'matched'), 'pilot');
  assert.equal(mapGeometryStatus({ ...route, geometry: [route.points[0], route.points[1]] }, 'pilot'), 'matched');
});
