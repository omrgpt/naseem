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

function sourceBetween(start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("expanded route details expose all rider route actions", () => {
  const expandedDetails = sourceBetween(
    "{expanded && (",
    "\n        {catalogPreview ? (",
  );

  for (const callback of ["onAddStop", "onReverse", "onEdit"]) {
    assert.match(
      expandedDetails,
      new RegExp(`onPress=\\{${callback}\\}`),
      `${callback} should be wired from the expanded details sheet`,
    );
  }
  assert.match(
    expandedDetails,
    /onSave &&[\s\S]*onPress=\{onSave\}/,
    "optional onSave should be rendered only when provided",
  );
  assert.match(
    expandedDetails,
    /styles\.manualActions, rtl && styles\.rowRtl/,
    "the action row should mirror in RTL",
  );
  assert.match(expandedDetails, /accessibilityRole="button"/);
  assert.match(expandedDetails, /tx\(t, "addStop", "Add stop"\)/);
  assert.match(expandedDetails, /tx\(t, "reverse", "Reverse"\)/);
  assert.match(expandedDetails, /tx\(t, "editPoints", "Edit points"\)/);
  assert.match(expandedDetails, /tx\(t, "saveRoute", "Save route"\)/);
});

test("unavailable route details retain retry and change-points recovery", () => {
  const recovery = sourceBetween(
    '{routeStatus === "unavailable" && (',
    "\n        {expanded && (",
  );

  assert.match(recovery, /onPress=\{onRetry\}/);
  assert.match(recovery, /tx\(t, "retry", "Try again"\)/);
  assert.match(recovery, /onPress=\{onEdit\}/);
  assert.match(recovery, /tx\(t, "editPoints", "Change points"\)/);
});
