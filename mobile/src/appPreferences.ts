import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from './i18n';
import type { DistanceUnit, ExperienceLevel, RideWindow, RidingGoal, WindPreference } from './Onboarding';

export const APP_PREFERENCES_STORAGE_KEY = 'naseem.preferences.v1';

export type ThemePreference = 'light' | 'dark';
export type RidingFocus = 'road' | 'fitness' | 'explore';

export type AppPreferences = {
  onboardingComplete: boolean;
  displayName: string;
  language: Language;
  theme: ThemePreference;
  ridingFocus: RidingFocus;
  weeklyDistanceKm: number;
  experience: ExperienceLevel | null;
  goals: RidingGoal[];
  preferredWindow: RideWindow | null;
  windPreference: WindPreference;
  distanceUnit: DistanceUnit;
  notificationsEnabled: boolean;
  backgroundRefreshEnabled: boolean;
  locationExplainerSeen: boolean;
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  onboardingComplete: false,
  displayName: '',
  language: 'en',
  theme: 'dark',
  ridingFocus: 'road',
  weeklyDistanceKm: 80,
  experience: null,
  goals: [],
  preferredWindow: null,
  windPreference: 'balanced',
  distanceUnit: 'km',
  notificationsEnabled: true,
  backgroundRefreshEnabled: true,
  locationExplainerSeen: false,
};

function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ar';
}

function isTheme(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark';
}

function isRidingFocus(value: unknown): value is RidingFocus {
  return value === 'road' || value === 'fitness' || value === 'explore';
}

function isExperience(value: unknown): value is ExperienceLevel {
  return value === 'new' || value === 'regular' || value === 'endurance';
}

function isGoal(value: unknown): value is RidingGoal {
  return value === 'plan' || value === 'train' || value === 'discover' || value === 'commute';
}

function isRideWindow(value: unknown): value is RideWindow {
  return value === 'morning' || value === 'afternoon' || value === 'flexible';
}

function isWindPreference(value: unknown): value is WindPreference {
  return value === 'balanced' || value === 'sheltered' || value === 'tailwind';
}

function isDistanceUnit(value: unknown): value is DistanceUnit {
  return value === 'km' || value === 'mi';
}

function boundedDistance(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(500, Math.max(10, Math.round(value))) : DEFAULT_APP_PREFERENCES.weeklyDistanceKm;
}

export function parseAppPreferences(raw: string | null): AppPreferences {
  if (!raw) return DEFAULT_APP_PREFERENCES;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== 'object') return DEFAULT_APP_PREFERENCES;
    const value = candidate as Record<string, unknown>;
    return {
      onboardingComplete: value.onboardingComplete === true,
      displayName: typeof value.displayName === 'string' ? value.displayName.trim().slice(0, 60) : '',
      language: isLanguage(value.language) ? value.language : DEFAULT_APP_PREFERENCES.language,
      theme: isTheme(value.theme) ? value.theme : DEFAULT_APP_PREFERENCES.theme,
      ridingFocus: isRidingFocus(value.ridingFocus) ? value.ridingFocus : DEFAULT_APP_PREFERENCES.ridingFocus,
      weeklyDistanceKm: boundedDistance(value.weeklyDistanceKm),
      experience: isExperience(value.experience) ? value.experience : DEFAULT_APP_PREFERENCES.experience,
      goals: Array.isArray(value.goals) ? value.goals.filter(isGoal).slice(0, 4) : DEFAULT_APP_PREFERENCES.goals,
      preferredWindow: isRideWindow(value.preferredWindow) ? value.preferredWindow : DEFAULT_APP_PREFERENCES.preferredWindow,
      windPreference: isWindPreference(value.windPreference) ? value.windPreference : DEFAULT_APP_PREFERENCES.windPreference,
      distanceUnit: isDistanceUnit(value.distanceUnit) ? value.distanceUnit : DEFAULT_APP_PREFERENCES.distanceUnit,
      notificationsEnabled: value.notificationsEnabled !== false,
      backgroundRefreshEnabled: value.backgroundRefreshEnabled !== false,
      locationExplainerSeen: value.locationExplainerSeen === true,
    };
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export async function loadAppPreferences() {
  try {
    return parseAppPreferences(await AsyncStorage.getItem(APP_PREFERENCES_STORAGE_KEY));
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export async function saveAppPreferences(preferences: AppPreferences) {
  await AsyncStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export async function clearAppPreferences() {
  await AsyncStorage.removeItem(APP_PREFERENCES_STORAGE_KEY);
}
