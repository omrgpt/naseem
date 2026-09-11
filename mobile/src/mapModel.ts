import type { Coordinate, RoadKind, RoutePlan, RoutePoint } from './domain';
import { hasFiniteCoordinate, validDisplayCoordinates } from './mapPreviewContract';

export type MapMarker = {
  coordinate: Coordinate;
  routePoint: RoutePoint;
  sourceIndex: number;
  isStart: boolean;
  isEnd: boolean;
  isLoop: boolean;
};

export type MapGeometryStatus = 'matched' | 'loading' | 'pilot';
export type MapRenderStatus = MapGeometryStatus | 'unavailable' | 'draft' | 'empty';

export type MapLineModel = {
  linePoints: Coordinate[];
  lineStyle: 'solid' | 'dashed' | 'none';
  roadMatched: boolean;
  status: MapRenderStatus;
};

type RouteWithGeometryMetadata = RoutePlan & {
  geometryKind?: 'road_matched' | 'recorded_trace' | 'waypoint_trace' | 'none';
  geometryStatus?: 'draft' | 'matching' | 'ready' | 'unavailable';
};

/** Dense geometry is the only road-following line the map is allowed to draw. */
export function mapLinePoints(route: RoutePlan): Coordinate[] {
  const metadata = route as RouteWithGeometryMetadata;
  const geometry = (route as { geometry?: unknown }).geometry;
  if (
    metadata.geometryKind === 'none' ||
    metadata.geometryStatus === 'unavailable' ||
    (!isRenderableGeometry(geometry) && !isPointOnlyPreview(route, metadata))
  ) {
    return [];
  }
  if (isRenderableGeometry(geometry)) return geometry;
  const pointPreview = mapDisplayPoints(route);
  return isRenderableGeometry(pointPreview) ? pointPreview : [];
}

export function mapLineModel(route: RoutePlan, requestedStatus?: MapGeometryStatus): MapLineModel {
  const roadMatched = hasRoadMatchedGeometry(route);
  const linePoints = mapLinePoints(route);
  return {
    linePoints,
    lineStyle:
      linePoints.length < 2 ? 'none' : roadMatched ? 'solid' : 'dashed',
    roadMatched,
    status: renderMapGeometryStatus(route, requestedStatus, linePoints),
  };
}

/**
 * Legacy non-rendering status adapter for callers that predate canonical
 * geometry metadata. MapPreview must use mapLineModel instead; this helper is
 * never consulted for line style or viewport geometry, and it reports matched
 * only when explicit ready road-matched metadata validates the geometry.
 * @deprecated Use mapLineModel.status for renderer state.
 */
export function mapGeometryStatus(route: RoutePlan, requestedStatus?: MapGeometryStatus): MapGeometryStatus {
  const status = renderMapGeometryStatus(route, requestedStatus);
  return status === 'matched' || status === 'loading' ? status : 'pilot';
}

function renderMapGeometryStatus(
  route: RoutePlan,
  requestedStatus?: MapGeometryStatus,
  linePoints = mapLinePoints(route),
): MapRenderStatus {
  const metadata = route as RouteWithGeometryMetadata;
  if (hasRoadMatchedGeometry(route)) return 'matched';
  if (metadata.geometryStatus === 'matching') return 'loading';
  if (metadata.geometryStatus === 'unavailable') return 'unavailable';
  if (metadata.geometryStatus === 'draft') return 'draft';
  if (requestedStatus === 'loading' && metadata.geometryStatus === undefined) return 'loading';
  return linePoints.length < 2 ? 'empty' : 'pilot';
}

export function mapIsLoop(route: RoutePlan) {
  const points = getRenderableRoutePoints(route);
  return points.length > 1 && sameCoordinate(
    points[0].routePoint,
    points[points.length - 1].routePoint,
  );
}

/** Valid route-point coordinates used only to position markers and fit the viewport. */
export function mapDisplayPoints(route: RoutePlan): Coordinate[] {
  return getRenderableRoutePoints(route).map(({ routePoint }) => ({
    latitude: routePoint.latitude,
    longitude: routePoint.longitude,
  }));
}

/** Prefer rendered line geometry; otherwise fit validated markers without drawing a line. */
export function mapViewportPoints(
  route: RoutePlan,
  linePoints?: readonly unknown[],
): Coordinate[] {
  const safeLinePoints = validDisplayCoordinates(linePoints ?? mapLinePoints(route));
  return safeLinePoints.length >= 2 ? safeLinePoints : mapDisplayPoints(route);
}

/**
 * Convert a rendered geometry edge into the reviewable route segment it
 * belongs to. Routed geometry is sampled unevenly, so an index ratio is only
 * a fallback; cumulative distance is the source of truth when available.
 */
export function mapSegmentIndexForLine(route: RoutePlan, lineIndex: number, linePointCount: number) {
  const routePoints = getRenderableRoutePoints(route).map(({ routePoint }) => routePoint);
  const maximum = Math.max(0, routePoints.length - 2);
  if (!maximum) return 0;
  const safeLinePointCount = Number.isFinite(linePointCount)
    ? Math.max(0, Math.trunc(linePointCount))
    : 0;
  const lastLineIndex = Math.max(0, safeLinePointCount - 2);
  const safeLineIndex = Number.isFinite(lineIndex)
    ? Math.min(Math.max(Math.trunc(lineIndex), 0), lastLineIndex)
    : 0;
  const distances = route.geometryDistancesKm;
  if (distances?.length === safeLinePointCount && safeLinePointCount > 1) {
    const start = Number(distances[safeLineIndex] ?? 0);
    const end = Number(distances[safeLineIndex + 1] ?? start);
    const midpoint = (start + end) / 2;
    for (let segmentIndex = 0; segmentIndex < maximum; segmentIndex += 1) {
      const segmentEnd = Number(routePoints[segmentIndex + 1]?.distanceKm);
      if (Number.isFinite(segmentEnd) && midpoint <= segmentEnd) return segmentIndex;
    }
    return maximum;
  }
  return Math.min(maximum, Math.floor((safeLineIndex / Math.max(1, safeLinePointCount - 1)) * maximum));
}

