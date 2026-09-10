import type { Coordinate, RoutePlan, RoutePoint } from './domain';
import { departureInstant } from './routeTime';

const unknownRoad = (source: string) => ({ kind: 'unknown' as const, label: 'Unknown road data', evidence: 'This route has no validated infrastructure evidence yet.', evidenceAr: 'لا تتوفر أدلة موثقة عن البنية التحتية لهذا المسار بعد.', source, confidence: 'low' as const });
export const ROUTE_LIMITS = { maxDistanceKm: 160, maxLegKm: 35, maxPoints: 2_000 } as const;
const BAHRAIN_BOUNDS = { minLatitude: 25.5, maxLatitude: 26.5, minLongitude: 50.3, maxLongitude: 50.9 } as const;

export type RouteValidationError = 'tooFewPoints' | 'outsideCoverage' | 'tooLong' | 'legTooLong' | null;

export function validateRouteCoordinates(coordinates: Coordinate[]): RouteValidationError {
  const valid = coordinates.filter(isValidCoordinate);
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
  const validCoordinates = coordinates.filter(isValidCoordinate).filter((coordinate, index, all) => index === 0 || coordinate.latitude !== all[index - 1].latitude || coordinate.longitude !== all[index - 1].longitude);
  if (validateRouteCoordinates(validCoordinates)) return null;
  const points: RoutePoint[] = [];
  let distanceKm = 0;
  validCoordinates.forEach((coordinate, index) => {
    if (index > 0) distanceKm += haversineKm(validCoordinates[index - 1].latitude, validCoordinates[index - 1].longitude, coordinate.latitude, coordinate.longitude);
    const next = validCoordinates[index + 1] ?? validCoordinates[index - 1] ?? coordinate;
    points.push({ name: index === 0 ? `Start · ${name}` : index === validCoordinates.length - 1 ? `Finish · ${name}` : `Route point ${index}`, nameAr: index === 0 ? `البداية · ${name}` : index === validCoordinates.length - 1 ? `النهاية · ${name}` : `نقطة المسار ${index}`, latitude: coordinate.latitude, longitude: coordinate.longitude, distanceKm, headingDegrees: bearingDegrees(coordinate, next), suitability: unknownRoad(source) });
  });
  return { id, name, nameAr: name, source, distanceKm: Number(distanceKm.toFixed(1)), departureAt: departureInstant('tomorrow'), departureLabel: '', arrivalLabel: '', durationMinutes: 0, recommendation: 'Route evidence is unknown until the route service validates the geometry.', windSummary: { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 }, segments: [], points };
}

/** Build a visible draft even after the first tap; saving still requires two
 * points and runs the normal Bahrain/length validation. */
export function draftRouteFromCoordinates(id: string, name: string, coordinates: Coordinate[], source = 'Drawn on device'): RoutePlan | null {
  const validCoordinates = coordinates.filter(isValidCoordinate).filter((coordinate, index, all) => index === 0 || coordinate.latitude !== all[index - 1].latitude || coordinate.longitude !== all[index - 1].longitude);
  if (!validCoordinates.length) return null;
  return routeFromCoordinates(id, name, validCoordinates, source) ?? {
    id,
    name,
    nameAr: name,
    source,
    distanceKm: 0,
    departureAt: departureInstant('tomorrow'),
    departureLabel: '',
    arrivalLabel: '',
    durationMinutes: 0,
    recommendation: 'Route evidence is unknown until the route service validates the geometry.',
    windSummary: { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 },
    segments: [],
    points: [{ name: `Start · ${name}`, nameAr: `البداية · ${name}`, ...validCoordinates[0], distanceKm: 0, headingDegrees: 0, suitability: unknownRoad(source) }],
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
function isBahrainCoordinate(coordinate: Coordinate) { return coordinate.latitude >= BAHRAIN_BOUNDS.minLatitude && coordinate.latitude <= BAHRAIN_BOUNDS.maxLatitude && coordinate.longitude >= BAHRAIN_BOUNDS.minLongitude && coordinate.longitude <= BAHRAIN_BOUNDS.maxLongitude; }

function bearingDegrees(from: Coordinate, to: Coordinate) { const dLon = (to.longitude - from.longitude) * Math.PI / 180; const lat1 = from.latitude * Math.PI / 180; const lat2 = to.latitude * Math.PI / 180; const y = Math.sin(dLon) * Math.cos(lat2); const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; }
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) { const earthRadius = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
