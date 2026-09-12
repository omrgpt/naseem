import type { Coordinate, RoutePlan, RoutePoint } from './domain';
import { departureInstant } from './routeTime';
import type { BuilderRouteState, PlannerPoint } from './screenTypes';

const unknownRoad = (source: string) => ({ kind: 'unknown' as const, label: 'Unknown road data', evidence: 'This route has no validated infrastructure evidence yet.', evidenceAr: 'لا تتوفر أدلة موثقة عن البنية التحتية لهذا المسار بعد.', source, confidence: 'low' as const });
export const ROUTE_LIMITS = { maxDistanceKm: 160, maxLegKm: 35, maxPoints: 2_000 } as const;
const BAHRAIN_BOUNDS = { minLatitude: 25.5, maxLatitude: 26.5, minLongitude: 50.3, maxLongitude: 50.9 } as const;

export type RouteValidationError = 'tooFewPoints' | 'outsideCoverage' | 'tooLong' | 'legTooLong' | null;

export type PlannerField = 'start' | 'destination';
export type PlannerInputState = {
  startText: string;
  destinationText: string;
  start: PlannerPoint | null;
  destination: PlannerPoint | null;
  activeField: PlannerField | null;
  suggestionsOpen: PlannerField | null;
};

export type PlannerValidationError =
  | 'emptyStart'
  | 'emptyDestination'
  | 'invalidStart'
  | 'invalidDestination'
  | 'uncommittedStart'
  | 'uncommittedDestination'
  | 'sameEndpoints'
  | null;

export function createPlannerInputState(
  start: PlannerPoint | null = null,
  destination: PlannerPoint | null = null,
): PlannerInputState {
  return {
    startText: start?.name ?? '',
    destinationText: destination?.name ?? '',
    start,
    destination,
    activeField: null,
    suggestionsOpen: null,
  };
}

export function updatePlannerTextState(
  state: PlannerInputState,
  field: PlannerField,
  value: string,
): PlannerInputState {
  const currentPoint = field === 'start' ? state.start : state.destination;
  const textMatchesPoint = Boolean(
    currentPoint &&
      (value.trim() === currentPoint.name.trim() ||
        value.trim() === currentPoint.nameAr?.trim()),
  );
  const nextPoint = textMatchesPoint ? currentPoint : null;
  return field === 'start'
    ? {
        ...state,
        startText: value,
        start: nextPoint,
        activeField: field,
        suggestionsOpen: field,
      }
    : {
        ...state,
        destinationText: value,
        destination: nextPoint,
        activeField: field,
        suggestionsOpen: field,
      };
}

export function commitPlannerPoint(
  state: PlannerInputState,
  field: PlannerField,
  point: PlannerPoint,
): PlannerInputState {
  const nextStart = field === 'start' ? { ...point } : state.start;
  const nextDestination = field === 'destination' ? { ...point } : state.destination;
  return {
    ...state,
    start: nextStart,
    destination: nextDestination,
    startText: field === 'start' ? point.name : state.startText,
    destinationText: field === 'destination' ? point.name : state.destinationText,
    activeField: field === 'start' && !nextDestination ? 'destination' : null,
    suggestionsOpen: null,
  };
}

export function clearPlannerPointState(
  state: PlannerInputState,
  field: PlannerField,
): PlannerInputState {
  return field === 'start'
    ? { ...state, start: null, startText: '', activeField: field, suggestionsOpen: field }
    : { ...state, destination: null, destinationText: '', activeField: field, suggestionsOpen: field };
}

export function plannerEndpointIsCommitted(
  state: PlannerInputState,
  field: PlannerField,
): boolean {
  const point = field === 'start' ? state.start : state.destination;
  const text = field === 'start' ? state.startText : state.destinationText;
  if (!point) return false;
  const trimmed = text.trim();
  return trimmed === point.name.trim() || trimmed === point.nameAr?.trim();
}

export function validatePlannerEndpoints(
  start: PlannerPoint | null | undefined,
  destination: PlannerPoint | null | undefined,
): PlannerValidationError {
  if (!start) return 'emptyStart';
  if (!destination) return 'emptyDestination';
  if (!isValidCoordinate(start)) return 'invalidStart';
  if (!isValidCoordinate(destination)) return 'invalidDestination';
  if (start.latitude === destination.latitude && start.longitude === destination.longitude) {
    return 'sameEndpoints';
  }
  return null;
}

