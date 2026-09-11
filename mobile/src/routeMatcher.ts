import type { Coordinate, Confidence, PositionMatch, PositionMatchState, RoutePlan } from './domain';
import { routeProgress } from './routeProgress';
import { routePlanHasAuthoritativeGeometry } from './routeRepository';

export type MatchOptions = {
  accuracyMeters?: number;
  headingDegrees?: number;
  paceKph?: number;
  timestamp?: string | Date;
  referenceAt?: string | Date;
  previous?: PositionMatch;
};

export type StatefulRouteMatcher = {
  update: (coordinate: Coordinate, options?: Omit<MatchOptions, 'previous'>) => PositionMatch;
  reset: () => void;
  getLast: () => PositionMatch | undefined;
};

const OFF_CORRIDOR_THRESHOLD_KM = 0.35;
const STALE_AFTER_MS = 90_000;

export function matchRoutePosition(route: RoutePlan, coordinate: Coordinate, options: MatchOptions = {}): PositionMatch {
  const timestamp = toIso(options.timestamp ?? new Date());
  if (!routePlanHasAuthoritativeGeometry(route)) return unavailableMatch(timestamp, options.accuracyMeters);
  const canonicalDistanceKm = route.routedDistanceKm ?? route.distanceKm;
  const progressRoute = route.routedDistanceKm === undefined ? route : { ...route, distanceKm: canonicalDistanceKm };
  const previous = options.previous;
  const raw = routeProgress(progressRoute, coordinate, 0);
  const accuracyMeters = options.accuracyMeters;
  const entryDistanceKm = distanceKm(coordinate, route.points[0]);
  const loopAtEntry = isLoop(route) && entryDistanceKm <= Math.max(0.12, (accuracyMeters ?? 0) / 1_000);
  const stale = options.referenceAt ? new Date(options.referenceAt).getTime() - new Date(timestamp).getTime() > STALE_AFTER_MS : false;
  const tooFar = raw.offRouteKm > Math.max(OFF_CORRIDOR_THRESHOLD_KM, (accuracyMeters ?? 0) / 1_000 * 2);
  const lowAccuracy = accuracyMeters !== undefined && accuracyMeters > 80;
  const candidateCount = loopAtEntry ? 2 : 1;
  let state: PositionMatchState = stale ? 'stale' : tooFar ? 'off-corridor' : candidateCount > 1 ? 'uncertain' : lowAccuracy ? 'uncertain' : raw.progress < 0.04 && entryDistanceKm > 0.25 ? 'approaching' : 'matched';
  let progress = raw.progress;
  if (state === 'off-corridor' || state === 'stale' || state === 'uncertain') progress = previous?.progress ?? 0;
  const confidence: Confidence = state === 'matched' && (accuracyMeters ?? 0) <= 25 ? 'high' : state === 'off-corridor' || state === 'stale' ? 'low' : 'medium';
  return { routeDistanceKm: Math.max(0, progress * Math.max(canonicalDistanceKm, 1)), progress, confidence, state, ...(accuracyMeters !== undefined ? { accuracyMeters } : {}), candidateCount, timestamp, offCorridorKm: raw.offRouteKm };
}

export function createStatefulRouteMatcher(route: RoutePlan): StatefulRouteMatcher {
  const reviewedRoute = clone(route);
  let last: PositionMatch | undefined;
  let reverseEvidence = 0;
  return {
    update: (coordinate, options = {}) => {
      const raw = matchRoutePosition(reviewedRoute, coordinate, { ...options, ...(last ? { previous: last } : {}) });
      let next = raw;
      if (last && raw.progress < last.progress - 0.02 && raw.state === 'matched') {
        reverseEvidence += 1;
        if (reverseEvidence < 3) next = { ...raw, progress: last.progress, routeDistanceKm: last.routeDistanceKm, state: 'uncertain', confidence: 'low' };
      } else if (!last || raw.progress >= last.progress - 0.02) {
        reverseEvidence = 0;
      }
      last = next;
      return next;
    },
    reset: () => { last = undefined; reverseEvidence = 0; },
    getLast: () => last,
  };
}

export function distanceToRouteEntryKm(route: RoutePlan, coordinate: Coordinate) { return distanceKm(coordinate, route.points[0]); }

export function matchStateLabel(state: PositionMatchState, arabic = false) {
  if (!arabic) return state === 'approaching' ? 'Approaching entry' : state === 'matched' ? 'Position matched' : state === 'uncertain' ? 'Location uncertain' : state === 'off-corridor' ? 'Off corridor' : 'Stale location';
  return state === 'approaching' ? 'تقترب من المدخل' : state === 'matched' ? 'تمت مطابقة الموقع' : state === 'uncertain' ? 'الموقع غير مؤكد' : state === 'off-corridor' ? 'خارج الممر' : 'الموقع قديم';
}

function isLoop(route: RoutePlan) {
  const first = route.points[0];
  const last = route.points.at(-1);
  return Boolean(first && last && first.latitude === last.latitude && first.longitude === last.longitude);
}

function distanceKm(first: Coordinate | undefined, second: Coordinate | undefined) {
  if (!first || !second) return Number.POSITIVE_INFINITY;
  const latitudeScale = 110.574;
  const longitudeScale = 111.32 * Math.cos((first.latitude * Math.PI) / 180);
  return Math.hypot((first.latitude - second.latitude) * latitudeScale, (first.longitude - second.longitude) * longitudeScale);
}

function toIso(value: string | Date) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Expected a valid location timestamp.');
  return date.toISOString();
}

function unavailableMatch(timestamp: string, accuracyMeters?: number): PositionMatch {
  return {
    routeDistanceKm: 0,
    progress: 0,
    confidence: 'low',
    state: 'uncertain',
    ...(accuracyMeters !== undefined ? { accuracyMeters } : {}),
    candidateCount: 0,
    timestamp,
    offCorridorKm: Number.POSITIVE_INFINITY,
  };
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
