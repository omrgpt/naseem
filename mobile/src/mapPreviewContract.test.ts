import assert from "node:assert/strict";
import test from "node:test";
import * as mapPreviewContract from "./mapPreviewContract";
import {
  hasFiniteCoordinate,
  shouldShowMinimalMapControls,
  shouldShowUserLocationControl,
} from "./mapPreviewContract";

test("compact minimal previews hide the fit and zoom toolbar", () => {
  assert.equal(shouldShowMinimalMapControls(true, true), false);
});

test("full route-review minimal maps keep the fit and zoom toolbar", () => {
  assert.equal(shouldShowMinimalMapControls(false, true), true);
});

test("non-minimal maps do not render the minimal toolbar", () => {
  assert.equal(shouldShowMinimalMapControls(false, false), false);
});

test("current-location control requires opt-in and a finite coordinate", () => {
  assert.equal(
    shouldShowUserLocationControl(true, {
      latitude: 26.2235,
      longitude: 50.5876,
    }),
    true,
  );
  assert.equal(
    shouldShowUserLocationControl(false, {
      latitude: 26.2235,
      longitude: 50.5876,
    }),
    false,
  );
  assert.equal(
    shouldShowUserLocationControl(true, {
      latitude: Number.NaN,
      longitude: 50.5876,
    }),
    false,
  );
  assert.equal(
    shouldShowUserLocationControl(true, {
      latitude: 26.2235,
      longitude: Number.POSITIVE_INFINITY,
    }),
    false,
  );
  assert.equal(shouldShowUserLocationControl(true), false);
});

test("coordinate validation rejects null, pole latitudes, and out-of-range values", () => {
  assert.equal(hasFiniteCoordinate(null), false);
  assert.equal(hasFiniteCoordinate({ latitude: 90, longitude: 50.5 }), false);
  assert.equal(hasFiniteCoordinate({ latitude: -90, longitude: 50.5 }), false);
  assert.equal(hasFiniteCoordinate({ latitude: 26.2, longitude: 181 }), false);
  assert.equal(hasFiniteCoordinate({ latitude: 26.2, longitude: -181 }), false);
  assert.equal(
    shouldShowUserLocationControl(true, {
      latitude: 90,
      longitude: 50.5,
    }),
    false,
  );
  assert.equal(shouldShowUserLocationControl(true, null), false);
});

test("map controls stay above the bottom safe zone on phone and desktop surfaces", () => {
  const mapControlLayout = (
    mapPreviewContract as typeof mapPreviewContract & {
      mapControlLayout?: (viewport: { width: number; height: number }, mapHeight: number, controlHeight: number) => {
        top: number;
        bottom: number;
        visible: boolean;
      };
    }
  ).mapControlLayout;
  assert.equal(typeof mapControlLayout, "function");
  if (!mapControlLayout) return;

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1280, height: 720 },
  ]) {
    const layout = mapControlLayout(viewport, 448, 146);
    assert.equal(layout.visible, true);
    assert.ok(layout.top >= 0);
    assert.ok(layout.bottom >= 88);
  }
});

test("available map rectangles preserve host size and subtract sheet/navigation obstructions", () => {
  const createMapAvailableRect = (
    mapPreviewContract as typeof mapPreviewContract & {
      createMapAvailableRect?: (
        host: { width: number; height: number },
        obstruction?: {
          top?: number;
          right?: number;
          bottom?: number;
          left?: number;
          sheet?: number;
          navigation?: number;
        },
      ) => {
        host: { width: number; height: number };
        obstruction: { sheet: number; navigation: number };
        insets: { top: number; right: number; bottom: number; left: number };
        available: { width: number; height: number };
      };
    }
  ).createMapAvailableRect;
  assert.equal(typeof createMapAvailableRect, "function");
  if (!createMapAvailableRect) return;

  assert.deepEqual(
    createMapAvailableRect(
      { width: 390, height: 520 },
      { top: 12, right: 8, left: 8, sheet: 28, navigation: 112 },
    ),
    {
      host: { width: 390, height: 520 },
      obstruction: { sheet: 28, navigation: 112 },
      insets: { top: 12, right: 8, bottom: 112, left: 8 },
      available: { width: 374, height: 396 },
    },
  );
});

