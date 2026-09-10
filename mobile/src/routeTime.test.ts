import assert from 'node:assert/strict';
import test from 'node:test';
import { copy, directionForLanguage, localeForLanguage } from './i18n';
import {
  BAHRAIN_TIME_ZONE,
  analysisKey,
  createBahrainInstant,
  dayRelation,
  departureInstant,
  formatBahrainDate,
  formatBahrainDateTime,
  formatBahrainTime,
  formatNumber,
} from './routeTime';

const instant = '2026-09-09T14:40:00.000Z';

test('Bahrain time is stable for an instant and follows Intl locale defaults', () => {
  assert.deepEqual(createBahrainInstant(instant), { instant, timeZone: BAHRAIN_TIME_ZONE });
  assert.equal(formatBahrainTime(instant, 'en-BH'), '5:40 PM');
  assert.equal(formatBahrainTime(createBahrainInstant(instant), 'en-BH'), '5:40 PM');
  assert.equal(formatBahrainTime(instant, 'ar-BH'), '٥:٤٠ م');
  assert.equal(formatBahrainTime(instant, 'en-BH', { hour12: false }), '17:40');
  assert.equal(formatBahrainTime(instant, 'ar-BH', { hour12: false }), '١٧:٤٠');
});

test('departure instants and day relation use Bahrain calendar days', () => {
  const reference = '2026-09-09T20:30:00.000Z'; // 23:30 in Bahrain.
  const tomorrow = departureInstant('tomorrow', { hour: 0, minute: 10 }, reference);
  assert.equal(tomorrow, '2026-09-09T21:10:00.000Z');
  assert.equal(dayRelation(tomorrow, reference), 'tomorrow');
  assert.equal(dayRelation('2026-09-09T20:00:00.000Z', reference), 'today');
  assert.equal(dayRelation('2026-09-08T20:30:00.000Z', reference), 'yesterday');
});

test('localized date, date-time, and numbers use the requested presentation locale', () => {
  assert.match(formatBahrainDate(instant, 'en-BH'), /Wednesday/);
  assert.match(formatBahrainDateTime(instant, 'ar-BH'), /٥:٤٠ م/);
  assert.equal(formatNumber(12.5, 'en-BH'), '12.5');
  assert.equal(formatNumber(12.5, 'ar-BH'), '١٢٫٥');
});

test('analysis keys include route identity, revision, canonical instant, and zone', () => {
  const first = analysisKey('route-1', 3, '2026-09-09T14:40:00Z');
  assert.equal(first, `route-1|3|${instant}|${BAHRAIN_TIME_ZONE}`);
  assert.equal(analysisKey({ routeId: 'route-1', revision: 3, departureAt: instant }), first);
  assert.notEqual(analysisKey('route-1', 4, instant), first);
  assert.notEqual(analysisKey('route-1', 3, '2026-09-09T14:41:00Z'), first);
  assert.notEqual(analysisKey('route-1', 3, instant, 'UTC'), first);
});

test('English and Arabic copy keep parity and use time placeholders instead of display-ready times', () => {
  assert.equal(localeForLanguage('en'), 'en-BH');
  assert.equal(localeForLanguage('ar'), 'ar-BH');
  assert.equal(directionForLanguage('en'), 'ltr');
  assert.equal(directionForLanguage('ar'), 'rtl');
  assert.deepEqual(Object.keys(copy.en).sort(), Object.keys(copy.ar).sort());
  const required = [
    'home', 'plan', 'ride', 'you', 'planRoute', 'start', 'destination', 'findingRoadRoute', 'routeMatchFailure',
    'sample', 'yours', 'imported', 'roadMatched', 'recordedTrace', 'waypointTrace', 'routeDraft', 'routeMatching',
    'routeReady', 'routeUnavailable', 'chooseRouteBeforeRide', 'openSettings', 'liveStateActive', 'loadingRoute',
    'emptyRoutes', 'importReview', 'useThisTrack', 'generatedReview', 'decisionGate', 'arabicTypefaceDecision',
    'liveWaypointTraceDecision', 'recommendationPolicyDecision', 'bahrainNumeralsDecision',
  ] as const;
  for (const key of required) {
    assert.ok(copy.en[key].length > 0, `English copy is missing ${key}`);
    assert.ok(copy.ar[key].length > 0, `Arabic copy is missing ${key}`);
  }
  const displayReadyTime = /(?:\b\d{1,2}:\d{2}\b|[٠-٩]{1,2}:[٠-٩]{2})/u;
  assert.equal(Object.values(copy.en).some((value) => displayReadyTime.test(value)), false);
  assert.equal(Object.values(copy.ar).some((value) => displayReadyTime.test(value)), false);
  assert.match(copy.en.goodWindow, /\{time\}/u);
  assert.match(copy.ar.goodWindow, /\{time\}/u);
});
