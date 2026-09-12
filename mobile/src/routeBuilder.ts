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
  return field === 'start'
    ? { ...state, startText: value, activeField: field, suggestionsOpen: field }
    : { ...state, destinationText: value, activeField: field, suggestionsOpen: field };
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
function isBahrainCoordinate(coordinate: Coordinate) { return coordinate.latitude >= BAHRAIN_BOUNDS.minLatitude && coordinate.latitude <= BAHRAIN_BOUNDS.maxLatitude && coordinate.longitude >= BAHRAIN_BOUNDS.minLongitude && coordinate.longitude <= BAHRAIN_BOUNDS.maxLongitude; }

function bearingDegrees(from: Coordinate, to: Coordinate) { const dLon = (to.longitude - from.longitude) * Math.PI / 180; const lat1 = from.latitude * Math.PI / 180; const lat2 = to.latitude * Math.PI / 180; const y = Math.sin(dLon) * Math.cos(lat2); const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; }
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) { const earthRadius = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
