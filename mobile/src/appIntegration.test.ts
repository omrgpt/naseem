import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(sourceDirectory, "..", "App.tsx"), "utf8");

function sourceBetween(start: string, end: string) {
  const startIndex = appSource.indexOf(start);
  const endIndex = appSource.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`);
  return appSource.slice(startIndex, endIndex);
}

test("route review matching is limited to waypoint drafts and retries", () => {
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

test("editing a planner field clears its point and invalidates stale matching", () => {
  const updatePlannerText = sourceBetween(
    "const updatePlannerText =",
    "const mapPlannerPress =",
  );
  assert.match(updatePlannerText, /matchingToken\.current \+= 1/);
  assert.match(updatePlannerText, /field === "start" \? null : builder\.start/);
  assert.match(
    updatePlannerText,
    /field === "destination" \? null : builder\.destination/,
  );
  assert.match(updatePlannerText, /route: null/);
  assert.match(updatePlannerText, /setActiveField\(field\)/);
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