/** `findIndex` returns -1 when there is no matching focus segment. */
export function normalizeSelectedSegment(selectedSegment?: number) {
  return Number.isInteger(selectedSegment) && selectedSegment !== undefined && selectedSegment >= 0 ? selectedSegment : undefined;
}

/**
 * Keep the route line detailed while capping review markers. A 2,000-point
 * GPX must not become a 2,000-marker map. Start/finish and evenly distributed
 * review points remain visible, with loop finish represented by the S/E pin.
 */
export function mapMarkerPoints(
  route: RoutePlan,
  linePoints: Coordinate[] = mapLinePoints(route),
  roadMatched = hasRoadMatchedGeometry(route),
  maxMarkers = 8,
): MapMarker[] {
  const routePoints = getRenderableRoutePoints(route);
  const isLoop = routePoints.length > 1 && sameCoordinate(
    routePoints[0].routePoint,
    routePoints[routePoints.length - 1].routePoint,
  );
  const candidates = isLoop ? routePoints.slice(0, -1) : routePoints;
  if (!candidates.length) return [];
  const markerLimit = Number.isFinite(maxMarkers) ? Math.max(0, Math.floor(maxMarkers)) : 8;
  const indexes = sampleIndexes(candidates.length, markerLimit);
  const safeLinePoints = validDisplayCoordinates(linePoints);
  const useRoadGeometry = roadMatched && safeLinePoints.length >= 2;
  return indexes.map((candidateIndex, markerIndex) => {
    const candidate = candidates[candidateIndex];
    const routePoint = candidate.routePoint;
    const isStart = markerIndex === 0;
    const isEnd = !isLoop && markerIndex === indexes.length - 1;
    const coordinate = useRoadGeometry
      ? isStart
        ? safeLinePoints[0] ?? routePoint
        : isEnd
          ? safeLinePoints[safeLinePoints.length - 1] ?? routePoint
          : routePoint
      : routePoint;
    return {
      coordinate,
      routePoint,
      sourceIndex: candidate.sourceIndex,
      isStart,
      isEnd,
      isLoop,
    };
  });
}

export function mapRoadKindAt(route: RoutePlan, pointIndex: number): RoadKind {
  return getRenderableRoutePoints(route).map(({ routePoint }) => routePoint)[pointIndex]?.suitability.kind ?? 'unknown';
}

function hasRoadMatchedGeometry(route: RoutePlan) {
  const metadata = route as RouteWithGeometryMetadata;
  return (
    metadata.geometryKind === 'road_matched' &&
    metadata.geometryStatus === 'ready' &&
    isRenderableGeometry((route as { geometry?: unknown }).geometry)
  );
}

function isPointOnlyPreview(
  route: RoutePlan,
  metadata: RouteWithGeometryMetadata,
) {
  const geometry = (route as { geometry?: unknown }).geometry;
  if (Array.isArray(geometry) && geometry.length) return false;
  if (metadata.geometryKind === 'road_matched' || metadata.geometryKind === 'none') return false;
  if (metadata.geometryKind === 'recorded_trace' || metadata.geometryKind === 'waypoint_trace') return true;
  const source = typeof route.source === 'string' ? route.source.toLowerCase() : '';
  return source.includes('gpx') || source.includes('draw');
}

function isRenderableGeometry(geometry: unknown): geometry is Coordinate[] {
  return Boolean(
    Array.isArray(geometry) &&
      geometry.length >= 2 &&
      geometry.every(hasFiniteCoordinate),
  );
}

function getRenderableRoutePoints(
  route: RoutePlan,
): Array<{ routePoint: RoutePoint; sourceIndex: number }> {
  const points = (route as { points?: unknown }).points;
  if (!Array.isArray(points)) return [];
  return points.flatMap((value, sourceIndex) =>
    isRenderableRoutePoint(value) ? [{ routePoint: value, sourceIndex }] : [],
  );
}

function isRenderableRoutePoint(value: unknown): value is RoutePoint {
  if (!hasFiniteCoordinate(value) || typeof value !== 'object' || value === null) return false;
  const point = value as Partial<RoutePoint> & {
    suitability?: { kind?: unknown };
  };
  return (
    typeof point.name === 'string' &&
    point.name.trim().length > 0 &&
    Number.isFinite(point.distanceKm) &&
    isRoadKind(point.suitability?.kind)
  );
}

function isRoadKind(value: unknown): value is RoadKind {
  return value === 'dedicated' || value === 'mixed' || value === 'restricted' || value === 'unknown';
}

function sampleIndexes(length: number, maximum: number) {
  if (maximum <= 0) return [];
  if (length <= maximum) return Array.from({ length }, (_, index) => index);
  if (maximum <= 1) return [0];
  const indexes = new Set<number>();
  for (let index = 0; index < maximum; index += 1) indexes.add(Math.round((index * (length - 1)) / (maximum - 1)));
  return [...indexes].sort((a, b) => a - b);
}

function sameCoordinate(a: Coordinate, b: Coordinate) {
  return Math.abs(a.latitude - b.latitude) < 0.00001 && Math.abs(a.longitude - b.longitude) < 0.00001;
}