test("map controls include the largest bottom obstruction in their safe zone", () => {
  const createMapAvailableRect = (
    mapPreviewContract as typeof mapPreviewContract & {
      createMapAvailableRect?: (
        host: { width: number; height: number },
        obstruction?: { sheet?: number; navigation?: number },
      ) => {
        host: { width: number; height: number };
        insets: { top: number; right: number; bottom: number; left: number };
      };
    }
  ).createMapAvailableRect;
  const mapControlLayout = (
    mapPreviewContract as typeof mapPreviewContract & {
      mapControlLayout?: (
        viewport: { width: number; height: number },
        mapHeight: number,
        controlHeight: number,
        insets?: { top?: number; right?: number; bottom?: number; left?: number },
      ) => { top: number; bottom: number; visible: boolean };
    }
  ).mapControlLayout;
  assert.equal(typeof createMapAvailableRect, "function");
  assert.equal(typeof mapControlLayout, "function");
  if (!createMapAvailableRect || !mapControlLayout) return;

  const rect = createMapAvailableRect(
    { width: 390, height: 320 },
    { sheet: 28, navigation: 112 },
  );
  const controls = mapControlLayout(
    rect.host,
    rect.host.height,
    146,
    rect.insets,
  );
  assert.equal(controls.visible, true);
  assert.ok(controls.bottom >= 120);
  assert.ok(controls.top >= rect.insets.top);
});

test("route detail controls fit between a small phone top bar and sheet", () => {
  const createMapAvailableRect = (
    mapPreviewContract as typeof mapPreviewContract & {
      createMapAvailableRect?: (
        host: { width: number; height: number },
        obstruction?: { top?: number; sheet?: number },
      ) => {
        host: { width: number; height: number };
        insets: { top: number; right: number; bottom: number; left: number };
      };
    }
  ).createMapAvailableRect;
  const mapControlLayout = (
    mapPreviewContract as typeof mapPreviewContract & {
      mapControlLayout?: (
        viewport: { width: number; height: number },
        mapHeight: number,
        controlHeight: number,
        insets?: { top?: number; right?: number; bottom?: number; left?: number },
      ) => { top: number; bottom: number; visible: boolean };
    }
  ).mapControlLayout;
  assert.equal(typeof createMapAvailableRect, "function");
  assert.equal(typeof mapControlLayout, "function");
  if (!createMapAvailableRect || !mapControlLayout) return;

  const rect = createMapAvailableRect(
    { width: 320, height: 248 },
    { top: 58, sheet: 28 },
  );
  const controls = mapControlLayout(rect.host, rect.host.height, 146, rect.insets);
  assert.equal(controls.bottom, 36);
  assert.equal(controls.visible, true);
  assert.ok(controls.top >= rect.insets.top);
  assert.ok(controls.top + 146 <= rect.host.height - rect.insets.bottom);
});

test("route detail switches from a phone sheet to a non-overlapping desktop split", () => {
  const routeDetailSurfaceLayout = (
    mapPreviewContract as typeof mapPreviewContract & {
      routeDetailSurfaceLayout?: (viewport: { width: number; height: number }) => {
        mode: "mobile" | "desktop";
        obstruction: { sheet: number; navigation: number };
      };
    }
  ).routeDetailSurfaceLayout;
  assert.equal(typeof routeDetailSurfaceLayout, "function");
  if (!routeDetailSurfaceLayout) return;

  assert.deepEqual(routeDetailSurfaceLayout({ width: 390, height: 844 }), {
    mode: "mobile",
    obstruction: { sheet: 28, navigation: 0 },
  });
  assert.deepEqual(routeDetailSurfaceLayout({ width: 1280, height: 720 }), {
    mode: "desktop",
    obstruction: { sheet: 0, navigation: 0 },
  });
});

