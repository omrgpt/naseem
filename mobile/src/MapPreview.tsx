import { Platform } from "react-native";
import { MapPreview as NativeMapPreview } from "./MapPreview.native";
import { MapPreview as WebMapPreview } from "./MapPreview.web";
import type { Coordinate, RoadKind, RoutePlan, RoutePoint } from "./domain";
import type { MapAvailableRect } from "./mapPreviewContract";

export type MapText = {
  native: string;
  nativeNeedsKey?: string;
  web: string;
  fit: string;
  loop: string;
  routeLabel?: string;
  gestures?: string;
  status?: "matched" | "loading" | "pilot";
  statusMatched?: string;
  statusLoading?: string;
  statusPilot?: string;
  statusUnavailable?: string;
  statusDraft?: string;
  statusEmpty?: string;
  providerUnavailable?: string;
  providerFallbackHint?: string;
  tilesUnavailable?: string;
  zoomIn?: string;
  zoomOut?: string;
  distanceUnit?: string;
  mapLabel?: string;
  mapHint?: string;
  routePoints?: string;
  startPoint?: string;
  startEndPoint?: string;
  destinationPoint?: string;
  waypoint?: string;
  activeEndpointLabel?: string;
  addPoint?: string;
  addPointHint?: string;
  userLocation?: string;
  formatNumber?: (
    value: number,
    options?: Intl.NumberFormatOptions,
  ) => string;
};

/**
 * Shared map contract consumed by the web and react-native renderers.
 * Forecast data and durable selection state are intentionally not renderer
 * inputs: screens own those layers and pass only route/access evidence,
 * optional read-only focus/endpoint hints, callbacks, and a supplied live
 * coordinate for display.
 */
export type MapPreviewProps = {
  route: RoutePlan;
  compact?: boolean;
  fullScreen?: boolean;
  /** A map-first surface owns its surrounding copy and legend in its sheet. */
  minimal?: boolean;
  /** A read-only visual focus hint; the screen still owns selection state. */
  selectedSegment?: number;
  rtl?: boolean;
  /** Enables the renderer-owned center control when paired with a coordinate. */
  showUserLocation?: boolean;
  /** Renderers use this supplied value only; they never request location here. */
  userCoordinate?: Coordinate;
  /** The endpoint currently owned by map placement, when a picker supplies it. */
  activeEndpoint?: "start" | "destination";
  /** Parent-measured host and the portion hidden by an overlapping surface. */
  availableMapRect?: MapAvailableRect;
  onReset?: () => void;
  onMapPress?: (coordinate: Coordinate) => void;
  /** Optional marker selection; the renderer never mutates route state. */
  onSelectPoint?: (point: RoutePoint) => void;
  roadLabels?: Partial<Record<RoadKind, string>>;
  mapText?: MapText;
};

export function MapPreview(props: MapPreviewProps) {
  return Platform.OS === "web" ? (
    <WebMapPreview {...props} />
  ) : (
    <NativeMapPreview {...props} />
  );
}

export const roadColor = (kind: RoadKind) =>
  ({
    dedicated: "#006B6F",
    mixed: "#A94B31",
    restricted: "#B64B4B",
    unknown: "#6B7B7D",
  })[kind];
