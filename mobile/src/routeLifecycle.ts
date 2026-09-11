import { ROUTE_MATCHING_MAX_WAYPOINTS } from './domain';
import type { ActiveRideSnapshot, Coordinate, RouteGeometryKind, RoutePlan, RouteRecord } from './domain';
import { createActiveRideSnapshot, routeAnalysisKey, routePlanHasAuthoritativeGeometry, routeRecordHasAuthoritativeGeometry } from './routeRepository';

export type RouteLifecycleStage =
  | 'draft'
  | 'validated'
  | 'matching'
  | 'trace-ready'
  | 'saved-personal'
  | 'selected'
  | 'analysis'
  | 'active-snapshot'
  | 'ended'
  | 'matching-failed'
  | 'waypoint-limit-exceeded';

export type RouteMatchingFailureReason =
  | 'tooFewWaypoints'
  | 'tooManyWaypoints'
  | 'outsideCoverage'
  | 'routerUnavailable'
  | 'noRoute'
  | 'invalidResponse'
  | 'rateLimited';

export type RouteRecoveryAction = 'retry' | 'edit-points' | 'reduce-points';

type RouteState = { route: RouteRecord };
type DraftState = RouteState & { state: 'draft' };
type ValidatedState = RouteState & { state: 'validated' };
type MatchingState = RouteState & { state: 'matching'; waypointCount: number; maxWaypoints: number };
type TraceReadyState = RouteState & { state: 'trace-ready' };
type SavedPersonalState = RouteState & { state: 'saved-personal' };
type SelectedState = RouteState & { state: 'selected' };
type AnalysisState = RouteState & { state: 'analysis'; analysisKey: string };
type MatchingFailedState = RouteState & {
  state: 'matching-failed';
  reason: RouteMatchingFailureReason;
  recoverable: true;
  recoveryActions: readonly RouteRecoveryAction[];
};
type WaypointLimitState = RouteState & {
  state: 'waypoint-limit-exceeded';
  reason: 'tooManyWaypoints';
  recoverable: true;
  waypointCount: number;
  maxWaypoints: number;
  recoveryActions: readonly RouteRecoveryAction[];
};

export type RouteLifecycleState = DraftState | ValidatedState | MatchingState | TraceReadyState | SavedPersonalState | SelectedState | AnalysisState | MatchingFailedState | WaypointLimitState | { state: 'active-snapshot'; snapshot: ActiveRideSnapshot } | { state: 'ended'; snapshot: ActiveRideSnapshot; endedAt: string };

export type WaypointTraceLiveRidePolicy = 'allow' | 'deny';
export const DEFAULT_WAYPOINT_TRACE_LIVE_RIDE_POLICY: WaypointTraceLiveRidePolicy | undefined = undefined;
export const PHASE_0_DECISION_GATES = {
  arabicTypeface: {
    status: 'decision_required',
    key: 'approved_arabic_typeface',
    reason: 'Owner must provide the approved Arabic family, licensed weights, and fallback policy before Arabic typography work.',
  },
  waypointTraceLiveRide: {
    status: 'decision_required',
    key: 'waypoint_trace_live_ride_policy',
    reason: 'Owner must explicitly allow or deny Live Ride from an unmatched waypoint trace.',
  },
  bahrainTimePolicy: {
    status: 'decision_required',
    key: 'bahrain_time_policy',
    reason: 'Owner must confirm the Bahrain-zone and 12/24-hour plus Arabic-numeral presentation policy.',
  },
} as const;

export type LiveRidePolicyGate = {
  allowed: boolean;
  decision: 'allowed' | 'blocked' | 'decision_required';
  reason: 'ready' | 'route_not_ready' | 'geometry_not_road_matched' | 'waypoint_trace_policy_required' | 'waypoint_trace_not_allowed';
};

export type NavigationPolicyGate = {
  allowed: boolean;
  reason: 'road_matched' | 'route_not_ready' | 'geometry_not_road_matched';
};

export type ActiveRideStartResult =
  | { ok: true; state: 'active-snapshot'; snapshot: ActiveRideSnapshot }
  | { ok: false; state: 'blocked'; route: RouteRecord; gate: LiveRidePolicyGate };

export const ROUTE_MATCHING_WAYPOINT_LIMIT = ROUTE_MATCHING_MAX_WAYPOINTS;

export function draftRouteLifecycle(route: RouteRecord): DraftState {
  return { state: 'draft', route: clone(route) };
}

export const createDraftRouteLifecycle = draftRouteLifecycle;

export type RouteValidationState = DraftState | ValidatedState | MatchingFailedState;

