import type { RoutePlan, TimedWind, WindForecast, WindKind } from './domain';
import { departureInstant, formatBahrainTime, BAHRAIN_LOCALES } from './routeTime';
import { routePlanHasAuthoritativeGeometry } from './routeRepository';

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function windComponents(headingDegrees: number, wind: WindForecast) {
  const heading = radians(headingDegrees);
  const travelEast = Math.sin(heading);
  const travelNorth = Math.cos(heading);
  const from = radians(wind.directionFrom);
  const airEast = -Math.sin(from) * wind.speed;
  const airNorth = -Math.cos(from) * wind.speed;
  const tailwindKph = airEast * travelEast + airNorth * travelNorth;
  const crosswindKph = Math.abs(airEast * travelNorth - airNorth * travelEast);
  return { tailwindKph, headwindKph: Math.max(0, -tailwindKph), crosswindKph };
}

export function windKind(components: ReturnType<typeof windComponents>): WindKind {
  if (components.headwindKph >= Math.max(components.tailwindKph, components.crosswindKph)) return 'headwind';
  if (components.tailwindKph >= components.crosswindKph) return 'tailwind';
  return 'crosswind';
}

export function adjustedSpeedKph(baseSpeed: number, components: ReturnType<typeof windComponents>) {
  // tailwindKph is signed: a headwind is already negative. Apply each vector
  // once so a headwind is not penalised twice through headwindKph as well.
  return Math.max(12, Math.min(baseSpeed + components.tailwindKph * 0.18 - components.crosswindKph * 0.04, baseSpeed + 5));
}

export function gustAllowanceKph(wind: WindForecast) {
  return Math.min(4, Math.max(0, (wind.gusts ?? wind.speed) - wind.speed) * 0.12);
}

function nearestWind(forecasts: TimedWind[], target: Date) {
  return forecasts.reduce((closest, item) => Math.abs(new Date(item.time).getTime() - target.getTime()) < Math.abs(new Date(closest.time).getTime() - target.getTime()) ? item : closest, forecasts[0]);
}

export function analyseRoute(seed: RoutePlan, baseSpeed = 26, departureOffsetMinutes = 0, liveWind?: WindForecast, hourlyWind: TimedWind[] = [], departureAt?: Date): RoutePlan {
  if (!canAnalyseRoute(seed)) return withoutFinalMetrics(seed);
  const fallbackWind = liveWind ?? { speed: 18, directionFrom: 330, gusts: 29 };
  let elapsedMinutes = 0;
  let lastDistance = seed.points[0]?.distanceKm ?? 0;
  const counts = { tailwind: 0, headwind: 0, crosswind: 0 };
  const startDate = departureAt ? new Date(departureAt) : new Date(new Date(departureInstant('tomorrow')).getTime() + departureOffsetMinutes * 60_000);
  const segments = seed.points.slice(1).map((point, index) => {
    const target = new Date(startDate.getTime() + elapsedMinutes * 60_000);
    const wind = hourlyWind.length ? nearestWind(hourlyWind, target) : fallbackWind;
    const previous = seed.points[index];
    const components = windComponents(previous.headingDegrees, wind);
    const kind = windKind(components);
    const distance = point.distanceKm - lastDistance;
    elapsedMinutes += (distance / Math.max(12, adjustedSpeedKph(baseSpeed, components) - gustAllowanceKph(wind))) * 60;
    lastDistance = point.distanceKm;
    counts[kind] += distance;
    const arrivalAt = new Date(startDate.getTime() + elapsedMinutes * 60_000).toISOString();
    const magnitude = kind === 'headwind' ? components.headwindKph : kind === 'tailwind' ? Math.max(0, components.tailwindKph) : components.crosswindKph;
    const forecastTime = 'time' in wind && typeof wind.time === 'string' ? wind.time : undefined;
    return { id: `${seed.id}-${index}`, name: point.name, nameAr: point.nameAr, arrivalAt, arrivalLabel: formatBahrainTime(arrivalAt, BAHRAIN_LOCALES.en, { hour12: false }), wind: { kind, magnitudeKph: magnitude, headwindKph: components.headwindKph, crosswindKph: components.crosswindKph, gustsKph: wind.gusts ?? wind.speed, forecastTime, source: hourlyWind.length ? 'Open-Meteo' : undefined }, suitability: point.suitability, insight: kind === 'tailwind' ? 'The wind is helping this section.' : kind === 'headwind' ? 'This is the tougher section; pace allowance is included.' : 'Crosswind is noticeable here. Keep the forecast in context.' };
  });
  const total = seed.points[seed.points.length - 1]?.distanceKm || seed.distanceKm || 1;
  const arrivalAt = new Date(startDate.getTime() + elapsedMinutes * 60_000).toISOString();
  if (!routePlanHasAuthoritativeGeometry(seed)) return withoutFinalMetrics(seed, previewSegments(segments));
  return { ...seed, distanceStatus: 'authoritative', departureAt: startDate.toISOString(), departureLabel: formatBahrainTime(startDate, BAHRAIN_LOCALES.en, { hour12: false }), durationMinutes: Math.round(elapsedMinutes), arrivalAt, arrivalLabel: formatBahrainTime(arrivalAt, BAHRAIN_LOCALES.en, { hour12: false }), segments, windSummary: { tailwindPercent: Math.round((counts.tailwind / total) * 100), headwindPercent: Math.round((counts.headwind / total) * 100), crosswindPercent: Math.round((counts.crosswind / total) * 100) } };
}

