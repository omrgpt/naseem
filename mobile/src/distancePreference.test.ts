import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(sourceDirectory, "..", "App.tsx"), "utf8");
const settingsSource = readFileSync(
  join(sourceDirectory, "SettingsScreen.tsx"),
  "utf8",
);

test("Settings owns the persisted distance unit and does not fake System appearance", () => {
  assert.match(appSource, /distanceUnit=\{preferences\.distanceUnit\}/u);
  assert.match(
    appSource,
    /onDistanceUnitChange=\{\(unit\) => commitPreferences\(\{ distanceUnit: unit \}\)\}/u,
  );
  assert.doesNotMatch(appSource, /next === ["']system["']/u);
  assert.doesNotMatch(settingsSource, /value: ["']system["']/u);
});

test("major rider screens consume the shared display-distance contract", () => {
  for (const fileName of [
    "TodayScreen.tsx",
    "RoutesScreen.tsx",
    "RouteDetailScreen.tsx",
    "LiveRideScreen.tsx",
    "ProfileScreen.tsx",
  ]) {
    const source = readFileSync(join(sourceDirectory, "screens", fileName), "utf8");
    assert.match(source, /distanceDisplay/u, `${fileName} is not unit-aware`);
    assert.match(source, /formatDistance/u, `${fileName} does not format route distances`);
  }
  assert.match(appSource, /createDistanceDisplay/u);
  assert.match(appSource, /distanceDisplay=\{distanceDisplay\}/u);
});
