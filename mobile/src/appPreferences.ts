import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from './i18n';
import type { DistanceUnit, ExperienceLevel, RideWindow, RidingGoal, WindPreference } from './Onboarding';
import {
  ROUTE_MATCHING_DISCLOSURE,
  STRAVA_CONNECTION_STATE,
  STRAVA_DISCLOSURE,
  STRAVA_OAUTH_CONFIGURED,
  type ExternalDataFlowDisclosure,
  type StravaDisclosure,
} from './api';
import { WEATHER_REFRESH_DISCLOSURE } from './weather';

export { STRAVA_CONNECTION_STATE, STRAVA_OAUTH_CONFIGURED };

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

export type LocationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'pending'
  | 'unavailable'
  | 'undetermined'
  | 'limited';

export type LocationStatusCopy = {
  label: string;
  description: string;
  actionLabel: string;
};

export const LOCATION_STATUS_COPY = {
  en: {
    granted: {
      label: 'Allowed',
      description: 'Location is available for your explicit Current location choice or active ride.',
      actionLabel: 'Manage',
    },
    denied: {
      label: 'Not allowed',
      description: 'Location was denied. You can still browse and plan; open settings or try again.',
      actionLabel: 'Manage',
    },
    pending: {
      label: 'Requesting location…',
      description: 'Waiting for the permission result. Browsing does not use device location.',
      actionLabel: 'Waiting…',
    },
    unavailable: {
      label: 'Unavailable',
      description: 'Location is unavailable in this browser or on this device. You can still browse and plan without it.',
      actionLabel: 'Try again',
    },
    undetermined: {
      label: 'Not requested',
      description: 'Location has not been requested. Browsing routes and weather never requests device location.',
      actionLabel: 'Allow location',
    },
    limited: {
      label: 'Limited',
      description: 'Location access is limited and may not support an active ride.',
      actionLabel: 'Manage',
    },
  },
  ar: {
    granted: {
      label: 'مسموح',
      description: 'الموقع متاح عند اختيارك الصريح للموقع الحالي أو أثناء رحلة نشطة.',
      actionLabel: 'إدارة',
    },
    denied: {
      label: 'غير مسموح',
      description: 'رُفض الوصول إلى الموقع. يمكنك التصفح والتخطيط؛ افتح الإعدادات أو حاول مرة أخرى.',
      actionLabel: 'إدارة',
    },
    pending: {
      label: 'جارٍ طلب الموقع…',
      description: 'بانتظار نتيجة الإذن. لا يستخدم التصفح موقع الجهاز.',
      actionLabel: 'بانتظار النتيجة…',
    },
    unavailable: {
      label: 'غير متاح',
      description: 'الموقع غير متاح في هذا المتصفح أو الجهاز. يمكنك التصفح والتخطيط بدونه.',
      actionLabel: 'حاول مرة أخرى',
    },
    undetermined: {
      label: 'لم يُطلب',
      description: 'لم يُطلب الموقع. لا يطلب تصفح المسارات والطقس موقع الجهاز.',
      actionLabel: 'السماح بالموقع',
    },
    limited: {
      label: 'محدود',
      description: 'الوصول إلى الموقع محدود وقد لا يدعم رحلة نشطة.',
      actionLabel: 'إدارة',
    },
  },
} as const satisfies Record<Language, Record<LocationPermissionStatus, LocationStatusCopy>>;

export type PrivacyText = { title: string; body: string };
export type PrivacyCenterCopy = {
  title: string;
  intro: string;
  storedData: PrivacyText;
  temporaryData: PrivacyText;
  locationTiming: PrivacyText;
  routeMatching: ExternalDataFlowDisclosure;
  weatherRefresh: ExternalDataFlowDisclosure;
  retention: PrivacyText;
  exportShare: PrivacyText;
  deletion: PrivacyText;
  strava: StravaDisclosure;
};

