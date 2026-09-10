import type { RoutePlan, SegmentCondition } from './domain';
import { BAHRAIN_LOCALES, formatBahrainTime } from './routeTime';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const API_BASE_URL = configuredApiUrl && (!IS_PRODUCTION || /^https:\/\//i.test(configuredApiUrl)) ? configuredApiUrl : undefined;
// EXPO_PUBLIC_* values are embedded in the client bundle. This token is only a
// local-pilot convenience; production must use user/session authentication.
const API_TOKEN = IS_PRODUCTION ? undefined : process.env.EXPO_PUBLIC_API_TOKEN;
const ANALYSIS_CACHE_TTL_MS = 30_000;
const analysisCache = new Map<string, { expiresAt: number; value: RemoteRouteAnalysis }>();
const analysisInFlight = new Map<string, Promise<RemoteRouteAnalysis | null>>();

export type RemoteRouteAnalysis = { segments: SegmentCondition[]; durationMinutes: number; arrivalAt: string; windSummary: RoutePlan['windSummary'] };

export async function requestRouteAnalysis(route: RoutePlan, departureAt: string, typicalSpeedKph = 26): Promise<RemoteRouteAnalysis | null> {
  // Fail closed until the app has a real user/session auth flow. A public
  // mobile bundle must never call a protected API with a static token.
  if (!API_BASE_URL || IS_PRODUCTION) return null;
  const key = JSON.stringify({ routeId: route.id, routeRevision: route.revision ?? 1, departureAt, typicalSpeedKph, points: route.points, geometry: route.geometry ?? [] });
  const cached = analysisCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) analysisCache.delete(key);
  const pending = analysisInFlight.get(key);
  if (pending) return pending;
  const request = fetchAnalysis(route, departureAt, typicalSpeedKph).then((value) => {
    if (value) {
      while (analysisCache.size >= 128) analysisCache.delete(analysisCache.keys().next().value as string);
      analysisCache.set(key, { value, expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS });
    }
    return value;
  }).finally(() => analysisInFlight.delete(key));
  analysisInFlight.set(key, request);
  return request;
}

async function fetchAnalysis(route: RoutePlan, departureAt: string, typicalSpeedKph: number): Promise<RemoteRouteAnalysis | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${API_BASE_URL!.replace(/\/$/, '')}/v1/route-analysis`, { method: 'POST', headers: { 'content-type': 'application/json', ...(API_TOKEN ? { authorization: `Bearer ${API_TOKEN}` } : {}) }, body: JSON.stringify({ routeId: route.id, routeRevision: route.revision ?? 1, points: route.points, geometry: route.geometry, departureAt, typicalSpeedKph }), signal: controller.signal });
    if (!response.ok) throw new Error(`Route analysis failed (${response.status})`);
    return parseRemoteAnalysis(await response.json(), route);
  } finally {
    clearTimeout(timer);
  }
}

export const apiConfigured = Boolean(API_BASE_URL && !IS_PRODUCTION);

function parseRemoteAnalysis(payload: unknown, route: RoutePlan): RemoteRouteAnalysis | null {
  if (!isRecord(payload) || !boundedNumber(payload.durationMinutes, 0, 2_000) || !validDate(payload.arrivalAt) || !isRecord(payload.windSummary) || !boundedNumber(payload.windSummary.tailwindPercent, 0, 100) || !boundedNumber(payload.windSummary.headwindPercent, 0, 100) || !boundedNumber(payload.windSummary.crosswindPercent, 0, 100) || !Array.isArray(payload.segments) || payload.segments.length < 1 || payload.segments.length > 2_000) return null;
  const segments: SegmentCondition[] = [];
  for (const candidate of payload.segments) {
    if (!isRecord(candidate) || !boundedString(candidate.id, 128) || !boundedString(candidate.name, 160) || !validDate(candidate.arrivalAt) || !isWind(candidate.wind) || !isSuitability(candidate.suitability)) return null;
    const wind = candidate.wind;
    segments.push({
      id: `${route.id}-api-${candidate.id}`,
      name: candidate.name,
      nameAr: typeof candidate.nameAr === 'string' ? candidate.nameAr.slice(0, 160) : undefined,
      arrivalAt: candidate.arrivalAt,
      arrivalLabel: formatBahrainTime(candidate.arrivalAt, BAHRAIN_LOCALES.en, { hour12: false }),
      wind,
      suitability: candidate.suitability,
      insight: wind.kind === 'headwind' ? 'Headwind allowance included.' : wind.kind === 'tailwind' ? 'Wind is helping this section.' : 'Crosswind is noticeable here.',
    });
  }
  return { durationMinutes: payload.durationMinutes, arrivalAt: payload.arrivalAt, windSummary: { tailwindPercent: payload.windSummary.tailwindPercent, headwindPercent: payload.windSummary.headwindPercent, crosswindPercent: payload.windSummary.crosswindPercent }, segments };
}

function isWind(value: unknown): value is SegmentCondition['wind'] {
  if (!isRecord(value) || (value.kind !== 'headwind' && value.kind !== 'tailwind' && value.kind !== 'crosswind')) return false;
  return boundedNumber(value.magnitudeKph, 0, 200) && boundedNumber(value.headwindKph, -200, 200) && boundedNumber(value.crosswindKph, 0, 200) && (value.gustsKph === undefined || boundedNumber(value.gustsKph, 0, 300)) && (value.forecastTime === undefined || boundedString(value.forecastTime, 64)) && (value.source === undefined || boundedString(value.source, 160)) && (value.gridCell === undefined || boundedString(value.gridCell, 80));
}

function isSuitability(value: unknown): value is SegmentCondition['suitability'] {
  return isRecord(value) && (value.kind === 'dedicated' || value.kind === 'mixed' || value.kind === 'restricted' || value.kind === 'unknown') && boundedString(value.label, 120) && boundedString(value.evidence, 300) && boundedString(value.source, 160) && (value.confidence === 'high' || value.confidence === 'medium' || value.confidence === 'low') && (value.evidenceAr === undefined || boundedString(value.evidenceAr, 300)) && (value.sourceUrl === undefined || boundedString(value.sourceUrl, 500));
}

function validDate(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(new Date(value).getTime()); }
function boundedNumber(value: unknown, minimum: number, maximum: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum; }
function boundedString(value: unknown, maxLength: number): value is string { return typeof value === 'string' && value.length > 0 && value.length <= maxLength; }
function isRecord(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
