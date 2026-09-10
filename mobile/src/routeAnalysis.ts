import type {
  AnalysisRun,
  AnalysisSegment,
  Confidence,
  RouteRecord,
  RoutePlan,
  TimedWind,
  WindForecast,
} from "./domain";
import { routePlanFromRecord } from "./routeRepository";
import { analyseRoute } from "./routeEngine";
import { BAHRAIN_TIME_ZONE, toIsoInstant } from "./routeTime";

export type RouteAnalysisInput = {
  route: RouteRecord;
  departureAt: string | Date;
  wind?: WindForecast;
  hourlyWind?: TimedWind[];
  forecastRunAt?: string;
  forecastSource?: string;
  typicalSpeedKph?: number;
  algorithmVersion?: string;
  pacePolicy?: string;
};

export type RouteAnalysisResult = { plan: RoutePlan; run: AnalysisRun };

export type DepartureComparison = {
  departureAt: string;
  run: AnalysisRun;
  plan: RoutePlan;
  score: number;
  selected: boolean;
};

export type RunExplanationLabels = {
  paused?: string;
  headwindAndTailwind?: (
    headwind: string,
    headwindKm: string,
    tailwind: string,
    tailwindKm: string,
  ) => string;
  headwind?: (name: string, distanceKm: string) => string;
  tailwind?: (name: string, distanceKm: string) => string;
  mixed?: string;
  segmentName?: (segment: AnalysisSegment) => string;
};

const confidenceScore: Record<Confidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function analyseRouteRevision({
  route,
  departureAt,
  wind,
  hourlyWind = [],
  forecastRunAt,
  forecastSource,
  typicalSpeedKph = 26,
  algorithmVersion = "segment-wind-v1",
  pacePolicy = "steady-road-26-kph",
}: RouteAnalysisInput): RouteAnalysisResult {
  const instant = toIsoInstant(departureAt);
  const sourcePlan = routePlanFromRecord(route);
  const plan = analyseRoute(
    sourcePlan,
    typicalSpeedKph,
    0,
    wind,
    hourlyWind,
    new Date(instant),
  );
  const routeConfidence = routeEvidenceConfidence(route);
  const forecastConfidence =
    hourlyWind.length >= 2 && forecastRunAt
      ? "medium"
      : hourlyWind.length
        ? "low"
        : "low";
  const confidence = lowestConfidence(routeConfidence, forecastConfidence);
  const segments: AnalysisSegment[] = plan.segments.map((segment, index) => {
    const startDistanceKm = plan.points[index]?.distanceKm ?? 0;
    const endDistanceKm = plan.points[index + 1]?.distanceKm ?? startDistanceKm;
    const phase =
      index === 0
        ? "outbound"
        : index === plan.segments.length - 1
          ? "finish"
          : "middle";
    return {
      ...segment,
      startDistanceKm,
      endDistanceKm,
      phase,
      confidence,
      forecastConfidence,
    };
  });
  const run: AnalysisRun = {
    id: `analysis-${route.id}-${route.revision}-${instant}`,
    ...(route.familyId ? { familyId: route.familyId } : {}),
    ...(route.variantId ? { variantId: route.variantId } : {}),
    routeId: route.id,
    routeRevision: route.revision,
    departureAt: instant,
    timeZone: BAHRAIN_TIME_ZONE,
    ...(forecastRunAt ? { forecastRunAt } : {}),
    ...(forecastSource ? { forecastSource } : {}),
    pacePolicy,
    algorithmVersion,
    routeConfidence,
    forecastConfidence,
    confidence,
    ranking: confidence === "low" ? "suppressed" : "enabled",
    segments,
  };
  return {
    plan: {
      ...plan,
      familyId: route.familyId,
      variantId: route.variantId,
      revisionId: route.revisionId,
      revision: route.revision,
    },
    run,
  };
}

