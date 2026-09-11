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