export function validatePlannerInput(state: PlannerInputState): PlannerValidationError {
  const endpointError = validatePlannerEndpoints(state.start, state.destination);
  if (endpointError) return endpointError;
  if (!plannerEndpointIsCommitted(state, 'start')) return 'uncommittedStart';
  if (!plannerEndpointIsCommitted(state, 'destination')) return 'uncommittedDestination';
  return null;
}

export function plannerInputCanMatch(state: PlannerInputState): boolean {
  return validatePlannerInput(state) === null;
}

export type PlannerMatchPreparation =
  | {
      ok: true;
      start: PlannerPoint;
      destination: PlannerPoint;
      points: PlannerPoint[];
    }
  | {
      ok: false;
      error: Exclude<PlannerValidationError, null>;
    };

/** Prepare the exact committed input that the App is allowed to send to routing. */
export function preparePlannerMatch(
  state: PlannerInputState,
  orderedPoints: readonly PlannerPoint[] = [state.start, state.destination].filter(
    (point): point is PlannerPoint => Boolean(point),
  ),
): PlannerMatchPreparation {
  const error = validatePlannerInput(state);
  if (error) return { ok: false, error };
  const start = state.start!;
  const destination = state.destination!;
  const points = [...orderedPoints];
  if (!points.length || !sameCoordinate(points[0], start))
    return { ok: false, error: 'invalidStart' };
  if (points.length < 2 || !sameCoordinate(points.at(-1)!, destination))
    return { ok: false, error: 'invalidDestination' };
  return { ok: true, start, destination, points };
}

export type MapSurfaceBounds = {
  center: Coordinate;
  latitudeDelta: number;
  longitudeDelta: number;
};

/** Convert a touch/pointer position in the editor surface into a map point. */
export function coordinateFromMapSurface(
  point: { x: number; y: number },
  size: { width: number; height: number },
  bounds: MapSurfaceBounds,
): Coordinate | null {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0 ||
    !Number.isFinite(bounds.center.latitude) ||
    !Number.isFinite(bounds.center.longitude) ||
    !Number.isFinite(bounds.latitudeDelta) ||
    !Number.isFinite(bounds.longitudeDelta) ||
    bounds.latitudeDelta <= 0 ||
    bounds.longitudeDelta <= 0
  )
    return null;
  const normalizedX = Math.max(0, Math.min(1, point.x / size.width));
  const normalizedY = Math.max(0, Math.min(1, point.y / size.height));
  return {
    latitude:
      bounds.center.latitude + (0.5 - normalizedY) * bounds.latitudeDelta,
    longitude:
      bounds.center.longitude + (normalizedX - 0.5) * bounds.longitudeDelta,
  };
}

const plannerValidationMessages = {
  en: {
    emptyStart: 'Choose a Start before finding a route.',
    emptyDestination: 'Choose a Destination before finding a route.',
    invalidStart: 'Choose a valid Start before finding a route.',
    invalidDestination: 'Choose a valid Destination before finding a route.',
    uncommittedStart: 'Choose the typed Start from the suggestions or map before finding a route.',
    uncommittedDestination: 'Choose the typed Destination from the suggestions or map before finding a route.',
    sameEndpoints: 'Choose a different Destination from Start.',
  },
  ar: {
    emptyStart: 'اختر نقطة بداية قبل العثور على المسار.',
    emptyDestination: 'اختر وجهة قبل العثور على المسار.',
    invalidStart: 'اختر نقطة بداية صحيحة قبل العثور على المسار.',
    invalidDestination: 'اختر وجهة صحيحة قبل العثور على المسار.',
    uncommittedStart: 'اختر البداية المكتوبة من الاقتراحات أو الخريطة قبل العثور على المسار.',
    uncommittedDestination: 'اختر الوجهة المكتوبة من الاقتراحات أو الخريطة قبل العثور على المسار.',
    sameEndpoints: 'اختر وجهة مختلفة عن البداية.',
  },
} as const;

export function plannerValidationMessage(
  error: Exclude<PlannerValidationError, null> | null,
  language: 'en' | 'ar' = 'en',
): string {
  return error ? plannerValidationMessages[language][error] : '';
}

