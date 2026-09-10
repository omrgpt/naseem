import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldShowMinimalMapControls,
  shouldShowUserLocationControl,
} from "./mapPreviewContract";

test("compact minimal previews hide the fit and zoom toolbar", () => {
  assert.equal(shouldShowMinimalMapControls(true, true), false);
});

test("full route-review minimal maps keep the fit and zoom toolbar", () => {
  assert.equal(shouldShowMinimalMapControls(false, true), true);
});

test("non-minimal maps do not render the minimal toolbar", () => {
  assert.equal(shouldShowMinimalMapControls(false, false), false);
});

test("current-location control requires opt-in and a finite coordinate", () => {
  assert.equal(
    shouldShowUserLocationControl(true, {
      latitude: 26.2235,
      longitude: 50.5876,
    }),
    true,
  );
  assert.equal(
    shouldShowUserLocationControl(false, {
      latitude: 26.2235,
      longitude: 50.5876,
    }),
    false,
  );
  assert.equal(
    shouldShowUserLocationControl(true, {
      latitude: Number.NaN,
      longitude: 50.5876,
    }),
    false,
  );
  assert.equal(
    shouldShowUserLocationControl(true, {
      latitude: 26.2235,
      longitude: Number.POSITIVE_INFINITY,
    }),
    false,
  );
  assert.equal(shouldShowUserLocationControl(true), false);
});