export const PRIVACY_CENTER_CONTENT = {
  en: {
    title: 'Privacy center',
    intro: 'See what stays on this device, what leaves it for a requested service, how long it is kept, and what you can share or delete.',
    storedData: {
      title: 'Stored on this device',
      body: 'Saved routes, route revisions, riding preferences, and saved ride summaries are stored locally. A saved ride can include its route and forecast snapshots.',
    },
    temporaryData: {
      title: 'Temporary ride samples',
      body: 'While an active ride runs, foreground location samples are kept for the session. An unsaved completion draft can keep those precise samples until you save, export, or discard it.',
    },
    locationTiming: {
      title: 'When location is used',
      body: 'Naseem never requests device location just because you browse. It may request a one-time location after you choose Current location, or foreground updates after you choose Start ride. Ending the ride stops location updates.',
    },
    routeMatching: ROUTE_MATCHING_DISCLOSURE.en,
    weatherRefresh: WEATHER_REFRESH_DISCLOSURE.en,
    retention: {
      title: 'Retention',
      body: 'Local routes, rides, preferences, and saved snapshots remain until you delete them. Weather responses cache in memory for 10 minutes and route-analysis responses for 30 seconds; these bounded caches are not saved history.',
    },
    exportShare: {
      title: 'Export and sharing',
      body: 'Export creates a JSON copy containing preferences, saved routes, saved rides, route and forecast snapshots, and precise recorded location samples. It leaves this device only when you choose a share destination; supported browsers can download a local copy. Naseem does not upload the export itself.',
    },
    deletion: {
      title: 'Deletion scope',
      body: 'The Settings delete action removes saved routes and saved rides from this device; use Discard on a pending completion draft to remove its temporary samples. Language and other preferences stay. Deletion cannot recall an export you already shared or erase provider request logs.',
    },
    strava: STRAVA_DISCLOSURE.en,
  },
  ar: {
    title: 'مركز الخصوصية',
    intro: 'تعرّف على ما يبقى على هذا الجهاز، وما يغادره لخدمة تطلبها، ومدة الاحتفاظ به، وما يمكنك مشاركته أو حذفه.',
    storedData: {
      title: 'المحفوظ على هذا الجهاز',
      body: 'تُحفظ المسارات المحفوظة وإصداراتها وتفضيلات الركوب وملخصات الرحلات المحفوظة محلياً. وقد تتضمن الرحلة المحفوظة نسخة من المسار ولقطات التوقع.',
    },
    temporaryData: {
      title: 'عينات الرحلة المؤقتة',
      body: 'أثناء الرحلة النشطة تُحفظ عينات الموقع الأمامي للجلسة. وقد يحتفظ مسودّ إنجاز غير محفوظ بهذه العينات الدقيقة حتى تحفظه أو تصدّره أو تحذفه.',
    },
    locationTiming: {
      title: 'متى يُستخدم الموقع',
      body: 'لا يطلب نسيم موقع الجهاز لمجرد التصفح. وقد يطلب موقعاً لمرة واحدة بعد اختيار الموقع الحالي، أو تحديثات أمامية بعد اختيار بدء الرحلة. يتوقف تحديث الموقع عند إنهاء الرحلة.',
    },
    routeMatching: ROUTE_MATCHING_DISCLOSURE.ar,
    weatherRefresh: WEATHER_REFRESH_DISCLOSURE.ar,
    retention: {
      title: 'مدة الاحتفاظ',
      body: 'تبقى المسارات والرحلات والتفضيلات واللقطات المحفوظة محلياً حتى تحذفها. تُخزّن نتائج الطقس في الذاكرة 10 دقائق ونتائج تحليل المسار 30 ثانية؛ وهذه ذاكرات محدودة وليست سجلاً محفوظاً.',
    },
    exportShare: {
      title: 'التصدير والمشاركة',
      body: 'ينشئ التصدير نسخة JSON تتضمن التفضيلات والمسارات والرحلات المحفوظة ولقطات المسار والتوقع وعينات الموقع المسجلة الدقيقة. لا يغادر الملف هذا الجهاز إلا عند اختيار وجهة مشاركة؛ ويمكن للمتصفحات المدعومة تنزيل نسخة محلية. لا يرفع نسيم الملف بنفسه.',
    },
    deletion: {
      title: 'نطاق الحذف',
      body: 'يحذف إجراء حذف الإعدادات المسارات والرحلات المحفوظة من هذا الجهاز؛ استخدم حذف مسودة الإنجاز المعلقة لإزالة عيناتها المؤقتة. تبقى اللغة والتفضيلات الأخرى. ولا يمكن للحذف استرجاع ملف صدّرته أو شاركته أو محو سجلات طلبات المزوّد.',
    },
    strava: STRAVA_DISCLOSURE.ar,
  },
} as const satisfies Record<Language, PrivacyCenterCopy>;

