import type { Coordinate } from "./domain";

export type MapProvider = "openstreetmap" | "react-native-maps";

export type MapControlLayout = {
  top: number;
  bottom: number;
  visible: boolean;
};

/** Keep bottom-anchored map controls clear of the fixed navigation/sheet zone. */
export const MAP_BOTTOM_SAFE_ZONE = 88;
export const MAP_CONTROL_CLEARANCE = 8;

export function mapControlLayout(
  viewport: { width: number; height: number },
  mapHeight: number,
  controlHeight: number,
): MapControlLayout {
  const availableHeight = Math.min(
    Math.max(0, Number.isFinite(mapHeight) ? mapHeight : 0),
    Math.max(0, Number.isFinite(viewport.height) ? viewport.height : 0),
  );
  const bottom = MAP_BOTTOM_SAFE_ZONE + MAP_CONTROL_CLEARANCE;
  const safeControlHeight = Math.max(
    0,
    Number.isFinite(controlHeight) ? controlHeight : 0,
  );
  return {
    top: Math.max(0, availableHeight - bottom - safeControlHeight),
    bottom,
    visible: availableHeight >= bottom + safeControlHeight,
  };
}

/**
 * Provider selection is deliberately provider-neutral: web uses the visible-
 * attribution OSM fallback and native keeps the existing react-native-maps
 * default. A key alone never opts the app into an unverified provider.
 */
export function selectMapProvider(input: {
  platform: "web" | "ios" | "android";
  googleMapsApiKey?: string;
}): MapProvider {
  void input.googleMapsApiKey;
  return input.platform === "web" ? "openstreetmap" : "react-native-maps";
}

/**
 * Compact previews are intentionally quiet. The minimal fit/zoom toolbar is
 * reserved for full route-review surfaces so web and native expose the same
 * controls for the same map mode.
 */
export function shouldShowMinimalMapControls(
  compact: boolean,
  minimal: boolean,
): boolean {
  return !compact && minimal;
}

export function hasFiniteCoordinate(
  coordinate?: Coordinate,
): coordinate is Coordinate {
  return Boolean(
    coordinate &&
      Number.isFinite(coordinate.latitude) &&
      Number.isFinite(coordinate.longitude),
  );
}

export function shouldShowUserLocationControl(
  showUserLocation: boolean,
  coordinate?: Coordinate,
): boolean {
  return showUserLocation && hasFiniteCoordinate(coordinate);
}