export function compareDepartures(
  route: RouteRecord,
  departureAt: Array<string | Date>,
  options: Omit<RouteAnalysisInput, "route" | "departureAt"> = {},
): DepartureComparison[] {
  const results = departureAt.map((instant) => {
    const result = analyseRouteRevision({
      route,
      departureAt: instant,
      ...options,
    });
    return {
      departureAt: result.run.departureAt,
      run: result.run,
      plan: result.plan,
      score: comparisonScore(result.run),
    };
  });
  const canRank =
    results.length > 0 &&
    results.every((result) => result.run.ranking === "enabled");
  const bestScore = canRank
    ? Math.min(...results.map((result) => result.score))
    : Number.NaN;
  return results.map((result) => ({
    ...result,
    selected: canRank && result.score === bestScore,
  }));
}

export function comparisonScore(run: AnalysisRun): number {
  if (!run.segments.length) return Number.POSITIVE_INFINITY;
  return run.segments.reduce((total, segment) => {
    const length = Math.max(0, segment.endDistanceKm - segment.startDistanceKm);
    const effort =
      segment.wind.kind === "headwind"
        ? segment.wind.magnitudeKph * 1.35
        : segment.wind.kind === "crosswind"
          ? segment.wind.magnitudeKph * 0.55
          : 0;
    return total + length * effort;
  }, 0);
}

export function explainRun(
  run: AnalysisRun,
  number: (value: number) => string = (value) => value.toFixed(1),
  labels: RunExplanationLabels = {},
): string {
  if (run.ranking === "suppressed")
    return (
      labels.paused ??
      "Comparison is paused while route or forecast confidence is low."
    );
  const headwind = longestCondition(run.segments, "headwind");
  const tailwind = longestCondition(run.segments, "tailwind");
  const headwindName = headwind
    ? (labels.segmentName?.(headwind) ?? headwind.name)
    : "";
  const tailwindName = tailwind
    ? (labels.segmentName?.(tailwind) ?? tailwind.name)
    : "";
  const headwindDistance = headwind ? number(segmentLength(headwind)) : "";
  const tailwindDistance = tailwind ? number(segmentLength(tailwind)) : "";
  if (headwind && tailwind)
    return (
      labels.headwindAndTailwind?.(
        headwindName,
        headwindDistance,
        tailwindName,
        tailwindDistance,
      ) ??
      `${headwindName} carries the stronger headwind across ${headwindDistance} km; ${tailwindName} is more favourable across ${tailwindDistance} km.`
    );
  if (headwind)
    return (
      labels.headwind?.(headwindName, headwindDistance) ??
      `${headwindName} carries the stronger headwind across ${headwindDistance} km; allow more effort and time there.`
    );
  if (tailwind)
    return (
      labels.tailwind?.(tailwindName, tailwindDistance) ??
      `${tailwindName} is the more favourable section across ${tailwindDistance} km.`
    );
  return (
    labels.mixed ?? "Wind effect is mixed across the named route segments."
  );
}

export function aheadWindow(
  run: AnalysisRun,
  routeDistanceKm: number,
  horizonKm = 3,
): AnalysisSegment[] {
  const start = Math.max(0, routeDistanceKm);
  const end = start + horizonKm;
  return run.segments.filter(
    (segment) => segment.endDistanceKm > start && segment.startDistanceKm < end,
  );
}

export function remainingOrderedSegments(
  run: AnalysisRun,
  routeDistanceKm: number,
): AnalysisSegment[] {
  return run.segments.filter(
    (segment) => segment.endDistanceKm > routeDistanceKm,
  );
}

export function routeEvidenceConfidence(route: RouteRecord): Confidence {
  if (route.geometry.status !== "ready") return "low";
  if (route.geometry.kind !== "road_matched") return "low";
  if (route.roadEvidenceStatus === "sourced") return "high";
  return route.roadEvidenceStatus === "pilot_pending" ? "low" : "medium";
}

export function lowestConfidence(
  first: Confidence,
  second: Confidence,
): Confidence {
  return confidenceScore[first] <= confidenceScore[second] ? first : second;
}

function longestCondition(
  segments: AnalysisSegment[],
  kind: AnalysisSegment["wind"]["kind"],
) {
  return segments
    .filter((segment) => segment.wind.kind === kind)
    .sort((first, second) => segmentLength(second) - segmentLength(first))[0];
}

function segmentLength(segment: AnalysisSegment) {
  return Math.max(0, segment.endDistanceKm - segment.startDistanceKm);
}
