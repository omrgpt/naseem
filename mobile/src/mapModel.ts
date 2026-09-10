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
  roadMatched: boolean;
  status: MapGeometryStatus;
};

type RouteWithGeometryMetadata = RoutePlan & {
  geometryKind?: 'road_matched' | 'recorded_trace' | 'waypoint_trace' | 'none';
  geometryStatus?: 'draft' | 'matching' | 'ready' | 'unavailable';
};

/** Dense geometry is the only road-following line the map is allowed to draw. */
export function mapLinePoints(route: RoutePlan): Coordinate[] {
  return route.geometry?.length ? route.geometry : route.points;
}

export function mapLineModel(route: RoutePlan, requestedStatus?: MapGeometryStatus): MapLineModel {
  const roadMatched = hasRoadMatchedGeometry(route);
  return {
    linePoints: mapLinePoints(route),
    roadMatched,
    status: mapGeometryStatus(route, requestedStatus),
  };
}

/**
 * The rendered route owns the geometry truth. A pending status can describe a
 * request before geometry exists, but a stale "matched" status must never
 * make a waypoint trace look like road-following geometry.
 */
export function mapGeometryStatus(route: RoutePlan, requestedStatus?: MapGeometryStatus): MapGeometryStatus {
  // A supplied or recorded trace is drawable, but it is not road-following
  // geometry. Canonical review views carry this metadata explicitly; the
  // family fallback keeps older catalog plans honest as previews too.
  if (!hasRoadMatchedGeometry(route)) return requestedStatus === 'loading' ? 'loading' : 'pilot';
  if (requestedStatus === 'pilot' && route.familyId === 'nbh-loop') return 'pilot';
  if (route.geometry?.length) return 'matched';
  return requestedStatus === 'loading' ? 'loading' : 'pilot';
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
  return Boolean(route.geometry?.length) &&
    (metadata.geometryKind === undefined || metadata.geometryKind === 'road_matched') &&
    (metadata.geometryStatus === undefined || metadata.geometryStatus === 'ready');
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