export function validateRouteLifecycle(route: RouteRecord): RouteValidationState {
  const next = clone(route);
  if (next.points.length < 2) return { state: 'draft', route: next };
  if (!next.points.every(isCoordinate)) return matchingFailure(next, 'invalidResponse');
  if (next.geometry.status === 'unavailable') return matchingFailure(next, 'noRoute');
  if (next.geometry.status !== 'ready') next.analysis = undefined;
  if (next.geometry.status === 'ready' && next.geometry.kind === 'road_matched' && !routeRecordHasAuthoritativeGeometry(next)) return matchingFailure(next, 'invalidResponse');
  return { state: 'validated', route: next };
}

export const validateRoute = validateRouteLifecycle;

export function beginRouteMatching(route: RouteRecord): RouteLifecycleState {
  if (route.points.length > ROUTE_MATCHING_WAYPOINT_LIMIT) return waypointLimitExceeded(route);
  const validated = validateRouteLifecycle(route);
  if (validated.state === 'draft' || validated.state === 'matching-failed') return validated;
  const next = clone(validated.route);
  next.geometry = { kind: 'road_matched', status: 'matching', coordinates: [] };
  next.provisionalDistanceKm = next.provisionalDistanceKm ?? pointDistanceKm(next.points);
  next.revision += 1;
  next.analysis = undefined;
  return { state: 'matching', route: next, waypointCount: next.points.length, maxWaypoints: ROUTE_MATCHING_WAYPOINT_LIMIT };
}

export const startRouteMatching = beginRouteMatching;

export function routeMatchingSucceeded(route: RouteRecord, matchedPlan: RoutePlan): TraceReadyState | MatchingFailedState {
  const coordinates = matchedPlan.geometry?.map(toCoordinate) ?? [];
  if (route.geometry.status !== 'matching'
    || route.geometry.kind !== 'road_matched'
    || matchedPlan.id !== route.id
    || (matchedPlan.revision !== undefined && matchedPlan.revision !== route.revision)
    || (matchedPlan.revisionId !== undefined && route.revisionId !== undefined && matchedPlan.revisionId !== route.revisionId)
    || !routePlanHasAuthoritativeGeometry(matchedPlan)) return matchingFailure(route, 'invalidResponse');
  if (!coordinatesMatchEndpoints(coordinates, route.points) || !matchedPointsMatchRoute(matchedPlan.points, route.points)) return matchingFailure(route, 'invalidResponse');
  const next = clone(route);
  next.points = mergeMatchedPoints(next.points, matchedPlan.points);
  next.geometry = {
    kind: 'road_matched',
    status: 'ready',
    coordinates,
    ...(matchedPlan.geometryDistancesKm ? { distancesKm: clone(matchedPlan.geometryDistancesKm) } : {}),
    ...(matchedPlan.geometrySource ? { source: matchedPlan.geometrySource } : {}),
  };
  next.revision += 1;
  next.analysis = undefined;
  return { state: 'trace-ready', route: next };
}

export const completeRouteMatching = routeMatchingSucceeded;

export function routeMatchingFailed(route: RouteRecord, reason: RouteMatchingFailureReason = 'routerUnavailable'): MatchingFailedState | WaypointLimitState {
  if (reason === 'tooManyWaypoints') return waypointLimitExceeded(route);
  return matchingFailure(route, reason);
}

export const markRouteMatchingFailed = routeMatchingFailed;

export function waypointLimitExceeded(route: RouteRecord): WaypointLimitState {
  const next = clone(route);
  next.geometry = {
    kind: 'waypoint_trace',
    status: 'unavailable',
    coordinates: next.points.map(toCoordinate),
  };
  next.provisionalDistanceKm = next.provisionalDistanceKm ?? pointDistanceKm(next.points);
  next.revision += 1;
  next.analysis = undefined;
  return {
    state: 'waypoint-limit-exceeded',
    route: next,
    reason: 'tooManyWaypoints',
    recoverable: true,
    waypointCount: next.points.length,
    maxWaypoints: ROUTE_MATCHING_WAYPOINT_LIMIT,
    recoveryActions: ['reduce-points', 'edit-points'],
  };
}

export const routeWaypointLimitRecovery = waypointLimitExceeded;

export function traceReady(route: RouteRecord, kind: Extract<RouteGeometryKind, 'recorded_trace' | 'waypoint_trace'> = route.origin === 'gpx' ? 'recorded_trace' : 'waypoint_trace'): TraceReadyState {
  const next = clone(route);
  next.geometry = {
    ...next.geometry,
    kind,
    status: 'ready',
    coordinates: next.geometry.coordinates.length ? next.geometry.coordinates : next.points.map(toCoordinate),
  };
  next.provisionalDistanceKm = next.provisionalDistanceKm ?? pointDistanceKm(next.points);
  next.revision += 1;
  next.analysis = undefined;
  return { state: 'trace-ready', route: next };
}

