import assert from 'node:assert/strict';
import test from 'node:test';
import { NBH_LOOP } from './seed';
import { clearRouteGeometryCache, resolveRoadGeometry } from './routeRouter';

const originalFetch = globalThis.fetch;

test('road matcher returns detailed geometry and authoritative routed distance', async () => {
  globalThis.fetch = (async (input) => {
    const url = String(input);
    assert.match(url, /routed-bike\/route\/v1\/driving/);
    assert.match(url, /50\.498300,25\.988800/);
    return new Response(JSON.stringify({
      code: 'Ok',
      waypoints: NBH_LOOP.points.map((point) => ({ location: [point.longitude, point.latitude] })),
      routes: [{
        distance: 21_800,
        legs: [{ distance: 4_300 }, { distance: 6_200 }, { distance: 7_000 }, { distance: 4_300 }],
        geometry: { coordinates: [
          [50.4983, 25.9888], [50.51, 26.002], [50.54, 25.98],
          [50.54, 25.96], [50.50, 25.955], [50.47, 25.96], [50.48, 25.98], [50.4983, 25.9888],
        ] },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  try {
    const resolved = await resolveRoadGeometry(NBH_LOOP);
    assert.ok(resolved);
    assert.equal(resolved.distanceKm, 21.8);
    assert.equal(resolved.points.at(-1)?.distanceKm, 21.8);
    assert.ok((resolved.geometry?.length ?? 0) > resolved.points.length);
    assert.equal(resolved.geometrySource, 'OpenStreetMap routed-bike preview · suitability audit pending');
  } finally {
    globalThis.fetch = originalFetch;
    clearRouteGeometryCache();
  }
});

test('road matcher rejects a router response without a complete leg list', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: 1_000, legs: [], geometry: { coordinates: [[50.5, 26.1], [50.51, 26.11]] } }] }), { status: 200 })) as typeof fetch;
  try {
    assert.equal(await resolveRoadGeometry(NBH_LOOP), null);
  } finally {
    globalThis.fetch = originalFetch;
    clearRouteGeometryCache();
  }
});

test('router cache does not reuse one route identity for another route with the same waypoints', async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(JSON.stringify({
      code: 'Ok',
      waypoints: NBH_LOOP.points.map((point) => ({ location: [point.longitude, point.latitude] })),
      routes: [{
        distance: 21_800,
        legs: [{ distance: 4_300 }, { distance: 6_200 }, { distance: 7_000 }, { distance: 4_300 }],
        geometry: { coordinates: [
          [50.4983, 25.9888], [50.51, 26.002], [50.54, 25.98],
          [50.54, 25.96], [50.50, 25.955], [50.47, 25.96], [50.48, 25.98], [50.4983, 25.9888],
        ] },
      }],
    }), { status: 200 });
  }) as typeof fetch;
  try {
    await resolveRoadGeometry(NBH_LOOP);
    await resolveRoadGeometry({ ...NBH_LOOP, id: 'same-shape-different-route' });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    clearRouteGeometryCache();
  }
});

test('road matcher rejects malformed geometry instead of filtering invalid points', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    routes: [{
      distance: 21_800,
      legs: [{ distance: 4_300 }, { distance: 6_200 }, { distance: 7_000 }, { distance: 4_300 }],
      geometry: { coordinates: [
        [50.4983, 25.9888],
        ['not-a-longitude', 26.002],
        [50.53, 26.015],
      ] },
    }],
  }), { status: 200 })) as typeof fetch;
  try {
    assert.equal(await resolveRoadGeometry(NBH_LOOP), null);
  } finally {
    globalThis.fetch = originalFetch;
    clearRouteGeometryCache();
  }
});

test('road matcher rejects geometry whose endpoints do not match requested waypoints', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    routes: [{
      distance: 21_800,
      legs: [{ distance: 4_300 }, { distance: 6_200 }, { distance: 7_000 }, { distance: 4_300 }],
      geometry: { coordinates: [
        [50.7, 26.3],
        [50.71, 26.31],
      ] },
    }],
  }), { status: 200 })) as typeof fetch;
  try {
    assert.equal(await resolveRoadGeometry(NBH_LOOP), null);
  } finally {
    globalThis.fetch = originalFetch;
    clearRouteGeometryCache();
  }
});

test('road matcher rejects malformed snapped waypoints instead of falling back to requested points', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    waypoints: [
      { location: [50.4983, 25.9888] },
      { location: ['invalid', 26.015] },
      { location: [50.54, 25.96] },
      { location: [50.47, 25.96] },
      { location: [50.4983, 25.9888] },
    ],
    routes: [{
      distance: 21_800,
      legs: [{ distance: 4_300 }, { distance: 6_200 }, { distance: 7_000 }, { distance: 4_300 }],
      geometry: { coordinates: [
        [50.4983, 25.9888], [50.51, 26.002], [50.54, 25.98],
        [50.54, 25.96], [50.50, 25.955], [50.47, 25.96], [50.48, 25.98], [50.4983, 25.9888],
      ] },
    }],
  }), { status: 200 })) as typeof fetch;
  try {
    assert.equal(await resolveRoadGeometry(NBH_LOOP), null);
  } finally {
    globalThis.fetch = originalFetch;
    clearRouteGeometryCache();
  }
});

test('road matcher rejects inconsistent distance metadata', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    routes: [{
      distance: 21_800,
      legs: [{ distance: 100 }, { distance: 100 }, { distance: 100 }, { distance: 100 }],
      geometry: { coordinates: [
        [50.4983, 25.9888], [50.51, 26.002], [50.54, 25.98],
        [50.54, 25.96], [50.50, 25.955], [50.47, 25.96], [50.48, 25.98], [50.4983, 25.9888],
      ] },
    }],
  }), { status: 200 })) as typeof fetch;
  try {
    assert.equal(await resolveRoadGeometry(NBH_LOOP), null);
  } finally {
    globalThis.fetch = originalFetch;
    clearRouteGeometryCache();
  }
});

test('road matcher rejects a total distance that would make geometry distances decrease', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    routes: [{
      distance: 1_000,
      legs: [{ distance: 250 }, { distance: 250 }, { distance: 250 }, { distance: 250 }],
      geometry: { coordinates: [
        [50.4983, 25.9888], [50.51, 26.002], [50.54, 25.98],
        [50.54, 25.96], [50.50, 25.955], [50.47, 25.96], [50.48, 25.98], [50.4983, 25.9888],
      ] },
    }],
  }), { status: 200 })) as typeof fetch;
  try {
    assert.equal(await resolveRoadGeometry(NBH_LOOP), null);
  } finally {
    globalThis.fetch = originalFetch;
    clearRouteGeometryCache();
  }
});
