import assert from "node:assert/strict";
import test from "node:test";
import {
  createDistanceDisplay,
  distanceInUnit,
  kilometresFromDisplayValue,
} from "./distanceDisplay";

const formatter = (locale: string) =>
  (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale, options).format(value);

test("distance display converts km to miles without changing the canonical value", () => {
  const display = createDistanceDisplay({
    unit: "mi",
    distanceLabels: { km: "km", mi: "mi" },
    speedLabels: { km: "km/h", mi: "mph" },
    formatNumber: formatter("en-BH"),
  });

  assert.equal(display.formatDistance(21.8), "13.5 mi");
  assert.equal(display.formatDistanceValue(21.8), "13.5");
  assert.equal(distanceInUnit(21.8, "km"), 21.8);
  assert.ok(
    Math.abs(
      kilometresFromDisplayValue(distanceInUnit(21.8, "mi"), "mi") - 21.8,
    ) < 0.000001,
  );
});

test("distance display uses the selected Arabic unit and converts direct speed", () => {
  const display = createDistanceDisplay({
    unit: "mi",
    distanceLabels: { km: "كم", mi: "ميل" },
    speedLabels: { km: "كم/س", mi: "ميل/س" },
    formatNumber: formatter("ar-BH"),
  });

  assert.equal(display.formatDistance(21.8), "١٣٫٥ ميل");
  assert.equal(display.formatSpeed(26), "١٦ ميل/س" );
});

test("kilometre display remains unchanged and uses the km labels", () => {
  const display = createDistanceDisplay({
    unit: "km",
    distanceLabels: { km: "km", mi: "mi" },
    speedLabels: { km: "km/h", mi: "mph" },
    formatNumber: formatter("en-BH"),
  });

  assert.equal(display.formatDistance(21.8), "21.8 km");
  assert.equal(display.formatSpeed(26), "26 km/h");
});