export const markTraceReady = traceReady;

export function savePersonalRoute(route: RouteRecord): RouteLifecycleState {
  const state = validateRouteLifecycle(route);
  if (state.state !== 'validated' || state.route.geometry.status !== 'ready') return state;
  const next = clone(state.route);
  if (next.ownership !== 'personal') {
    next.ownership = 'personal';
    next.revision += 1;
    next.analysis = undefined;
  }
  return { state: 'saved-personal', route: next };
}

export const markSavedPersonal = savePersonalRoute;

export function selectRoute(route: RouteRecord): RouteLifecycleState {
  const state = validateRouteLifecycle(route);
  if (state.state === 'draft' || state.state === 'matching-failed') return state;
  if (state.route.geometry.status !== 'ready') return notReadyState(state.route);
  return { state: 'selected', route: clone(state.route) };
}

export const markSelected = selectRoute;

export function analyseSelectedRoute(routeOrState: RouteRecord | SelectedState, departureAt: string | Date): AnalysisState {
  const route = 'state' in routeOrState ? routeOrState.route : routeOrState;
  if (!routeRecordHasAuthoritativeGeometry(route)) throw new Error('Only an explicit ready road route can be analysed.');
  return { state: 'analysis', route: clone(route), analysisKey: routeAnalysisKey(route, departureAt) };
}

export const analyseRouteLifecycle = analyseSelectedRoute;

/**
 * Gate planned-route Live Ride. Recording-only sessions do not provide a
 * RouteRecord and are intentionally started by their separate explicit path.
 */
export function liveRidePolicyGate(route: RouteRecord, _policy?: WaypointTraceLiveRidePolicy): LiveRidePolicyGate {
  if (route.geometry.status !== 'ready') return { allowed: false, decision: 'blocked', reason: 'route_not_ready' };
  if (!routeRecordHasAuthoritativeGeometry(route)) {
    return { allowed: false, decision: 'blocked', reason: 'geometry_not_road_matched' };
  }
  return { allowed: true, decision: 'allowed', reason: 'ready' };
}

export const waypointTraceLiveRideGate = liveRidePolicyGate;

export function navigationPolicyGate(route: RouteRecord): NavigationPolicyGate {
  if (route.geometry.status !== 'ready') return { allowed: false, reason: 'route_not_ready' };
  if (!routeRecordHasAuthoritativeGeometry(route)) return { allowed: false, reason: 'geometry_not_road_matched' };
  return { allowed: true, reason: 'road_matched' };
}

export const canUseForNavigation = (route: RouteRecord) => navigationPolicyGate(route).allowed;
export const routeIsNavigable = canUseForNavigation;

export function startActiveRide(routeOrState: RouteRecord | SelectedState | AnalysisState, startedAt: string | Date, policy?: WaypointTraceLiveRidePolicy, options: { analysisKey?: string } = {}): ActiveRideStartResult {
  const route = 'state' in routeOrState ? routeOrState.route : routeOrState;
  const gate = liveRidePolicyGate(route, policy);
  if (!gate.allowed) return { ok: false, state: 'blocked', route: clone(route), gate };
  const analysisKey = 'state' in routeOrState && routeOrState.state === 'analysis' ? routeOrState.analysisKey : undefined;
  return { ok: true, state: 'active-snapshot', snapshot: createActiveRideSnapshot(route, startedAt, { analysisKey: options.analysisKey ?? analysisKey }) };
}

export const activateRoute = startActiveRide;

export function endActiveRide(activeOrState: ActiveRideSnapshot | { state: 'active-snapshot'; snapshot: ActiveRideSnapshot }, endedAt: string | Date): Extract<RouteLifecycleState, { state: 'ended' }> {
  const snapshot = 'state' in activeOrState ? activeOrState.snapshot : activeOrState;
  return { state: 'ended', snapshot, endedAt: normalizeInstant(endedAt) };
}

export const markRideEnded = endActiveRide;

export type ReverseRouteResult =
  | { ok: true; state: 'draft'; route: RouteRecord }
  | { ok: false; state: 'unavailable'; reason: 'tooFewWaypoints' | 'shared-start-finish' };

