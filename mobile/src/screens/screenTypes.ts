import type { ComponentType } from "react";
import type { RoutePlan, Coordinate, RoadKind } from "../domain";
import type { Language, copy } from "../i18n";
import type { Palette } from "../designTokens";

export type Copy = typeof copy.en;
export type ScreenStyles = ReturnType<
  typeof import("../screenStyles").createScreenStyles
>;
export type RouteOrigin = "pilot" | "gpx" | "drawn" | "generated";
export type RouteOwnership = "catalog" | "personal";
export type GeometryKind = "road_matched" | "recorded_trace" | "waypoint_trace";
export type GeometryStatus = "draft" | "matching" | "ready" | "unavailable";
export type RouteStatus = GeometryStatus | "trace_ready";
export type CollectionKind = "samples" | "my" | "imports";
export type RouteCollectionKind = "my-routes" | "imports";

export type CanonicalRouteView = RoutePlan & {
  origin?: RouteOrigin;
  ownership?: RouteOwnership;
  geometryKind?: GeometryKind;
  geometryStatus?: GeometryStatus;
  roadEvidenceStatus?: "pilot_pending" | "unknown" | "sourced";
  revision?: number;
  departureAt?: string;
  arrivalAt?: string;
  routeStatus?: RouteStatus;
  importFileName?: string;
};

export type ScreenBaseProps = {
  t: Copy;
  rtl: boolean;
  palette: Palette;
  styles: ScreenStyles;
  language?: Language;
};

export type RouteChip = {
  label: string;
  tone?: "info" | "success" | "warning" | "danger";
};

export type RouteListItem = {
  route: CanonicalRouteView;
  collection: CollectionKind;
  chip: RouteChip;
  onPress: () => void;
};

export type PlannerPoint = Coordinate & { name: string; nameAr?: string };

export type BuilderRouteState = {
  status: "empty" | "start-selected" | "matching" | "ready" | "failed";
  start: PlannerPoint | null;
  destination: PlannerPoint | null;
  route: CanonicalRouteView | null;
  error?: string;
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
  if (
    route.source === "Generated route candidate" ||
    route.id.startsWith("generated-")
  )
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
  if (ownership === "catalog") return { label: t.sampleRoute, tone: "info" };
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

export type StylesProp = ScreenStyles;
export type ScreenComponent = ComponentType<any>;
export type RoadLabels = Partial<Record<RoadKind, string>>;

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
  etaLabel?: string;
  accuracyLabel?: string;
  offRouteLabel?: string;
};

export type LiveRideMapText = {
  native: string;
  web: string;
  fit: string;
  loop: string;
  gestures?: string;
  zoomIn?: string;
  zoomOut?: string;
  distanceUnit?: string;
};

export type LiveRideScreenProps = ScreenBaseProps & {
  route: RoutePlan | null;
  state: LiveRideState;
  position?: LiveRidePosition;
  snapshot?: LiveRideSnapshot | null;
  routeStatus?: RouteStatus;
  statusMessage?: string;
  permissionMessage?: string;
  endConfirmationMessage?: string;
  nextSegmentName?: string;
  nextSegmentWindLabel?: string;
  mapText: LiveRideMapText;
  roadLabels?: RoadLabels;
  onChooseRoute: () => void;
  onReviewRoute?: () => void;
  onShowPermissionExplanation?: () => void;
  onRequestPermission?: () => void;
  onCancelPermission?: () => void;
  onOpenSettings?: () => void;
  onRetryPermission?: () => void;
  onStartRide?: () => void;
  onRequestEndRide?: () => void;
  onCancelEndRide?: () => void;
  onConfirmEndRide?: () => void;
  onChooseAnotherRoute?: () => void;
};

export type ProfileConnection = {
  providerLabel: string;
  statusLabel: string;
  detail: string;
  actionLabel?: string;
};

export type ProfileDecisionGate = {
  visible?: boolean;
  title: string;
  body: string;
  decisions: string[];
  actionLabel?: string;
};
export type OwnerDecisionGate = ProfileDecisionGate;

export type ProfileAction = {
  icon: "route" | "map" | "settings" | "person" | "wind";
  title: string;
  description: string;
  actionLabel?: string;
};

export type RouteSurfaceItem = {
  route: RoutePlan;
  meta: {
    ownership?: RouteOwnership;
    ownershipLabel?: string;
    sourceLabel?: string;
    provenanceLabel?: string;
  };
  display?: { name?: string; distance?: string; movingTime?: string };
};

export type RouteCollection = {
  kind: RouteCollectionKind;
  title: string;
  description?: string;
  items: RouteSurfaceItem[];
  emptyLabel?: string;
};

export type ProfileScreenProps = ScreenBaseProps & {
  copy: Copy;
  profile: { name: string; detail?: string; statusLabel?: string };
  collections?: RouteCollection[];
  connection?: ProfileConnection;
  privacy?: ProfileAction;
  settings?: ProfileAction;
  decisionGate?: ProfileDecisionGate;
  onOpenCollection?: (kind: RouteCollectionKind) => void;
  onOpenRoute?: (route: RouteSurfaceItem) => void;
  onConnectionAction?: () => void;
  onPrivacyAction?: () => void;
  onSettingsAction?: () => void;
  onReviewDecisions?: () => void;
};

export function text(t: Copy, key: string, fallback: string): string {
  const value = (t as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export const screenText = text;

/** The Plan entry points intentionally have different destinations. */
export type PlanActionId = "first-route" | "samples" | "endpoints";
export type PlanActionTarget =
  | "beginner-guide"
  | "sample-chooser"
  | "endpoint-builder";

export const PLAN_ACTIONS: ReadonlyArray<{
  id: PlanActionId;
  target: PlanActionTarget;
}> = [
  { id: "first-route", target: "beginner-guide" },
  { id: "samples", target: "sample-chooser" },
  { id: "endpoints", target: "endpoint-builder" },
];