export function builderStateAfterEdit(state: BuilderRouteState): BuilderRouteState {
  return {
    ...state,
    status: state.start || state.destination ? 'start-selected' : 'empty',
    route: null,
    error: undefined,
  };
}

export function builderStateForRetry(state: BuilderRouteState): BuilderRouteState {
  const editable = builderStateAfterEdit(state);
  return editable.start && editable.destination
    ? { ...editable, status: 'matching' }
    : editable;
}

export function selectSampleRoute(
  routes: readonly RoutePlan[],
  routeId: string,
): RoutePlan | null {
  return routes.find((route) => route.id === routeId) ?? null;
}

export type ManualSketchDecision = 'use' | 'save' | 'edit' | 'discard';
export type ManualSketchResult = {
  status: 'editing' | 'done';
  points: Coordinate[];
  redo: Coordinate[];
  route: RoutePlan | null;
  decision: 'pending' | ManualSketchDecision;
};

export function createManualSketchResult(
  coordinates: Coordinate[],
  id: string,
  name: string,
  source = 'Drawn on device',
): ManualSketchResult {
  const points = normalizeCoordinates(coordinates);
  return {
    status: points.length >= 2 ? 'done' : 'editing',
    points,
    redo: [],
    route: points.length ? draftRouteFromCoordinates(id, name, points, source) : null,
    decision: 'pending',
  };
}

export function applyManualSketchDecision(
  result: ManualSketchResult,
  decision: ManualSketchDecision,
): ManualSketchResult {
  if (decision === 'discard') {
    return { ...result, status: 'editing', points: [], redo: [], route: null, decision };
  }
  if (decision === 'edit') return { ...result, status: 'editing', decision };
  return { ...result, status: 'done', decision };
}

export type ManualStroke = Coordinate[];
export type ManualSketchState = {
  strokes: ManualStroke[];
  redo: ManualStroke[];
};

export type ManualStrokeCaptureState = {
  active: boolean;
  points: Coordinate[];
};

export type ManualStrokeCaptureResult = {
  capture: ManualStrokeCaptureState;
  stroke: Coordinate[];
};

export function beginManualStrokeCapture(
  coordinate: Coordinate,
): ManualStrokeCaptureState {
  const points = normalizeCoordinates([coordinate]);
  return { active: points.length > 0, points };
}

export function extendManualStrokeCapture(
  capture: ManualStrokeCaptureState,
  coordinate: Coordinate,
): ManualStrokeCaptureState {
  if (!capture.active) return cloneManualStrokeCapture(capture);
  const points = normalizeCoordinates([...capture.points, coordinate]);
  return { active: true, points };
}

export function endManualStrokeCapture(
  capture: ManualStrokeCaptureState,
): ManualStrokeCaptureResult {
  return {
    capture: { active: false, points: [] },
    stroke: normalizeCoordinates(capture.points),
  };
}

export function cancelManualStrokeCapture(
  capture: ManualStrokeCaptureState,
): ManualStrokeCaptureState {
  return { active: false, points: [] };
}

export function createManualSketchState(
  strokes: readonly Coordinate[][] = [],
): ManualSketchState {
  return {
    strokes: strokes
      .map((stroke) => normalizeCoordinates(stroke))
      .filter((stroke) => stroke.length > 0),
    redo: [],
  };
}

export function appendManualStroke(
  state: ManualSketchState,
  stroke: readonly Coordinate[],
): ManualSketchState {
  const points = normalizeCoordinates([...stroke]);
  if (!points.length) return cloneManualSketchState(state);
  return {
    strokes: [...state.strokes.map((item) => [...item]), points],
    redo: [],
  };
}

export function undoManualStroke(state: ManualSketchState): ManualSketchState {
  if (!state.strokes.length) return cloneManualSketchState(state);
  const strokes = state.strokes.map((stroke) => [...stroke]);
  const removed = strokes.pop();
  return {
    strokes,
    redo: removed
      ? [...state.redo.map((stroke) => [...stroke]), removed]
      : state.redo.map((stroke) => [...stroke]),
  };
}

export function redoManualStroke(state: ManualSketchState): ManualSketchState {
  if (!state.redo.length) return cloneManualSketchState(state);
  const redo = state.redo.map((stroke) => [...stroke]);
  const restored = redo.pop();
  return {
    strokes: restored
      ? [...state.strokes.map((stroke) => [...stroke]), restored]
      : state.strokes.map((stroke) => [...stroke]),
    redo,
  };
}