function canAnalyseRoute(route: RoutePlan) {
  if (route.geometryStatus !== 'ready' || (route.geometryKind !== 'road_matched' && route.geometryKind !== 'recorded_trace')) return false;
  if (route.geometryKind === 'road_matched' && !routePlanHasAuthoritativeGeometry(route)) return false;
  if (route.points.length < 2 || !Number.isFinite(route.distanceKm) || route.distanceKm <= 0) return false;
  return route.points.every((point, index) => Number.isFinite(point.distanceKm) && point.distanceKm >= 0 && (index === 0 || point.distanceKm >= route.points[index - 1].distanceKm));
}

function withoutFinalMetrics(seed: RoutePlan, segments: RoutePlan['segments'] = []): RoutePlan {
  const provisionalDistanceKm = Number.isFinite(seed.provisionalDistanceKm) && (seed.provisionalDistanceKm ?? 0) >= 0
    ? seed.provisionalDistanceKm!
    : Number.isFinite(seed.distanceKm) && seed.distanceKm >= 0
      ? seed.distanceKm
      : seed.points.at(-1)?.distanceKm ?? 0;
  const downgradeInvalidRoad = seed.geometryKind === 'road_matched'
    || (seed.geometryStatus === 'ready' && seed.geometryKind !== 'recorded_trace' && seed.geometryKind !== 'waypoint_trace');
  return {
    ...seed,
    ...(downgradeInvalidRoad ? {
      geometryKind: 'waypoint_trace' as const,
      geometryStatus: 'unavailable' as const,
      geometry: undefined,
      geometryDistancesKm: undefined,
      geometrySource: undefined,
      corridor: undefined,
      legDistancesKm: undefined,
      routedDistanceKm: undefined,
    } : {}),
    distanceKm: provisionalDistanceKm,
    provisionalDistanceKm,
    distanceStatus: 'provisional',
    departureAt: undefined,
    arrivalAt: undefined,
    departureLabel: '',
    arrivalLabel: '',
    durationMinutes: 0,
    recommendation: '',
    segments,
    windSummary: { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 },
  };
}

function previewSegments(segments: RoutePlan['segments']): RoutePlan['segments'] {
  return segments.map((segment) => ({
    ...segment,
    arrivalAt: undefined,
    arrivalLabel: '',
    wind: { kind: 'crosswind', magnitudeKph: 0, headwindKph: 0, crosswindKph: 0 },
    insight: '',
  }));
}
