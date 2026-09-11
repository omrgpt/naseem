import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  join(sourceDirectory, "screens", "RouteDetailScreen.tsx"),
  "utf8",
);
const profileSource = readFileSync(
  join(sourceDirectory, "screens", "ProfileScreen.tsx"),
  "utf8",
);

type RenderNode = {
  type: string;
  props: Record<string, unknown>;
};
type ScreenComponent = (props: Record<string, unknown>) => unknown;

const screenRuntime = loadScreenRuntime();
const RouteDetailScreen = screenRuntime.routeDetail;
const ProfileScreen = screenRuntime.profile;

function loadScreenRuntime() {
  const runtimeRequire = createRequire(import.meta.url);
  const moduleRuntime = runtimeRequire("node:module") as {
    _load: (
      request: string,
      parent: unknown,
      isMain: boolean,
    ) => unknown;
  };
  const originalLoad = moduleRuntime._load;
  let stateOverrides: unknown[] | undefined;
  let stateCursor = 0;
  const hostNode = (
    type: string,
    props: Record<string, unknown> = {},
  ): RenderNode => ({ type, props });
  const fragment = Symbol("Fragment");
  const renderElement = (
    type: unknown,
    props: Record<string, unknown> = {},
  ): unknown => {
    if (type === fragment) return props.children ?? null;
    return typeof type === "function"
      ? type(props)
      : hostNode(String(type), props);
  };
  const jsxRuntime = {
    Fragment: fragment,
    jsx: renderElement,
    jsxs: renderElement,
  };
  const reactNative = {
    Pressable: (props: Record<string, unknown>) =>
      hostNode("Pressable", props),
    ScrollView: (props: Record<string, unknown>) =>
      hostNode("ScrollView", props),
    Text: (props: Record<string, unknown>) => hostNode("Text", props),
    View: (props: Record<string, unknown>) => hostNode("View", props),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    Platform: { OS: "web" },
  };
  const react = {
    useState: <T>(initial: T): [T, () => void] => {
      const value = (stateOverrides?.[stateCursor] as T | undefined) ?? initial;
      stateCursor += 1;
      return [value, () => undefined];
    },
  };
  const mapPreview = {
    MapPreview: (props: Record<string, unknown>) =>
      hostNode("MapPreview", props),
  };
  const routeLayerLegend = {
    RouteLayerLegend: (props: Record<string, unknown>) =>
      hostNode("RouteLayerLegend", props),
  };
  const uiPatterns = {
    StatusBadge: (props: Record<string, unknown>) =>
      hostNode("StatusBadge", props),
  };

  moduleRuntime._load = ((
    request: string,
    parent: unknown,
    isMain: boolean,
  ) => {
    if (request === "react") return react;
    if (request === "react/jsx-runtime") return jsxRuntime;
    if (request === "react-native") return reactNative;
    if (request === "../MapPreview") return mapPreview;
    if (request === "../RouteLayerLegend") return routeLayerLegend;
    if (request === "../UiPatterns") return uiPatterns;
    return originalLoad(request, parent, isMain);
  }) as typeof originalLoad;

  try {
    return {
      routeDetail: runtimeRequire(
        join(sourceDirectory, "screens", "RouteDetailScreen.tsx"),
      ).RouteDetailScreen as ScreenComponent,
      profile: runtimeRequire(
        join(sourceDirectory, "screens", "ProfileScreen.tsx"),
      ).ProfileScreen as ScreenComponent,
      setStateOverrides(overrides: unknown[] | undefined) {
        stateOverrides = overrides;
        stateCursor = 0;
      },
      clearStateOverrides() {
        stateOverrides = undefined;
        stateCursor = 0;
      },
    };
  } finally {
    moduleRuntime._load = originalLoad;
  }
}

function renderRouteDetail(
  overrides: Record<string, unknown> = {},
  state?: unknown[],
) {
  screenRuntime.setStateOverrides(state);
  try {
    return RouteDetailScreen({ ...routeDetailProps(), ...overrides });
  } finally {
    screenRuntime.clearStateOverrides();
  }
}

function renderProfile(overrides: Record<string, unknown> = {}) {
  return ProfileScreen({ ...profileProps(), ...overrides });
}

