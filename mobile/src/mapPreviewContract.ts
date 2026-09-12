import type { Coordinate } from "./domain";

export type MapProvider =
  | "openstreetmap"
  | "react-native-maps"
  | "native-fallback";

export const MAP_MARKER_HIT_SIZE = 44;
export const MAP_MARKER_HIT_TARGET = {
  width: MAP_MARKER_HIT_SIZE,
  height: MAP_MARKER_HIT_SIZE,
} as const;

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

export type MapRectSize = {
  width: number;
  height: number;
};

export type MapInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type MapBottomObstruction = {
  sheet: number;
  navigation: number;
};

export type MapAvailableRect = {
  host: MapRectSize;
  obstruction: MapBottomObstruction;
  insets: MapInsets;
  available: MapRectSize;
};

type MapAvailableRectOptions = Partial<MapInsets> &
  Partial<MapBottomObstruction>;

const DEFAULT_MAP_CENTER: Coordinate = { latitude: 26.18, longitude: 50.53 };
const DEFAULT_LATITUDE_DELTA = 0.08;
const DEFAULT_LONGITUDE_DELTA = 0.12;
const MIN_DISPLAY_DELTA = 0.01;
const DISPLAY_PADDING = 1.2;

export const ROUTE_DETAIL_DESKTOP_BREAKPOINT = 900;
export const ROUTE_DETAIL_SHEET_OVERLAP = 28;
export const ROUTE_DETAIL_TOP_BAR_INSET = 58;

function nonNegativeFinite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function normalizeMapInsets(
  options: MapAvailableRectOptions | undefined,
): MapInsets {
  const sheet = nonNegativeFinite(options?.sheet);
  const navigation = nonNegativeFinite(options?.navigation);
  return {
    top: nonNegativeFinite(options?.top),
    right: nonNegativeFinite(options?.right),
    bottom: Math.max(
      nonNegativeFinite(options?.bottom),
      sheet,
      navigation,
    ),
    left: nonNegativeFinite(options?.left),
  };
}

/**
 * Keep the measured host and every bottom obstruction together so renderers
 * can fit route content inside the rectangle the rider can actually see.
 * Sheet and navigation obstructions are bottom-anchored and therefore use
 * the larger occupied edge; callers can pass an explicit bottom inset when
 * separate surfaces are stacked.
 */
export function createMapAvailableRect(
  host: MapRectSize,
  options: MapAvailableRectOptions = {},
): MapAvailableRect {
  const hostSize = {
    width: nonNegativeFinite(host?.width),
    height: nonNegativeFinite(host?.height),
  };
  const obstruction = {
    sheet: nonNegativeFinite(options.sheet),
    navigation: nonNegativeFinite(options.navigation),
  };
  const insets = normalizeMapInsets(options);
  return {
    host: hostSize,
    obstruction,
    insets,
    available: {
      width: Math.max(0, hostSize.width - insets.left - insets.right),
      height: Math.max(0, hostSize.height - insets.top - insets.bottom),
    },
  };
}

export function routeDetailSurfaceLayout(viewport: MapRectSize): {
  mode: "mobile" | "desktop";
  obstruction: MapBottomObstruction;
} {
  const isDesktop =
    nonNegativeFinite(viewport?.width) >= ROUTE_DETAIL_DESKTOP_BREAKPOINT;
  return {
    mode: isDesktop ? "desktop" : "mobile",
    obstruction: {
      sheet: isDesktop ? 0 : ROUTE_DETAIL_SHEET_OVERLAP,
      navigation: 0,
    },
  };
}

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
  viewport: MapRectSize,
  mapHeight: number,
  controlHeight: number,
  insets?: Partial<MapInsets>,
): MapControlLayout {
  const availableHeight = Math.min(
    nonNegativeFinite(mapHeight),
    nonNegativeFinite(viewport?.height) || nonNegativeFinite(mapHeight),
  );
  const normalizedInsets = normalizeMapInsets(insets);
  const bottomSafeZone =
    normalizedInsets.bottom > 0
      ? normalizedInsets.bottom
      : MAP_BOTTOM_SAFE_ZONE;
  const bottom =
    bottomSafeZone + MAP_CONTROL_CLEARANCE;
  const safeControlHeight = nonNegativeFinite(controlHeight);
  return {
    top: Math.max(
      normalizedInsets.top,
      availableHeight - bottom - safeControlHeight,
    ),
    bottom,
    visible:
      availableHeight >= normalizedInsets.top + bottom + safeControlHeight,
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

/** A no-key native fallback has no map surface, so map-only controls are inert. */
export function shouldShowNativeMapControls(
  nativeMapUnavailable: boolean,
): boolean {
  return !nativeMapUnavailable;
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

/** Keep every map press callback behind the same finite-coordinate guard. */
export function validMapPressCoordinate(
  coordinate: unknown,
): Coordinate | undefined {
  return hasFiniteCoordinate(coordinate) ? coordinate : undefined;
}

export function shouldShowUserLocationControl(
  showUserLocation: boolean,
  coordinate?: unknown,
): boolean {
  return showUserLocation && hasFiniteCoordinate(coordinate);
}
