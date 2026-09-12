import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(sourceDirectory, "..", "App.tsx"), "utf8");
const routesScreenSource = readFileSync(
  join(sourceDirectory, "screens", "RoutesScreen.tsx"),
  "utf8",
);

function sourceBetween(start: string, end: string) {
  const startIndex = appSource.indexOf(start);
  const endIndex = appSource.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`);
  return appSource.slice(startIndex, endIndex);
}

test("runtime endpoint and matching transitions reject stale input and late manual results", async () => {
  const builder = await import("./routeBuilder");
  const lifecycle = await import("./routeLifecycle");
  const repository = await import("./routeRepository");
  const start = {
    name: "Seef",
    nameAr: "السيف",
    latitude: 26.24,
    longitude: 50.53,
  };
  const destination = {
    name: "Zallaq",
    nameAr: "الزلاق",
    latitude: 25.99,
    longitude: 50.5,
  };
  const selected = builder.commitPlannerPoint(
    builder.commitPlannerPoint(builder.createPlannerInputState(), "start", start),
    "destination",
    destination,
  );
  const stale = builder.updatePlannerTextState(selected, "start", "Typed place");
  const rejected = builder.preparePlannerMatch(stale);
  assert.equal(rejected.ok, false);
  if (rejected.ok) throw new Error("Expected stale endpoint rejection");

  const rawPoints = [
    { latitude: 26.1, longitude: 50.5 },
    { latitude: 26.105, longitude: 50.505 },
    { latitude: 26.11, longitude: 50.51 },
  ];
  const artifact = builder.createManualSketchMatchArtifact(rawPoints, 2);
  const plan = builder.draftRouteFromCoordinates(
    "runtime-manual",
    "Runtime manual",
    artifact.routingPoints,
  );
  if (!plan) throw new Error("Expected manual draft plan");
  const draft = repository.routeRecordFromPlan(plan, {
    origin: "drawn",
    ownership: "personal",
    geometry: { kind: "waypoint_trace", status: "draft" },
    roadEvidenceStatus: "unknown",
    provenance: { source: "Runtime manual" },
  });
  const matching = lifecycle.beginRouteMatching(draft);
  assert.equal(matching.state, "matching");
  if (matching.state !== "matching") throw new Error("Expected matching state");
  const failed = lifecycle.routeMatchingFailed(matching.route, "noRoute");
  assert.equal(failed.route.geometry.kind, "waypoint_trace");
  assert.equal(failed.route.geometry.status, "unavailable");
  assert.equal(lifecycle.navigationPolicyGate(failed.route).allowed, false);
  assert.deepEqual(artifact.rawPoints, rawPoints);

  const matchedPlan = {
    ...plan,
    id: matching.route.id,
    revision: matching.route.revision,
    geometryKind: "road_matched" as const,
    geometryStatus: "ready" as const,
    distanceStatus: "authoritative" as const,
    geometry: artifact.routingPoints,
    geometryDistancesKm: [0, plan.distanceKm],
    geometrySource: "runtime matcher",
    distanceKm: plan.distanceKm,
  };
  const ready = lifecycle.routeMatchingSucceeded(matching.route, matchedPlan);
  assert.equal(ready.state, "trace-ready");
  if (ready.state !== "trace-ready") throw new Error("Expected ready road match");
  assert.equal(ready.route.geometry.kind, "road_matched");
  assert.equal(ready.route.geometry.status, "ready");
  assert.equal(lifecycle.navigationPolicyGate(ready.route).allowed, true);

  const session = builder.beginManualMatchSession(
    builder.createManualMatchSession(rawPoints),
    rawPoints,
    artifact.routingPoints,
  );
  const editedSession = builder.invalidateManualMatchSession(session, [
    ...rawPoints,
    { latitude: 26.115, longitude: 50.515 },
  ]);
  assert.equal(builder.manualMatchSessionIsCurrent(editedSession, session.revision), false);
});

test("route review matching is limited to catalog previews and waypoint drafts/retries", () => {
  assert.match(
    appSource,
    /function shouldAutoMatchRouteReview\(record: RouteRecord\)[\s\S]*record\.geometry\.kind === "waypoint_trace"[\s\S]*record\.geometry\.status === "draft"[\s\S]*record\.geometry\.status === "unavailable"/,
  );
  const openRouteDetail = sourceBetween(
    "const openRouteDetail = (route: RoutePlan) => {",
    "const selectRoute =",
  );
  assert.match(openRouteDetail, /if \(record && shouldAutoMatchRouteReview\(record\)\)/);
  assert.match(openRouteDetail, /shouldAutoMatchRouteReview\(record\)[\s\S]*matchRecord\(record\)/);
  assert.match(
    sourceBetween("const detailRetry = () => {", "const detailAddStop ="),
    /detailRecord && shouldAutoMatchRouteReview\(detailRecord\)/,
  );
});

test("App gates route readiness and catalog matching with canonical RouteRecord evidence", () => {
  assert.match(appSource, /routeRecordHasAuthoritativeGeometry\(record\)/);
  assert.match(
    appSource,
    /function shouldAutoMatchRouteReview\(record: RouteRecord\)[\s\S]*record\.origin === "pilot"[\s\S]*record\.geometry\.kind === "recorded_trace"/,
  );
  assert.match(
    sourceBetween("function routeStatusForRecord", "function uniqueRecords"),
    /routeRecordHasAuthoritativeGeometry\(record\)/,
  );
  assert.match(
    sourceBetween("function analyseSurfaceRecord", "function explainSurfaceRun"),
    /routeRecordHasAuthoritativeGeometry\(record\)/,
  );
  assert.match(
    appSource,
    /samples=\{catalogRecords\.map\(\(record\) =>\s*viewForRecord\(record, language\),?\s*\)\}/,
  );
  const surfaceItem = sourceBetween(
    "function surfaceItem(",
    "function windForDeparture",
  );
  assert.match(surfaceItem, /reconciledGeometryForRecord\(record\)/);
  assert.match(surfaceItem, /geometryKind: geometry\.kind/);
  assert.match(surfaceItem, /geometryStatus: geometry\.status/);
  assert.doesNotMatch(appSource, /const byId = new Map<string, RouteRecord>\(\)/);
});

test("onboarding completion establishes a deterministic Home route and Plan navigation", () => {
  const saveOnboarding = sourceBetween("const saveOnboarding =", "const departureDay");
  assert.match(saveOnboarding, /setSelectedRouteId\(NBH_LOOP\.id\)/);
  assert.match(saveOnboarding, /setTab\("home"\)/);
  assert.match(appSource, /onPlanRoute=\{openPlanner\}/);
  assert.match(appSource, /const openPlanner = \(\) =>/);
});

test("Connect confirms the route and waits for the visible Ride permission flow", () => {
  const connectHandler = sourceBetween(
    "const beginConnectFromLocation = (route: RouteRecord | null) => {",
    "const connectFromCurrentLocation =",
  );
  assert.match(connectHandler, /setSelectedRouteId\(route\.id\)/);
  assert.match(connectHandler, /setConfirmedRouteId\(route\.id\)/);
  assert.match(connectHandler, /setRideStartIntent\(\{[\s\S]*mode: "connect"[\s\S]*phase: "queued"/);
  assert.match(connectHandler, /setTab\("ride"\)/);
  assert.doesNotMatch(connectHandler, /Location\.requestForegroundPermissionsAsync\(\)/);
  assert.doesNotMatch(connectHandler, /Location\.getCurrentPositionAsync\(/);
  assert.match(
    sourceBetween(
      "const connectFromCurrentLocation =",
      "const startNbhAtEntry =",
    ),
    /recordById\(NBH_LOOP\.id\)/,
  );

  assert.match(appSource, /rideStartIntent\.phase !== "queued"/);
  assert.match(appSource, /live\.prepareStart\(\)/);
  assert.match(appSource, /phase: "permission-explanation"/);
  assert.match(appSource, /live\.state === "active"[\s\S]*setRideStartIntent\(null\)/);
});

test("App clears stale planner endpoints and invalidates matching when text changes", () => {
  const updatePlannerText = sourceBetween(
    "const updatePlannerText =",
    "const mapPlannerPress =",
  );
  assert.match(updatePlannerText, /matchingToken\.current \+= 1/);
  assert.match(updatePlannerText, /updatePlannerTextState\(currentInput, field, value\)/);
  assert.match(updatePlannerText, /const start = nextInput\.start/);
  assert.match(updatePlannerText, /const destination = nextInput\.destination/);
  assert.match(updatePlannerText, /if \(!start \|\| !destination\) setPlannerPoints\(\[\]\)/);
  assert.match(updatePlannerText, /route: null/);
  assert.match(updatePlannerText, /setRouteMessage\(""\)/);
  assert.match(updatePlannerText, /setActiveField\(field\)/);
});

test("builder and manual routes keep explicit review, recovery, and edit actions", () => {
  assert.match(appSource, /onRetryLoop=\{retryLoopGeneration\}/);
  assert.match(appSource, /onUseManual=\{useManualRoute\}/);
  assert.match(appSource, /onSaveManual=\{saveManualRoute\}/);
  assert.match(appSource, /onEditManual=\{editManualRoute\}/);
  assert.match(appSource, /onDiscardManual=\{discardManualRoute\}/);
  assert.match(appSource, /const retryLoopGeneration = \(\) =>/);
  assert.match(appSource, /const saveManualRoute = \(\) =>/);
  assert.match(appSource, /setDetailRouteId\(record\.id\)/);
  assert.match(appSource, /setTab\("plan"\)/);
});

test("sample, builder, and route-detail transitions keep one explicit Ride gate", () => {
  const useMatchedRoute = sourceBetween(
    "const useMatchedRoute =",
    "if (catalogMode)",
  );
  assert.match(useMatchedRoute, /builder\.status !== "ready"/);
  assert.match(useMatchedRoute, /routeRecordHasAuthoritativeGeometry\(record\)/);
  assert.match(useMatchedRoute, /setDetailRouteId\(record\.id\)/);
  assert.match(useMatchedRoute, /setConfirmedRouteId\(null\)/);
  assert.match(appSource, /onSelect=\{selectRoute\}/);
  assert.match(
    sourceBetween("const selectRoute =", "const editRoutePoints ="),
    /openRouteDetail\(route\)/,
  );
  const useDetailRoute = sourceBetween(
    "const useDetailRoute =",
    "const confirmedAnalysisResult",
  );
  assert.match(useDetailRoute, /routeRecordHasAuthoritativeGeometry\(detailRecord\)/);
  assert.match(useDetailRoute, /setConfirmedRouteId\(detailRecord\.id\)/);
  assert.match(useDetailRoute, /setTab\("ride"\)/);
  const detailReverse = sourceBetween(
    "const detailReverse =",
    "const saveDetail",
  );
  assert.match(detailReverse, /reverseRoute\(detailRecord\)/);
  assert.match(detailReverse, /if \(!reversedResult\.ok\)/);
  assert.match(detailReverse, /showAppAlert\(t\.reverse, t\.routeMatchFailure/);
});

test("permission, Settings Back, and document direction stay explicit in App", () => {
  const permission = sourceBetween(
    "const requestLocationPermission =",
    "const exportData",
  );
  assert.match(permission, /setLocationPermission\("pending"\)/);
  assert.match(permission, /permissionStateFromResult/);
  assert.match(permission, /return status/);
  const currentLocation = sourceBetween(
    "const useCurrentLocation =",
    "const beginConnectFromLocation",
  );
  assert.match(currentLocation, /Location\.requestForegroundPermissionsAsync\(\)/);
  assert.match(currentLocation, /Location\.getCurrentPositionAsync\(/);
  assert.match(currentLocation, /showAppAlert\(t\.currentLocation/);
  assert.match(appSource, /onRequestLocationPermission=\{requestLocationPermission\}/);
  assert.match(appSource, /onRetryPermission=\{live\.retryPermission\}/);
  assert.match(appSource, /onBack=\{\(\) => setSettingsOpen\(false\)\}/);
  assert.match(appSource, /document\.documentElement\.lang = language/);
  assert.match(appSource, /document\.documentElement\.dir = directionForLanguage\(language\)/);
  assert.match(appSource, /<SettingsScreen[\s\S]*language=\{language\}/);
});

test("App connects hydrated draft preservation, weather refresh states, and browser export", () => {
  assert.match(appSource, /ACTIVITY_PENDING_STORAGE_KEY/);
  assert.match(appSource, /removeItem\(ROUTE_STORAGE_V2_KEY\)/);
  assert.doesNotMatch(
    sourceBetween("const deleteSavedRoutes =", "const saveOnboarding ="),
    /removeItem\(ACTIVITY_PENDING_STORAGE_KEY\)/,
  );
  assert.match(appSource, /createWeatherRefreshState/);
  assert.match(appSource, /beginWeatherRefresh/);
  assert.match(appSource, /completeWeatherRefresh/);
  assert.match(appSource, /failWeatherRefresh/);
  assert.match(appSource, /forceRefresh: true/);
  assert.match(appSource, /downloadJsonInBrowser/);
  assert.match(appSource, /STRAVA_CONNECTION_STATE/);
  const openSavedRide = sourceBetween(
    "const openSavedRide =",
    "const stravaDisclosure",
  );
  assert.match(openSavedRide, /setCompletionDraftView\(activity\)/);
  assert.match(openSavedRide, /activity\.routeSnapshot/);
  assert.match(openSavedRide, /recordForPlan/);
  assert.match(openSavedRide, /setTab\("ride"\)/);
  assert.match(appSource, /onOpenActivity=\{openSavedRide\}/);
});

test("App resolves stale plans by canonical identity and cancels stale draft hydration", () => {
  const recordResolver = sourceBetween(
    "const recordForPlan =",
    "const selectedRecord",
  );
  assert.match(recordResolver, /routeRecordMatchesPlanIdentity/);
  assert.match(recordResolver, /stateMatches/);
  const identityMatcher = sourceBetween(
    "function routeRecordMatchesPlanIdentity",
    "function hasExplicitPlanIdentity",
  );
  assert.doesNotMatch(identityMatcher, /geometryKind|geometryStatus/);
  const pendingHydration = sourceBetween(
    "AsyncStorage.getItem(ACTIVITY_PENDING_STORAGE_KEY)",
    "if (!activitiesHydrated || !pendingDraftHydrated)",
  );
  assert.match(pendingHydration, /dataDeletionGeneration\.current/);
  assert.match(pendingHydration, /generation !== dataDeletionGeneration\.current/);
});

test("loop failure recovery keeps a retry path for validation and generation failures", () => {
  const generateLoop = sourceBetween(
    "const generateLoop = async () => {",
    "const retryLoopGeneration",
  );
  assert.ok(
    (generateLoop.match(/setLoopGenerationFailed\(true\)/g) ?? []).length >= 3,
  );
  assert.match(generateLoop, /setActiveField\("start"\)/);
});

test("App uses the shared accessible shell and keeps navigation surfaces separated", () => {
  assert.match(appSource, /AccessibleNavigation/);
  assert.match(appSource, /AccessibleHeading/);
  assert.match(appSource, /AccessibleLandmark/);
  assert.match(appSource, /SkipToContent/);
  assert.match(appSource, /settingsOpen \|\| detailRouteId/);
  assert.match(appSource, /navSafeArea/);
  assert.doesNotMatch(appSource, /about:blank/);
});

test("normal scroll content clears the bottom tab bar without changing map surfaces", () => {
  const contentStyle = appSource.match(
    /content:\s*\{\s*paddingHorizontal:\s*0,\s*paddingTop:\s*0,\s*paddingBottom:\s*(\d+)/,
  );
  assert.ok(contentStyle, "Missing normal scroll content padding");
  assert.ok(Number(contentStyle[1]) >= 100, "Scroll padding should clear the tab bar");
  assert.match(appSource, /contentContainerStyle=\{shellStyles\.content\}/);
  assert.match(appSource, /const ownsMapViewport = Boolean\([\s\S]*detailRouteId/);
  assert.match(appSource, /<View style=\{shellStyles\.surface\}>\{content\}<\/View>/);
});

test("endpoint editing uses the real map with an active crosshair and explicit confirmation", () => {
  assert.doesNotMatch(routesScreenSource, /EmptyBuilderMap/);
  assert.match(routesScreenSource, /draftRouteFromCoordinates/);
  assert.match(routesScreenSource, /activeEndpoint=\{mapPickerField\}/);
  assert.match(routesScreenSource, /Selected point:/);
  assert.match(routesScreenSource, /Confirm \$\{pendingMapPoint\.field/);
});

test("manual sketch review keeps the explicit mapped-road check and draft copy", () => {
  assert.match(appSource, /manualMatchStatus/);
  assert.match(appSource, /const checkManualRoads = async/);
  assert.match(appSource, /createManualSketchMatchArtifact/);
  assert.match(appSource, /manualRawArtifact/);
  assert.match(routesScreenSource, /Check against mapped roads/);
  assert.match(routesScreenSource, /تحقق من الطرق المرسومة/);
  assert.match(routesScreenSource, /manualMatchStatus/);
  assert.match(appSource, /onCheckManualRoads=\{checkManualRoads\}/);
});

test("manual decisions never promote an unchecked sketch to ready road geometry", () => {
  const manualDraft = sourceBetween(
    "const manualDraftRecord =",
    "const manualRoute =",
  );
  const manualRecord = sourceBetween(
    "const manualRecordForDecision",
    "const useManualRoute =",
  );
  assert.match(
    manualDraft,
    /geometry: \{ kind: "waypoint_trace", status: "draft" \}/,
  );
  assert.match(manualRecord, /manualDraftRecord/);
  assert.doesNotMatch(
    `${manualDraft}\n${manualRecord}`,
    /kind: "recorded_trace"[\s\S]*status: "ready"/,
  );
});

test("Add stop and Edit retain committed intermediate planner points at runtime", async () => {
  const builder = await import("./routeBuilder");
  const middle = {
    name: "Tubli",
    nameAr: "توبلي",
    latitude: 26.18,
    longitude: 50.54,
  };
  const selected = builder.commitPlannerPoint(
    builder.commitPlannerPoint(builder.createPlannerInputState(), "start", {
      name: "Seef",
      nameAr: "السيف",
      latitude: 26.24,
      longitude: 50.53,
    }),
    "destination",
    {
      name: "Zallaq",
      nameAr: "الزلاق",
      latitude: 25.99,
      longitude: 50.5,
    },
  );
  const prepared = builder.preparePlannerMatch(selected, [
    selected.start!,
    middle,
    selected.destination!,
  ]);
  assert.equal(prepared.ok, true);
  if (!prepared.ok) throw new Error("Expected intermediate planner point");
  assert.deepEqual(prepared.points, [selected.start, middle, selected.destination]);

  assert.match(appSource, /const \[plannerPoints, setPlannerPoints\]/);
  const editRoutePoints = sourceBetween(
    "const editRoutePoints =",
    "const detailRetry =",
  );
  assert.match(editRoutePoints, /record\.points\s*\.slice\(1, -1\)/);
  assert.match(routesScreenSource, /plannerStops/);
});
