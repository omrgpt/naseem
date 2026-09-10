import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(sourceDirectory, '..', 'App.tsx'), 'utf8');

test('App routes alerts through a native-preserving, web-safe presenter', () => {
  assert.match(appSource, /const showAppAlert = \(/);
  assert.match(appSource, /if \(Platform\.OS !== "web"\)/);
  assert.match(appSource, /Alert\.alert\(title, message, buttons\)/);
  assert.match(appSource, /Alert\.alert\(title, message\)/);
  assert.equal((appSource.match(/Alert\.alert\(/g) ?? []).length, 2);
  assert.doesNotMatch(appSource, /openPrivacy = \(\) => Alert\.alert/);
  assert.doesNotMatch(appSource, /discardCompletion[\s\S]{0,220}Alert\.alert/);
});

test('web alert fallback exposes an accessible action surface', () => {
  assert.match(appSource, /role=\{confirmation \? "alertdialog" : "alert"\}/);
  assert.match(appSource, /accessibilityLiveRegion="assertive"/);
  assert.match(appSource, /accessibilityViewIsModal/);
  assert.match(appSource, /aria-modal=\{true\}/);
  assert.match(appSource, /accessibilityRole="button"/);
  assert.match(appSource, /minHeight: 48/);
  assert.match(appSource, /setWebAlert\(null\)/);
});

test('privacy, export, discard, and connection feedback use the presenter', () => {
  assert.match(appSource, /const openPrivacy = \(\) => showAppAlert/);
  assert.match(appSource, /const discardCompletion = \(\) => \{/);
  assert.match(appSource, /showAppAlert\(t\.discardRide, t\.discardRideConfirm/);
  assert.match(appSource, /showAppAlert\(t\.exportRide/);
  assert.match(appSource, /showAppAlert\(t\.connectStrava, t\.stravaNotConfigured\)/);
});
