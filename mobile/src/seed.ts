import type {
  RouteCatalog,
  RouteCorridor,
  RouteEntryPoint,
  RouteFamily,
  RoutePlan,
  RoutePoint,
  RouteRevision,
  RouteVariant,
} from "./domain";
import {
  NBH_FAMILY_ID,
  NBH_PREVIEW_DISTANCE_KM,
  NBH_REVISION_ID,
  NBH_VARIANT_ID,
} from "./domain";
import { departureInstant } from "./routeTime";

const DEFAULT_SEED_DEPARTURE_AT = departureInstant("tomorrow");

export const NBH_CUSTOMER_NAMES = {
  short: "NBH Loop",
  full: "Nasser bin Hamad Loop",
  arabic: "حلقة ناصر بن حمد",
} as const;

const previewRoadEvidence = {
  kind: "unknown" as const,
  label: "Road/access evidence pending",
  evidence:
    "Bahrain Tourism establishes the public route identity; the supplied preview geometry does not verify road or access conditions.",
  evidenceAr:
    "تثبت هيئة السياحة الهوية العامة للمسار؛ ولا تتحقق هندسة المعاينة المقدمة من حالة الطرق أو الوصول.",
  source: "Bahrain Tourism",
  sourceUrl: "https://www.bahrain.com/en/the-nasser-bin-hamad-loop",
  confidence: "low" as const,
};

const mixed = {
  kind: "mixed" as const,
  label: "Mixed traffic road",
  evidence:
    "OpenStreetMap-derived road classification; not a safety assessment.",
  evidenceAr: "تصنيف للطريق مشتق من OpenStreetMap؛ وليس تقييماً للسلامة.",
  source: "OpenStreetMap",
  sourceUrl: "https://www.openstreetmap.org/",
  confidence: "low" as const,
};

const nbhEntry: RouteEntryPoint = {
  id: "nbh-entry-zallaq",
  name: "NBH entry · Zallaq",
  nameAr: "مدخل NBH · الزلاق",
  latitude: 25.9888,
  longitude: 50.4983,
};

const nbhFinish: RouteEntryPoint = {
  id: "nbh-finish-zallaq",
  name: "NBH finish · Zallaq",
  nameAr: "نهاية NBH · الزلاق",
  latitude: 25.9888,
  longitude: 50.4983,
};

const nbhPreviewPoints: RoutePoint[] = [
  {
    name: "Start · Zallaq",
    nameAr: "البداية · الزلاق",
    latitude: 25.9888,
    longitude: 50.4983,
    distanceKm: 0,
    headingDegrees: 47,
    suitability: previewRoadEvidence,
  },
  {
    name: "Northern approach",
    nameAr: "الاقتراب الشمالي",
    latitude: 26.015,
    longitude: 50.53,
    distanceKm: 4.304,
    headingDegrees: 171,
    suitability: previewRoadEvidence,
  },
  {
    name: "Eastern turn",
    nameAr: "المنعطف الشرقي",
    latitude: 25.96,
    longitude: 50.54,
    distanceKm: 10.501,
    headingDegrees: 270,
    suitability: previewRoadEvidence,
  },
  {
    name: "Western return",
    nameAr: "العودة الغربية",
    latitude: 25.96,
    longitude: 50.47,
    distanceKm: 17.499,
    headingDegrees: 41,
    suitability: previewRoadEvidence,
  },
  {
    name: "Finish · Zallaq",
    nameAr: "النهاية · الزلاق",
    latitude: 25.9888,
    longitude: 50.4983,
    distanceKm: NBH_PREVIEW_DISTANCE_KM,
    headingDegrees: 221,
    suitability: previewRoadEvidence,
  },
];

const nbhCorridor: RouteCorridor = {
  variantId: NBH_VARIANT_ID,
  revisionId: NBH_REVISION_ID,
  coordinates: nbhPreviewPoints.map(({ latitude, longitude }) => ({
    latitude,
    longitude,
  })),
  distancesKm: nbhPreviewPoints.map((point) => point.distanceKm),
  sharedGeometry: { startFinish: true, ranges: [{ startKm: 0, endKm: 0 }] },
};

export const NBH_CORRIDOR = nbhCorridor;

export const NBH_REVISION: RouteRevision = {
  id: NBH_REVISION_ID,
  familyId: NBH_FAMILY_ID,
  variantId: NBH_VARIANT_ID,
  revision: 1,
  corridor: nbhCorridor,
  geometry: {
    kind: "recorded_trace",
    status: "ready",
    coordinates: nbhCorridor.coordinates,
    distancesKm: nbhCorridor.distancesKm,
    source: "Supplied route preview geometry",
  },
  distanceKm: NBH_PREVIEW_DISTANCE_KM,
  entry: nbhEntry,
  finish: nbhFinish,
  reviewStatus: "pending",
  evidenceSummary:
    "The supplied preview geometry measures 21.8 km. Bahrain Tourism describes a 50 km track in Zallaq; the full-track geometry and road/access verification are not supplied here.",
  evidenceSummaryAr:
    "تبلغ هندسة المعاينة المقدمة ٢١٫٨ كم. تصف هيئة السياحة مساراً بطول ٥٠ كم في الزلاق؛ ولم تُقدَّم هندسة المسار الكامل أو التحقق من الطرق والوصول هنا.",
};

