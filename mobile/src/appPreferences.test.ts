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

test('preferences recover each malformed field without accepting string booleans', () => {
  const parsed = parseAppPreferences(JSON.stringify({
    displayName: { value: 'not a name' },
    language: 'fr',
    theme: 'system',
    ridingFocus: 'unknown',
    weeklyDistanceKm: '500',
    experience: { level: 'regular' },
    goals: ['plan', { id: 'train' }, 'unknown'],
    preferredWindow: 'night',
    windPreference: 'strong',
    distanceUnit: 'yards',
    notificationsEnabled: 'false',
    backgroundRefreshEnabled: 'true',
    locationExplainerSeen: 'true',
  }));

  assert.equal(parsed.displayName, '');
  assert.equal(parsed.language, 'en');
  assert.equal(parsed.theme, 'dark');
  assert.equal(parsed.ridingFocus, 'road');
  assert.equal(parsed.weeklyDistanceKm, DEFAULT_APP_PREFERENCES.weeklyDistanceKm);
  assert.equal(parsed.experience, null);
  assert.deepEqual(parsed.goals, ['plan']);
  assert.equal(parsed.preferredWindow, null);
  assert.equal(parsed.windPreference, 'balanced');
  assert.equal(parsed.distanceUnit, 'km');
  assert.equal(parsed.notificationsEnabled, true);
  assert.equal(parsed.backgroundRefreshEnabled, true);
  assert.equal(parsed.locationExplainerSeen, false);
  assert.deepEqual(parseAppPreferences(undefined), DEFAULT_APP_PREFERENCES);
});

test('preference fallbacks do not share mutable goal arrays', () => {
  const first = parseAppPreferences(null);
  first.goals.push('plan');
  assert.deepEqual(parseAppPreferences(null).goals, []);
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

test('privacy center content names stored, temporary, external, retention, export, deletion, and Strava state', async () => {
  const module = (await import('./appPreferences')) as unknown as Record<string, unknown>;
  const getPrivacyCenterCopy = module.getPrivacyCenterCopy as
    | ((language: 'en' | 'ar') => Record<string, any>)
    | undefined;
  assert.equal(typeof getPrivacyCenterCopy, 'function');
  if (!getPrivacyCenterCopy) return;

  for (const language of ['en', 'ar'] as const) {
    const content = getPrivacyCenterCopy(language);
    for (const field of [
      'storedData',
      'temporaryData',
      'locationTiming',
      'routeMatching',
      'weatherRefresh',
      'retention',
      'exportShare',
      'deletion',
      'strava',
    ]) {
      assert.ok(content[field], `${language} privacy copy is missing ${field}`);
    }
    assert.match(content.routeMatching.body, /coordinate|إحداثيات/i);
    assert.match(content.weatherRefresh.body, /coordinate|إحداثيات/i);
    assert.match(content.exportShare.body, /JSON|نسخة|تصدير/i);
    assert.match(content.exportShare.body, /precise|الدقيقة|المحددة/i);
    assert.match(content.deletion.body, /export|مشارك|خارج|إعدادات/i);
  }

  assert.match(
    getPrivacyCenterCopy('en').temporaryData.body,
    /Exporting a copy does not automatically discard/i,
  );
  assert.match(
    getPrivacyCenterCopy('en').exportShare.body,
    /does not automatically discard/i,
  );
  assert.match(getPrivacyCenterCopy('en').deletion.body, /preferences/i);
  assert.match(
    getPrivacyCenterCopy('en').retention.body,
    /deleting saved routes or rides does not delete preferences/i,
  );
  assert.match(
    getPrivacyCenterCopy('ar').temporaryData.body,
    /لا يؤدي التصدير تلقائياً/i,
  );
  assert.match(getPrivacyCenterCopy('ar').deletion.body, /التفضيلات/);
  assert.match(getPrivacyCenterCopy('ar').retention.body, /لا يحذف.*التفضيلات/);

  assert.equal(module.STRAVA_OAUTH_CONFIGURED, false);
  assert.equal(getPrivacyCenterCopy('en').strava.configured, false);
  assert.match(getPrivacyCenterCopy('en').strava.body, /OAuth|configured|imported/i);
});

test('location status copy distinguishes pending, denied, unavailable, and granted', async () => {
  const module = (await import('./appPreferences')) as unknown as Record<string, any>;
  const statusCopy = module.LOCATION_STATUS_COPY as Record<string, Record<string, { label: string; description: string }>> | undefined;
  assert.ok(statusCopy);
  if (!statusCopy) return;

  for (const language of ['en', 'ar'] as const) {
    for (const status of ['pending', 'denied', 'unavailable', 'granted'] as const) {
      assert.ok(statusCopy[language][status].label);
      assert.ok(statusCopy[language][status].description);
    }
  }
  assert.match(statusCopy.en.pending.label, /Waiting|Requesting/i);
  assert.match(statusCopy.en.denied.description, /not allowed|settings/i);
  assert.match(statusCopy.en.unavailable.description, /unavailable|browser|device/i);
  assert.match(statusCopy.en.granted.description, /explicit|ride/i);
  assert.match(settingsSource, /pending|unavailable/);
  assert.match(settingsSource, /Current location/);
  assert.match(settingsSource, /Start ride/);
});

test('export copy makes sharing and precise trace contents explicit', async () => {
  const module = (await import('./appPreferences')) as unknown as Record<string, any>;
  const getPrivacyCenterCopy = module.getPrivacyCenterCopy as ((language: 'en' | 'ar') => Record<string, any>) | undefined;
  assert.equal(typeof getPrivacyCenterCopy, 'function');
  if (!getPrivacyCenterCopy) return;
  const exportCopy = getPrivacyCenterCopy('en').exportShare.body;
  assert.match(exportCopy, /share|download/i);
  assert.match(exportCopy, /preferences|routes|rides/i);
  assert.match(exportCopy, /route|forecast/i);
  assert.match(exportCopy, /precise recorded location samples/i);
  assert.match(exportCopy, /browser/i);
  assert.match(settingsSource, /Share or download/);
  assert.match(settingsSource, /precise recorded location samples/);
  assert.match(settingsSource, /shareOrDownload/);
});
