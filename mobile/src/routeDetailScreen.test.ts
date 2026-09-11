import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    /onSave &&[\s\S]*onPress=\{onSave\}/,
    "optional onSave should be rendered only when provided",
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
  assert.match(source, /routeStatus === "unavailable"/);
  assert.match(source, /onPress=\{onRetry\}/);
  assert.match(source, /tx\(t, "retry", "Try again"\)/);
  assert.match(source, /onPress=\{openEditPoints\}/);
  assert.match(source, /tx\(t, "editPoints", "Change points"\)/);
});

test("route detail owns one independently scrollable decision sheet with sticky actions", () => {
  assert.match(source, /import \{[^}]*ScrollView[^}]*\} from "react-native"/);
  assert.match(source, /testID="route-detail-decision-sheet"/);
  assert.match(source, /keyboardShouldPersistTaps="handled"/);
  assert.match(source, /nestedScrollEnabled/);
  assert.match(source, /contentContainerStyle=\{[^}]*styles\.sheetSafeArea/);
  assert.match(source, /testID="route-detail-sticky-back"/);
  assert.match(source, /testID="route-detail-sticky-actions"/);
});

test("route detail shows canonical identity and route facts before deep evidence", () => {
  assert.match(source, /testID="route-detail-default-facts"/);
  assert.match(source, /canonical\.ownership/);
  assert.match(source, /canonical\.origin/);
  assert.match(source, /canonical\.provenance/);
  assert.match(source, /routePlanHasAuthoritativeGeometry\(canonical\)/);
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
  assert.match(profileSource, /item\.meta\.origin === "gpx"/);
  assert.match(profileSource, /text\.imported/);
  assert.match(profileSource, /item\.meta\.ownership === "catalog"/);
  assert.match(profileSource, /text\.sample/);
  assert.match(profileSource, /text\.yours/);
  assert.match(profileSource, /item\.meta\.sourceLabel|item\.meta\.provenanceLabel/);
});