function routeDetailProps() {
  return {
    t: {},
    rtl: false,
    palette: testPalette,
    styles: testStyles,
    formatNumber: (value: number) => String(value),
    distanceDisplay: {
      formatDistance: (value: number) => `${value.toFixed(1)} km`,
    },
    route: testRoute(),
    routeStatus: "draft",
    departureLabel: "08:00",
    arrivalLabel: "09:00",
    departureChoices: [],
    mapText: {},
    roadLabels: {},
    onDeparture: () => undefined,
    onBack: () => undefined,
    onUse: () => undefined,
    onChangeRoute: () => undefined,
    onAddStop: () => undefined,
    onReverse: () => undefined,
    onEdit: () => undefined,
    onStartAtEntry: () => undefined,
    onConnectFromLocation: () => undefined,
  };
}

function testRoute(overrides: Record<string, unknown> = {}) {
  const suitability = {
    kind: "unknown",
    label: "Unknown",
    evidence: "Test fixture",
    source: "Test fixture",
    confidence: "low",
  };
  const points = [
    {
      latitude: 26,
      longitude: 50,
      name: "Start",
      distanceKm: 0,
      headingDegrees: 0,
      suitability,
    },
    {
      latitude: 26,
      longitude: 50.1,
      name: "Finish",
      distanceKm: 10,
      headingDegrees: 0,
      suitability,
    },
  ];
  return {
    id: "route-1",
    name: "Test route",
    source: "Naseem planner",
    points,
    geometry: points.map(({ latitude, longitude }) => ({ latitude, longitude })),
    geometryDistancesKm: [0, 10],
    geometrySource: "Test router",
    geometryKind: "waypoint_trace",
    geometryStatus: "draft",
    origin: "drawn",
    ownership: "personal",
    provisionalDistanceKm: 10,
    distanceStatus: "provisional",
    distanceKm: 10,
    departureLabel: "08:00",
    arrivalLabel: "09:00",
    durationMinutes: 60,
    recommendation: "Test recommendation",
    segments: [],
    windSummary: { tailwindPercent: 0, headwindPercent: 0, crosswindPercent: 0 },
    ...overrides,
  };
}

function profileProps() {
  return {
    t: {},
    rtl: false,
    palette: testPalette,
    styles: testStyles,
    formatNumber: (value: number) => String(value),
    formatTime: () => "08:00",
    distanceDisplay: {
      formatDistance: (value: number) => `${value.toFixed(1)} km`,
    },
    profile: { name: "Test rider", detail: "Bahrain" },
    collections: [
      {
        kind: "my-routes",
        title: "My routes",
        items: [
          {
            route: testRoute({
              id: "gpx-legacy-route",
              source: "GPX import",
              geometry: undefined,
              geometrySource: undefined,
              geometryKind: undefined,
              geometryStatus: undefined,
              origin: undefined,
              ownership: undefined,
            }),
            meta: {},
            display: { distance: "10.0 km", movingTime: "42 min" },
          },
        ],
      },
    ],
    activities: [],
    onOpenActivity: () => undefined,
  };
}

const testPalette = {
  bg: "#fff",
  ink: "#111",
  muted: "#666",
  panel: "#eee",
  panelAlt: "#ddd",
  accent: "#078",
  accentSoft: "#def",
  line: "#aaa",
  caution: "#b50",
  cautionSoft: "#fed",
  shadow: "#000",
};
const testStyles = new Proxy(
  { sheetSafeArea: { paddingBottom: 96 } } as Record<string, unknown>,
  { get: (target, property: string) => target[property] ?? {} },
);

function isRenderNode(value: unknown): value is RenderNode {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      "props" in value,
  );
}

function childrenOf(value: unknown): unknown[] {
  if (!isRenderNode(value)) return Array.isArray(value) ? value : [];
  const children = value.props.children;
  return Array.isArray(children) ? children : children == null ? [] : [children];
}

function allNodes(value: unknown): RenderNode[] {
  if (Array.isArray(value)) return value.flatMap(allNodes);
  if (!isRenderNode(value)) return [];
  return [value, ...childrenOf(value).flatMap(allNodes)];
}

function findNode(
  tree: unknown,
  predicate: (node: RenderNode) => boolean,
) {
  return allNodes(tree).find(predicate);
}

function findButton(tree: unknown, label: string) {
  return findNode(
    tree,
    (node) =>
      node.type === "Pressable" &&
      node.props.accessibilityLabel === label,
  );
}

