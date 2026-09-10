import assert from "node:assert/strict";
import test from "node:test";
import {
  NBH_CATALOG,
  NBH_CORRIDOR,
  NBH_CUSTOMER_NAMES,
  NBH_FAMILY,
  NBH_LOOP,
  NBH_PREVIEW_VARIANT,
  NBH_REVISION,
} from "./seed";
import {
  createActiveRideSnapshot,
  createRouteRepository,
  routePlanFromRecord,
  routeRecordFromPlan,
  routeRecordFromRevision,
} from "./routeRepository";

const catalogMetadata = {
  origin: "pilot" as const,
  ownership: "catalog" as const,
  geometry: { kind: "recorded_trace" as const, status: "ready" as const },
  roadEvidenceStatus: "pilot_pending" as const,
  provenance: { source: "Bahrain Tourism" },
};

test("NBH has one truthful, linked preview revision", () => {
  assert.deepEqual(NBH_CUSTOMER_NAMES, {
    short: "NBH Loop",
    full: "Nasser bin Hamad Loop",
    arabic: "حلقة ناصر بن حمد",
  });
  assert.equal(NBH_FAMILY.variants.length, 1);
  assert.equal(NBH_PREVIEW_VARIANT.direction, "unknown");
  assert.equal(NBH_PREVIEW_VARIANT.label, "Standard clockwise");
  assert.equal(NBH_PREVIEW_VARIANT.availability, "preview");
  assert.equal(NBH_REVISION.reviewStatus, "pending");
  assert.equal(NBH_LOOP.name, "NBH Loop");
  assert.equal(NBH_LOOP.nameAr, "حلقة ناصر بن حمد");
  assert.doesNotMatch(NBH_LOOP.name, /MBH|pilot trace/i);

  assert.equal(NBH_LOOP.distanceKm, 21.8);
  assert.equal(NBH_PREVIEW_VARIANT.distanceKm, 21.8);
  assert.equal(NBH_REVISION.distanceKm, 21.8);
  assert.equal(NBH_CORRIDOR.distancesKm.at(-1), 21.8);
  assert.equal(NBH_LOOP.points.at(-1)?.distanceKm, 21.8);
  assert.ok(
    NBH_LOOP.points.every((point) => point.suitability.kind === "unknown"),
  );
  assert.equal(NBH_REVISION.corridor, NBH_CORRIDOR);
  assert.equal(NBH_PREVIEW_VARIANT.currentRevision, NBH_REVISION);
  assert.equal(NBH_PREVIEW_VARIANT.currentRevisionId, NBH_REVISION.id);
  assert.equal(NBH_CORRIDOR.variantId, NBH_PREVIEW_VARIANT.id);
  assert.equal(NBH_CORRIDOR.revisionId, NBH_REVISION.id);
});

test("catalog selection and snapshots retain the exact NBH revision linkage", () => {
  const record = routeRecordFromRevision(
    NBH_LOOP,
    NBH_REVISION,
    catalogMetadata,
  );
  assert.deepEqual(
    {
      familyId: record.familyId,
      variantId: record.variantId,
      revisionId: record.revisionId,
      revision: record.revision,
    },
    {
      familyId: NBH_FAMILY.id,
      variantId: NBH_PREVIEW_VARIANT.id,
      revisionId: NBH_REVISION.id,
      revision: NBH_REVISION.revision,
    },
  );
  assert.equal(record.analysis?.distanceKm, 21.8);
  assert.equal(record.corridor?.distancesKm.at(-1), 21.8);
  assert.equal(routePlanFromRecord(record).distanceKm, 21.8);
  assert.equal(routePlanFromRecord(record).revision, NBH_REVISION.revision);

  const repository = createRouteRepository([record], NBH_CATALOG);
  const selected = repository.selectVariant(
    NBH_FAMILY.id,
    NBH_PREVIEW_VARIANT.id,
  );
  assert.equal(selected?.revisionId, NBH_REVISION.id);
  assert.equal(
    repository.getRevision(NBH_FAMILY.id, NBH_PREVIEW_VARIANT.id)?.corridor
      .revisionId,
    NBH_REVISION.id,
  );

  const snapshot = createActiveRideSnapshot(record, "2026-09-10T14:40:00Z");
  assert.equal(snapshot.familyId, NBH_FAMILY.id);
  assert.equal(snapshot.variantId, NBH_PREVIEW_VARIANT.id);
  assert.equal(snapshot.revisionId, NBH_REVISION.id);
  assert.equal(snapshot.route.corridor?.revisionId, NBH_REVISION.id);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.route), true);
});

test("route plan preserves fallback distance for every geometry status", () => {
  const record = routeRecordFromRevision(
    NBH_LOOP,
    NBH_REVISION,
    catalogMetadata,
  );
  const statuses = ["draft", "matching", "ready", "unavailable"] as const;
  const fallbackCases = [
    {
      label: "geometry distance index",
      expected: 12.4,
      update: (route: typeof record) => ({
        ...route,
        geometry: { ...route.geometry, distancesKm: [0, 12.4] },
        corridor: { ...route.corridor!, distancesKm: [0, 11.2] },
        points: route.points.map((point, index, points) => index === points.length - 1
          ? { ...point, distanceKm: 10.1 }
          : point),
        analysis: undefined,
      }),
    },
    {
      label: "corridor distance index",
      expected: 11.2,
      update: (route: typeof record) => ({
        ...route,
        geometry: { ...route.geometry, distancesKm: undefined },
        corridor: { ...route.corridor!, distancesKm: [0, 11.2] },
        points: route.points.map((point, index, points) => index === points.length - 1
          ? { ...point, distanceKm: 10.1 }
          : point),
        analysis: undefined,
      }),
    },
    {
      label: "waypoint cumulative distance",
      expected: 10.1,
      update: (route: typeof record) => ({
        ...route,
        geometry: { ...route.geometry, distancesKm: undefined },
        corridor: undefined,
        points: route.points.map((point, index, points) => index === points.length - 1
          ? { ...point, distanceKm: 10.1 }
          : point),
        analysis: undefined,
      }),
    },
  ] as const;

  for (const status of statuses) {
    for (const fallbackCase of fallbackCases) {
      const unresolved = fallbackCase.update({
        ...record,
        geometry: { ...record.geometry, status },
      });
      assert.equal(
        routePlanFromRecord(unresolved).distanceKm,
        fallbackCase.expected,
        `${fallbackCase.label} should survive ${status} geometry`,
      );
    }
  }

  const analyzed = {
    ...record,
    geometry: { ...record.geometry, status: "matching" as const, distancesKm: [0, 12.4] },
    analysis: { ...record.analysis!, distanceKm: 99.9 },
  };
  assert.equal(routePlanFromRecord(analyzed).distanceKm, 99.9);
});

test("legacy NBH display names are normalized without changing personal route compatibility", () => {
  const legacy = routeRecordFromPlan(
    {
      ...NBH_LOOP,
      name: "Nasser bin Hamad Loop · pilot trace",
      nameAr: "حلقة ناصر بن حمد · تتبع تجريبي",
    },
    catalogMetadata,
  );
  assert.equal(legacy.name, "NBH Loop");
  assert.equal(legacy.nameAr, "حلقة ناصر بن حمد");
  assert.equal(legacy.analysis?.distanceKm, 21.8);
});
