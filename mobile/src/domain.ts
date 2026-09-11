export type Coordinate = { latitude: number; longitude: number };
export type RoadKind = "dedicated" | "mixed" | "restricted" | "unknown";
export type WindKind = "headwind" | "tailwind" | "crosswind";

export const BAHRAIN_TIME_ZONE = "Asia/Bahrain" as const;
export const ROUTE_MATCHING_MAX_WAYPOINTS = 25 as const;
/** Stable catalog identifiers retained across route revisions and app reloads. */
export const NBH_FAMILY_ID = "nbh-loop" as const;
export const NBH_VARIANT_ID = "nbh-loop-standard-clockwise" as const;
export const NBH_REVISION_ID = "nbh-loop-standard-clockwise-r1" as const;
export const NBH_PREVIEW_DISTANCE_KM = 21.8 as const;

export type RouteOrigin = "pilot" | "gpx" | "drawn" | "generated";
export type RouteOwnership = "catalog" | "personal";
export type RouteGeometryKind =
  "road_matched" | "recorded_trace" | "waypoint_trace";
export type RouteGeometryStatus =
  "draft" | "matching" | "ready" | "unavailable";
/** Renderer-only absence marker retained for legacy RoutePlan adapters. */
export type RoutePlanGeometryKind = RouteGeometryKind | "none";
export type RouteDistanceStatus = "provisional" | "authoritative";
export type RoadEvidenceStatus = "pilot_pending" | "unknown" | "sourced";
export type CatalogStatus = "available" | "preview" | "unavailable";
export type RouteReviewStatus = "reviewed" | "pending" | "unavailable";
export type RouteDirection = "clockwise" | "counter_clockwise" | "unknown";
export type Confidence = "high" | "medium" | "low";

export type RouteEntryPoint = Coordinate & {
  id: string;
  name: string;
  nameAr?: string;
};

export type RouteRevision = {
  id: string;
  familyId: string;
  variantId: string;
  revision: number;
  corridor: RouteCorridor;
  geometry: RouteGeometry;
  distanceKm: number;
  entry: RouteEntryPoint;
  finish: RouteEntryPoint;
  reviewStatus: RouteReviewStatus;
  evidenceSummary: string;
  evidenceSummaryAr?: string;
};

export type RouteVariant = {
  id: string;
  familyId: string;
  label: string;
  labelAr?: string;
  direction: RouteDirection;
  distanceKm: number;
  durationRangeMinutes: { min: number; max: number };
  entry: RouteEntryPoint;
  finish: RouteEntryPoint;
  availability: CatalogStatus;
  currentRevisionId?: string;
  currentRevision: RouteRevision;
};

export type RouteFamily = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  catalogStatus: CatalogStatus;
  entryPoints: RouteEntryPoint[];
  defaultViewport: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  sourcePolicy: string;
  sourcePolicyAr?: string;
  variants: RouteVariant[];
};

export type RouteCorridor = {
  variantId: string;
  revisionId: string;
  coordinates: Coordinate[];
  distancesKm: number[];
  sharedGeometry?: {
    startFinish: boolean;
    ranges: Array<{ startKm: number; endKm: number }>;
  };
};

export type RouteCatalog = {
  families: RouteFamily[];
  corridors: RouteCorridor[];
};

export type WindForecast = {
  speed: number;
  directionFrom: number;
  gusts?: number;
};
export type TimedWind = WindForecast & { time: string };
export type RoadSuitability = {
  kind: RoadKind;
  label: string;
  evidence: string;
  evidenceAr?: string;
  source: string;
  sourceUrl?: string;
  confidence: Confidence;
};
export type RoutePoint = Coordinate & {
  name: string;
  nameAr?: string;
  distanceKm: number;
  headingDegrees: number;
  suitability: RoadSuitability;
};
export type SegmentCondition = {
  id: string;
  name: string;
  nameAr?: string;
  arrivalAt?: string;
  arrivalLabel: string;
  startDistanceKm?: number;
  endDistanceKm?: number;
  phase?: "outbound" | "middle" | "finish";
  confidence?: Confidence;
  wind: {
    kind: WindKind;
    magnitudeKph: number;
    headwindKph: number;
    crosswindKph: number;
    gustsKph?: number;
    forecastTime?: string;
    source?: string;
    gridCell?: string;
  };
  suitability: RoadSuitability;
  insight: string;
};

export type AnalysisSegment = SegmentCondition & {
  startDistanceKm: number;
  endDistanceKm: number;
  phase: "outbound" | "middle" | "finish";
  forecastConfidence: Confidence;
};

export type AnalysisRun = {
  id: string;
  familyId?: string;
  variantId?: string;
  routeId: string;
  routeRevision: number;
  departureAt: string;
  timeZone: typeof BAHRAIN_TIME_ZONE;
  forecastRunAt?: string;
  forecastSource?: string;
  pacePolicy: string;
  algorithmVersion: string;
  routeConfidence: Confidence;
  forecastConfidence: Confidence;
  confidence: Confidence;
  ranking: "enabled" | "suppressed";
  segments: AnalysisSegment[];
};

export type PositionMatchState =
  "approaching" | "matched" | "uncertain" | "off-corridor" | "stale";

export type PositionMatch = {
  routeDistanceKm: number;
  progress: number;
  confidence: Confidence;
  state: PositionMatchState;
  accuracyMeters?: number;
  candidateCount: number;
  timestamp: string;
  offCorridorKm: number;
};

