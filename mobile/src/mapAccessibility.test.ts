import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { RoutePlan } from './domain';
import { mapGeometryStatus } from './mapModel';

const uiPatternsSource = readFileSync(new URL('./UiPatterns.tsx', import.meta.url), 'utf8');

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
  assert.equal(mapGeometryStatus({ ...route, geometry: [route.points[0], route.points[1]] }, 'pilot'), 'pilot');
});

test('route point lists expose keyboard selection and a stable selection announcement', () => {
  assert.match(uiPatternsSource, /export function AccessiblePointList/);
  const pointListSource = uiPatternsSource.slice(uiPatternsSource.indexOf('export function AccessiblePointList'));
  assert.match(pointListSource, /accessibilityRole="list"/);
  assert.match(pointListSource, /accessibilityRole="button"/);
  assert.match(pointListSource, /onSelect\(point\.id\)/);
  assert.match(pointListSource, /aria-pressed/);
  assert.match(pointListSource, /AccessibleLiveRegion/);
});

test('map point markers provide a 44px keyboard-operable fallback', () => {
  assert.match(uiPatternsSource, /export function AccessibleMapMarker/);
  const markerSource = uiPatternsSource.slice(
    uiPatternsSource.indexOf('export function AccessibleMapMarker'),
    uiPatternsSource.indexOf('export function AccessiblePointList'),
  );
  assert.match(markerSource, /accessibilityRole="button"/);
  assert.match(markerSource, /onPress=\{onSelect\}/);
  assert.doesNotMatch(markerSource, /onKeyDown/);
  assert.match(uiPatternsSource, /mapMarker:\s*\{[^}]*minHeight:\s*44/);
  assert.match(uiPatternsSource, /mapMarker:\s*\{[^}]*minWidth:\s*44/);
});