/** Reverse a route as a new draft; shared-start loops have no distinct reverse endpoints. */
export function reverseRoute(route: RouteRecord): ReverseRouteResult {
  if (route.points.length < 2) return { ok: false, state: 'unavailable', reason: 'tooFewWaypoints' };
  if (sameCoordinate(route.points[0], route.points.at(-1)!)) return { ok: false, state: 'unavailable', reason: 'shared-start-finish' };
  const next = clone(route);
  const reversed = clone(route.points).reverse();
  let cumulativeDistanceKm = 0;
  next.points = reversed.map((point, index) => {
    if (index > 0) cumulativeDistanceKm += coordinateDistanceKm(reversed[index - 1], point);
    const following = reversed[index + 1] ?? point;
    return { ...point, distanceKm: cumulativeDistanceKm, headingDegrees: bearingDegrees(point, following) };
  });
  next.geometry = {
    kind: 'waypoint_trace',
    status: 'draft',
    coordinates: next.points.map(toCoordinate),
  };
  next.provisionalDistanceKm = cumulativeDistanceKm;
  next.revision += 1;
  if (next.revisionId) next.revisionId = `${next.revisionId}-r${next.revision}`;
  next.analysis = undefined;
  return { ok: true, state: 'draft', route: next };
}

export const reverseRouteLifecycle = reverseRoute;

function matchingFailure(route: RouteRecord, reason: RouteMatchingFailureReason): MatchingFailedState {
  const next = clone(route);
  next.geometry = {
    kind: 'waypoint_trace',
    status: 'unavailable',
    coordinates: next.points.map(toCoordinate),
  };
  next.provisionalDistanceKm = next.provisionalDistanceKm ?? pointDistanceKm(next.points);
  if (route.geometry.status !== 'unavailable') next.revision += 1;
  next.analysis = undefined;
  return { state: 'matching-failed', route: next, reason, recoverable: true, recoveryActions: ['retry', 'edit-points'] };
}

function notReadyState(route: RouteRecord): RouteLifecycleState {
  if (route.geometry.status === 'draft') return { state: 'draft', route: clone(route) };
  if (route.geometry.status === 'matching') return { state: 'matching', route: clone(route), waypointCount: route.points.length, maxWaypoints: ROUTE_MATCHING_WAYPOINT_LIMIT };
  return matchingFailure(route, 'noRoute');
}

function isCoordinate(value: Coordinate) { return Number.isFinite(value.latitude) && Number.isFinite(value.longitude); }
function toCoordinate(point: Coordinate): Coordinate { return { latitude: point.latitude, longitude: point.longitude }; }
function coordinatesMatchEndpoints(geometry: Coordinate[], points: Coordinate[]) {
  return geometry.length >= 2
    && points.length >= 2
    && isCoordinate(geometry[0])
    && isCoordinate(geometry.at(-1)!)
    && coordinateDistanceKm(geometry[0], points[0]) <= 2
    && coordinateDistanceKm(geometry.at(-1)!, points.at(-1)!) <= 2;
}
function matchedPointsMatchRoute(matched: RoutePlan['points'], requested: RouteRecord['points']) {
  if (matched.length !== requested.length || matched.length < 2) return false;
  return matched[0].distanceKm === 0
    && matched.at(-1)!.distanceKm > 0
    && matched.every((point, index) => isCoordinate(point)
    && Number.isFinite(point.distanceKm)
    && point.distanceKm >= 0
    && (index === 0 || point.distanceKm >= matched[index - 1].distanceKm)
    && coordinateDistanceKm(point, requested[index]) <= 2);
}
function mergeMatchedPoints(requested: RouteRecord['points'], matched: RoutePlan['points']): RouteRecord['points'] {
  return requested.map((point, index) => ({
    ...point,
    latitude: matched[index].latitude,
    longitude: matched[index].longitude,
    distanceKm: matched[index].distanceKm,
    headingDegrees: matched[index].headingDegrees,
  }));
}
function sameCoordinate(first: Coordinate, second: Coordinate) {
  return first.latitude === second.latitude && first.longitude === second.longitude;
}
function pointDistanceKm(points: RouteRecord['points']) {
  const indexed = points.at(-1)?.distanceKm;
  if (indexed !== undefined && Number.isFinite(indexed) && indexed >= 0) return indexed;
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += coordinateDistanceKm(points[index - 1], points[index]);
  return total;
}
function coordinateDistanceKm(first: Coordinate, second: Coordinate) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(second.latitude - first.latitude);
  const dLon = radians(second.longitude - first.longitude);
  const lat1 = radians(first.latitude);
  const lat2 = radians(second.latitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
function bearingDegrees(from: Coordinate, to: Coordinate) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const degrees = (value: number) => (value * 180) / Math.PI;
  const y = Math.sin(radians(to.longitude - from.longitude)) * Math.cos(radians(to.latitude));
  const x = Math.cos(radians(from.latitude)) * Math.sin(radians(to.latitude)) - Math.sin(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.cos(radians(to.longitude - from.longitude));
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function normalizeInstant(value: string | Date): string {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Expected a valid end instant.');
  return date.toISOString();
}