export const NBH_LOOP: RoutePlan = {
  id: NBH_FAMILY_ID,
  familyId: NBH_FAMILY_ID,
  variantId: NBH_VARIANT_ID,
  revisionId: NBH_REVISION_ID,
  name: NBH_CUSTOMER_NAMES.short,
  nameAr: NBH_CUSTOMER_NAMES.arabic,
  source: "Bahrain Tourism",
  distanceKm: NBH_PREVIEW_DISTANCE_KM,
  departureAt: DEFAULT_SEED_DEPARTURE_AT,
  departureLabel: "",
  arrivalLabel: "",
  durationMinutes: 52,
  recommendation:
    "Forecast signals are shown by named route segment. Road/access evidence remains pending for this preview.",
  windSummary: {
    tailwindPercent: 44,
    headwindPercent: 31,
    crosswindPercent: 25,
  },
  segments: [],
  corridor: nbhCorridor,
  points: nbhPreviewPoints,
};

export const COASTAL_LOOP: RoutePlan = {
  id: "coastal-loop",
  name: "Bahrain Bay Loop",
  nameAr: "حلقة خليج البحرين",
  source: "OpenStreetMap",
  distanceKm: 9.2,
  departureAt: DEFAULT_SEED_DEPARTURE_AT,
  departureLabel: "",
  arrivalLabel: "",
  durationMinutes: 22,
  recommendation:
    "Shorter option. Expect more variable crosswind and mixed-traffic exposure on connecting roads.",
  windSummary: {
    tailwindPercent: 33,
    headwindPercent: 22,
    crosswindPercent: 45,
  },
  segments: [],
  points: [
    {
      name: "Bahrain Bay",
      nameAr: "خليج البحرين",
      latitude: 26.247,
      longitude: 50.587,
      distanceKm: 0,
      headingDegrees: 65,
      suitability: mixed,
    },
    {
      name: "Waterfront",
      nameAr: "الواجهة البحرية",
      latitude: 26.262,
      longitude: 50.613,
      distanceKm: 3.083,
      headingDegrees: 112,
      suitability: mixed,
    },
    {
      name: "Muharraq crossing",
      nameAr: "عبور المحرق",
      latitude: 26.269,
      longitude: 50.626,
      distanceKm: 4.595,
      headingDegrees: 232,
      suitability: mixed,
    },
    {
      name: "Return shore",
      nameAr: "شاطئ العودة",
      latitude: 26.252,
      longitude: 50.598,
      distanceKm: 7.967,
      headingDegrees: 258,
      suitability: mixed,
    },
    {
      name: "Bahrain Bay",
      nameAr: "خليج البحرين",
      latitude: 26.247,
      longitude: 50.587,
      distanceKm: 9.197,
      headingDegrees: 320,
      suitability: mixed,
    },
  ],
};

export const ROUTE_ALTERNATIVES = [NBH_LOOP, COASTAL_LOOP];

/** The only currently selectable NBH variant; other directions are not supplied. */
export const NBH_PREVIEW_VARIANT: RouteVariant = {
  id: NBH_VARIANT_ID,
  familyId: NBH_FAMILY_ID,
  label: "Standard clockwise",
  labelAr: "اتجاه عقارب الساعة القياسي",
  direction: "unknown",
  distanceKm: NBH_PREVIEW_DISTANCE_KM,
  durationRangeMinutes: {
    min: NBH_LOOP.durationMinutes,
    max: NBH_LOOP.durationMinutes,
  },
  entry: nbhEntry,
  finish: nbhFinish,
  availability: "preview",
  currentRevisionId: NBH_REVISION.id,
  currentRevision: NBH_REVISION,
};

/** Compatibility export for callers that used the former constant name. */
export const NBH_STANDARD_VARIANT = NBH_PREVIEW_VARIANT;

export const NBH_FAMILY: RouteFamily = {
  id: NBH_FAMILY_ID,
  slug: NBH_FAMILY_ID,
  name: NBH_CUSTOMER_NAMES.short,
  nameAr: NBH_CUSTOMER_NAMES.arabic,
  catalogStatus: "preview",
  entryPoints: [nbhEntry],
  defaultViewport: {
    latitude: 25.99,
    longitude: 50.5,
    latitudeDelta: 0.16,
    longitudeDelta: 0.2,
  },
  sourcePolicy:
    "Bahrain Tourism establishes the public route identity. This app preview shows only supplied geometry and does not certify safety, access, or the full public track.",
  sourcePolicyAr:
    "تثبت هيئة السياحة الهوية العامة للمسار. تعرض هذه المعاينة الهندسة المقدمة فقط ولا تشهد بالسلامة أو الوصول أو المسار العام الكامل.",
  variants: [NBH_PREVIEW_VARIANT],
};

export const NBH_CATALOG: RouteCatalog = {
  families: [NBH_FAMILY],
  corridors: [NBH_CORRIDOR],
};
