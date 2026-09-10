import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_APP_PREFERENCES, parseAppPreferences } from './appPreferences';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const profileSource = readFileSync(join(sourceDirectory, 'screens', 'ProfileScreen.tsx'), 'utf8');
const settingsSource = readFileSync(join(sourceDirectory, 'SettingsScreen.tsx'), 'utf8');

test('preferences fall back safely when storage is malformed', () => {
  assert.deepEqual(parseAppPreferences('{not-json'), DEFAULT_APP_PREFERENCES);
  assert.deepEqual(parseAppPreferences(null), DEFAULT_APP_PREFERENCES);
});

test('preferences normalize bounded, user-controlled values', () => {
  const parsed = parseAppPreferences(JSON.stringify({
    onboardingComplete: true,
    displayName: '  Omar '.repeat(30),
    weeklyDistanceKm: 900,
    language: 'ar',
    theme: 'light',
    ridingFocus: 'fitness',
    notificationsEnabled: false,
  }));

  assert.equal(parsed.onboardingComplete, true);
  assert.equal(parsed.displayName.length, 60);
  assert.equal(parsed.weeklyDistanceKm, 500);
  assert.equal(parsed.language, 'ar');
  assert.equal(parsed.theme, 'light');
  assert.equal(parsed.ridingFocus, 'fitness');
  assert.equal(parsed.notificationsEnabled, false);
});

test('You keeps the personal hub focused and leaves settings reachable', () => {
  assert.match(profileSource, /My routes/);
  assert.match(profileSource, /Saved rides/);
  assert.match(profileSource, /Connections & privacy/);
  assert.match(profileSource, /onSettingsAction/);
  assert.doesNotMatch(profileSource, /StatusBadge|Owner decision|ownerDecision|policy/);
  assert.doesNotMatch(profileSource, /Personal routes stay distinct from examples and imports/);
});

test('Settings exposes language, units, local data, and explicit deletion in both directions', () => {
  for (const source of [settingsSource]) {
    assert.match(source, /Language/);
    assert.match(source, /Distance units/);
    assert.match(source, /Location & notifications/);
    assert.match(source, /Data/);
    assert.match(source, /onEditProfile/);
    assert.match(source, /onDeleteData/);
    assert.match(source, /Delete saved routes and rides/);
    assert.doesNotMatch(source, /Delete all saved data/);
    assert.match(source, /Your language and other settings will stay unchanged/);
    assert.match(source, /checked: selected/);
    assert.match(source, /aria-checked=\{selected\}/);
    assert.match(source, /hitSlop=\{4\}/);
    assert.match(source, /flexWrap/);
    assert.doesNotMatch(source, /Bahrain route preview|Account|Sign out|owner|policy/);
    assert.doesNotMatch(source, /signOut:/);
  }
  assert.match(settingsSource, /وحدة المسافة/);
  assert.match(settingsSource, /الكيلومترات/);
  assert.match(settingsSource, /الأميال/);
  assert.match(settingsSource, /حذف المسارات والرحلات المحفوظة/);
  assert.match(settingsSource, /ستبقى لغتك وإعداداتك الأخرى دون تغيير/);
  assert.match(settingsSource, /الموقع والإشعارات/);
});
