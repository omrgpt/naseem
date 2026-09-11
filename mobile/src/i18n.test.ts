import assert from "node:assert/strict";
import test from "node:test";
import {
  copy,
  directionForLanguage,
  localeForLanguage,
  localizedConfidenceLabel,
  localizedVariantLabel,
} from "./i18n";
import { readFileSync } from "node:fs";

const catalogs = {
  en: copy.en as Record<string, string>,
  ar: copy.ar as Record<string, string>,
};

const placeholderTokens = (value: string) =>
  Array.from(value.matchAll(/\{[^{}]+\}/gu), (match) => match[0]).sort();

const screenCopyKeys = [
  "mapEmptyCopy",
  "emptyMapLabel",
  "routeCheckPending",
  "routePreviewLabel",
  "previewOnlyRideCopy",
  "drawRouteSketch",
  "onlyVariantNote",
  "locationAccessNeedsAttention",
  "endRideKeepRecording",
] as const;

const todayScreenSource = readFileSync(
  new URL("./screens/TodayScreen.tsx", import.meta.url),
  "utf8",
);

test("Home uses the catalog key for empty-map copy", () => {
  assert.match(todayScreenSource, /"mapEmptyCopy"/u);
  assert.doesNotMatch(todayScreenSource, /"emptyMapCopy"/u);
});

test("English and Arabic copy expose the same non-empty customer catalog", () => {
  assert.deepEqual(Object.keys(catalogs.en).sort(), Object.keys(catalogs.ar).sort());

  for (const key of Object.keys(catalogs.en)) {
    assert.equal(typeof catalogs.en[key], "string", `English copy is missing ${key}`);
    assert.equal(typeof catalogs.ar[key], "string", `Arabic copy is missing ${key}`);
    assert.ok(catalogs.en[key].trim().length > 0, `English copy is empty for ${key}`);
    assert.ok(catalogs.ar[key].trim().length > 0, `Arabic copy is empty for ${key}`);
  }

  for (const key of screenCopyKeys) {
    assert.ok(catalogs.en[key], `English screen copy is missing ${key}`);
    assert.ok(catalogs.ar[key], `Arabic screen copy is missing ${key}`);
  }
});

test("English and Arabic copy preserve identical interpolation placeholders", () => {
  for (const key of Object.keys(catalogs.en)) {
    assert.deepEqual(
      placeholderTokens(catalogs.en[key]),
      placeholderTokens(catalogs.ar[key]),
      `Placeholder mismatch for ${key}`,
    );
  }

  assert.match(catalogs.en.goodWindow, /\{time\}/u);
  assert.match(catalogs.ar.goodWindow, /\{time\}/u);
  assert.match(catalogs.en.nbhEntryDistance, /\{distance\}/u);
  assert.match(catalogs.ar.nbhEntryDistance, /\{distance\}/u);
});

test("customer copy does not expose internal implementation vocabulary", () => {
  const internalEnglish =
    /\b(?:pilot|private|owner|policy|decision\s+gate|debug|provider|catalogue|geometry|audit|development|public\s+release|supplied|native|route\s+service)\b/iu;
  const internalArabic =
    /(?:تجريبي|المالك|سياسة|بوابة قرار|القرارات|هندسة|مزود|تدقيق|التطوير|الإطلاق العام|المقدمة|مقدّمة)/u;

  for (const [language, catalog, pattern] of [
    ["English", catalogs.en, internalEnglish],
    ["Arabic", catalogs.ar, internalArabic],
  ] as const) {
    for (const [key, value] of Object.entries(catalog)) {
      assert.doesNotMatch(value, pattern, `${language} copy still exposes ${key}: ${value}`);
    }
  }

  assert.equal("privatePilot" in catalogs.en, false);
  assert.equal("privatePilot" in catalogs.ar, false);
});

test("NBH preview status and route identity stay consistent in both languages", () => {
  assert.equal(catalogs.en.routeCheckPending, "Route preview · road check not complete");
  assert.equal(catalogs.ar.routeCheckPending, "معاينة المسار · لم يتم التحقق من الطرق بعد");
  assert.equal(catalogs.en.previewRouteStatus, catalogs.en.routeCheckPending);
  assert.equal(catalogs.ar.previewRouteStatus, catalogs.ar.routeCheckPending);

  assert.match(catalogs.en.startAtEntry, /NBH Loop/u);
  assert.match(catalogs.en.nbhEntryDistance, /NBH Loop/u);
  assert.match(catalogs.ar.startAtEntry, /حلقة ناصر بن حمد/u);
  assert.match(catalogs.ar.nbhEntryDistance, /حلقة ناصر بن حمد/u);
  assert.match(catalogs.en.nbhPublicIdentityNote, /50\s*km/u);
  assert.match(catalogs.en.nbhPublicIdentityNote, /21\.8\s*km/u);
  assert.match(catalogs.ar.nbhPublicIdentityNote, /٥٠\s*كم/u);
  assert.match(catalogs.ar.nbhPublicIdentityNote, /٢١٫٨\s*كم/u);
  assert.doesNotMatch(Object.values(catalogs.en).join("\n"), /\b50\.3\b/u);
});

