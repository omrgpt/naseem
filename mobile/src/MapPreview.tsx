import { Platform } from "react-native";
import { MapPreview as NativeMapPreview } from "./MapPreview.native";
import { MapPreview as WebMapPreview } from "./MapPreview.web";
import type { Coordinate, RoadKind, RoutePlan } from "./domain";

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
  providerUnavailable?: string;
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
  addPoint?: string;
  addPointHint?: string;
  userLocation?: string;
  formatNumber?: (
    value: number,
    options?: Intl.NumberFormatOptions,
  ) => string;
};

/** Shared map contract consumed by the web and react-native renderers. */
export type MapPreviewProps = {
  route: RoutePlan;
  compact?: boolean;
  fullScreen?: boolean;
  /** A map-first surface owns its surrounding copy and legend in its sheet. */
  minimal?: boolean;
  selectedSegment?: number;
  rtl?: boolean;
  showUserLocation?: boolean;
  userCoordinate?: Coordinate;
  onReset?: () => void;
  onMapPress?: (coordinate: Coordinate) => void;
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