export function clearManualSketch(state: ManualSketchState): ManualSketchState {
  return {
    strokes: [],
    redo: state.strokes.map((stroke) => [...stroke]).reverse(),
  };
}

export function manualSketchCoordinates(state: ManualSketchState): Coordinate[] {
  return normalizeCoordinates(state.strokes.flatMap((stroke) => stroke));
}

function manualPointLocation(
  state: ManualSketchState,
  index: number,
): { strokeIndex: number; pointIndex: number } | null {
  if (!Number.isInteger(index) || index < 0) return null;
  let offset = 0;
  for (let strokeIndex = 0; strokeIndex < state.strokes.length; strokeIndex += 1) {
    const stroke = state.strokes[strokeIndex];
    if (index < offset + stroke.length)
      return { strokeIndex, pointIndex: index - offset };
    offset += stroke.length;
  }
  return null;
}

/** Remove a point without flattening the remaining stroke boundaries. */
export function removeManualPointFromSketch(
  state: ManualSketchState,
  index: number,
): ManualSketchState {
  const location = manualPointLocation(state, index);
  if (!location) return cloneManualSketchState(state);
  const strokes = state.strokes.map((stroke) => [...stroke]);
  strokes[location.strokeIndex].splice(location.pointIndex, 1);
  return {
    strokes: strokes.filter((stroke) => stroke.length > 0),
    redo: [],
  };
}

/** Move one displayed point while retaining every original stroke partition. */
export function moveManualPointInSketch(
  state: ManualSketchState,
  index: number,
  direction: -1 | 1,
): ManualSketchState {
  const location = manualPointLocation(state, index);
  const target = manualPointLocation(state, index + direction);
  if (!location || !target) return cloneManualSketchState(state);
  const strokes = state.strokes.map((stroke) => [...stroke]);
  const current = strokes[location.strokeIndex][location.pointIndex];
  strokes[location.strokeIndex][location.pointIndex] =
    strokes[target.strokeIndex][target.pointIndex];
  strokes[target.strokeIndex][target.pointIndex] = current;
  return { strokes, redo: [] };
}

export type ManualSketchMatchArtifact = {
  rawPoints: Coordinate[];
  routingPoints: Coordinate[];
};

/** Keep the drawn artifact and the bounded provider payload as separate values. */
export function createManualSketchMatchArtifact(
  coordinates: Coordinate[],
  maxRoutingPoints = 25,
): ManualSketchMatchArtifact {
  const rawPoints = normalizeCoordinates(coordinates);
  return {
    rawPoints,
    routingPoints: simplifyCoordinatesForRouting(rawPoints, maxRoutingPoints),
  };
}

export type ManualMatchSessionStatus = 'draft' | 'matching' | 'ready' | 'failed';
export type ManualMatchSession = {
  revision: number;
  status: ManualMatchSessionStatus;
  rawPoints: Coordinate[];
  routingPoints: Coordinate[];
};

export function createManualMatchSession(
  rawPoints: Coordinate[] = [],
): ManualMatchSession {
  return {
    revision: 0,
    status: 'draft',
    rawPoints: normalizeCoordinates(rawPoints),
    routingPoints: [],
  };
}

export function beginManualMatchSession(
  session: ManualMatchSession,
  rawPoints: Coordinate[],
  routingPoints: Coordinate[],
): ManualMatchSession {
  return {
    revision: session.revision + 1,
    status: 'matching',
    rawPoints: normalizeCoordinates(rawPoints),
    routingPoints: normalizeCoordinates(routingPoints),
  };
}

export function invalidateManualMatchSession(
  session: ManualMatchSession,
  rawPoints: Coordinate[],
): ManualMatchSession {
  return {
    revision: session.revision + 1,
    status: 'draft',
    rawPoints: normalizeCoordinates(rawPoints),
    routingPoints: [],
  };
}

export function manualMatchSessionIsCurrent(
  session: ManualMatchSession,
  revision: number,
): boolean {
  return session.status === 'matching' && session.revision === revision;
}

export function finishManualMatchSession(
  session: ManualMatchSession,
  revision: number,
  status: Exclude<ManualMatchSessionStatus, 'matching'>,
): ManualMatchSession | null {
  if (!manualMatchSessionIsCurrent(session, revision)) return null;
  return { ...session, status };
}

