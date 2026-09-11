import type { Coordinate } from "./domain";

export type MapProvider =
  | "openstreetmap"
  | "react-native-maps"
  | "native-fallback";

export const MAP_MARKER_HIT_SIZE = 44;

/**
 * MapPreview renders route/access evidence and supplied live-position data.
 * Forecast data and durable selection state remain owned by their screens;
 * marker callbacks and endpoint labels cross this boundary without mutating
 * that screen state.
 */
export const MAP_LAYER_BOUNDARY = {
  route: "renderer",
  access: "renderer",
  forecast: "screen",
  selection: "screen",
  livePosition: "screen-supplied",
} as const;

export type MapDisplayBounds = {
  coordinates: Coordinate[];
  center: Coordinate;
  latitudeDelta: number;
  longitudeDelta: number;
};

const DEFAULT_MAP_CENTER: Coordinate = { latitude: 26.18, longitude: 50.53 };
const DEFAULT_LATITUDE_DELTA = 0.08;
const DEFAULT_LONGITUDE_DELTA = 0.12;
const MIN_DISPLAY_DELTA = 0.01;
const DISPLAY_PADDING = 1.2;

export type MapControlLayout = {
  top: number;
  bottom: number;
  visible: boolean;
};

/** Keep bottom-anchored map controls clear of the fixed navigation/sheet zone. */
export const MAP_BOTTOM_SAFE_ZONE = 88;
export const MAP_CONTROL_CLEARANCE = 8;

export function validDisplayCoordinates(
  points: readonly unknown[] | null | undefined,
): Coordinate[] {
  if (!Array.isArray(points)) return [];
  return points.filter(hasFiniteCoordinate);
}

/** Compute a finite viewport from display markers without implying a route line. */
export function mapDisplayBounds(
  points: readonly unknown[] | null | undefined,
): MapDisplayBounds {
  const coordinates = validDisplayCoordinates(points);
  if (!coordinates.length) {
    return {
      coordinates,
      center: DEFAULT_MAP_CENTER,
      latitudeDelta: DEFAULT_LATITUDE_DELTA,
      longitudeDelta: DEFAULT_LONGITUDE_DELTA,
    };
  }
  const latitudes = coordinates.map((point) => point.latitude);
  const longitudes = coordinates.map((point) => point.longitude);
  const latitudeSpan = Math.max(
    MIN_DISPLAY_DELTA,
    (Math.max(...latitudes) - Math.min(...latitudes)) * DISPLAY_PADDING,
  );
  const longitudeSpan = Math.max(
    MIN_DISPLAY_DELTA,
    (Math.max(...longitudes) - Math.min(...longitudes)) * DISPLAY_PADDING,
  );
  return {
    coordinates,
    center: {
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    },
    latitudeDelta: latitudeSpan,
    longitudeDelta: longitudeSpan,
  };
}

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
  if (input.platform === "android" && !input.googleMapsApiKey?.trim()) {
    return "native-fallback";
  }
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
  coordinate?: unknown,
): coordinate is Coordinate {
  if (!coordinate || typeof coordinate !== "object") return false;
  const value = coordinate as { latitude?: unknown; longitude?: unknown };
  return Boolean(
    typeof value.latitude === "number" &&
      typeof value.longitude === "number" &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude) &&
      value.latitude > -90 &&
      value.latitude < 90 &&
      value.longitude >= -180 &&
      value.longitude <= 180,
  );
}

export function shouldShowUserLocationControl(
  showUserLocation: boolean,
  coordinate?: unknown,
): boolean {
  return showUserLocation && hasFiniteCoordinate(coordinate);
}