export const PRIVACY_CENTER_COPY = PRIVACY_CENTER_CONTENT;

export function getPrivacyCenterCopy(language: Language): PrivacyCenterCopy {
  return PRIVACY_CENTER_CONTENT[language];
}

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

function defaultAppPreferences(): AppPreferences {
  return { ...DEFAULT_APP_PREFERENCES, goals: [...DEFAULT_APP_PREFERENCES.goals] };
}

export function parseAppPreferences(raw: string | null | undefined): AppPreferences {
  if (typeof raw !== 'string' || !raw.trim()) return defaultAppPreferences();
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return defaultAppPreferences();
    const value = candidate as Record<string, unknown>;
    return {
      onboardingComplete: value.onboardingComplete === true,
      displayName: typeof value.displayName === 'string' ? value.displayName.trim().slice(0, 60) : '',
      language: isLanguage(value.language) ? value.language : DEFAULT_APP_PREFERENCES.language,
      theme: isTheme(value.theme) ? value.theme : DEFAULT_APP_PREFERENCES.theme,
      ridingFocus: isRidingFocus(value.ridingFocus) ? value.ridingFocus : DEFAULT_APP_PREFERENCES.ridingFocus,
      weeklyDistanceKm: boundedDistance(value.weeklyDistanceKm),
      experience: isExperience(value.experience) ? value.experience : DEFAULT_APP_PREFERENCES.experience,
      goals: Array.isArray(value.goals) ? value.goals.filter(isGoal).slice(0, 4) : [...DEFAULT_APP_PREFERENCES.goals],
      preferredWindow: isRideWindow(value.preferredWindow) ? value.preferredWindow : DEFAULT_APP_PREFERENCES.preferredWindow,
      windPreference: isWindPreference(value.windPreference) ? value.windPreference : DEFAULT_APP_PREFERENCES.windPreference,
      distanceUnit: isDistanceUnit(value.distanceUnit) ? value.distanceUnit : DEFAULT_APP_PREFERENCES.distanceUnit,
      notificationsEnabled: typeof value.notificationsEnabled === 'boolean' ? value.notificationsEnabled : DEFAULT_APP_PREFERENCES.notificationsEnabled,
      backgroundRefreshEnabled: typeof value.backgroundRefreshEnabled === 'boolean' ? value.backgroundRefreshEnabled : DEFAULT_APP_PREFERENCES.backgroundRefreshEnabled,
      locationExplainerSeen: value.locationExplainerSeen === true,
    };
  } catch {
    return defaultAppPreferences();
  }
}

export async function loadAppPreferences() {
  try {
    return parseAppPreferences(await AsyncStorage.getItem(APP_PREFERENCES_STORAGE_KEY));
  } catch {
    return defaultAppPreferences();
  }
}

export async function saveAppPreferences(preferences: AppPreferences) {
  await AsyncStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export async function clearAppPreferences() {
  await AsyncStorage.removeItem(APP_PREFERENCES_STORAGE_KEY);
}