function textContent(value: unknown): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value)) return value.map(textContent).join("");
  if (isRenderNode(value)) return textContent(value.props.children);
  return "";
}

function flattenStyle(value: unknown) {
  const flattened: Record<string, unknown> = {};
  for (const item of Array.isArray(value) ? value : [value]) {
    if (item && typeof item === "object")
      Object.assign(flattened, item as Record<string, unknown>);
  }
  return flattened;
}

test("expanded route details expose all rider route actions", () => {
  for (const callback of ["onAddStop", "onReverse", "onEditPoints"]) {
    assert.match(
      source,
      new RegExp(`onPress=\\{${callback}\\}`),
      `${callback} should be wired from the expanded details sheet`,
    );
  }
  assert.match(
    source,
    /canSave &&[\s\S]*onPress=\{onSave\}/,
    "onSave should be rendered only for a saveable route",
  );
  assert.match(
    source,
    /styles\.manualActions, rtl && styles\.rowRtl/,
    "the action row should mirror in RTL",
  );
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /tx\(t, "addStop", "Add stop"\)/);
  assert.match(source, /tx\(t, "reverse", "Reverse"\)/);
  assert.match(source, /tx\(t, "editPoints", "Edit points"\)/);
  assert.match(source, /tx\(t, "saveRoute", "Save route"\)/);
});

test("unavailable route details retain retry and change-points recovery", () => {
  assert.match(source, /retryEligible/);
  assert.match(source, /primaryRecoveryAction\.onPress/);
  assert.match(source, /tx\(t, "retry", "Try again"\)/);
  assert.match(source, /onPress=\{pointRecoveryAction\.onPress\}/);
  assert.match(source, /tx\(t, "editPoints", "Change points"\)/);
});

test("route detail owns one independently scrollable decision sheet with sticky actions", () => {
  assert.match(source, /import \{[^}]*ScrollView[^}]*\} from "react-native"/);
  assert.match(source, /testID="route-detail-decision-sheet"/);
  assert.match(source, /map: \{[^}]*flex: 1[^}]*minHeight: 240/);
  assert.match(source, /sheet: \{[^}]*flex: 1[^}]*minHeight: 0/);
  assert.match(source, /sheetScroll: \{[^}]*flex: 1[^}]*minHeight: 0/);
  assert.doesNotMatch(source, /sheetScroll: \{[^}]*maxHeight/);
  assert.match(source, /keyboardShouldPersistTaps="handled"/);
  assert.match(source, /nestedScrollEnabled/);
  assert.match(source, /styles\.sheetSafeArea/);
  assert.match(source, /flexShrink: 0/);
  assert.match(source, /testID="route-detail-sticky-back"/);
  assert.match(source, /testID="route-detail-sticky-actions"/);
});

test("route detail shows canonical identity and route facts before deep evidence", () => {
  assert.match(source, /testID="route-detail-default-facts"/);
  assert.match(source, /canonicalOwnership/);
  assert.match(source, /canonicalOrigin/);
  assert.match(source, /canonical\.provenance/);
  assert.match(source, /routeIsNavigable\(canonical\)/);
  assert.match(source, /routeGeometryStatus\(canonical\)/);
  assert.match(source, /routeOrigin\(canonical\)/);
  assert.match(source, /routeOwnership\(canonical\)/);
  assert.match(source, /routeCollection\(canonical\)/);
  assert.match(source, /Selected sample for review/);
  assert.match(source, /geometryStateLabel/);
  assert.match(source, /entryLabel/);
  assert.match(source, /finishLabel/);
  assert.match(source, /distanceLabel/);
  assert.match(source, /timeLabel/);
  assert.match(source, /rideAvailabilityLabel/);
  assert.match(source, /localText\("Ride availability", "إتاحة الركوب"\)/);
  assert.match(source, /testID="route-detail-evidence-disclosure"/);
});

test("Add stop opens an ordered in-context editor before the App transition", () => {
  assert.match(source, /const \[stopEditorOpen, setStopEditorOpen\]/);
  assert.match(source, /const openStopEditor = \(\) =>/);
  assert.match(source, /testID="route-detail-stop-editor"/);
  assert.match(source, /orderedStops/);
  assert.match(source, /committedEndpoints/);
  assert.match(source, /onPress=\{openStopEditor\}/);
  assert.match(source, /onPress=\{onAddStop\}/);
});

