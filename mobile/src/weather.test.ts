import assert from 'node:assert/strict';
import test from 'node:test';
import { WEATHER_CACHE_TTL_MS, weatherGridKey } from './weather';

test('weather requests use a stable two-decimal grid key and bounded cache TTL', () => {
  assert.equal(weatherGridKey(26.22351, 50.58764), '26.22,50.59');
  assert.equal(WEATHER_CACHE_TTL_MS, 10 * 60_000);
});
