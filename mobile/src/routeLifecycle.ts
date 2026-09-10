import { ROUTE_MATCHING_MAX_WAYPOINTS } from './domain';
import type { ActiveRideSnapshot, Coordinate, RouteGeometryKind, RoutePlan, RouteRecord } from './domain';
import { createActiveRideSnapshot, routeAnalysisKey } from './routeRepository';

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
  return { state: 'validated', route: next };
}

export const validateRoute = validateRouteLifecycle;

export function beginRouteMatching(route: RouteRecord): RouteLifecycleState {
  if (route.points.length > ROUTE_MATCHING_WAYPOINT_LIMIT) return waypointLimitExceeded(route);
  const validated = validateRouteLifecycle(route);
  if (validated.state === 'draft' || validated.state === 'matching-failed') return validated;
  const next = clone(validated.route);
  next.geometry = { kind: 'road_matched', status: 'matching', coordinates: [] };
  next.revision += 1;
  next.analysis = undefined;
  return { state: 'matching', route: next, waypointCount: next.points.length, maxWaypoints: ROUTE_MATCHING_WAYPOINT_LIMIT };
}

export const startRouteMatching = beginRouteMatching;

export function routeMatchingSucceeded(route: RouteRecord, matchedPlan: RoutePlan): TraceReadyState | MatchingFailedState {
  const coordinates = matchedPlan.geometry?.map(toCoordinate) ?? [];
  if (coordinates.length < 2) return matchingFailure(route, 'invalidResponse');
  const next = clone(route);
  next.points = clone(matchedPlan.points);
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
  if (route.geometry.status !== 'ready') throw new Error('Only a ready route can be analysed.');
  return { state: 'analysis', route: clone(route), analysisKey: routeAnalysisKey(route, departureAt) };
}

export const analyseRouteLifecycle = analyseSelectedRoute;

/**
 * Gate planned-route Live Ride. Recording-only sessions do not provide a
 * RouteRecord and are intentionally started by their separate explicit path.
 */
export function liveRidePolicyGate(route: RouteRecord, _policy?: WaypointTraceLiveRidePolicy): LiveRidePolicyGate {
  if (route.geometry.status !== 'ready') return { allowed: false, decision: 'blocked', reason: 'route_not_ready' };
  if (route.geometry.kind !== 'road_matched') {
    return { allowed: false, decision: 'blocked', reason: 'geometry_not_road_matched' };
  }
  return { allowed: true, decision: 'allowed', reason: 'ready' };
}

export const waypointTraceLiveRideGate = liveRidePolicyGate;

export function navigationPolicyGate(route: RouteRecord): NavigationPolicyGate {
  if (route.geometry.status !== 'ready') return { allowed: false, reason: 'route_not_ready' };
  if (route.geometry.kind !== 'road_matched') return { allowed: false, reason: 'geometry_not_road_matched' };
  return { allowed: true, reason: 'road_matched' };
}

export const canUseForNavigation = (route: RouteRecord) => navigationPolicyGate(route).allowed;

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

function matchingFailure(route: RouteRecord, reason: RouteMatchingFailureReason): MatchingFailedState {
  const next = clone(route);
  next.geometry = {
    kind: 'waypoint_trace',
    status: 'unavailable',
    coordinates: next.points.map(toCoordinate),
  };
  next.revision += 1;
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
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function normalizeInstant(value: string | Date): string {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Expected a valid end instant.');
  return date.toISOString();
}
