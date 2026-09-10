import type {
  AnalysisRun,
  Confidence,
  PositionMatch,
  RouteRecord,
} from "./domain";
import { copy, localizedConfidenceLabel } from "./i18n";
import { routeEvidenceConfidence } from "./routeAnalysis";

export type LayerTone =
  | "favorable"
  | "headwind"
  | "crosswind"
  | "uncertain"
  | "selected"
  | "matched"
  | "off-corridor";

export type RouteLayer = {
  id: "route-access" | "forecast" | "selection" | "live-position";
  label: string;
  labelAr: string;
  detail: string;
  detailAr: string;
  tone: LayerTone;
  confidence: Confidence;
  accessibleLabel: string;
  accessibleLabelAr: string;
};

export type RouteLayerInput = {
  route: RouteRecord;
  analysis?: AnalysisRun;
  selected?: boolean;
  match?: PositionMatch;
};

export function buildRouteLayers({
  route,
  analysis,
  selected = true,
  match,
}: RouteLayerInput): RouteLayer[] {
  const routeConfidence = routeEvidenceConfidence(route);
  const forecastConfidence = analysis?.forecastConfidence ?? "low";
  const forecastSegment =
    analysis?.segments.find((segment) => segment.wind.kind === "headwind") ??
    analysis?.segments[0];
  const forecastDetail = forecastSegment
    ? `${conditionName(forecastSegment.wind.kind)} across ${formatKm(forecastSegment.startDistanceKm)}–${formatKm(forecastSegment.endDistanceKm)} km; forecast confidence is ${localizedConfidenceLabel(copy.en, forecastConfidence)}.`
    : "Forecast condition is not available for the selected revision.";
  const live = match
    ? liveLayerCopy(match)
    : {
        tone: "uncertain" as const,
        confidence: "low" as const,
        detail: "Live location is off until a Naseem ride is active.",
        detailAr: "يبقى الموقع متوقفاً حتى تبدأ رحلة في نسيم.",
      };
  return [
    {
      id: "route-access",
      label: "Route / access evidence",
      labelAr: "أدلة المسار والوصول",
      detail:
        route.geometry.kind === "road_matched" &&
        route.roadEvidenceStatus === "sourced"
          ? "Road-following route line with sourced access details."
          : "Preview route — road verification pending. This is not a safety claim.",
      detailAr:
        route.geometry.kind === "road_matched" &&
        route.roadEvidenceStatus === "sourced"
          ? "خط مسار يتبع الطرق مع أدلة وصول موثقة المصدر."
          : "معاينة المسار — التحقق من الطرق معلّق. هذا ليس ادعاءً بالسلامة.",
      tone: routeConfidence === "high" ? "matched" : "uncertain",
      confidence: routeConfidence,
      accessibleLabel: `Route/access layer: ${localizedConfidenceLabel(copy.en, routeConfidence)}. ${route.geometry.kind === "road_matched" ? "Road-following route line." : "Recorded route preview."}`,
      accessibleLabelAr: `طبقة أدلة المسار والوصول: ${localizedConfidenceLabel(copy.ar, routeConfidence)}. ${route.geometry.kind === "road_matched" ? "خط مسار يتبع الطرق." : "معاينة مسار مسجلة."}`,
    },
    {
      id: "forecast",
      label: "Forecast condition",
      labelAr: "حالة التوقع",
      detail: forecastDetail,
      detailAr: forecastSegment
        ? `${conditionNameAr(forecastSegment.wind.kind)} بين ${formatKmAr(forecastSegment.startDistanceKm)} و${formatKmAr(forecastSegment.endDistanceKm)} كم؛ ${localizedConfidenceLabel(copy.ar, forecastConfidence)} للتوقع.`
        : "لا تتوفر حالة توقع لهذه النسخة المختارة.",
      tone: forecastSegment
        ? forecastTone(forecastSegment.wind.kind)
        : "uncertain",
      confidence: forecastConfidence,
      accessibleLabel: `Forecast condition layer: ${forecastDetail}`,
      accessibleLabelAr: `طبقة حالة التوقع: ${forecastSegment ? `${conditionNameAr(forecastSegment.wind.kind)} بين ${formatKmAr(forecastSegment.startDistanceKm)} و${formatKmAr(forecastSegment.endDistanceKm)} كم.` : "لا تتوفر حالة توقع."}`,
    },
    {
      id: "selection",
      label: "Selection",
      labelAr: "حالة الاختيار",
      detail: selected ? "Chosen route" : "Alternative route",
      detailAr: selected ? "المسار المختار" : "مسار بديل",
      tone: selected ? "selected" : "uncertain",
      confidence: selected ? "high" : "medium",
      accessibleLabel: selected
        ? "Route choice layer: chosen route."
        : "Route choice layer: alternative route.",
      accessibleLabelAr: selected
        ? "طبقة اختيار المسار: المسار المختار."
        : "طبقة اختيار المسار: مسار بديل.",
    },
    {
      id: "live-position",
      label: "Live position",
      labelAr: "الموقع المباشر",
      detail: live.detail,
      detailAr: live.detailAr,
      tone: live.tone,
      confidence: live.confidence,
      accessibleLabel: `Live-position layer: ${live.detail}`,
      accessibleLabelAr: `طبقة الموقع المباشر: ${live.detailAr}`,
    },
  ];
}

