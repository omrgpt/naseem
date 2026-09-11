import assert from 'node:assert/strict';
import test from 'node:test';
import { NBH_LOOP } from './seed';
import { clearRouteGeometryCache, resolveRoadGeometry, routerConfig } from './routeRouter';

const originalFetch = globalThis.fetch;

test('road matcher returns detailed geometry and authoritative routed distance', async () => {
  globalThis.fetch = (async (input) => {
    const url = String(input);
    assert.match(url, /routed-bike\/route\/v1\/driving/);
    assert.match(url, /50\.498300,25\.988800/);
    return new Response(JSON.stringify({
      code: 'Ok',
      waypoints: NBH_LOOP.points.map((point) => ({ location: [point.longitude, point.latitude], distance: 0 })),
      routes: [{
        distance: 21_800,
        duration: 3_600,
        legs: [{ distance: 4_300, duration: 700 }, { distance: 6_200, duration: 900 }, { distance: 7_000, duration: 1_100 }, { distance: 4_300, duration: 900 }],
        geometry: { type: 'LineString', coordinates: [
          [50.4983, 25.9888], [50.51, 26.002], [50.53, 26.015], [50.54, 25.98],
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
    assert.deepEqual(resolved.legDistancesKm, [4.3, 6.2, 7, 4.3]);
    assert.equal(resolved.routedDistanceKm, 21.8);
    assert.ok((resolved.geometry?.length ?? 0) > resolved.points.length);
    assert.equal(resolved.geometrySource, `${routerConfig.sourceLabel} · suitability audit pending`);
  } finally {
    globalThis.fetch = originalFetch;
    clearRouteGeometryCache();
  }
});

test('road matcher requires explicit LineString geometry metadata', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    waypoints: NBH_LOOP.points.map((point) => ({ location: [point.longitude, point.latitude], distance: 0 })),
    routes: [{
      distance: 21_800,
      duration: 3_600,
      legs: [{ distance: 4_300, duration: 700 }, { distance: 6_200, duration: 900 }, { distance: 7_000, duration: 1_100 }, { distance: 4_300, duration: 900 }],
      geometry: { coordinates: [
        [50.4983, 25.9888], [50.51, 26.002], [50.53, 26.015], [50.54, 25.98],
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

test('road matcher rejects a snapped intermediate waypoint that is absent from the returned geometry', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    waypoints: NBH_LOOP.points.map((point) => ({ location: [point.longitude, point.latitude], distance: 0 })),
    routes: [{
      distance: 21_800,
      duration: 3_600,
      legs: [{ distance: 4_300, duration: 700 }, { distance: 6_200, duration: 900 }, { distance: 7_000, duration: 1_100 }, { distance: 4_300, duration: 900 }],
      geometry: { type: 'LineString', coordinates: [
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

test('road matcher rejects snapped waypoints that are on the geometry in the wrong order', async () => {
  const points = NBH_LOOP.points.slice(0, 4).map((point, index) => ({
    ...point,
    latitude: 26.1 + index * 0.01,
    longitude: 50.5,
    distanceKm: index,
  }));
  const route = { ...NBH_LOOP, id: 'ordered-waypoint-route', points };
  const start = [50.5, 26.1];
  const firstIntermediate = [50.5, 26.11];
  const secondIntermediate = [50.5, 26.12];
  const finish = [50.5, 26.13];
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    waypoints: [start, firstIntermediate, secondIntermediate, finish].map((location) => ({ location, distance: 0 })),
    routes: [{
      distance: 3_336,
      duration: 3_000,
      legs: [{ distance: 1_112, duration: 1_000 }, { distance: 1_112, duration: 1_000 }, { distance: 1_112, duration: 1_000 }],
      geometry: { type: 'LineString', coordinates: [start, secondIntermediate, firstIntermediate, finish] },
    }],
  }), { status: 200 })) as typeof fetch;
  try {
    assert.equal(await resolveRoadGeometry(route), null);
  } finally {
    globalThis.fetch = originalFetch;
    clearRouteGeometryCache();
  }
});

test('road matcher enforces the configured geometry point cap', async () => {
  const points = [
    { ...NBH_LOOP.points[0], latitude: 26.1, longitude: 50.5, distanceKm: 0 },
    { ...NBH_LOOP.points[1], latitude: 26.11, longitude: 50.5, distanceKm: 1.112 },
  ];
  const coordinates = Array.from({ length: routerConfig.maxGeometryPoints + 1 }, (_, index) => [50.5, 26.1 + (0.01 * index) / routerConfig.maxGeometryPoints]);
  const route = { ...NBH_LOOP, id: 'geometry-cap-route', points };
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    waypoints: points.map((point) => ({ location: [point.longitude, point.latitude], distance: 0 })),
    routes: [{
      distance: 1_112,
      duration: 60,
      legs: [{ distance: 1_112, duration: 60 }],
      geometry: { type: 'LineString', coordinates },
    }],
  }), { status: 200 })) as typeof fetch;
  try {
    assert.equal(await resolveRoadGeometry(route), null);
  } finally {
    globalThis.fetch = originalFetch;
    clearRouteGeometryCache();
  }
});

test('router fingerprints retain request precision instead of merging nearby routes', async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(JSON.stringify({
      code: 'Ok',
      waypoints: NBH_LOOP.points.map((point) => ({ location: [point.longitude, point.latitude], distance: 0 })),
      routes: [{
        distance: 21_800,
        duration: 3_600,
        legs: [{ distance: 4_300, duration: 700 }, { distance: 6_200, duration: 900 }, { distance: 7_000, duration: 1_100 }, { distance: 4_300, duration: 900 }],
        geometry: { type: 'LineString', coordinates: [
          [50.4983, 25.9888], [50.51, 26.002], [50.53, 26.015], [50.54, 25.98],
          [50.54, 25.96], [50.50, 25.955], [50.47, 25.96], [50.48, 25.98], [50.4983, 25.9888],
        ] },
      }],
    }), { status: 200 });
  }) as typeof fetch;
  try {
    const nearby = { ...NBH_LOOP, points: NBH_LOOP.points.map((point, index) => index === 0 ? { ...point, longitude: point.longitude + 0.000004 } : point) };
    await resolveRoadGeometry(NBH_LOOP);
    await resolveRoadGeometry(nearby);
    assert.equal(calls, 2);
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
      waypoints: NBH_LOOP.points.map((point) => ({ location: [point.longitude, point.latitude], distance: 0 })),
      routes: [{
        distance: 21_800,
        duration: 3_600,
        legs: [{ distance: 4_300, duration: 700 }, { distance: 6_200, duration: 900 }, { distance: 7_000, duration: 1_100 }, { distance: 4_300, duration: 900 }],
        geometry: { type: 'LineString', coordinates: [
          [50.4983, 25.9888], [50.51, 26.002], [50.53, 26.015], [50.54, 25.98],
          [50.54, 25.96], [50.50, 25.955], [50.47, 25.96], [50.48, 25.98], [50.4983, 25.9888],
        ] },
      }],
    }), { status: 200 });
  }) as typeof fetch;
  try {
    const first = await resolveRoadGeometry(NBH_LOOP);
    const second = await resolveRoadGeometry({ ...NBH_LOOP, id: 'same-shape-different-route' });
    const cached = await resolveRoadGeometry(NBH_LOOP);
    assert.equal(first?.geometryStatus, 'ready');
    assert.equal(first?.geometryKind, 'road_matched');
    assert.equal(first?.distanceStatus, 'authoritative');
    assert.equal(second?.geometryStatus, 'ready');
    assert.equal(second?.geometryKind, 'road_matched');
    assert.equal(second?.distanceStatus, 'authoritative');
    assert.equal(cached?.geometryStatus, 'ready');
    assert.equal(cached?.geometryKind, 'road_matched');
    assert.equal(cached?.distanceStatus, 'authoritative');
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

test('road matcher rejects numeric geometry when leg metadata is incomplete', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    waypoints: NBH_LOOP.points.map((point) => ({ location: [point.longitude, point.latitude], distance: 0 })),
    routes: [{
      distance: 21_800,
      duration: 3_600,
      legs: [{ distance: 4_300 }, { distance: 6_200 }, { distance: 7_000 }, { distance: 4_300 }],
      geometry: { type: 'LineString', coordinates: [
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

test('road matcher rejects a response without waypoint metadata', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    routes: [{
      distance: 21_800,
      duration: 3_600,
      legs: [{ distance: 4_300, duration: 700 }, { distance: 6_200, duration: 900 }, { distance: 7_000, duration: 1_100 }, { distance: 4_300, duration: 900 }],
      geometry: { type: 'LineString', coordinates: [
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

test('road matcher rejects cumulative geometry distance that disagrees with the route total', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    waypoints: NBH_LOOP.points.map((point) => ({ location: [point.longitude, point.latitude], distance: 0 })),
    routes: [{
      distance: 30_000,
      duration: 3_600,
      legs: [{ distance: 7_500, duration: 700 }, { distance: 7_500, duration: 900 }, { distance: 7_500, duration: 1_100 }, { distance: 7_500, duration: 900 }],
      geometry: { type: 'LineString', coordinates: [
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

test('road matcher rejects a route duration that disagrees with complete leg durations', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    code: 'Ok',
    waypoints: NBH_LOOP.points.map((point) => ({ location: [point.longitude, point.latitude], distance: 0 })),
    routes: [{
      distance: 21_800,
      duration: 7_200,
      legs: [{ distance: 4_300, duration: 700 }, { distance: 6_200, duration: 900 }, { distance: 7_000, duration: 1_100 }, { distance: 4_300, duration: 900 }],
      geometry: { type: 'LineString', coordinates: [
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
