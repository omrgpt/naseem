import assert from 'node:assert/strict';
import test from 'node:test';
import { NBH_LOOP } from './seed';
import { parseStoredRoutes, readStoredRouteRecords, serializeStoredRouteRecords, serializeStoredRoutes } from './routeStorage';

const personalGpx = { ...NBH_LOOP, id: 'gpx-personal-1', name: 'Imported ride', source: 'GPX import', geometry: [{ latitude: 26.1, longitude: 50.5 }, { latitude: 26.11, longitude: 50.51 }], geometryDistancesKm: [0, 1.4], geometrySource: undefined };
const personalDrawn = { ...NBH_LOOP, id: 'drawn-personal-1', name: 'Hand drawn ride', source: 'Drawn on device', geometry: undefined, geometryDistancesKm: undefined, geometrySource: undefined };

test('route storage migrates v1 data once and preserves personal route identity, geometry, and points', () => {
  const migrated = readStoredRouteRecords(JSON.stringify({ version: 1, routes: [NBH_LOOP, personalGpx, personalDrawn, { id: 'bad' }] }));
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.sourceVersion, 1);
  assert.equal(migrated.routes.length, 3);

  const catalog = migrated.routes.find((route) => route.id === NBH_LOOP.id);
  const imported = migrated.routes.find((route) => route.id === personalGpx.id);
  const drawn = migrated.routes.find((route) => route.id === personalDrawn.id);
  assert.equal(catalog?.origin, 'pilot');
  assert.equal(catalog?.ownership, 'catalog');
  assert.equal(imported?.origin, 'gpx');
  assert.equal(imported?.ownership, 'personal');
  assert.deepEqual(imported?.geometry.coordinates, personalGpx.geometry);
  assert.deepEqual(imported?.points, personalGpx.points);
  assert.equal(drawn?.origin, 'drawn');
  assert.equal(drawn?.ownership, 'personal');
  assert.equal(drawn?.geometry.kind, 'waypoint_trace');
  assert.equal(drawn?.geometry.status, 'unavailable');

  const serialized = serializeStoredRouteRecords(migrated.routes);
  const reloaded = readStoredRouteRecords(serialized);
  assert.equal(reloaded.migrated, false);
  assert.equal(reloaded.sourceVersion, 2);
  assert.deepEqual(reloaded.routes, migrated.routes);
});

test('v2 validation does not infer again from a changed-looking ID or source', () => {
  const legacy = readStoredRouteRecords(JSON.stringify([personalDrawn])).routes[0];
  const deliberatelyCanonical = { ...legacy, id: 'gpx-now-but-still-drawn', origin: 'generated' as const, ownership: 'catalog' as const, provenance: { ...legacy.provenance, source: 'GPX import' } };
  const loaded = readStoredRouteRecords(serializeStoredRouteRecords([deliberatelyCanonical]));
  assert.equal(loaded.migrated, false);
  assert.equal(loaded.routes[0].origin, 'generated');
  assert.equal(loaded.routes[0].ownership, 'catalog');
  assert.equal(loaded.routes[0].provenance.source, 'GPX import');
});

test('the compatibility RoutePlan adapter keeps canonical metadata across a reload/save cycle', () => {
  const canonical = readStoredRouteRecords(JSON.stringify([personalDrawn])).routes[0];
  const changed = { ...canonical, id: 'gpx-looking-id', origin: 'generated' as const, ownership: 'catalog' as const, provenance: { ...canonical.provenance, source: 'GPX import' } };
  const raw = serializeStoredRouteRecords([changed]);
  const plans = parseStoredRoutes(raw);
  const roundTrip = JSON.parse(serializeStoredRoutes(plans)) as { routes: Array<{ origin: string; ownership: string; provenance: { source: string } }> };
  assert.equal(roundTrip.routes[0].origin, 'generated');
  assert.equal(roundTrip.routes[0].ownership, 'catalog');
  assert.equal(roundTrip.routes[0].provenance.source, 'GPX import');
});

test('route storage rejects unknown versions and serializes compatible RoutePlan callers as v2', () => {
  assert.deepEqual(readStoredRouteRecords(JSON.stringify({ version: 99, routes: [NBH_LOOP] })).routes, []);
  const payload = JSON.parse(serializeStoredRoutes([NBH_LOOP])) as { version: number; routes: Array<{ origin: string; ownership: string }> };
  assert.equal(payload.version, 2);
  assert.equal(payload.routes.length, 1);
  assert.equal(payload.routes[0].origin, 'pilot');
  assert.equal(payload.routes[0].ownership, 'catalog');
  assert.equal(parseStoredRoutes(JSON.stringify({ version: 1, routes: [NBH_LOOP] })).length, 1);
});

test('v2 serialization does not silently truncate valid personal routes', () => {
  const routes = Array.from({ length: 40 }, (_, index) => ({ ...NBH_LOOP, id: `drawn-${index}`, source: 'Drawn on device' }));
  const payload = JSON.parse(serializeStoredRoutes(routes)) as { version: number; routes: unknown[] };
  assert.equal(payload.version, 2);
  assert.equal(payload.routes.length, 40);
});