test("native provider falls back without a configured Google key", () => {
  const selectMapProvider = (
    mapPreviewContract as typeof mapPreviewContract & {
      selectMapProvider?: (input: {
        platform: "web" | "ios" | "android";
        googleMapsApiKey?: string;
      }) => string;
    }
  ).selectMapProvider;
  assert.equal(typeof selectMapProvider, "function");
  if (!selectMapProvider) return;

  assert.equal(
    selectMapProvider({ platform: "android", googleMapsApiKey: "" }),
    "native-fallback",
  );
  assert.equal(
    selectMapProvider({ platform: "android", googleMapsApiKey: "configured" }),
    "react-native-maps",
  );
  assert.equal(selectMapProvider({ platform: "ios" }), "react-native-maps");
  assert.equal(selectMapProvider({ platform: "web" }), "openstreetmap");
});

test("native provider fallback does not expose inert map controls", () => {
  const shouldShowNativeMapControls = (
    mapPreviewContract as typeof mapPreviewContract & {
      shouldShowNativeMapControls?: (nativeMapUnavailable: boolean) => boolean;
    }
  ).shouldShowNativeMapControls;
  assert.equal(typeof shouldShowNativeMapControls, "function");
  if (typeof shouldShowNativeMapControls !== "function") return;

  assert.equal(shouldShowNativeMapControls(true), false);
  assert.equal(shouldShowNativeMapControls(false), true);
});

test("marker hit targets meet the minimum touch size", () => {
  const markerHitSize = (
    mapPreviewContract as typeof mapPreviewContract & {
      MAP_MARKER_HIT_SIZE?: number;
    }
  ).MAP_MARKER_HIT_SIZE;
  assert.equal(typeof markerHitSize, "number");
  if (typeof markerHitSize !== "number") return;
  assert.ok(markerHitSize >= 44);
});

test("marker hit target layout keeps the outer web target at the shared size", () => {
  const markerHitTarget = (
    mapPreviewContract as typeof mapPreviewContract & {
      MAP_MARKER_HIT_TARGET?: { width: number; height: number };
    }
  ).MAP_MARKER_HIT_TARGET;
  assert.equal(typeof markerHitTarget, "object");
  if (!markerHitTarget) return;

  assert.deepEqual(markerHitTarget, { width: 44, height: 44 });
});

test("center placement rejects non-finite unproject results before dispatch", () => {
  const validMapPressCoordinate = (
    mapPreviewContract as typeof mapPreviewContract & {
      validMapPressCoordinate?: (coordinate: unknown) =>
        | { latitude: number; longitude: number }
        | undefined;
    }
  ).validMapPressCoordinate;
  assert.equal(typeof validMapPressCoordinate, "function");
  if (typeof validMapPressCoordinate !== "function") return;

  assert.deepEqual(
    validMapPressCoordinate({ latitude: 26.2, longitude: 50.5 }),
    { latitude: 26.2, longitude: 50.5 },
  );
  assert.equal(
    validMapPressCoordinate({ latitude: Number.NaN, longitude: 50.5 }),
    undefined,
  );
  assert.equal(
    validMapPressCoordinate({ latitude: 26.2, longitude: Number.POSITIVE_INFINITY }),
    undefined,
  );
});

test("map layer boundary keeps forecast and selection state screen-owned", () => {
  const boundary = (
    mapPreviewContract as typeof mapPreviewContract & {
      MAP_LAYER_BOUNDARY?: {
        route: string;
        access: string;
        forecast: string;
        selection: string;
        livePosition: string;
      };
    }
  ).MAP_LAYER_BOUNDARY;
  assert.deepEqual(boundary, {
    route: "renderer",
    access: "renderer",
    forecast: "screen",
    selection: "screen",
    livePosition: "screen-supplied",
  });
});
