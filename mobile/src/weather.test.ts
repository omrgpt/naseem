import assert from 'node:assert/strict';
import test from 'node:test';
import { WEATHER_CACHE_TTL_MS, weatherGridKey, type BahrainConditions } from './weather';

test('weather requests use a stable two-decimal grid key and bounded cache TTL', () => {
  assert.equal(weatherGridKey(26.22351, 50.58764), '26.22,50.59');
  assert.equal(WEATHER_CACHE_TTL_MS, 10 * 60_000);
});

test('weather refresh state keeps the last good timestamp while loading and retrying', async () => {
  const module = (await import('./weather')) as unknown as Record<string, any>;
  const initial = module.createWeatherRefreshState as ((conditions?: BahrainConditions | null) => any) | undefined;
  const begin = module.beginWeatherRefresh as ((state: any) => any) | undefined;
  const complete = module.completeWeatherRefresh as ((state: any, conditions: BahrainConditions) => any) | undefined;
  const fail = module.failWeatherRefresh as ((state: any, error: unknown) => any) | undefined;
  const retry = module.retryWeatherRefresh as ((state: any) => any) | undefined;
  assert.equal(typeof initial, 'function');
  assert.equal(typeof begin, 'function');
  assert.equal(typeof complete, 'function');
  assert.equal(typeof fail, 'function');
  assert.equal(typeof retry, 'function');
  if (!initial || !begin || !complete || !fail || !retry) return;

  const conditions: BahrainConditions = {
    temperature: 29,
    apparentTemperature: 31,
    wind: { speed: 15, directionFrom: 320, gusts: 22 },
    hourly: [],
    fetchedAt: '2026-09-11T13:00:00+03:00',
    source: 'Open-Meteo',
  };
  const ready = initial(conditions);
  const completed = complete(begin(initial()), conditions);
  assert.equal(completed.status, 'success');
  assert.equal(completed.conditions, conditions);
  assert.equal(completed.updatedAt, conditions.fetchedAt);

  const loading = begin(ready);
  assert.equal(loading.status, 'loading');
  assert.equal(loading.conditions, conditions);
  assert.equal(loading.updatedAt, conditions.fetchedAt);
  assert.equal(loading.canRetry, false);

  const failed = fail(loading, new Error('Network offline'));
  assert.equal(failed.status, 'error');
  assert.equal(failed.conditions, conditions);
  assert.equal(failed.updatedAt, conditions.fetchedAt);
  assert.equal(failed.canRetry, true);
  assert.match(failed.error, /Network offline/);

  const retrying = retry(failed);
  assert.equal(retrying.status, 'loading');
  assert.equal(retrying.conditions, conditions);
  assert.equal(retrying.updatedAt, conditions.fetchedAt);
  assert.equal(retrying.error, null);
});

test('weather refresh failure exposes provider and coordinate disclosure', async () => {
  const module = (await import('./weather')) as unknown as Record<string, any>;
  const disclosure = module.getWeatherRefreshDisclosure?.('en');
  assert.ok(disclosure);
  assert.match(disclosure.body, /coordinate/i);
  assert.match(disclosure.body, /Open-Meteo/i);
  assert.ok(disclosure.providerUrls.some((url: string) => url.includes('open-meteo.com')));
  assert.match(disclosure.body, /network|sends/i);
});

test('weather cache exposes a bounded diagnostic size without exposing cached data', async () => {
  const module = (await import('./weather')) as unknown as Record<string, any>;
  const cacheSize = module.getWeatherCacheSize as (() => number) | undefined;
  assert.equal(typeof cacheSize, 'function');
  assert.equal(module.WEATHER_CACHE_MAX_ENTRIES, 64);
  if (!cacheSize) return;
  module.clearWeatherCache();
  assert.equal(cacheSize(), 0);
});

test('refreshBahrainConditions returns an actionable error state for a failed refresh', async () => {
  const module = (await import('./weather')) as unknown as Record<string, any>;
  const refresh = module.refreshBahrainConditions as
    | ((previous: any, latitude: number, longitude: number) => Promise<any>)
    | undefined;
  const initial = module.createWeatherRefreshState as (() => any) | undefined;
  assert.equal(typeof refresh, 'function');
  assert.equal(typeof initial, 'function');
  if (!refresh || !initial) return;

  const state = await refresh(initial(), Number.NaN, 50.5);
  assert.equal(state.status, 'error');
  assert.equal(state.canRetry, true);
  assert.equal(state.conditions?.source, 'fallback');
  assert.equal(state.updatedAt, null);
});
