import type { Coordinate, RoutePlan, RoutePoint } from './domain';

export type MapMarker = {
  coordinate: Coordinate;
  routePoint: RoutePoint;
  sourceIndex: number;
  isStart: boolean;
  isEnd: boolean;
  isLoop: boolean;
};

export type MapGeometryStatus = 'matched' | 'loading' | 'pilot';

export type MapLineModel = {
  linePoints: Coordinate[];
  lineStyle: 'solid' | 'dashed' | 'none';
  roadMatched: boolean;
  status: MapGeometryStatus;
};

type RouteWithGeometryMetadata = RoutePlan & {
  geometryKind?: 'road_matched' | 'recorded_trace' | 'waypoint_trace' | 'none';
  geometryStatus?: 'draft' | 'matching' | 'ready' | 'unavailable';
};

/** Dense geometry is the only road-following line the map is allowed to draw. */
export function mapLinePoints(route: RoutePlan): Coordinate[] {
  const metadata = route as RouteWithGeometryMetadata;
  const geometry = route.geometry;
  if (
    metadata.geometryKind === 'none' ||
    metadata.geometryStatus === 'unavailable' ||
    (!isRenderableGeometry(geometry) && !isPointOnlyPreview(route, metadata))
  ) {
    return [];
  }
  if (isRenderableGeometry(geometry)) return geometry;
  const pointPreview = route.points.map(({ latitude, longitude }) => ({
    latitude,
    longitude,
  }));
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
    status: renderMapGeometryStatus(route, requestedStatus),
  };
}

/**
 * The rendered route owns the geometry truth. A pending status can describe a
 * request before geometry exists, but a stale "matched" status must never
 * make a waypoint trace look like road-following geometry.
 */
export function mapGeometryStatus(route: RoutePlan, requestedStatus?: MapGeometryStatus): MapGeometryStatus {
  const metadata = route as RouteWithGeometryMetadata;
  const status = renderMapGeometryStatus(route, requestedStatus);
  // Legacy callers used `pilot` as a request to display any supplied geometry.
  // Keep that compatibility at this helper boundary; mapLineModel uses the
  // strict renderer status above so legacy coordinates can never look solid.
  if (
    status === 'pilot' &&
    requestedStatus === 'pilot' &&
    metadata.geometryKind === undefined &&
    metadata.geometryStatus === undefined &&
    isRenderableGeometry(route.geometry)
  ) {
    return 'matched';
  }
  return status;
}

function renderMapGeometryStatus(
  route: RoutePlan,
  requestedStatus?: MapGeometryStatus,
): MapGeometryStatus {
  const metadata = route as RouteWithGeometryMetadata;
  if (hasRoadMatchedGeometry(route)) return 'matched';
  if (metadata.geometryStatus === 'matching') return 'loading';
  return requestedStatus === 'loading' && metadata.geometryStatus === undefined
    ? 'loading'
    : 'pilot';
}

export function mapIsLoop(route: RoutePlan) {
  return route.points.length > 1 && sameCoordinate(route.points[0], route.points[route.points.length - 1]);
}

/**
 * Convert a rendered geometry edge into the reviewable route segment it
 * belongs to. Routed geometry is sampled unevenly, so an index ratio is only
 * a fallback; cumulative distance is the source of truth when available.
 */
export function mapSegmentIndexForLine(route: RoutePlan, lineIndex: number, linePointCount: number) {
  const maximum = Math.max(0, route.points.length - 2);
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
      const segmentEnd = Number(route.points[segmentIndex + 1]?.distanceKm);
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
  const isLoop = mapIsLoop(route);
  const candidates = isLoop ? route.points.slice(0, -1) : route.points;
  if (!candidates.length) return [];
  const markerLimit = Number.isFinite(maxMarkers) ? Math.max(0, Math.floor(maxMarkers)) : 8;
  const indexes = sampleIndexes(candidates.length, markerLimit);
  return indexes.map((sourceIndex, markerIndex) => {
    const routePoint = candidates[sourceIndex];
    const isStart = markerIndex === 0;
    const isEnd = !isLoop && markerIndex === indexes.length - 1;
    const coordinate = roadMatched
      ? isStart
        ? linePoints[0] ?? routePoint
        : isEnd
          ? linePoints[linePoints.length - 1] ?? routePoint
          : routePoint
      : routePoint;
    return { coordinate, routePoint, sourceIndex, isStart, isEnd, isLoop };
  });
}

function hasRoadMatchedGeometry(route: RoutePlan) {
  const metadata = route as RouteWithGeometryMetadata;
  return (
    metadata.geometryKind === 'road_matched' &&
    metadata.geometryStatus === 'ready' &&
    isRenderableGeometry(route.geometry)
  );
}

function isPointOnlyPreview(
  route: RoutePlan,
  metadata: RouteWithGeometryMetadata,
) {
  if (route.geometry?.length) return false;
  if (metadata.geometryKind === 'road_matched' || metadata.geometryKind === 'none') return false;
  if (metadata.geometryKind === 'recorded_trace' || metadata.geometryKind === 'waypoint_trace') return true;
  const source = route.source.toLowerCase();
  return source.includes('gpx') || source.includes('draw');
}

function isRenderableGeometry(geometry: Coordinate[] | undefined): geometry is Coordinate[] {
  return Boolean(
    Array.isArray(geometry) &&
      geometry.length >= 2 &&
      geometry.every(
        (point) =>
          Number.isFinite(point.latitude) &&
          Number.isFinite(point.longitude) &&
          point.latitude >= -90 &&
          point.latitude <= 90 &&
          point.longitude >= -180 &&
          point.longitude <= 180,
      ),
  );
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