/** Cap a freehand request for routing while preserving the user-visible ends. */
export function simplifyCoordinatesForRouting(
  coordinates: Coordinate[],
  maxPoints = 25,
): Coordinate[] {
  const normalized = normalizeCoordinates(coordinates);
  const limit = Math.max(2, Math.floor(maxPoints));
  if (normalized.length <= limit) return normalized;
  const simplified = simplifyCoordinates(normalized, 0.000035);
  if (simplified.length <= limit) return simplified;
  const stride = Math.ceil((simplified.length - 1) / (limit - 1));
  return simplified.filter(
    (_, index) =>
      index === 0 ||
      index === simplified.length - 1 ||
      index % stride === 0,
  );
}

export type LoopGenerationFailure = 'invalidTarget' | 'outsideCoverage' | 'matchingFailed' | 'unknown';
export type LoopGenerationRecovery = {
  failure: LoopGenerationFailure;
  start: PlannerPoint | null;
  preservesStart: boolean;
  retryable: boolean;
  recoveryActions: readonly ('retry' | 'edit-start')[];
};

export function recoverLoopGenerationFailure(
  start: PlannerPoint | null,
  failure: LoopGenerationFailure,
): LoopGenerationRecovery {
  return {
    failure,
    start,
    preservesStart: Boolean(start),
    retryable: Boolean(start),
    recoveryActions: start ? ['retry', 'edit-start'] : ['edit-start'],
  };
}

export function validateRouteCoordinates(coordinates: Coordinate[]): RouteValidationError {
  const valid = normalizeCoordinates(coordinates);
  if (valid.length < 2) return 'tooFewPoints';
  if (valid.some((coordinate) => !isBahrainCoordinate(coordinate))) return 'outsideCoverage';
  if (valid.length > ROUTE_LIMITS.maxPoints) return 'tooLong';
  let distanceKm = 0;
  for (let index = 1; index < valid.length; index += 1) {
    const legKm = haversineKm(valid[index - 1].latitude, valid[index - 1].longitude, valid[index].latitude, valid[index].longitude);
    if (legKm > ROUTE_LIMITS.maxLegKm) return 'legTooLong';
    distanceKm += legKm;
    if (distanceKm > ROUTE_LIMITS.maxDistanceKm) return 'tooLong';
  }
  return null;
}

export function routeFromCoordinates(id: string, name: string, coordinates: Coordinate[], source = 'GPX import'): RoutePlan | null {
  const validCoordinates = normalizeCoordinates(coordinates);
  if (validateRouteCoordinates(validCoordinates)) return null;
  return buildRoutePlan(id, name, validCoordinates, source);
}

function buildRoutePlan(id: string, name: string, validCoordinates: Coordinate[], source: string): RoutePlan {
  const points: RoutePoint[] = [];
  let distanceKm = 0;
  validCoordinates.forEach((coordinate, index) => {
    if (index > 0) distanceKm += haversineKm(validCoordinates[index - 1].latitude, validCoordinates[index - 1].longitude, coordinate.latitude, coordinate.longitude);
    const next = validCoordinates[index + 1] ?? validCoordinates[index - 1] ?? coordinate;
    points.push({ name: index === 0 ? `Start · ${name}` : index === validCoordinates.length - 1 ? `Finish · ${name}` : `Route point ${index}`, nameAr: index === 0 ? `البداية · ${name}` : index === validCoordinates.length - 1 ? `النهاية · ${name}` : `نقطة المسار ${index}`, latitude: coordinate.latitude, longitude: coordinate.longitude, distanceKm, headingDegrees: bearingDegrees(coordinate, next), suitability: unknownRoad(source) });
  });
  return { id, name, nameAr: name, source, distanceKm: Number(distanceKm.toFixed(1)), departureAt: departureInstant('tomorrow'), departureLabel: '', arrivalLabel: '', durationMinutes: 0, recommendation: 'Route evidence is unknown until the route service validates the geometry.', windSummary: { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 }, segments: [], points };
}

/** Build a visible draft from every valid point; manual sketches stay
 * preview-only and do not claim road coverage or navigation readiness. */