export type RoutePlan = {
  id: string;
  familyId?: string;
  variantId?: string;
  revisionId?: string;
  /** Present on canonical-backed view models; absent for legacy seed/tests. */
  revision?: number;
  name: string;
  nameAr?: string;
  source: string;
  points: RoutePoint[];
  /**
   * Optional road-following geometry used by the map renderer. `points` stays
   * intentionally small: those are the reviewable route waypoints/segments.
   * Geometry is never treated as evidence of safety by itself.
   */
  geometry?: Coordinate[];
  geometryDistancesKm?: number[];
  /** Per-leg distance evidence retained from the provider response. */
  legDistancesKm?: number[];
  /** Provider-reported routed total kept distinct from recomputed geometry. */
  routedDistanceKm?: number;
  geometrySource?: string;
  /** Optional catalog corridor retained by the NBH preview adapter. */
  corridor?: RouteCorridor;
  /** Canonical geometry truth is carried explicitly into short-lived plans. */
  geometryKind?: RoutePlanGeometryKind;
  geometryStatus?: RouteGeometryStatus;
  origin?: RouteOrigin;
  ownership?: RouteOwnership;
  provenance?: RouteProvenance;
  /** A waypoint/recorded trace distance is never a routed distance. */
  provisionalDistanceKm?: number;
  distanceStatus?: RouteDistanceStatus;
  distanceKm: number;
  /** Canonical instants. The label fields remain only for v1/render compatibility. */
  departureAt?: string;
  arrivalAt?: string;
  departureLabel: string;
  arrivalLabel: string;
  durationMinutes: number;
  recommendation: string;
  segments: SegmentCondition[];
  windSummary: {
    tailwindPercent: number;
    headwindPercent: number;
    crosswindPercent: number;
  };
};

/**
 * Provenance is kept separate from geometry truth. A provider/source can be
 * named here without implying that the route is safe, road-matched, or GIS
 * validated.
 */
export type RouteProvenance = {
  source: string;
  sourceId?: string;
  sourceUrl?: string;
  createdAt?: string;
  importedAt?: string;
  migratedFrom?: "legacy-array" | "v1-envelope";
};

export type RouteGeometry = {
  kind: RouteGeometryKind;
  status: RouteGeometryStatus;
  coordinates: Coordinate[];
  distancesKm?: number[];
  source?: string;
};

/** The old render/analysis fields retained as a snapshot during migration. */
export type RouteAnalysisSnapshot = Pick<
  RoutePlan,
  | "distanceKm"
  | "departureLabel"
  | "arrivalLabel"
  | "durationMinutes"
  | "recommendation"
  | "segments"
  | "windSummary"
> &
  Pick<RoutePlan, "departureAt" | "arrivalAt"> & {
    routeId?: string;
    routeRevision?: number;
    analysisRunId?: string;
    forecastRunAt?: string;
    forecastSource?: string;
    confidence?: Confidence;
  };

/**
 * Canonical persisted route identity. RoutePlan remains the short-lived view
 * model used by renderers and analysis code; RouteRecord is the source of
 * truth for ownership, origin, geometry state, provenance, and revisions.
 */
export type RouteRecord = {
  id: string;
  familyId?: string;
  variantId?: string;
  revisionId?: string;
  name: string;
  nameAr?: string;
  origin: RouteOrigin;
  ownership: RouteOwnership;
  points: RoutePoint[];
  geometry: RouteGeometry;
  corridor?: RouteCorridor;
  roadEvidenceStatus: RoadEvidenceStatus;
  revision: number;
  provenance: RouteProvenance;
  /** Geodesic/trace distance retained separately from any routed distance. */
  provisionalDistanceKm?: number;
  /** Provider evidence retained so canonical readiness can reconcile every source. */
  legDistancesKm?: number[];
  routedDistanceKm?: number;
  analysis?: RouteAnalysisSnapshot;
};

export type CanonicalRoute = RouteRecord;
export type Route = RouteRecord;

export type ActiveRideSnapshot = Readonly<{
  id: string;
  routeId: string;
  familyId?: string;
  variantId?: string;
  revisionId?: string;
  routeRevision: number;
  startedAt: string;
  route: RouteRecord;
  analysisKey?: string;
}>;

/** A Naseem recording can be started without claiming that a route was selected. */
export type RecordingOnlySnapshot = Readonly<{
  id: string;
  mode: "recording-only";
  startedAt: string;
}>;

export type RecordedSample = {
  coordinate: Coordinate;
  timestamp: string;
  accuracyMeters?: number;
};

export type ActivityDraft = {
  id: string;
  plannedRouteId: string | null;
  plannedRouteRevision: number | null;
  routeSnapshot: RouteRecord | null;
  startedAt: string;
  endedAt: string;
  observedSamples: RecordedSample[];
  matchHistory: PositionMatch[];
  elapsedSeconds: number;
  distanceMeters: number;
  matchQuality: Confidence | "unknown";
  gaps: number;
  forecastSnapshot?: RouteAnalysisSnapshot;
  completionState: "draft" | "saved" | "save_failed" | "discarded";
  exportState: "not_exported" | "exported";
};

export type RouteAnalysisRequest = {
  routeId?: string;
  routeRevision?: number;
  points: RoutePoint[];
  geometry?: Coordinate[];
  departureAt: string;
  typicalSpeedKph: number;
  generateAlternatives?: boolean;
};
export type LiveRideSession = {
  id: string;
  routeId: string;
  startedAt: string;
  remainingDistanceKm: number;
  locationPermission: "foreground" | "background";
  isActive: boolean;
};
export type CanonicalActivity = {
  id: string;
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  sourceIds: string[];
  deduplicationConfidence: "high" | "review";
};
export type SourceConnection = {
  provider: "strava" | "whoop";
  scope: string[];
  connectedAt: string;
  lastSyncedAt?: string;
  status: "connected" | "pending_approval" | "disconnected";
};