export function confidenceLabel(confidence: Confidence, arabic = false) {
  return localizedConfidenceLabel(arabic ? copy.ar : copy.en, confidence);
}

export function layerColor(tone: LayerTone) {
  if (tone === "favorable" || tone === "matched") return "#087A74";
  if (tone === "headwind" || tone === "off-corridor") return "#A94B31";
  if (tone === "crosswind") return "#5A63B8";
  if (tone === "selected") return "#102A2E";
  return "#6B7B7D";
}

function forecastTone(kind: "headwind" | "tailwind" | "crosswind"): LayerTone {
  return kind === "tailwind"
    ? "favorable"
    : kind === "headwind"
      ? "headwind"
      : "crosswind";
}

function liveLayerCopy(match: PositionMatch) {
  if (match.state === "matched")
    return {
      tone: "matched" as const,
      confidence: match.confidence,
      detail: "Position matched to the selected route corridor.",
      detailAr: "تمت مطابقة الموقع مع ممر المسار المختار.",
    };
  if (match.state === "approaching")
    return {
      tone: "uncertain" as const,
      confidence: match.confidence,
      detail:
        "Approaching the selected route entry; route progress has not started.",
      detailAr: "تقترب من مدخل المسار المختار؛ لم يبدأ تقدم المسار.",
    };
  if (match.state === "off-corridor")
    return {
      tone: "off-corridor" as const,
      confidence: match.confidence,
      detail: "Not confidently matched. Check the map and surroundings.",
      detailAr: "لم تتم المطابقة بثقة. راجع الخريطة وما حولك.",
    };
  if (match.state === "stale")
    return {
      tone: "uncertain" as const,
      confidence: "low" as const,
      detail: "Location update is stale; route progress is paused.",
      detailAr: "تحديث الموقع قديم؛ تم إيقاف تقدم المسار.",
    };
  return {
    tone: "uncertain" as const,
    confidence: match.confidence,
    detail: "Location is uncertain; route progress is paused.",
    detailAr: "الموقع غير مؤكد؛ تم إيقاف تقدم المسار.",
  };
}

function conditionName(kind: "headwind" | "tailwind" | "crosswind") {
  return kind === "headwind"
    ? "Headwind"
    : kind === "tailwind"
      ? "More favourable wind"
      : "Crosswind";
}
function conditionNameAr(kind: "headwind" | "tailwind" | "crosswind") {
  return kind === "headwind"
    ? "رياح أمامية"
    : kind === "tailwind"
      ? "رياح أكثر ملاءمة"
      : "رياح جانبية";
}
function formatKm(value: number) {
  return value.toFixed(1);
}
function formatKmAr(value: number) {
  return value.toLocaleString("ar-BH", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