test("Arabic map labels and units are localized for RTL presentation", () => {
  const localizedKeys = [
    "km",
    "mi",
    "minutes",
    "speedUnit",
    "speedUnitMiles",
    "mapGestures",
    "zoomIn",
    "zoomOut",
    "mapEmptyCopy",
    "emptyMapLabel",
    "routePreviewLabel",
    "previewOnlyRideCopy",
    "drawRouteSketch",
    "onlyVariantNote",
    "locationAccessNeedsAttention",
    "endRideKeepRecording",
    "previewWithoutLocation",
    "checkMapAndSurroundings",
  ] as const;

  for (const key of localizedKeys) {
    assert.notEqual(catalogs.ar[key], catalogs.en[key], `Arabic copy fell back for ${key}`);
    assert.match(catalogs.ar[key], /[\u0600-\u06ff]/u, `Arabic copy is not localized for ${key}`);
  }

  assert.equal(catalogs.ar.km, "كم");
  assert.equal(catalogs.ar.mi, "ميل");
  assert.equal(catalogs.ar.speedUnit, "كم/س");
  assert.equal(catalogs.ar.speedUnitMiles, "ميل/س");
  assert.equal(catalogs.ar.minutes, "دقيقة");
});

test("planner fields do not promise unavailable place search", () => {
  assert.doesNotMatch(catalogs.en.searchStart, /search/iu);
  assert.doesNotMatch(catalogs.en.searchDestination, /search/iu);
  assert.match(catalogs.en.plannerFieldHint, /current location/iu);
  assert.match(catalogs.en.plannerFieldHint, /saved point/iu);
  assert.match(catalogs.en.plannerFieldHint, /does not search/iu);
  assert.match(catalogs.ar.plannerFieldHint, /الخريطة/u);
  assert.match(catalogs.ar.plannerFieldHint, /موقعك الحالي/u);
  assert.match(catalogs.ar.plannerFieldHint, /مكان محفوظ/u);
  assert.match(catalogs.ar.plannerFieldHint, /لا تبحث/u);
});

test("empty and unavailable states give truthful next actions in both languages", () => {
  assert.equal(catalogs.en.noSelectedRouteCopy, "Choose a route to see its plan.");
  assert.equal(catalogs.ar.noSelectedRouteCopy, "اختر مساراً لرؤية خطته.");
  assert.equal(
    catalogs.en.locationUnavailable,
    "Current location is unavailable. Choose a point on the map or try again.",
  );
  assert.equal(
    catalogs.ar.locationUnavailable,
    "الموقع الحالي غير متاح. اختر نقطة على الخريطة أو حاول مرة أخرى.",
  );
  assert.doesNotMatch(catalogs.en.locationUnavailable, /search/iu);
  assert.doesNotMatch(catalogs.ar.locationUnavailable, /بحث/u);
  assert.equal(catalogs.en.forecastFallback, "Forecast unavailable right now.");
  assert.equal(catalogs.ar.forecastFallback, "التوقع غير متاح الآن.");
});

test("recorded route copy explains the boundary without implementation language", () => {
  assert.equal(
    catalogs.en.recordedTrackCopy,
    "This is an imported recorded track. It is shown as a preview, not a road-following route.",
  );
  assert.equal(
    catalogs.ar.recordedTrackCopy,
    "هذا تتبع مستورد. يُعرض كمعاينة، وليس مساراً يتبع الطرق.",
  );
  assert.doesNotMatch(catalogs.en.recordedTrackCopy, /silently/iu);
});

test("language metadata keeps Bahrain locale and reading direction aligned", () => {
  assert.equal(localeForLanguage("en"), "en-BH");
  assert.equal(localeForLanguage("ar"), "ar-BH");
  assert.equal(directionForLanguage("en"), "ltr");
  assert.equal(directionForLanguage("ar"), "rtl");
});

test("rider-facing labels localize confidence and hide unknown variant IDs", () => {
  assert.equal(localizedConfidenceLabel(copy.en, "high"), "High confidence");
  assert.equal(localizedConfidenceLabel(copy.ar, "low"), "ثقة منخفضة");
  assert.equal(localizedConfidenceLabel(copy.en), catalogs.en.locationUncertain);

  const variants = [
    {
      id: "nbh-loop-standard-clockwise",
      label: "Standard clockwise",
      labelAr: "اتجاه عقارب الساعة القياسي",
    },
  ];
  assert.equal(
    localizedVariantLabel("en", "nbh-loop-standard-clockwise", variants),
    "Standard clockwise",
  );
  assert.equal(
    localizedVariantLabel("ar", "nbh-loop-standard-clockwise", variants),
    "اتجاه عقارب الساعة القياسي",
  );
  assert.equal(
    localizedVariantLabel("ar", "variant-without-arabic-label", [
      { id: "variant-without-arabic-label", label: "Standard clockwise" },
    ]),
    "Standard clockwise",
  );
  assert.equal(localizedVariantLabel("en", "internal-variant-id", variants), undefined);
});