export function draftRouteFromCoordinates(id: string, name: string, coordinates: Coordinate[], source = 'Drawn on device'): RoutePlan | null {
  const validCoordinates = normalizeCoordinates(coordinates);
  if (!validCoordinates.length) return null;
  const draft = buildRoutePlan(id, name, validCoordinates, source);
  return {
    ...draft,
    geometryKind: 'waypoint_trace',
    geometryStatus: 'draft',
    origin: 'drawn',
    ownership: 'personal',
    provisionalDistanceKm: draft.distanceKm,
    distanceStatus: 'provisional',
  };
}

export function parseGpx(gpx: string) {
  return parseGpxDetailed(gpx).coordinates;
}

export function parseGpxDetailed(gpx: string) {
  const coordinates: Coordinate[] = [];
  if (gpx.length > 2_000_000) return { coordinates, invalidCount: 0, pointCount: 0, error: 'tooLarge' as const };
  const pointPattern = /<(?:trkpt|rtept)\b[^>]*>/gi;
  let pointCount = 0;
  let invalidCount = 0;
  for (const match of gpx.matchAll(pointPattern)) {
    pointCount += 1;
    if (pointCount > 2_000) return { coordinates: [], invalidCount, pointCount, error: 'tooManyPoints' as const };
    const tag = match[0];
    const lat = tag.match(/\blat\s*=\s*["']([^"']+)["']/i)?.[1];
    const lon = tag.match(/\blon\s*=\s*["']([^"']+)["']/i)?.[1];
    const coordinate = { latitude: Number(lat), longitude: Number(lon) };
    if (isValidCoordinate(coordinate)) coordinates.push(coordinate); else invalidCount += 1;
  }
  return { coordinates, invalidCount, pointCount, error: null };
}

function isValidCoordinate(coordinate: Coordinate) { return Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude) && coordinate.latitude >= -90 && coordinate.latitude <= 90 && coordinate.longitude >= -180 && coordinate.longitude <= 180; }
function normalizeCoordinates(coordinates: Coordinate[]): Coordinate[] {
  return coordinates.filter(isValidCoordinate).filter((coordinate, index, all) => index === 0 || coordinate.latitude !== all[index - 1].latitude || coordinate.longitude !== all[index - 1].longitude);
}

function cloneManualSketchState(state: ManualSketchState): ManualSketchState {
  return {
    strokes: state.strokes.map((stroke) => [...stroke]),
    redo: state.redo.map((stroke) => [...stroke]),
  };
}

function cloneManualStrokeCapture(
  capture: ManualStrokeCaptureState,
): ManualStrokeCaptureState {
  return { active: capture.active, points: [...capture.points] };
}

function simplifyCoordinates(points: Coordinate[], tolerance: number): Coordinate[] {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maximum = tolerance;
    let index = -1;
    for (let cursor = start + 1; cursor < end; cursor += 1) {
      const distance = perpendicularDistance(points[cursor], points[start], points[end]);
      if (distance > maximum) {
        maximum = distance;
        index = cursor;
      }
    }
    if (index >= 0) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, index) => keep[index] === 1);
}

function perpendicularDistance(point: Coordinate, start: Coordinate, end: Coordinate) {
  const dx = end.longitude - start.longitude;
  const dy = end.latitude - start.latitude;
  if (dx === 0 && dy === 0) return Math.hypot(point.longitude - start.longitude, point.latitude - start.latitude);
  return Math.abs(dy * point.longitude - dx * point.latitude + end.longitude * start.latitude - end.latitude * start.longitude) / Math.hypot(dx, dy);
}
function sameCoordinate(first: Coordinate, second: Coordinate) {
  return first.latitude === second.latitude && first.longitude === second.longitude;
}
function isBahrainCoordinate(coordinate: Coordinate) { return coordinate.latitude >= BAHRAIN_BOUNDS.minLatitude && coordinate.latitude <= BAHRAIN_BOUNDS.maxLatitude && coordinate.longitude >= BAHRAIN_BOUNDS.minLongitude && coordinate.longitude <= BAHRAIN_BOUNDS.maxLongitude; }

function bearingDegrees(from: Coordinate, to: Coordinate) { const dLon = (to.longitude - from.longitude) * Math.PI / 180; const lat1 = from.latitude * Math.PI / 180; const lat2 = to.latitude * Math.PI / 180; const y = Math.sin(dLon) * Math.cos(lat2); const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; }
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) { const earthRadius = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