test("Reverse shows a changed preview or an honest unavailable state before leaving review", () => {
  assert.match(source, /const \[reversePreviewOpen, setReversePreviewOpen\]/);
  assert.match(source, /const reversedPoints =/);
  assert.match(source, /const reverseUnavailable =/);
  assert.match(source, /testID="route-detail-reverse-preview"/);
  assert.match(source, /onPress=\{onReverse\}/);
  assert.match(source, /reverseUnavailable/);
});

test("all chooser actions share one route-selection transition", () => {
  assert.match(source, /const openRouteChooser = \(\) =>/);
  assert.ok(
    (source.match(/onPress=\{openRouteChooser\}/g) ?? []).length >= 2,
    "route chooser should be reachable from the top bar and recovery action",
  );
  assert.doesNotMatch(source, /onPress=\{onChangeRoute\}/);
});

test("partial and preview routes label provisional distance without calling it a recorded track", () => {
  assert.match(source, /canonical\.distanceStatus/);
  assert.match(source, /canonical\.provisionalDistanceKm/);
  assert.match(source, /previewDistanceLabel/);
  assert.match(source, /referenceDistanceLabel/);
  assert.doesNotMatch(
    source,
    /routeGeometryKind\(canonical\) === "recorded_trace"[\s\S]*tx\(t, "recordedTrack"/,
  );
});

test("saved rides are openable summaries and expose route and forecast snapshots", () => {
  assert.match(profileSource, /onOpenActivity/);
  assert.match(profileSource, /testID=\{`saved-ride-\$\{activity\.id\}`\}/);
  assert.match(profileSource, /routeSnapshot/);
  assert.match(profileSource, /forecastSnapshot/);
  assert.match(profileSource, /accessibilityLabel=\{.*openRide/s);
  assert.match(profileSource, /onPress=\{\(\) => onOpenActivity\(activity\)\}/);
});

test("profile route rows distinguish Sample, Yours, and Imported from route metadata", () => {
  assert.match(profileSource, /routeOrigin\(/);
  assert.match(profileSource, /routeOwnership\(/);
  assert.match(profileSource, /routeCollection\(/);
  assert.match(profileSource, /profileRouteFacts/);
  assert.match(profileSource, /text\.imported/);
  assert.match(profileSource, /text\.sample/);
  assert.match(profileSource, /text\.yours/);
  assert.match(profileSource, /metadata\.sourceLabel|metadata\.provenanceLabel/);
});

test("captured route detail keeps the map and action region reachable", () => {
  const tree = renderRouteDetail();
  const map = findNode(
    tree,
    (node) =>
      node.type === "View" &&
      childrenOf(node).some(
        (child) => isRenderNode(child) && child.type === "MapPreview",
      ),
  );
  const sheet = findNode(
    tree,
    (node) =>
      node.type === "ScrollView" &&
      node.props.testID === "route-detail-decision-sheet",
  );
  const stickyActions = findNode(
    tree,
    (node) =>
      node.type === "View" &&
      node.props.testID === "route-detail-sticky-actions",
  );
  assert.ok(map);
  assert.ok(sheet);
  assert.ok(stickyActions);
  assert.deepEqual(
    {
      flex: flattenStyle(map?.props.style).flex,
      minHeight: flattenStyle(map?.props.style).minHeight,
    },
    { flex: 1, minHeight: 240 },
  );
  assert.deepEqual(
    {
      flex: flattenStyle(sheet?.props.style).flex,
      minHeight: flattenStyle(sheet?.props.style).minHeight,
      maxHeight: flattenStyle(sheet?.props.style).maxHeight,
    },
    { flex: 1, minHeight: 0, maxHeight: undefined },
  );
  assert.equal(flattenStyle(stickyActions?.props.style).flexShrink, 0);
  assert.equal(flattenStyle(stickyActions?.props.style).paddingBottom, 96);
  assert.ok(findButton(tree, "Back"));
  assert.ok(
    findButton(tree, "Choose another route") ||
      findButton(tree, "Change points"),
  );
});

test("captured route actions avoid inert save and retry callbacks", () => {
  let saveCalls = 0;
  let retryCalls = 0;
  let editCalls = 0;
  const matchingTree = renderRouteDetail({
    route: testRoute({
      geometry: undefined,
      geometrySource: undefined,
      geometryKind: "waypoint_trace",
      geometryStatus: "matching",
      distanceStatus: "provisional",
    }),
    onSave: () => {
      saveCalls += 1;
    },
    onRetry: () => {
      retryCalls += 1;
    },
  });
  assert.equal(findButton(matchingTree, "Save route"), undefined);

  const invalidReadyTree = renderRouteDetail({
    route: testRoute({
      geometryKind: "road_matched",
      geometryStatus: "ready",
      distanceStatus: "provisional",
      geometrySource: undefined,
    }),
    routeStatus: "ready",
    onRetry: () => {
      retryCalls += 1;
    },
    onEdit: () => {
      editCalls += 1;
    },
  });
  assert.equal(findButton(invalidReadyTree, "Try again"), undefined);
  const changePoints = findButton(invalidReadyTree, "Change points");
  assert.ok(changePoints);
  (changePoints?.props.onPress as () => void)();
  assert.equal(editCalls, 1);

  const projectedInvalidReadyTree = renderRouteDetail({
    route: testRoute({
      geometryKind: "waypoint_trace",
      geometryStatus: "unavailable",
      origin: "generated",
      ownership: "personal",
      routeStatus: "unavailable",
      distanceStatus: "provisional",
    }),
    routeStatus: "unavailable",
    onRetry: () => {
      retryCalls += 1;
    },
    onEdit: () => {
      editCalls += 1;
    },
  });
  assert.equal(findButton(projectedInvalidReadyTree, "Try again"), undefined);
  const projectedRecovery = findButton(
    projectedInvalidReadyTree,
    "Change points",
  );
  assert.ok(projectedRecovery);
  (projectedRecovery?.props.onPress as () => void)();
  assert.equal(editCalls, 2);

  const pilotUnavailableTree = renderRouteDetail({
    route: testRoute({
      geometryKind: "waypoint_trace",
      geometryStatus: "unavailable",
      origin: "pilot",
      ownership: "catalog",
      routeStatus: "unavailable",
      distanceStatus: "provisional",
    }),
    routeStatus: "unavailable",
    onRetry: () => {
      retryCalls += 1;
    },
  });
  const pilotRetry = findButton(pilotUnavailableTree, "Try again");
  assert.ok(pilotRetry);
  (pilotRetry?.props.onPress as () => void)();
  assert.equal(retryCalls, 1);

  const importedUnavailableTree = renderRouteDetail({
    route: testRoute({
      geometryKind: "recorded_trace",
      geometryStatus: "unavailable",
      origin: "gpx",
      ownership: "personal",
      routeStatus: "unavailable",
      distanceStatus: "provisional",
    }),
    routeStatus: "unavailable",
    onRetry: () => {
      retryCalls += 1;
    },
    onEdit: () => {
      editCalls += 1;
    },
  });
  assert.equal(findButton(importedUnavailableTree, "Try again"), undefined);
  const importedRecovery = findButton(importedUnavailableTree, "Change points");
  assert.ok(importedRecovery);
  (importedRecovery?.props.onPress as () => void)();
  assert.equal(editCalls, 3);

  const unavailableTree = renderRouteDetail({
    route: testRoute({
      geometry: undefined,
      geometrySource: undefined,
      geometryKind: "waypoint_trace",
      geometryStatus: "unavailable",
      distanceStatus: "provisional",
    }),
    onRetry: () => {
      retryCalls += 1;
    },
  });
  const retry = findButton(unavailableTree, "Try again");
  assert.ok(retry);
  (retry?.props.onPress as () => void)();
  assert.equal(retryCalls, 2);

  const readyTree = renderRouteDetail(
    {
      route: testRoute({
        geometryKind: "road_matched",
        geometryStatus: "ready",
        distanceStatus: "authoritative",
      }),
      onSave: () => {
        saveCalls += 1;
      },
    },
    [true, false, false, false],
  );
  const save = findButton(readyTree, "Save route");
  assert.ok(save);
  (save?.props.onPress as () => void)();
  assert.equal(saveCalls, 1);
});

test("captured route detail uses canonical readiness and legacy source helpers", () => {
  const tree = renderRouteDetail({
    route: testRoute({
      id: "legacy-pilot-route",
      familyId: "nbh-loop",
      source: "Bahrain Tourism",
      geometryKind: "road_matched",
      geometryStatus: "ready",
      distanceStatus: "provisional",
      geometrySource: undefined,
      origin: undefined,
      ownership: undefined,
    }),
    routeStatus: "ready",
  });
  const rendered = textContent(tree);
  assert.match(rendered, /OwnershipSample/);
  assert.match(rendered, /Bahrain Tourism/);
  assert.match(rendered, /Route unavailable/);
  assert.match(rendered, /Choose another route|Change points/);
});

test("captured Profile labels include visible route facts without raw IDs", () => {
  const tree = renderProfile({
    collections: [
      {
        kind: "my-routes",
        title: "My routes",
        items: [
          {
            route: testRoute({
              id: "gpx-legacy-route",
              source: "GPX import",
              geometry: undefined,
              geometrySource: undefined,
              geometryKind: undefined,
              geometryStatus: undefined,
              origin: undefined,
              ownership: undefined,
            }),
            meta: {},
            display: { distance: "10.0 km", movingTime: "42 min" },
          },
        ],
      },
    ],
    activities: [testSavedActivity()],
  });
  const routeButton = findNode(
    tree,
    (node) =>
      node.type === "Pressable" &&
      String(node.props.accessibilityLabel).startsWith("Open route:"),
  );
  const rideButton = findNode(
    tree,
    (node) => node.props.testID === "saved-ride-activity-1",
  );
  assert.ok(routeButton);
  assert.ok(rideButton);
  const routeLabel = String(routeButton?.props.accessibilityLabel);
  const rideLabel = String(rideButton?.props.accessibilityLabel);
  for (const label of [routeLabel, rideLabel]) {
    assert.match(label, /Imported|Sample/);
    assert.match(label, /GPX import|Bahrain Tourism/);
    assert.match(label, /Route preview|Route unavailable/);
    assert.match(label, /10\.0 km/);
    assert.match(label, /42 min/);
    assert.doesNotMatch(label, /gpx-legacy-route|activity-1/);
  }
  assert.match(routeLabel, /Ownership: Yours/);
  assert.match(rideLabel, /Ownership: Sample/);
  assert.match(routeLabel, /Collection: Imported/);
  assert.match(rideLabel, /Collection: Sample/);
});

test("captured long stop labels keep a shrinking wrapped detail column", () => {
  const longName = "A very long stop name that must wrap on a narrow phone";
  const tree = renderRouteDetail(
    {
      route: testRoute({
        points: [
          testRoute().points[0],
          { ...testRoute().points[1], name: longName },
          { ...testRoute().points[1], name: `${longName} finish`, distanceKm: 20 },
        ],
        distanceKm: 20,
        provisionalDistanceKm: 20,
      }),
    },
    [true, true, false, false],
  );
  const longLabel = findNode(
    tree,
    (node) => textContent(node) === longName,
  );
  assert.ok(longLabel);
  assert.deepEqual(
    {
      flex: flattenStyle(longLabel?.props.style).flex,
      flexShrink: flattenStyle(longLabel?.props.style).flexShrink,
      minWidth: flattenStyle(longLabel?.props.style).minWidth,
    },
    { flex: 1, flexShrink: 1, minWidth: 0 },
  );
});

function testSavedActivity() {
  const route = testRoute({
    id: "pilot-snapshot",
    name: "NBH Loop",
    source: "Bahrain Tourism",
    geometry: undefined,
    geometrySource: undefined,
    geometryKind: undefined,
    geometryStatus: undefined,
    origin: undefined,
    ownership: undefined,
  });
  return {
    id: "activity-1",
    plannedRouteId: route.id,
    plannedRouteRevision: 1,
    routeSnapshot: {
      id: route.id,
      name: route.name,
      nameAr: "حلقة ناصر بن حمد",
      origin: "pilot",
      ownership: "catalog",
      points: route.points,
      geometry: {
        kind: "recorded_trace",
        status: "ready",
        coordinates: [],
      },
      roadEvidenceStatus: "pilot_pending",
      revision: 1,
      provenance: { source: "Bahrain Tourism" },
      provisionalDistanceKm: 10,
    },
    startedAt: "2026-09-11T05:00:00.000Z",
    endedAt: "2026-09-11T05:42:00.000Z",
    observedSamples: [],
    matchHistory: [],
    elapsedSeconds: 42 * 60,
    distanceMeters: 10_000,
    matchQuality: "unknown",
    gaps: 0,
    completionState: "saved",
    exportState: "not_exported",
  };
}
