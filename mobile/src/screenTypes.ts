import type { ComponentType } from "react";
import type {
  ActivityDraft,
  Coordinate,
  RoadKind,
  RouteFamily,
  RoutePlan,
  RouteRecord,
} from "./domain";
import { copy, type Language } from "./i18n";
import type { Palette } from "./designTokens";
import type { RouteLayer } from "./routeConditions";

export type Copy = typeof copy.en;
export type BaseScreenCopy = Copy;
export type ScreenCopyOverrides = Readonly<Record<string, string | undefined>>;
export type ScreenStyles = ReturnType<
  typeof import("./screenStyles").createScreenStyles
>;

export function screenText(
  overrides: ScreenCopyOverrides | Copy | undefined,
  key: string,
  fallback: string,
) {
  const value = overrides?.[key as keyof typeof overrides];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
export const text = screenText;

export type ScreenBaseProps = {
  t: Copy;
  copy?: ScreenCopyOverrides | Copy;
  palette: Palette;
  rtl: boolean;
  styles: ScreenStyles;
  language?: Language;
  formatNumber?: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatTime?: (instant: string) => string;
};
export type RoadLabels = Partial<Record<RoadKind, string>>;
export type RouteOrigin = "pilot" | "gpx" | "drawn" | "generated" | "unknown";
export type RouteOwnership = "catalog" | "personal" | "unknown";
export type GeometryKind =
  "road_matched" | "recorded_trace" | "waypoint_trace" | "none";
export type GeometryStatus = "draft" | "matching" | "ready" | "unavailable";
export type RouteStatus = GeometryStatus | "trace_ready";
export type CollectionKind = "samples" | "my" | "imports";
export type RouteCollectionKind = "my-routes" | "imports" | "samples";

export type CanonicalRouteView = RoutePlan & {
  origin?: RouteOrigin;
  ownership?: RouteOwnership;
  geometryKind?: GeometryKind;
  geometryStatus?: GeometryStatus;
  roadEvidenceStatus?: "pilot_pending" | "unknown" | "sourced";
  revision?: number;
  routeStatus?: RouteStatus;
  importFileName?: string;
};
export type BuilderRouteState = {
  status: "empty" | "start-selected" | "matching" | "ready" | "failed";
  start: PlannerPoint | null;
  destination: PlannerPoint | null;
  route: CanonicalRouteView | null;
  error?: string;
};
export type PlannerPoint = Coordinate & { name: string; nameAr?: string };
export type RouteChip = {
  label: string;
  tone?: "info" | "success" | "warning" | "danger";
};

export function asCanonicalRoute(
  route: RoutePlan | null | undefined,
): CanonicalRouteView | null {
  return route ? (route as CanonicalRouteView) : null;
}
export function routeOrigin(route: CanonicalRouteView): RouteOrigin {
  if (route.origin) return route.origin;
  if (route.source === "GPX import" || route.id.startsWith("gpx-"))
    return "gpx";
  if (route.source === "Drawn on device" || route.id.startsWith("drawn-"))
    return "drawn";
  if (route.source.includes("Generated") || route.id.startsWith("generated-"))
    return "generated";
  return "pilot";
}
export function routeOwnership(route: CanonicalRouteView): RouteOwnership {
  return (
    route.ownership ?? (routeOrigin(route) === "pilot" ? "catalog" : "personal")
  );
}
export function routeGeometryKind(route: CanonicalRouteView): GeometryKind {
  if (route.geometryKind) return route.geometryKind;
  // Legacy catalog and imported plans can contain drawable coordinates without
  // having been checked against mapped roads. Preserve that preview truth when
  // the canonical metadata is not present yet.
  if (route.ownership === "catalog" || routeOrigin(route) === "pilot")
    return "recorded_trace";
  if (route.geometry?.length) return "road_matched";
  return routeOrigin(route) === "gpx" ? "recorded_trace" : "waypoint_trace";
}
export function routeGeometryStatus(route: CanonicalRouteView): GeometryStatus {
  if (route.geometryStatus) return route.geometryStatus;
  return route.geometry?.length ? "ready" : "draft";
}
export function routeIsNavigable(route: CanonicalRouteView): boolean {
  return (
    routeGeometryKind(route) === "road_matched" &&
    routeGeometryStatus(route) === "ready" &&
    Boolean(route.geometry?.length)
  );
}
export function routeChipFor(route: CanonicalRouteView, t: Copy): RouteChip {
  const ownership = routeOwnership(route);
  if (ownership === "catalog")
    return { label: t.previewRoute ?? t.sampleRoute, tone: "info" };
  if (routeOrigin(route) === "gpx")
    return { label: t.importedRoute, tone: "warning" };
  return { label: t.yourRoute, tone: "success" };
}
export function routeCollection(route: CanonicalRouteView): CollectionKind {
  return routeOrigin(route) === "gpx"
    ? "imports"
    : routeOwnership(route) === "catalog"
      ? "samples"
      : "my";
}

export type RoutesMapText = {
  native: string;
  nativeNeedsKey?: string;
  web: string;
  fit: string;
  loop: string;
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
};

export type TodayScreenProps = ScreenBaseProps & {
  route: RoutePlan | null;
  conditions: {
    temperature: number;
    wind: { speed: number };
    source?: string;
  } | null;
  refreshing: boolean;
  recommendationTitle: string;
  recommendationReason: string;
  departureTime: string;
  routeStatus: RouteStatus;
  variantLabel?: string;
  roadLabels?: RoadLabels;
  mapText: RoutesMapText;
  onReviewRoute: () => void;
  onPlanRoute: () => void;
  onChooseRoute: () => void;
  onRefresh: () => void;
};

export type RoutesScreenProps = ScreenBaseProps & {
  builder: BuilderRouteState;
  builderPreview: RoutePlan | null;
  activeField: "start" | "destination" | null;
  startText: string;
  destinationText: string;
  targetDistanceKm?: string;
  mapText: RoutesMapText;
  roadLabels?: RoadLabels;
  samples: RoutePlan[];
  myRoutes: RoutePlan[];
  imports: RoutePlan[];
  selectedRouteId?: string | null;
  manualMode: boolean;
  manualRoute: RoutePlan | null;
  manualPoints: Coordinate[];
  importReview: RoutePlan | null;
  importReviewFileName?: string;
  generatedReview: RoutePlan | null;
  routeMessage?: string;
  knownRouteFamily?: KnownRouteFamilyProps;
  onStartText: (value: string) => void;
  onDestinationText: (value: string) => void;
  onGenerationDistance?: (value: string) => void;
  onFocusField: (field: "start" | "destination") => void;
  onChooseOnMap: (field: "start" | "destination") => void;
  onUseCurrentLocation: (field: "start" | "destination") => void;
  onUseSavedPoint: (
    field: "start" | "destination",
    point: PlannerPoint,
  ) => void;
  onMapPress: (coordinate: Coordinate) => void;
  onRetryMatch: () => void;
  onEditPoints: () => void;
  onUseMatchedRoute: () => void;
  onAddStop: () => void;
  onReverse: () => void;
  onImport: () => void;
  onGenerate: () => void;
  onOpenManual: () => void;
  onCancelManual: () => void;
  onUndoManual: () => void;
  onRedoManual: () => void;
  onClearManual: () => void;
  onDoneManual: () => void;
  onRemoveManualPoint: (index: number) => void;
  onMoveManualPoint?: (index: number, direction: -1 | 1) => void;
  onUseImport: () => void;
  onCancelImport: () => void;
  onUseGenerated: () => void;
  onCancelGenerated: () => void;
  onSelect: (route: RoutePlan) => void;
};
export type KnownRouteFamilyProps = {
  family: RouteFamily;
  route: RoutePlan;
  status: RouteStatus;
  layers?: RouteLayer[];
  entryDistanceLabel?: string;
  onReview: () => void;
  onStartAtEntry?: () => void;
  onConnectFromLocation?: () => void;
  onRecordWithoutFollowing?: () => void;
  onChooseAnotherRoute?: () => void;
};

export type RouteDetailMapText = RoutesMapText;
export type RouteDetailScreenProps = ScreenBaseProps & {
  route: RoutePlan | null;
  routeStatus: RouteStatus;
  departureLabel: string;
  arrivalLabel: string;
  departureChoices: Array<{ value: number; label: string; selected: boolean }>;
  mapText: RouteDetailMapText;
  roadLabels?: RoadLabels;
  routeName?: string;
  onRouteNameChange?: (value: string) => void;
  onDeparture: (value: number) => void;
  onBack: () => void;
  onUse: () => void;
  onAddStop: () => void;
  onReverse: () => void;
  onEdit: () => void;
  onRetry?: () => void;
  onSave?: () => void;
  onChangeRoute: () => void;
  variantLabel?: string;
  entryLabel?: string;
  finishLabel?: string;
  entryDistanceLabel?: string;
  comparisonReason?: string;
  comparisonStatus?: "enabled" | "suppressed";
  layers?: RouteLayer[];
  onlyVariant?: boolean;
  entryActionsEnabled?: boolean;
  onStartAtEntry?: () => void;
  onConnectFromLocation?: () => void;
};

export type LiveRideState =
  | "no-route"
  | "loading"
  | "ready"
  | "permission-explanation"
  | "permission-denied"
  | "active"
  | "ending"
  | "ended";
export type LiveRideSnapshot = {
  routeId: string;
  routeRevision?: number;
  routeName: string;
  startedLabel?: string;
  endedLabel?: string;
  distanceCompletedLabel?: string;
  movingTimeLabel?: string;
};
export type LiveRidePosition = {
  coordinate?: Coordinate;
  progress: number;
  remainingLabel?: string;
  remainingDistanceLabel?: string;
  etaLabel?: string;
  accuracyLabel?: string;
  offRouteLabel?: string;
  match?: import("./domain").PositionMatch;
};
export type LiveRideMapText = RoutesMapText;
export type LiveRideScreenProps = ScreenBaseProps & {
  route: RoutePlan | null;
  recordingOnly?: boolean;
  state: LiveRideState;
  position?: LiveRidePosition;
  snapshot?: LiveRideSnapshot | null;
  completionDraft?: ActivityDraft | null;
  routeStatus?: RouteStatus;
  statusMessage?: string;
  permissionMessage?: string;
  privacyMessage?: string;
  endConfirmationMessage?: string;
  aheadLabel?: string;
  nextSegmentName?: string;
  nextSegmentWindLabel?: string;
  mapText: LiveRideMapText;
  roadLabels?: RoadLabels;
  layers?: RouteLayer[];
  entryLabel?: string;
  onChooseRoute: () => void;
  onReviewRoute?: () => void;
  onShowPermissionExplanation?: () => void;
  onRequestPermission?: () => void;
  onCancelPermission?: () => void;
  onOpenSettings?: () => void;
  onRetryPermission?: () => void;
  onStartRide?: () => void;
  onConnectFromLocation?: () => void;
  onRequestEndRide?: () => void;
  onCancelEndRide?: () => void;
  onConfirmEndRide?: () => void;
  onChooseAnotherRoute?: () => void;
  onSaveCompletion?: () => void;
  onRetrySaveCompletion?: () => void;
  onDiscardCompletion?: () => void;
  onExportCompletion?: () => void;
};

export type RouteSurfaceMeta = {
  ownership: RouteOwnership;
  origin: RouteOrigin;
  geometryKind: GeometryKind;
  geometryStatus: GeometryStatus;
  roadEvidenceStatus?: "pilot_pending" | "unknown" | "sourced";
  revision?: number;
  sourceLabel?: string;
  provenanceLabel?: string;
  ownershipLabel?: string;
  originLabel?: string;
  geometryLabel?: string;
  statusLabel?: string;
};
export type RouteDisplay = {
  name?: string;
  distance?: string;
  movingTime?: string;
  returnTime?: string;
  departureTime?: string;
};
export type RouteSurfaceItem = {
  route: RoutePlan;
  meta: RouteSurfaceMeta;
  display?: RouteDisplay;
};
export type RouteCollection = {
  kind: RouteCollectionKind;
  title: string;
  description?: string;
  emptyLabel?: string;
  items: RouteSurfaceItem[];
};
export type OwnerDecisionGate = {
  visible?: boolean;
  title: string;
  body: string;
  decisions: string[];
  actionLabel?: string;
};
export type ProfileAction = {
  id: string;
  icon: "route" | "map" | "settings" | "person" | "wind";
  title: string;
  description: string;
  actionLabel?: string;
};
export type ProfileConnection = {
  providerLabel: string;
  statusLabel: string;
  detail: string;
  actionLabel?: string;
};
export type ProfileScreenProps = ScreenBaseProps & {
  profile: { name: string; detail?: string; statusLabel?: string };
  collections?: RouteCollection[];
  activities?: ActivityDraft[];
  connection?: ProfileConnection;
  privacy?: ProfileAction;
  settings?: ProfileAction;
  onOpenCollection?: (kind: RouteCollectionKind) => void;
  onOpenRoute?: (item: RouteSurfaceItem) => void;
  onConnectionAction?: () => void;
  onPrivacyAction?: () => void;
  onSettingsAction?: () => void;
};
export type ScreenComponent = ComponentType<any>;
