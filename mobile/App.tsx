import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import * as Sharing from "expo-sharing";
import { useFonts } from "expo-font";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  NotoSansArabic_400Regular,
  NotoSansArabic_500Medium,
  NotoSansArabic_600SemiBold,
  NotoSansArabic_700Bold,
} from "@expo-google-fonts/noto-sans-arabic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ComponentCatalog } from "./src/ComponentCatalog";
import { DirectionsGallery } from "./src/DirectionsGallery";
import { FontCatalog } from "./src/FontCatalog";
import { Onboarding, type OnboardingData } from "./src/Onboarding";
import {
  SettingsScreen,
  type PermissionStatus,
  type SettingsTheme,
} from "./src/SettingsScreen";
import { UiDirectionLab } from "./src/UiDirectionLab";
import { Icon, type IconName } from "./src/Icon";
import type { Language } from "./src/i18n";
import { copy, directionForLanguage, localeForLanguage } from "./src/i18n";
import {
  createDistanceDisplay,
  kilometresFromDisplayValue,
  type DistanceUnit,
} from "./src/distanceDisplay";
import { analyseRoute } from "./src/routeEngine";
import {
  aheadWindow,
  analyseRouteRevision,
  explainRun,
} from "./src/routeAnalysis";
import { buildRouteLayers } from "./src/routeConditions";
import {
  draftRouteFromCoordinates,
  parseGpxDetailed,
  routeFromCoordinates,
  validateRouteCoordinates,
} from "./src/routeBuilder";
import {
  beginRouteMatching,
  routeMatchingFailed,
  routeMatchingSucceeded,
  savePersonalRoute,
  DEFAULT_WAYPOINT_TRACE_LIVE_RIDE_POLICY,
} from "./src/routeLifecycle";
import {
  routeAnalysisKey,
  routePlanFromRecord,
  routeRecordFromPlan,
} from "./src/routeRepository";
import { resolveRoadGeometryDetailed } from "./src/routeRouter";
import {
  COASTAL_LOOP,
  NBH_FAMILY,
  NBH_LOOP,
  ROUTE_ALTERNATIVES,
} from "./src/seed";
import { getBahrainConditions, type BahrainConditions } from "./src/weather";
import type {
  Coordinate,
  RoutePlan,
  RouteRecord,
  WindForecast,
} from "./src/domain";
import { DARK, LIGHT, type Palette } from "./src/designTokens";
import {
  DEFAULT_APP_PREFERENCES,
  loadAppPreferences,
  saveAppPreferences,
  type AppPreferences,
} from "./src/appPreferences";
import {
  readStoredRouteRecords,
  serializeStoredRouteRecords,
} from "./src/routeStorage";
import {
  formatBahrainTime,
  formatNumber,
  departureInstant,
} from "./src/routeTime";
import { createScreenStyles } from "./src/screenStyles";
import { LiveRideScreen } from "./src/screens/LiveRideScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { RouteDetailScreen } from "./src/screens/RouteDetailScreen";
import { RoutesScreen } from "./src/screens/RoutesScreen";
import { TodayScreen } from "./src/screens/TodayScreen";
import type {
  BuilderRouteState,
  CanonicalRouteView,
  CollectionKind,
  LiveRidePosition,
  LiveRideSnapshot,
  RouteCollection,
  RouteSurfaceItem,
} from "./src/screenTypes";
import { routeIsNavigable, screenText } from "./src/screenTypes";
import { useLiveRideSession } from "./src/useLiveRideSession";
import {
  parseActivities,
  serializeActivities,
  upsertActivity,
} from "./src/activityRepository";
import {
  markActivityDiscarded,
  markActivityExported,
  markActivitySaveFailed,
  markActivitySaved,
} from "./src/rideRecording";
import { distanceToRouteEntryKm } from "./src/routeMatcher";
import {
  FONT_ARABIC_BOLD,
  FONT_ARABIC_MEDIUM,
  FONT_ARABIC_REGULAR,
  FONT_ARABIC_SEMIBOLD,
  FONT_BOLD,
  FONT_EXTRABOLD,
  FONT_MEDIUM,
  FONT_REGULAR,
  FONT_SEMIBOLD,
} from "./src/fonts";
import type { ActivityDraft } from "./src/domain";

type Tab = "home" | "plan" | "ride" | "you";
type RouteStatus =
  "draft" | "matching" | "ready" | "unavailable" | "trace_ready" | "failed";

type AppAlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type WebAlertState = {
  title: string;
  message: string;
  buttons: AppAlertButton[];
};

type RideStartIntent = {
  routeId: string;
  mode: "connect";
  phase: "queued" | "permission-explanation";
};

const ROUTE_STORAGE_V1_KEY = "ridewind.bahrain.routes.v1";
const ROUTE_STORAGE_V2_KEY = "ridewind.bahrain.routes.v2";
const ACTIVITY_STORAGE_KEY = "ridewind.bahrain.activities.v1";
const ACTIVITY_PENDING_STORAGE_KEY = "ridewind.bahrain.activity-pending.v1";
const GENERATION_COOLDOWN_MS = 12_000;
const BAHRAIN_CENTER = { latitude: 26.2235, longitude: 50.5876 };
const SMART_LOOP_TEMPLATES = [
  {
    name: "Manama north ring",
    nameAr: "حلقة شمال المنامة",
    points: [
      { latitude: 26.223, longitude: 50.588 },
      { latitude: 26.243, longitude: 50.608 },
      { latitude: 26.271, longitude: 50.597 },
      { latitude: 26.258, longitude: 50.563 },
      { latitude: 26.232, longitude: 50.566 },
      { latitude: 26.223, longitude: 50.588 },
    ],
  },
  {
    name: "Seef waterfront ring",
    nameAr: "حلقة واجهة السيف البحرية",
    points: [
      { latitude: 26.238, longitude: 50.526 },
      { latitude: 26.258, longitude: 50.548 },
      { latitude: 26.27, longitude: 50.576 },
      { latitude: 26.251, longitude: 50.592 },
      { latitude: 26.232, longitude: 50.567 },
      { latitude: 26.238, longitude: 50.526 },
    ],
  },
  {
    name: "Bahrain Bay return ring",
    nameAr: "حلقة عودة خليج البحرين",
    points: [
      { latitude: 26.247, longitude: 50.587 },
      { latitude: 26.261, longitude: 50.608 },
      { latitude: 26.279, longitude: 50.615 },
      { latitude: 26.286, longitude: 50.585 },
      { latitude: 26.266, longitude: 50.563 },
      { latitude: 26.247, longitude: 50.587 },
    ],
  },
] as const;

function shouldAutoMatchRouteReview(record: RouteRecord) {
  return (
    record.geometry.kind === "waypoint_trace" &&
    (record.geometry.status === "draft" ||
      record.geometry.status === "unavailable")
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    NotoSansArabic_400Regular,
    NotoSansArabic_500Medium,
    NotoSansArabic_600SemiBold,
    NotoSansArabic_700Bold,
  });
  const catalogMode =
    Platform.OS === "web" &&
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("catalog") === "1";
  const fontMode =
    Platform.OS === "web" &&
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("fonts") === "1";
  const labMode =
    Platform.OS === "web" &&
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("lab") === "1";
  const directionsMode =
    Platform.OS === "web" &&
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("directions") === "1";

  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [preferences, setPreferences] = useState<AppPreferences>(
    DEFAULT_APP_PREFERENCES,
  );
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [editingOnboarding, setEditingOnboarding] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailRouteId, setDetailRouteId] = useState<string | null>(null);
  const [storedRouteRecords, setStoredRouteRecords] = useState<RouteRecord[]>(
    [],
  );
  const [routeStorageReady, setRouteStorageReady] = useState(false);
  const [storedActivities, setStoredActivities] = useState<ActivityDraft[]>([]);
  const [activitiesHydrated, setActivitiesHydrated] = useState(false);
  const [activityStorageReady, setActivityStorageReady] = useState(false);
  const [pendingDraftHydrated, setPendingDraftHydrated] = useState(false);
  const [completionDraftView, setCompletionDraftView] =
    useState<ActivityDraft | null>(null);
  const [workingRecords, setWorkingRecords] = useState<
    Record<string, RouteRecord>
  >({});
  const [routesHydrated, setRoutesHydrated] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [confirmedRouteId, setConfirmedRouteId] = useState<string | null>(null);
  const [rideStartIntent, setRideStartIntent] =
    useState<RideStartIntent | null>(null);
  const [builder, setBuilder] = useState<BuilderRouteState>({
    status: "empty",
    start: null,
    destination: null,
    route: null,
  });
  const [activeField, setActiveField] = useState<
    "start" | "destination" | null
  >(null);
  const [startText, setStartText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [targetDistanceInput, setTargetDistanceInput] = useState("20");
  const [manualMode, setManualMode] = useState(false);
  const [manualPoints, setManualPoints] = useState<Coordinate[]>([]);
  const [manualRedo, setManualRedo] = useState<Coordinate[]>([]);
  const [importReview, setImportReview] = useState<RoutePlan | null>(null);
  const [importReviewFileName, setImportReviewFileName] = useState("");
  const [generatedReview, setGeneratedReview] = useState<RoutePlan | null>(
    null,
  );
  const [routeMessage, setRouteMessage] = useState("");
  const [webAlert, setWebAlert] = useState<WebAlertState | null>(null);
  const [conditions, setConditions] = useState<BahrainConditions | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [departureOffset, setDepartureOffset] = useState(0);
  const [detailNameDraft, setDetailNameDraft] = useState("");
  const [locationPermission, setLocationPermission] =
    useState<PermissionStatus>("undetermined");
  const [nbhEntryDistanceKm, setNbhEntryDistanceKm] = useState<number | null>(
    null,
  );
  const [recordingOnlyRide, setRecordingOnlyRide] = useState(false);
  const [stravaMessage, setStravaMessage] = useState("");
  const matchingToken = useRef(0);
  const generationIndex = useRef(0);
  const lastGeneratedAt = useRef(0);
  const activityWriteInFlight = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const t = copy[language];
  const rtl = language === "ar";
  const locale = localeForLanguage(language);
  const distanceDisplay = useMemo(
    () =>
      createDistanceDisplay({
        unit: preferences.distanceUnit,
        distanceLabels: { km: t.km, mi: t.mi },
        speedLabels: { km: t.speedUnit, mi: t.speedUnitMiles },
        formatNumber: (value, options) => formatNumber(value, locale, options),
      }),
    [
      locale,
      preferences.distanceUnit,
      t.km,
      t.mi,
      t.speedUnit,
      t.speedUnitMiles,
    ],
  );
  const routeLayerDistanceDisplays = useMemo(
    () => ({
      en: createDistanceDisplay({
        unit: preferences.distanceUnit,
        distanceLabels: { km: copy.en.km, mi: copy.en.mi },
        speedLabels: {
          km: copy.en.speedUnit,
          mi: copy.en.speedUnitMiles,
        },
        formatNumber: (value, options) =>
          formatNumber(value, localeForLanguage("en"), options),
      }),
      ar: createDistanceDisplay({
        unit: preferences.distanceUnit,
        distanceLabels: { km: copy.ar.km, mi: copy.ar.mi },
        speedLabels: {
          km: copy.ar.speedUnit,
          mi: copy.ar.speedUnitMiles,
        },
        formatNumber: (value, options) =>
          formatNumber(value, localeForLanguage("ar"), options),
      }),
    }),
    [preferences.distanceUnit],
  );
  const palette = theme === "light" ? LIGHT : DARK;
  const screenStyles = useMemo(
    () => createScreenStyles(palette, rtl),
    [palette, rtl],
  );
  const shellStyles = useMemo(
    () => createShellStyles(palette, rtl),
    [palette, rtl],
  );
  const hour12 = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions()
        .hour12 ?? language === "en",
    [language, locale],
  );
  const uiText = (key: string, fallback: string) =>
    screenText(t, key, fallback);
  const targetDistanceInputUnit = useRef<DistanceUnit>("km");

  useEffect(() => {
    const nextUnit = preferences.distanceUnit;
    const previousUnit = targetDistanceInputUnit.current;
    if (nextUnit === previousUnit) return;

    const enteredValue = Number(targetDistanceInput);
    if (Number.isFinite(enteredValue)) {
      const canonicalKm = kilometresFromDisplayValue(
        enteredValue,
        previousUnit,
      );
      setTargetDistanceInput(distanceDisplay.formatDistanceValue(canonicalKm));
    }
    targetDistanceInputUnit.current = nextUnit;
  }, [distanceDisplay, preferences.distanceUnit, targetDistanceInput]);

  const showAppAlert = (
    title: string,
    message: string,
    buttons?: AppAlertButton[],
  ) => {
    if (Platform.OS !== "web") {
      if (buttons) Alert.alert(title, message, buttons);
      else Alert.alert(title, message);
      return;
    }

    const webButtons = buttons?.length
      ? buttons
      : [{ text: t.done, style: "cancel" as const }];
    setWebAlert({
      title,
      message,
      buttons: webButtons.map((button) => ({
        ...button,
        onPress: () => {
          setWebAlert(null);
          button.onPress?.();
        },
      })),
    });
  };

  const catalogRecords = useMemo(
    () =>
      ROUTE_ALTERNATIVES.map((route) =>
        routeRecordFromPlan(route, {
          origin: "pilot",
          ownership: "catalog",
          geometry: {
            kind: "recorded_trace",
            status: "ready",
            source: "Supplied route preview geometry",
          },
          roadEvidenceStatus: "pilot_pending",
          provenance: { source: route.source, sourceId: route.id },
          revision: 1,
          familyId: route.familyId,
          variantId: route.variantId,
          revisionId: route.revisionId,
        }),
      ),
    [],
  );
  const allRecords = useMemo(() => {
    const byId = new Map<string, RouteRecord>();
    [
      ...catalogRecords,
      ...storedRouteRecords,
      ...Object.values(workingRecords),
    ].forEach((route) => byId.set(route.id, route));
    return [...byId.values()];
  }, [catalogRecords, storedRouteRecords, workingRecords]);
  const recordById = (id: string | null | undefined) =>
    id ? (allRecords.find((route) => route.id === id) ?? null) : null;
  const selectedRecord = recordById(selectedRouteId);
  const homeRecord = selectedRecord;
  const confirmedRecord = recordById(confirmedRouteId);
  const detailRecord = recordById(detailRouteId);

  useEffect(() => {
    void fontsLoaded;
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = directionForLanguage(language);
      document.documentElement.style.setProperty("font-synthesis", "none");
    }
  }, [fontsLoaded, language]);
  useEffect(() => {
    let active = true;
    void loadAppPreferences()
      .then((stored) => {
        if (!active) return;
        setPreferences(stored);
        setLanguage(stored.language);
        setTheme(stored.theme);
        setPreferencesHydrated(true);
      })
      .catch(() => {
        if (active) setPreferencesHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.all([
      AsyncStorage.getItem(ROUTE_STORAGE_V2_KEY),
      AsyncStorage.getItem(ROUTE_STORAGE_V1_KEY),
    ])
      .then(async ([v2, v1]) => {
        if (!active) return;
        const readOptions = {
          catalogRouteIds: ROUTE_ALTERNATIVES.map((route) => route.id),
          catalogSources: ["Bahrain Tourism"],
        };
        const v2Loaded = v2 && isValidRouteStoragePayload(v2)
          ? readStoredRouteRecords(v2, readOptions)
          : null;
        const v1Loaded = v1 && isValidRouteStoragePayload(v1)
          ? readStoredRouteRecords(v1, readOptions)
          : null;
        const loaded =
          v2Loaded && v2Loaded.sourceVersion !== null
            ? v2Loaded
            : v1Loaded && v1Loaded.sourceVersion !== null
              ? v1Loaded
              : !v2 && !v1
                ? { routes: [], migrated: false, sourceVersion: null }
                : null;
        if (!loaded) {
          // Do not turn an unreadable store into an empty write. Keep the
          // in-memory catalog usable, but leave persistence disabled until a
          // later explicit write or reload can establish a valid store.
          setRoutesHydrated(true);
          setRouteStorageReady(false);
          return;
        }
        setStoredRouteRecords((current) =>
          uniqueRecords([...loaded.routes, ...current]),
        );
        if (!v2 && v1 && loaded.migrated)
          await AsyncStorage.setItem(
            ROUTE_STORAGE_V2_KEY,
            serializeStoredRouteRecords(loaded.routes),
          );
        if (active) {
          setRoutesHydrated(true);
          setRouteStorageReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setRoutesHydrated(true);
          setRouteStorageReady(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (routesHydrated && routeStorageReady)
      void AsyncStorage.setItem(
        ROUTE_STORAGE_V2_KEY,
        serializeStoredRouteRecords(storedRouteRecords),
      ).catch(() => undefined);
  }, [routeStorageReady, routesHydrated, storedRouteRecords]);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(ACTIVITY_STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw && !isValidActivityStorage(raw)) {
          setActivitiesHydrated(true);
          setActivityStorageReady(false);
          return;
        }
        setStoredActivities((current) =>
          uniqueActivities([...parseActivities(raw), ...current]),
        );
        setActivitiesHydrated(true);
        setActivityStorageReady(true);
      })
      .catch(() => {
        if (active) {
          setActivitiesHydrated(true);
          setActivityStorageReady(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(ACTIVITY_PENDING_STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        const pending = parseActivities(raw).find(
          (activity) =>
            activity.completionState === "draft" ||
            activity.completionState === "save_failed",
        );
        if (pending) setCompletionDraftView(pending);
        setPendingDraftHydrated(true);
      })
      .catch(() => {
        if (active) setPendingDraftHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (activitiesHydrated && activityStorageReady)
      void AsyncStorage.setItem(
        ACTIVITY_STORAGE_KEY,
        serializeActivities(storedActivities),
      ).catch(() => undefined);
  }, [activitiesHydrated, activityStorageReady, storedActivities]);
  useEffect(() => {
    if (!activitiesHydrated || !pendingDraftHydrated) return;
    const draft = completionDraftView;
    if (
      !draft ||
      draft.completionState === "saved" ||
      draft.completionState === "discarded"
    ) {
      void AsyncStorage.removeItem(ACTIVITY_PENDING_STORAGE_KEY).catch(
        () => undefined,
      );
      return;
    }
    void AsyncStorage.setItem(
      ACTIVITY_PENDING_STORAGE_KEY,
      serializeActivities([draft]),
    ).catch(() => undefined);
  }, [activitiesHydrated, pendingDraftHydrated, completionDraftView]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab, detailRouteId, settingsOpen]);
  useEffect(() => {
    if (detailRecord)
      setDetailNameDraft(
        localizeName(detailRecord.name, detailRecord.nameAr, language),
      );
  }, [detailRecord?.id, detailRecord?.revision, language]);

  const commitPreferences = (patch: Partial<AppPreferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    setLanguage(next.language);
    setTheme(next.theme);
    void saveAppPreferences(next).catch(() => undefined);
  };
  const updateLanguage = (next: Language) =>
    commitPreferences({ language: next });
  const updateTheme = (next: "light" | "dark") =>
    commitPreferences({ theme: next });
  const openPrivacy = () => showAppAlert(t.privacySources, t.privacyCopy);
  const requestLocationPermission = async () => {
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      const status =
        result.status === "granted"
          ? "granted"
          : result.status === "denied"
            ? "denied"
            : "undetermined";
      setLocationPermission(status);
      if (status === "denied")
        await Linking.openSettings().catch(() => undefined);
    } catch {
      setLocationPermission("undetermined");
    }
  };
  const exportData = async () => {
    const payload = JSON.stringify(
      {
        version: 2,
        exportedAt: new Date().toISOString(),
        preferences,
        routes: storedRouteRecords,
        activities: storedActivities,
      },
      null,
      2,
    );
    if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) {
      showAppAlert(
        t.privacySources,
        uiText(
          "exportUnavailable",
          "Export is not available on this device right now.",
        ),
      );
      return;
    }
    const uri = `${FileSystem.cacheDirectory}naseem-export-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(uri, payload, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(uri, {
      mimeType: "application/json",
      dialogTitle:
        language === "ar" ? "تصدير بيانات نسيم" : "Export Naseem data",
    });
  };
  const deleteSavedRoutes = () => {
    setRideStartIntent(null);
    setStoredRouteRecords([]);
    setStoredActivities([]);
    setRouteStorageReady(true);
    setActivityStorageReady(true);
    setSelectedRouteId(null);
    setConfirmedRouteId(null);
    setDetailRouteId(null);
    void Promise.all([
      AsyncStorage.removeItem(ROUTE_STORAGE_V1_KEY),
      AsyncStorage.removeItem(ACTIVITY_PENDING_STORAGE_KEY),
    ]).catch(() => undefined);
    setRouteMessage(
      uiText("deleteDone", "Saved personal routes removed from this device."),
    );
  };
  const saveOnboarding = async (data: OnboardingData, skipped = false) => {
    const next: AppPreferences = {
      ...preferences,
      onboardingComplete: true,
      displayName:
        skipped && !data.displayName.trim()
          ? preferences.displayName
          : data.displayName.trim(),
      experience:
        skipped && !data.experience ? preferences.experience : data.experience,
      goals: skipped && !data.goals.length ? preferences.goals : data.goals,
      preferredWindow:
        skipped && !data.preferredWindow
          ? preferences.preferredWindow
          : data.preferredWindow,
      windPreference: data.windPreference,
      distanceUnit: data.distanceUnit,
      ridingFocus: data.goals.includes("train")
        ? "fitness"
        : data.goals.includes("discover")
          ? "explore"
          : "road",
      locationExplainerSeen:
        data.privacyAcknowledged || preferences.locationExplainerSeen,
    };
    setPreferences(next);
    setLanguage(next.language);
    setTheme(next.theme);
    setEditingOnboarding(false);
    await saveAppPreferences(next);
  };

  const departureDay = useMemo(
    () =>
      Date.now() <= new Date(departureInstant("today")).getTime()
        ? "today"
        : "tomorrow",
    [],
  );
  const baseDepartureAt = useMemo(
    () => departureInstant(departureDay),
    [departureDay],
  );
  const departureAt = useMemo(
    () =>
      new Date(
        new Date(baseDepartureAt).getTime() + departureOffset * 60_000,
      ).toISOString(),
    [baseDepartureAt, departureOffset],
  );
  const formatAppTime = (instant: string) =>
    formatBahrainTime(instant, locale, { hour12 }).replace(
      /\s(?=(?:AM|PM|ص|م)$)/,
      "\u00a0",
    );
  const liveFormatDistance = useCallback(
    (value: number) => distanceDisplay.formatDistance(value),
    [distanceDisplay],
  );
  const liveFormatTime = useCallback(
    (instant: string) => formatAppTime(instant),
    [hour12, locale],
  );
  const liveFormatAccuracy = useCallback(
    (value: number) =>
      `${formatNumber(value, locale, { maximumFractionDigits: 0 })} ${t.meters}`,
    [locale, t.meters],
  );
  const departureLabel = formatAppTime(departureAt);
  const departureChoices = [-20, 0, 20].map((value) => ({
    value,
    label: formatAppTime(
      new Date(
        new Date(baseDepartureAt).getTime() + value * 60_000,
      ).toISOString(),
    ),
    selected: value === departureOffset,
  }));
  const windowTitle = (
    departureDay === "today"
      ? uiText("forecastContextToday", "Forecast context today · {time}")
      : uiText("forecastContextTomorrow", "Forecast context tomorrow · {time}")
  ).replace("{time}", departureLabel);
  const departureWind = useMemo(
    () => windForDeparture(conditions, new Date(departureAt)),
    [conditions, departureAt],
  );
  const homeAnalysisResult = useMemo(
    () =>
      analyseSurfaceRecord(
        homeRecord,
        departureAt,
        departureWind,
        conditions?.hourly ?? [],
        conditions?.fetchedAt,
        conditions?.source,
      ),
    [
      homeRecord,
      departureAt,
      departureWind,
      conditions?.hourly,
      conditions?.fetchedAt,
      conditions?.source,
    ],
  );
  const detailAnalysisResult = useMemo(
    () =>
      analyseSurfaceRecord(
        detailRecord,
        departureAt,
        departureWind,
        conditions?.hourly ?? [],
        conditions?.fetchedAt,
        conditions?.source,
      ),
    [
      detailRecord,
      departureAt,
      departureWind,
      conditions?.hourly,
      conditions?.fetchedAt,
      conditions?.source,
    ],
  );

  const refresh = async () => {
    const weatherPoint = homeRecord?.points[0] ?? BAHRAIN_CENTER;
    setRefreshing(true);
    try {
      setConditions(
        await getBahrainConditions(
          weatherPoint.latitude,
          weatherPoint.longitude,
        ),
      );
    } catch {
      setConditions(null);
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, [homeRecord?.id]);

  const updateWorkingRecord = (record: RouteRecord) =>
    setWorkingRecords((current) => ({ ...current, [record.id]: record }));
  const matchRecord = async (
    record: RouteRecord,
  ): Promise<RouteRecord | null> => {
    const token = ++matchingToken.current;
    // A failed review is recoverable. Re-open it as a draft before asking the
    // router again; beginRouteMatching intentionally rejects unavailable
    // geometry so the lifecycle cannot accidentally treat a failed response as
    // ready.
    const retryableRecord =
      record.geometry.status === "unavailable"
        ? {
            ...record,
            geometry: {
              kind: "waypoint_trace" as const,
              status: "draft" as const,
              coordinates: record.points.map(({ latitude, longitude }) => ({
                latitude,
                longitude,
              })),
            },
            analysis: undefined,
          }
        : record;
    const matching = beginRouteMatching(retryableRecord);
    if (matching.state !== "matching") {
      if ("route" in matching) {
        updateWorkingRecord(matching.route);
        return matching.route;
      }
      return null;
    }
    updateWorkingRecord(matching.route);
    const result = await resolveRoadGeometryDetailed(
      routePlanFromRecord(matching.route),
    );
    if (token !== matchingToken.current) return null;
    if (result.ok) {
      const ready = routeMatchingSucceeded(matching.route, result.route);
      if (ready.state === "trace-ready") {
        updateWorkingRecord(ready.route);
        return ready.route;
      }
    }
    const failed = routeMatchingFailed(
      matching.route,
      result.ok ? "invalidResponse" : result.reason,
    );
    updateWorkingRecord(failed.route);
    return failed.route;
  };

  const makePlannerPoint = (
    coordinate: Coordinate,
    field: "start" | "destination",
    name?: string,
  ) => ({
    ...coordinate,
    name: name || (field === "start" ? "Start" : "Destination"),
    nameAr: name || (field === "start" ? "البداية" : "الوجهة"),
  });
  const matchPlanner = async (
    start: BuilderRouteState["start"],
    destination: BuilderRouteState["destination"],
  ) => {
    if (!start || !destination) return;
    const plan = routeFromCoordinates(
      `planned-${Date.now()}`,
      `${start.name} → ${destination.name}`,
      [start, destination],
      "Naseem planner",
    );
    if (!plan) {
      setBuilder((current) => ({
        ...current,
        status: "failed",
        route: null,
        error: t.routeMatchFailure,
      }));
      return;
    }
    const draftRecord = routeRecordFromPlan(plan, {
      origin: "drawn",
      ownership: "personal",
      geometry: { kind: "waypoint_trace", status: "draft" },
      roadEvidenceStatus: "unknown",
      provenance: {
        source: "Naseem planner",
        createdAt: new Date().toISOString(),
      },
      revision: 1,
    });
    const matching = beginRouteMatching(draftRecord);
    if (matching.state !== "matching") {
      if ("route" in matching)
        setBuilder({
          status: "failed",
          start,
          destination,
          route: viewForRecord(matching.route, language),
          error: t.routeMatchFailure,
        });
      return;
    }
    setBuilder({
      status: "matching",
      start,
      destination,
      route: viewForRecord(matching.route, language),
    });
    const token = ++matchingToken.current;
    const result = await resolveRoadGeometryDetailed(plan);
    if (token !== matchingToken.current) return;
    if (result.ok) {
      const analyzedPlan = analyseRoute(
        result.route,
        26,
        0,
        departureWind,
        conditions?.hourly ?? [],
        new Date(departureAt),
      );
      const ready = routeMatchingSucceeded(matching.route, analyzedPlan);
      if (ready.state === "trace-ready") {
        const analyzedRecord = recordWithAnalysis(ready.route, analyzedPlan);
        updateWorkingRecord(analyzedRecord);
        setBuilder({
          status: "ready",
          start,
          destination,
          route: viewForRecord(analyzedRecord, language),
        });
        return;
      }
    }
    const failed = routeMatchingFailed(
      matching.route,
      result.ok ? "invalidResponse" : result.reason,
    );
    updateWorkingRecord(failed.route);
    setBuilder({
      status: "failed",
      start,
      destination,
      route: viewForRecord(failed.route, language),
      error: t.routeMatchFailure,
    });
  };
  const choosePlannerPoint = (
    field: "start" | "destination",
    point: {
      latitude: number;
      longitude: number;
      name: string;
      nameAr?: string;
    },
  ) => {
    const nextPoint = makePlannerPoint(point, field, point.name);
    const nextStart = field === "start" ? nextPoint : builder.start;
    const nextDestination =
      field === "destination" ? nextPoint : builder.destination;
    if (field === "start") setStartText(nextPoint.name);
    else setDestinationText(nextPoint.name);
    setActiveField(
      field === "start" && !nextDestination ? "destination" : null,
    );
    if (!nextStart && !nextDestination)
      setBuilder({
        status: "empty",
        start: null,
        destination: null,
        route: null,
      });
    else if (nextStart && nextDestination)
      void matchPlanner(nextStart, nextDestination);
    else
      setBuilder({
        status: "start-selected",
        start: nextStart,
        destination: nextDestination,
        route: null,
      });
  };
  const updatePlannerText = (field: "start" | "destination", value: string) => {
    if (field === "start") setStartText(value);
    else setDestinationText(value);
    if (!value.trim()) {
      const start = field === "start" ? null : builder.start;
      const destination = field === "destination" ? null : builder.destination;
      setBuilder({
        status: start ? "start-selected" : "empty",
        start,
        destination,
        route: null,
      });
      setActiveField(field);
    }
  };
  const mapPlannerPress = (coordinate: Coordinate) => {
    if (manualMode) {
      setManualRedo([]);
      setManualPoints((current) => [...current, coordinate]);
      return;
    }
    const field = activeField ?? (builder.start ? "destination" : "start");
    choosePlannerPoint(
      field,
      makePlannerPoint(
        coordinate,
        field,
        field === "start" ? "Map start" : "Map destination",
      ),
    );
  };
  const useCurrentLocation = async (field: "start" | "destination") => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setRouteMessage(t.permissionDenied);
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinate = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      choosePlannerPoint(
        field,
        makePlannerPoint(
          coordinate,
          field,
          field === "start" ? "Current location" : "Current destination",
        ),
      );
    } catch {
      setRouteMessage(
        uiText(
          "locationUnavailable",
          "Current location is unavailable. Choose a point on the map or search again.",
        ),
      );
    }
  };
  const beginConnectFromLocation = (route: RouteRecord | null) => {
    if (!route || !routeIsNavigable(viewForRecord(route, language))) {
      setRouteMessage(
        uiText(
          "previewOnlyRideCopy",
          "Review this route first. A route-following ride becomes available after the road check is complete.",
        ),
      );
      return;
    }
    setRecordingOnlyRide(false);
    setSelectedRouteId(route.id);
    setConfirmedRouteId(route.id);
    setDetailRouteId(null);
    if (route.id === NBH_LOOP.id) setNbhEntryDistanceKm(null);
    setRideStartIntent({
      routeId: route.id,
      mode: "connect",
      phase: "queued",
    });
    setRouteMessage("");
    setTab("ride");
  };
  const connectFromCurrentLocation = () =>
    beginConnectFromLocation(recordById(NBH_LOOP.id));
  const connectConfirmedRouteFromLocation = () =>
    beginConnectFromLocation(confirmedRecord);
  const startNbhAtEntry = () => {
    const nbh = recordById(NBH_LOOP.id);
    if (!nbh || !routeIsNavigable(viewForRecord(nbh, language))) {
      setRouteMessage(
        uiText(
          "previewOnlyRideCopy",
          "Review this route first. A route-following ride becomes available after the road check is complete.",
        ),
      );
      return;
    }
    setRideStartIntent(null);
    setRecordingOnlyRide(false);
    setSelectedRouteId(NBH_LOOP.id);
    setConfirmedRouteId(NBH_LOOP.id);
    setTab("ride");
  };
  const recordWithoutFollowingNbh = () => {
    setRideStartIntent(null);
    setRecordingOnlyRide(true);
    setSelectedRouteId(null);
    setConfirmedRouteId(null);
    setDetailRouteId(null);
    setTab("ride");
  };
  const retryPlannerMatch = () => {
    if (builder.start && builder.destination)
      void matchPlanner(builder.start, builder.destination);
  };
  const editPlannerPoints = () =>
    setBuilder((current) => ({
      ...current,
      status: current.start ? "start-selected" : "empty",
      route: null,
    }));
  const reversePlanner = () => {
    if (!builder.start || !builder.destination) return;
    const start = builder.destination;
    const destination = builder.start;
    setStartText(start.name);
    setDestinationText(destination.name);
    setActiveField(null);
    void matchPlanner(start, destination);
  };

  const manualRoute = useMemo(
    () =>
      manualPoints.length
        ? draftRouteFromCoordinates(
            `drawn-draft-${manualPoints.length}`,
            language === "ar" ? "مسار مرسوم" : "Drawn route",
            manualPoints,
            language === "ar" ? "مرسوم على الجهاز" : "Drawn on device",
          )
        : null,
    [language, manualPoints],
  );
  const openManual = () => {
    setManualMode(true);
    setManualPoints([]);
    setManualRedo([]);
    setRouteMessage("");
  };
  const cancelManual = () => {
    setManualMode(false);
    setManualPoints([]);
    setManualRedo([]);
  };
  const undoManual = () => {
    if (!manualPoints.length) return;
    const next = [...manualPoints];
    const point = next.pop();
    if (point) setManualRedo((current) => [...current, point]);
    setManualPoints(next);
  };
  const redoManual = () => {
    const next = [...manualRedo];
    const point = next.pop();
    if (point) setManualPoints((current) => [...current, point]);
    setManualRedo(next);
  };
  const clearManual = () => {
    setManualRedo([...manualPoints].reverse());
    setManualPoints([]);
  };
  const doneManual = () => {
    setManualMode(false);
    setRouteMessage(t.straightLineWarning);
  };
  const removeManualPoint = (index: number) =>
    setManualPoints((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  const moveManualPoint = (index: number, direction: -1 | 1) => {
    setManualRedo([]);
    setManualPoints((current) => {
      const target = index + direction;
      if (
        index < 0 ||
        index >= current.length ||
        target < 0 ||
        target >= current.length
      )
        return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const importGpx = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/gpx+xml", "text/xml", "application/octet-stream"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const gpx = asset.file
        ? await asset.file.text()
        : await FileSystem.readAsStringAsync(asset.uri);
      const parsed = parseGpxDetailed(gpx);
      if (parsed.error === "tooLarge" || parsed.error === "tooManyPoints") {
        setRouteMessage(
          uiText("importTooLarge", "This GPX is too large to review here."),
        );
        return;
      }
      if (parsed.invalidCount > 0) {
        setRouteMessage(
          uiText(
            "importInvalid",
            "Some GPX points are invalid. Review the file and try again.",
          ),
        );
        return;
      }
      const validation = validateRouteCoordinates(parsed.coordinates);
      if (validation === "outsideCoverage") {
        setRouteMessage(t.routeOutsideCoverage);
        return;
      }
      if (validation === "tooLong") {
        setRouteMessage(t.routeTooLong);
        return;
      }
      if (validation === "legTooLong") {
        setRouteMessage(t.routeLegTooLong);
        return;
      }
      const name =
        asset.name?.replace(/\.[^/.]+$/, "") ||
        uiText("importedRoute", "Imported route");
      const imported = routeFromCoordinates(
        `gpx-${Date.now()}`,
        name,
        parsed.coordinates,
        "GPX import",
      );
      if (!imported) {
        setRouteMessage(uiText("importError", "We could not read this GPX."));
        return;
      }
      const record = routeRecordFromPlan(imported, {
        origin: "gpx",
        ownership: "personal",
        geometry: {
          kind: "recorded_trace",
          status: "ready",
          source: "GPX import",
        },
        roadEvidenceStatus: "unknown",
        provenance: {
          source: "GPX import",
          sourceId: asset.name,
          importedAt: new Date().toISOString(),
        },
        revision: 1,
      });
      updateWorkingRecord(record);
      setImportReview(viewForRecord(record, language));
      setImportReviewFileName(asset.name || name);
      setRouteMessage(t.importReady);
    } catch {
      setRouteMessage(uiText("importError", "We could not read this GPX."));
    }
  };
  const saveRecord = (record: RouteRecord) => {
    setStoredRouteRecords((current) => upsertRecords(current, record));
    updateWorkingRecord(record);
  };
  const useImport = () => {
    if (!importReview) return;
    const record =
      recordById(importReview.id) ??
      recordFromView(
        importReview,
        "gpx",
        "personal",
        "recorded_trace",
        "ready",
      );
    const saved = savePersonalRoute(record);
    if ("route" in saved) {
      setRideStartIntent(null);
      setRecordingOnlyRide(false);
      saveRecord(saved.route);
      setSelectedRouteId(saved.route.id);
      setDetailRouteId(saved.route.id);
      setImportReview(null);
      setTab("plan");
    }
  };
  const generateLoop = async () => {
    if (!builder.start) {
      setRouteMessage(
        uiText("generatorNeedsStart", "Add a Start before generating a loop."),
      );
      return;
    }
    const enteredTarget = Number(targetDistanceInput);
    const target = Number.isFinite(enteredTarget)
      ? kilometresFromDisplayValue(enteredTarget, preferences.distanceUnit)
      : Number.NaN;
    if (!Number.isFinite(target) || target < 5 || target > 80) {
      setRouteMessage(
        uiText(
          "generatorTargetError",
          "Enter a target distance between {min} and {max}.",
        )
          .replace("{min}", distanceDisplay.formatDistance(5))
          .replace("{max}", distanceDisplay.formatDistance(80)),
      );
      return;
    }
    if (Date.now() - lastGeneratedAt.current < GENERATION_COOLDOWN_MS) {
      setRouteMessage(
        uiText(
          "generationLimited",
          "Please wait before generating another loop.",
        ),
      );
      return;
    }
    lastGeneratedAt.current = Date.now();
    const template =
      SMART_LOOP_TEMPLATES[
        generationIndex.current % SMART_LOOP_TEMPLATES.length
      ];
    generationIndex.current += 1;
    const offset = {
      latitude: builder.start.latitude - template.points[0].latitude,
      longitude: builder.start.longitude - template.points[0].longitude,
    };
    const shifted = template.points.map((point) => ({
      latitude: point.latitude + offset.latitude,
      longitude: point.longitude + offset.longitude,
    }));
    const candidate = routeFromCoordinates(
      `generated-${Date.now()}`,
      `${template.name} · ${distanceDisplay.formatDistance(target)} target`,
      shifted,
      "Generated route candidate",
    );
    if (!candidate) {
      setRouteMessage(
        uiText(
          "generatedUnavailable",
          "This loop could not be generated in Bahrain coverage.",
        ),
      );
      return;
    }
    setRouteMessage(t.mapWebLoading);
    const record = routeRecordFromPlan(candidate, {
      origin: "generated",
      ownership: "personal",
      geometry: { kind: "waypoint_trace", status: "draft" },
      roadEvidenceStatus: "unknown",
      provenance: {
        source: "Generated route candidate",
        createdAt: new Date().toISOString(),
      },
      revision: 1,
    });
    const matched = await matchRecord(record);
    if (
      !matched ||
      matched.geometry.kind !== "road_matched" ||
      matched.geometry.status !== "ready"
    ) {
      setRouteMessage(
        uiText(
          "generatedUnavailable",
          "This loop could not be matched to mapped roads.",
        ),
      );
      return;
    }
    const generated = {
      ...viewForRecord(matched, language),
      nameAr: template.nameAr,
    };
    updateWorkingRecord({ ...matched, nameAr: template.nameAr });
    setGeneratedReview(generated);
    setRouteMessage("");
  };
  const useGenerated = () => {
    if (!generatedReview) return;
    const record =
      recordById(generatedReview.id) ??
      recordFromView(
        generatedReview,
        "generated",
        "personal",
        "road_matched",
        "ready",
      );
    const saved = savePersonalRoute(record);
    if ("route" in saved) {
      setRideStartIntent(null);
      setRecordingOnlyRide(false);
      saveRecord(saved.route);
      setSelectedRouteId(saved.route.id);
      setConfirmedRouteId(saved.route.id);
      setGeneratedReview(null);
      setTab("ride");
    }
  };

  const openRouteDetail = (route: RoutePlan) => {
    setRideStartIntent(null);
    setRecordingOnlyRide(false);
    if (confirmedRouteId !== route.id) setConfirmedRouteId(null);
    setSelectedRouteId(route.id);
    setDetailRouteId(route.id);
    setTab("plan");
    const record = recordById(route.id);
    if (record && shouldAutoMatchRouteReview(record))
      void matchRecord(record);
  };
  const selectRoute = (route: RoutePlan) => {
    openRouteDetail(route);
  };
  const editRoutePoints = (record: RouteRecord | null) => {
    if (!record || record.points.length < 2) return;
    const start = makePlannerPoint(
      record.points[0],
      "start",
      record.points[0].name,
    );
    const destination = makePlannerPoint(
      record.points[record.points.length - 1],
      "destination",
      record.points[record.points.length - 1].name,
    );
    setBuilder({ status: "start-selected", start, destination, route: null });
    setStartText(start.name);
    setDestinationText(destination.name);
    setActiveField("destination");
    setDetailRouteId(null);
    setTab("plan");
  };
  const detailRetry = () => {
    if (detailRecord && shouldAutoMatchRouteReview(detailRecord))
      void matchRecord(detailRecord);
  };
  const detailAddStop = () => {
    editRoutePoints(detailRecord);
    setActiveField("destination");
  };
  const detailReverse = () => {
    if (!detailRecord) return;
    const reversed = [...detailRecord.points].reverse();
    const start = makePlannerPoint(reversed[0], "start", reversed[0].name);
    const destination = makePlannerPoint(
      reversed[reversed.length - 1],
      "destination",
      reversed[reversed.length - 1].name,
    );
    setBuilder({ status: "start-selected", start, destination, route: null });
    setStartText(start.name);
    setDestinationText(destination.name);
    setActiveField("destination");
    setDetailRouteId(null);
    setTab("plan");
  };
  const saveDetail = () => {
    if (!detailRecord || !detailNameDraft.trim()) return;
    const raw = routePlanFromRecord(detailRecord);
    const nextPlan = {
      ...raw,
      name: language === "ar" ? raw.name : detailNameDraft.trim(),
      ...(language === "ar" ? { nameAr: detailNameDraft.trim() } : {}),
    };
    const nextRecord = routeRecordFromPlan(nextPlan, {
      origin: detailRecord.origin,
      ownership: detailRecord.ownership,
      geometry: {
        kind: detailRecord.geometry.kind,
        status: detailRecord.geometry.status,
        source: detailRecord.geometry.source,
      },
      roadEvidenceStatus: detailRecord.roadEvidenceStatus,
      provenance: detailRecord.provenance,
      revision: detailRecord.revision,
      familyId: detailRecord.familyId,
      variantId: detailRecord.variantId,
      revisionId: detailRecord.revisionId,
    });
    const saved = savePersonalRoute(nextRecord);
    if ("route" in saved) {
      setRecordingOnlyRide(false);
      saveRecord(saved.route);
      setSelectedRouteId(saved.route.id);
      setDetailRouteId(null);
    }
  };
  const useDetailRoute = () => {
    if (
      !detailRecord ||
      !routeIsNavigable(viewForRecord(detailRecord, language))
    )
      return;
    setRideStartIntent(null);
    setRecordingOnlyRide(false);
    setSelectedRouteId(detailRecord.id);
    setConfirmedRouteId(detailRecord.id);
    setDetailRouteId(null);
    setTab("ride");
  };

  const confirmedAnalysisResult = useMemo(
    () =>
      analyseSurfaceRecord(
        confirmedRecord,
        departureAt,
        departureWind,
        conditions?.hourly ?? [],
        conditions?.fetchedAt,
        conditions?.source,
      ),
    [
      confirmedRecord,
      departureAt,
      departureWind,
      conditions?.hourly,
      conditions?.fetchedAt,
      conditions?.source,
    ],
  );
  const rideRecordForHook = useMemo(
    () =>
      confirmedRecord
        ? recordWithAnalysis(
            confirmedRecord,
            confirmedAnalysisResult?.plan ??
              displayPlanForRecord(
                confirmedRecord,
                language,
                departureAt,
                departureWind,
                conditions?.hourly,
                conditions?.fetchedAt,
                conditions?.source,
              ),
            confirmedAnalysisResult?.run,
          )
        : null,
    [
      confirmedRecord,
      language,
      departureAt,
      departureWind,
      conditions?.hourly,
      conditions?.fetchedAt,
      conditions?.source,
      confirmedAnalysisResult,
    ],
  );
  const rideAnalysisResult = confirmedAnalysisResult;
  const ridePlan = useMemo(
    () =>
      (rideAnalysisResult?.plan
        ? localizePlanForRecord(
            rideRecordForHook!,
            rideAnalysisResult.plan,
            language,
          )
        : null) ??
      (rideRecordForHook
        ? displayPlanForRecord(
            rideRecordForHook,
            language,
            departureAt,
            departureWind,
            conditions?.hourly,
            conditions?.fetchedAt,
            conditions?.source,
          )
        : null),
    [
      rideRecordForHook,
      rideAnalysisResult,
      language,
      departureAt,
      departureWind,
      conditions?.hourly,
      conditions?.fetchedAt,
      conditions?.source,
    ],
  );
  const live = useLiveRideSession({
    route: ridePlan,
    routeRecord: rideRecordForHook,
    recordingOnly: recordingOnlyRide,
    messages: {
      waiting: t.liveStatusIdle,
      permissionStart: t.permissionExplanation,
      permissionRecord: t.recordingPermission,
      endConfirmation: t.endRideConfirmCopy,
      recordingOnlyEndConfirmation: t.recordingOnlyEndCopy,
      liveActive: t.liveCopy,
      recordingActive: t.recordingOnlyActive,
      liveStarted: t.liveStarted,
      recordingStarted: t.recordingOnlyStarted,
      permissionDeniedRecovery: t.permissionDeniedRecovery,
      routeNotReady: t.liveRouteNotReady,
      roadEvidenceReview: t.liveRoadEvidenceReview,
      roadMatchedRequired: t.liveRoadMatchedRequired,
      liveEnded: t.liveEnded,
      recordingEnded: t.recordingOnlyEnded,
      locationUpdatesStopped: uiText(
        "locationUpdatesStopped",
        "Location updates stopped. Your recording is still here; retry access or end the ride to save it.",
      ),
    },
    analysisKey: rideRecordForHook
      ? routeAnalysisKey(rideRecordForHook, departureAt)
      : undefined,
    policy: DEFAULT_WAYPOINT_TRACE_LIVE_RIDE_POLICY,
    formatDistance: liveFormatDistance,
    formatTime: liveFormatTime,
    formatAccuracy: liveFormatAccuracy,
    onPosition: undefined,
  });
  useEffect(() => {
    if (
      !rideStartIntent ||
      rideStartIntent.phase !== "queued" ||
      tab !== "ride" ||
      confirmedRouteId !== rideStartIntent.routeId ||
      rideRecordForHook?.id !== rideStartIntent.routeId
    )
      return;
    setRideStartIntent((current) =>
      current && current.routeId === rideStartIntent.routeId
        ? { ...current, phase: "permission-explanation" }
        : current,
    );
    live.prepareStart();
  }, [
    confirmedRouteId,
    live.prepareStart,
    rideRecordForHook,
    rideStartIntent,
    tab,
  ]);
  useEffect(() => {
    if (rideStartIntent && live.state === "active")
      setRideStartIntent(null);
  }, [live.state, rideStartIntent]);
  useEffect(() => {
    const coordinate = live.position.coordinate;
    if (
      live.state !== "active" ||
      rideRecordForHook?.id !== NBH_LOOP.id ||
      !coordinate
    )
      return;
    setNbhEntryDistanceKm(distanceToRouteEntryKm(NBH_LOOP, coordinate));
  }, [
    live.position.coordinate?.latitude,
    live.position.coordinate?.longitude,
    live.state,
    rideRecordForHook?.id,
  ]);
  useEffect(() => {
    setLocationPermission(
      live.permission === "granted"
        ? "granted"
        : live.permission === "denied"
          ? "denied"
          : "undetermined",
    );
  }, [live.permission]);
  useEffect(() => {
    if (live.completionDraft) setCompletionDraftView(live.completionDraft);
  }, [live.completionDraft]);

  const writeActivity = async (activity: ActivityDraft) => {
    if (activityWriteInFlight.current) return false;
    activityWriteInFlight.current = true;
    try {
      const next = upsertActivity(storedActivities, activity);
      await AsyncStorage.setItem(
        ACTIVITY_STORAGE_KEY,
        serializeActivities(next),
      );
      setStoredActivities(next);
      setCompletionDraftView(activity);
      return true;
    } catch {
      setCompletionDraftView(markActivitySaveFailed(activity));
      return false;
    } finally {
      activityWriteInFlight.current = false;
    }
  };
  const saveCompletion = () => {
    if (completionDraftView)
      void writeActivity(markActivitySaved(completionDraftView));
  };
  const discardCompletion = () => {
    if (!completionDraftView) return;
    showAppAlert(t.discardRide, t.discardRideConfirm, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.discardRide,
        style: "destructive",
        onPress: () =>
          setCompletionDraftView(markActivityDiscarded(completionDraftView)),
      },
    ]);
  };
  const exportCompletion = async () => {
    if (!completionDraftView) return;
    const payload = JSON.stringify(completionDraftView, null, 2);
    try {
      if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) {
        showAppAlert(
          t.exportRide,
          uiText(
            "exportUnavailable",
            "Export is not available on this device right now.",
          ),
        );
        return;
      }
      const uri = `${FileSystem.cacheDirectory}${completionDraftView.id}.json`;
      await FileSystem.writeAsStringAsync(uri, payload, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(uri, {
        mimeType: "application/json",
        dialogTitle: t.exportRide,
      });
      const exported = markActivityExported(completionDraftView);
      setCompletionDraftView(exported);
      if (exported.completionState === "saved") await writeActivity(exported);
    } catch {
      showAppAlert(t.exportRide, t.saveFailed);
    }
  };

  const homePlan =
    (homeAnalysisResult?.plan
      ? localizePlanForRecord(
          homeRecord!,
          homeAnalysisResult.plan,
          language,
        )
      : null) ??
    (homeRecord
      ? displayPlanForRecord(
          homeRecord,
          language,
          departureAt,
          departureWind,
          conditions?.hourly,
          conditions?.fetchedAt,
          conditions?.source,
        )
      : null);
  const homeStatus = homeRecord ? routeStatusForRecord(homeRecord) : "draft";
  const homeLayers = homeRecord
    ? buildRouteLayers({
        route: homeRecord,
        analysis: homeAnalysisResult?.run,
        selected: true,
        distanceDisplays: routeLayerDistanceDisplays,
      })
    : [];
  const detailPlan =
    (detailAnalysisResult?.plan
      ? localizePlanForRecord(
          detailRecord!,
          detailAnalysisResult.plan,
          language,
        )
      : null) ??
    (detailRecord
      ? displayPlanForRecord(
          detailRecord,
          language,
          departureAt,
          departureWind,
          conditions?.hourly,
          conditions?.fetchedAt,
          conditions?.source,
        )
      : null);
  const detailLayers = detailRecord
    ? buildRouteLayers({
        route: detailRecord,
        analysis: detailAnalysisResult?.run,
        selected: true,
        distanceDisplays: routeLayerDistanceDisplays,
      })
    : [];
  const homeRecommendationReason = homeAnalysisResult
    ? explainSurfaceRun(homeAnalysisResult.run, t, language, distanceDisplay)
    : uiText(
        "goodWindowCopy",
        "Forecast is shown by named route segment. Comparison is paused while route/access evidence is being reviewed. This is not a safety claim.",
      );
  const detailComparisonReason = detailAnalysisResult
    ? explainSurfaceRun(detailAnalysisResult.run, t, language, distanceDisplay)
    : undefined;
  const nbhRecord = recordById(NBH_LOOP.id);
  const nbhAnalysisResult = nbhRecord
    ? analyseSurfaceRecord(
        nbhRecord,
        departureAt,
        departureWind,
        conditions?.hourly ?? [],
        conditions?.fetchedAt,
        conditions?.source,
      )
    : null;
  const nbhPlan =
    (nbhAnalysisResult?.plan
      ? localizePlanForRecord(nbhRecord!, nbhAnalysisResult.plan, language)
      : null) ??
    (nbhRecord
      ? displayPlanForRecord(
          nbhRecord,
          language,
          departureAt,
          departureWind,
          conditions?.hourly,
          conditions?.fetchedAt,
          conditions?.source,
        )
      : NBH_LOOP);
  const nbhLayers = nbhRecord
    ? buildRouteLayers({
        route: nbhRecord,
        analysis: nbhAnalysisResult?.run,
        selected: true,
        distanceDisplays: routeLayerDistanceDisplays,
      })
    : [];
  const detailVariant =
    detailRecord?.familyId === NBH_FAMILY.id
      ? NBH_FAMILY.variants.find(
          (variant) => variant.id === detailRecord.variantId,
        )
      : undefined;
  const detailIsNbh = Boolean(detailVariant);
  const detailEntryLabel = detailVariant
    ? localizeName(
        detailVariant.entry.name,
        detailVariant.entry.nameAr,
        language,
      )
    : undefined;
  const detailFinishLabel = detailVariant
    ? localizeName(
        detailVariant.finish.name,
        detailVariant.finish.nameAr,
        language,
      )
    : undefined;
  const detailVariantLabel = detailVariant
    ? localizeName(detailVariant.label, detailVariant.labelAr, language)
    : undefined;
  const detailEntryActionsEnabled = Boolean(
    detailRecord &&
    detailRecord.geometry.kind === "road_matched" &&
    detailRecord.geometry.status === "ready",
  );
  const nbhEntryDistanceLabel =
    nbhEntryDistanceKm === null
      ? undefined
      : nbhEntryDistanceKm <= 0.25
        ? t.nearNbhEntry
        : t.nbhEntryDistance.replace(
            "{distance}",
            distanceDisplay.formatDistance(nbhEntryDistanceKm),
          );
  const commonMapText = (plan: RoutePlan | null, status: RouteStatus) => ({
    native:
      status === "ready"
        ? t.mapNativeRoadMatched
        : status === "matching"
          ? t.mapWebLoading
          : t.mapNativePilot,
    nativeNeedsKey: t.mapNativeNeedsKey,
    providerUnavailable: t.mapProviderUnavailable,
    web:
      status === "ready"
        ? t.mapWebRoadMatched
        : status === "matching"
          ? t.mapWebLoading
          : t.mapWebPilot,
    tilesUnavailable: t.mapTilesUnavailable,
    gestures: t.mapGestures,
    status:
      status === "ready"
        ? ("matched" as const)
        : status === "matching"
          ? ("loading" as const)
          : ("pilot" as const),
    statusMatched: t.mapStatusMatched,
    statusLoading: t.mapStatusLoading,
    statusPilot: t.mapStatusPilot,
    fit: t.fitRoute,
    loop: t.loop,
    zoomIn: t.zoomIn,
    zoomOut: t.zoomOut,
    distanceUnit: distanceDisplay.distanceLabel,
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => {
      const isDistance =
        options?.minimumFractionDigits === 1 &&
        options?.maximumFractionDigits === 1;
      return isDistance
        ? distanceDisplay.formatDistanceValue(value, options)
        : formatNumber(value, locale, options);
    },
    mapLabel: plan ? `${plan.name} · ${uiText("route", "route")}` : t.mapWeb,
    mapHint: t.mapGestures,
    routePoints: uiText("routePoints", "Route points"),
    startPoint: uiText("startPoint", "Start"),
    startEndPoint: uiText("startEndPoint", "Start and finish"),
    destinationPoint: t.destination,
    waypoint: uiText("waypoint", "Waypoint"),
    addPoint: uiText("addPoint", "Add point"),
    addPointHint: uiText("addPointHint", "Adds a point at the map center."),
  });
  const mapText = commonMapText(homePlan, homeStatus);
  const roadLabels = {
    dedicated: t.dedicated,
    mixed: t.mixedTraffic,
    restricted: t.restricted,
    unknown: t.unknown,
  };
  const profileCollections: RouteCollection[] = [
    {
      kind: "my-routes",
      title: uiText("youSavedRoutes", "My routes"),
      description: uiText(
        "youSavedRoutesHint",
        "Personal routes stay distinct from examples and imports.",
      ),
      items: storedRouteRecords
        .filter(
          (record) =>
            record.ownership === "personal" && record.origin !== "gpx",
        )
        .map((record) => surfaceItem(record, language, t, distanceDisplay)),
      emptyLabel: uiText("youNoSavedRoutes", "No personal routes yet."),
    },
    {
      kind: "imports",
      title: uiText("youImports", "Imports"),
      description: uiText(
        "youImportsHint",
        "Imported tracks remain labeled as imports.",
      ),
      items: storedRouteRecords
        .filter((record) => record.origin === "gpx")
        .map((record) => surfaceItem(record, language, t, distanceDisplay)),
      emptyLabel: uiText("youNoImports", "No imported tracks yet."),
    },
  ];
  const position: LiveRidePosition | undefined = live.position;
  const rideLayers = rideRecordForHook
    ? buildRouteLayers({
        route: rideRecordForHook,
        analysis: rideAnalysisResult?.run,
        selected: true,
        match: live.position.match,
        distanceDisplays: routeLayerDistanceDisplays,
      })
    : [];
  const snapshot: LiveRideSnapshot | null =
    live.activeSnapshot && "route" in live.activeSnapshot
      ? {
          routeId: live.activeSnapshot.routeId,
          routeRevision: live.activeSnapshot.routeRevision,
          routeName: localizeName(
            live.activeSnapshot.route.name,
            live.activeSnapshot.route.nameAr,
            language,
          ),
          startedLabel: formatAppTime(live.activeSnapshot.startedAt),
        }
      : live.endedSnapshot && "route" in live.endedSnapshot
        ? {
            routeId: live.endedSnapshot.routeId,
            routeRevision: live.endedSnapshot.routeRevision,
            routeName: localizeName(
              live.endedSnapshot.route.name,
              live.endedSnapshot.route.nameAr,
              language,
            ),
            startedLabel: formatAppTime(live.endedSnapshot.startedAt),
          }
        : null;
  const rideStatus = rideRecordForHook
    ? routeStatusForRecord(rideRecordForHook)
    : "draft";
  const permissionMessage =
    live.state === "permission-explanation"
      ? recordingOnlyRide
        ? t.recordingPermission
        : t.permissionExplanation
      : live.state === "permission-denied"
        ? live.permissionMessage || t.permissionDeniedRecovery
        : live.permissionMessage;
  const endConfirmationMessage =
    live.state === "ending"
      ? recordingOnlyRide
        ? t.recordingOnlyEndCopy
        : t.endRideConfirmCopy
      : live.endConfirmationMessage;
  const nextSegment =
    ridePlan && live.segmentIndex >= 0
      ? ridePlan.segments[live.segmentIndex]
      : undefined;
  const matchedRouteDistance =
    live.position.match?.state === "matched"
      ? live.position.match.routeDistanceKm
      : undefined;
  const aheadSegments =
    rideAnalysisResult?.run && matchedRouteDistance !== undefined
      ? aheadWindow(rideAnalysisResult.run, matchedRouteDistance, 3)
      : [];
  const aheadLabel =
    aheadSegments.length && ridePlan && matchedRouteDistance !== undefined
      ? `${t.aheadHorizon.replace(
          "{distance}",
          formatNumber(
            Math.min(
              3,
              Math.max(0, ridePlan.distanceKm - matchedRouteDistance),
            ),
            locale,
            { minimumFractionDigits: 1, maximumFractionDigits: 1 },
          ),
        )} · ${aheadSegments
          .map((segment) =>
            localizeName(segment.name, segment.nameAr, language),
          )
          .join(" · ")}`
      : undefined;

  if (catalogMode) return <ComponentCatalog />;
  if (fontMode) return <FontCatalog />;
  if (labMode) return <UiDirectionLab />;
  if (directionsMode) return <DirectionsGallery route={NBH_LOOP} />;
  if (!preferencesHydrated) return <BootScreen palette={palette} rtl={rtl} />;
  if (!preferences.onboardingComplete || editingOnboarding)
    return (
      <View style={webAlertStyles.host}>
        <Onboarding
          palette={palette}
          language={language}
          rtl={rtl}
          initialData={{
            displayName: preferences.displayName,
            experience: preferences.experience,
            goals: preferences.goals,
            preferredWindow: preferences.preferredWindow,
            windPreference: preferences.windPreference,
            distanceUnit: preferences.distanceUnit,
            privacyAcknowledged: preferences.locationExplainerSeen,
          }}
          onComplete={(data) => void saveOnboarding(data)}
          onSkip={(data) => void saveOnboarding(data, true)}
          onOpenPrivacy={openPrivacy}
        />
        <WebAppAlert
          alert={webAlert}
          palette={palette}
          rtl={rtl}
          onDismiss={() => setWebAlert(null)}
        />
      </View>
    );

  const content = settingsOpen ? (
    <SettingsScreen
      palette={palette}
      language={language}
      theme={theme}
      profile={{
        name: preferences.displayName || (rtl ? "راكب نسيم" : "Naseem rider"),
        email: rtl ? "ملف محلي" : "Local rider profile",
        statusLabel: uiText("youProfileStatus", "Local profile"),
      }}
      locationPermission={locationPermission}
      distanceUnit={preferences.distanceUnit}
      notificationsEnabled={preferences.notificationsEnabled}
      backgroundRefreshEnabled={preferences.backgroundRefreshEnabled}
      onBack={() => setSettingsOpen(false)}
      onEditProfile={() => {
        setSettingsOpen(false);
        setEditingOnboarding(true);
      }}
      onThemeChange={(next: SettingsTheme) => updateTheme(next)}
      onLanguageChange={updateLanguage}
      onDistanceUnitChange={(unit) => commitPreferences({ distanceUnit: unit })}
      onNotificationsChange={(enabled) =>
        commitPreferences({ notificationsEnabled: enabled })
      }
      onBackgroundRefreshChange={(enabled) =>
        commitPreferences({ backgroundRefreshEnabled: enabled })
      }
      onRequestLocationPermission={() => void requestLocationPermission()}
      onOpenPrivacy={openPrivacy}
      onExportData={() => void exportData()}
      onDeleteData={deleteSavedRoutes}
    />
  ) : detailRouteId ? (
    <RouteDetailScreen
      t={t}
      rtl={rtl}
      styles={screenStyles}
      palette={palette}
      formatNumber={(value, options) => formatNumber(value, locale, options)}
      distanceDisplay={distanceDisplay}
      formatTime={(instant) => formatBahrainTime(instant, locale, { hour12 })}
      route={detailPlan}
      routeStatus={detailRecord ? routeStatusForRecord(detailRecord) : "draft"}
      departureLabel={departureLabel}
      arrivalLabel={
        detailRecord?.geometry.kind === "road_matched" &&
        detailRecord.geometry.status === "ready" &&
        detailPlan?.arrivalAt
          ? formatBahrainTime(detailPlan.arrivalAt, locale, { hour12 })
          : "—"
      }
      departureChoices={departureChoices}
      mapText={commonMapText(
        detailPlan,
        detailRecord ? routeStatusForRecord(detailRecord) : "draft",
      )}
      roadLabels={roadLabels}
      routeName={detailNameDraft}
      onRouteNameChange={setDetailNameDraft}
      onDeparture={setDepartureOffset}
      onBack={() => setDetailRouteId(null)}
      onUse={useDetailRoute}
      onAddStop={detailAddStop}
      onReverse={detailReverse}
      onEdit={() => editRoutePoints(detailRecord)}
      onRetry={detailRetry}
      onSave={detailRecord?.ownership === "personal" ? saveDetail : undefined}
      onChangeRoute={() => setDetailRouteId(null)}
      variantLabel={detailVariantLabel}
      entryLabel={detailEntryLabel}
      finishLabel={detailFinishLabel}
      entryDistanceLabel={detailIsNbh ? nbhEntryDistanceLabel : undefined}
      onlyVariant={detailIsNbh && NBH_FAMILY.variants.length === 1}
      comparisonStatus={detailAnalysisResult?.run.ranking}
      comparisonReason={detailComparisonReason}
      layers={detailLayers}
      entryActionsEnabled={detailEntryActionsEnabled}
      onStartAtEntry={detailIsNbh ? useDetailRoute : undefined}
      onConnectFromLocation={
        detailIsNbh ? () => void connectFromCurrentLocation() : undefined
      }
    />
  ) : tab === "home" ? (
    <TodayScreen
      t={t}
      rtl={rtl}
      styles={screenStyles}
      palette={palette}
      formatNumber={(value, options) => formatNumber(value, locale, options)}
      distanceDisplay={distanceDisplay}
      route={homePlan}
      conditions={conditions}
      refreshing={refreshing}
      recommendationTitle={windowTitle}
      recommendationReason={homeRecommendationReason}
      departureTime={departureLabel}
      routeStatus={homeStatus}
      variantLabel={
        homeRecord?.familyId === NBH_FAMILY.id
          ? localizeName(
              NBH_FAMILY.variants[0]?.label ?? "",
              NBH_FAMILY.variants[0]?.labelAr,
              language,
            )
          : undefined
      }
      roadLabels={roadLabels}
      mapText={mapText}
      onReviewRoute={() =>
        homeRecord &&
        openRouteDetail(homePlan ?? routePlanFromRecord(homeRecord))
      }
      onPlanRoute={() => setTab("plan")}
      onChooseRoute={() => setTab("plan")}
      onRefresh={() => void refresh()}
    />
  ) : tab === "plan" ? (
    <RoutesScreen
      t={t}
      rtl={rtl}
      styles={screenStyles}
      palette={palette}
      formatNumber={(value, options) => formatNumber(value, locale, options)}
      distanceDisplay={distanceDisplay}
      builder={builder}
      builderPreview={builder.route}
      activeField={activeField}
      startText={startText}
      destinationText={destinationText}
      targetDistanceInput={targetDistanceInput}
      mapText={commonMapText(
        builder.route,
        builder.status === "ready"
          ? "ready"
          : builder.status === "matching"
            ? "matching"
            : builder.status === "failed"
              ? "failed"
              : "draft",
      )}
      roadLabels={roadLabels}
      samples={ROUTE_ALTERNATIVES}
      myRoutes={storedRouteRecords
        .filter(
          (record) =>
            record.ownership === "personal" && record.origin !== "gpx",
        )
        .map((record) =>
          displayPlanForRecord(
            record,
            language,
            departureAt,
            departureWind,
            conditions?.hourly,
            conditions?.fetchedAt,
            conditions?.source,
          ),
        )}
      imports={storedRouteRecords
        .filter((record) => record.origin === "gpx")
        .map((record) =>
          displayPlanForRecord(
            record,
            language,
            departureAt,
            departureWind,
            conditions?.hourly,
            conditions?.fetchedAt,
            conditions?.source,
          ),
        )}
      selectedRouteId={selectedRouteId}
      manualMode={manualMode}
      manualRoute={manualRoute}
      manualPoints={manualPoints}
      importReview={importReview}
      importReviewFileName={importReviewFileName}
      generatedReview={generatedReview}
      routeMessage={routeMessage}
      knownRouteFamily={{
        family: NBH_FAMILY,
        route: nbhPlan,
        status: nbhRecord ? routeStatusForRecord(nbhRecord) : "trace_ready",
        layers: nbhLayers,
        entryDistanceLabel: nbhEntryDistanceLabel,
        onReview: () => openRouteDetail(nbhPlan),
        onStartAtEntry: startNbhAtEntry,
        onConnectFromLocation: () => void connectFromCurrentLocation(),
        onRecordWithoutFollowing: recordWithoutFollowingNbh,
        onChooseAnotherRoute: () => {
          setRecordingOnlyRide(false);
          setSelectedRouteId(null);
          setConfirmedRouteId(null);
          setTab("plan");
        },
      }}
      onStartText={(value) => updatePlannerText("start", value)}
      onDestinationText={(value) => updatePlannerText("destination", value)}
      onGenerationDistance={setTargetDistanceInput}
      onFocusField={setActiveField}
      onChooseOnMap={(field) => setActiveField(field)}
      onUseCurrentLocation={(field) => void useCurrentLocation(field)}
      onUseSavedPoint={choosePlannerPoint}
      onMapPress={mapPlannerPress}
      onRetryMatch={retryPlannerMatch}
      onEditPoints={editPlannerPoints}
      onUseMatchedRoute={() => {
        if (builder.route && builder.status === "ready") {
          setRideStartIntent(null);
          setWorkingRecords((current) => ({
            ...current,
            [builder.route!.id]:
              recordById(builder.route!.id) ??
              recordFromView(
                builder.route!,
                "drawn",
                "personal",
                "road_matched",
                "ready",
              ),
          }));
          setSelectedRouteId(builder.route.id);
          setConfirmedRouteId(builder.route.id);
          setTab("ride");
        }
      }}
      onAddStop={() => setActiveField("destination")}
      onReverse={reversePlanner}
      onImport={() => void importGpx()}
      onGenerate={() => void generateLoop()}
      onOpenManual={openManual}
      onCancelManual={cancelManual}
      onUndoManual={undoManual}
      onRedoManual={redoManual}
      onClearManual={clearManual}
      onDoneManual={doneManual}
      onRemoveManualPoint={removeManualPoint}
      onMoveManualPoint={moveManualPoint}
      onUseImport={useImport}
      onCancelImport={() => {
        setImportReview(null);
        setImportReviewFileName("");
      }}
      onUseGenerated={useGenerated}
      onCancelGenerated={() => setGeneratedReview(null)}
      onSelect={selectRoute}
    />
  ) : tab === "ride" ? (
    <LiveRideScreen
      t={t}
      rtl={rtl}
      styles={screenStyles}
      palette={palette}
      formatNumber={(value, options) => formatNumber(value, locale, options)}
      distanceDisplay={distanceDisplay}
      route={ridePlan}
      recordingOnly={recordingOnlyRide}
      state={live.state}
      position={position}
      snapshot={snapshot}
      completionDraft={completionDraftView}
      routeStatus={rideStatus}
      statusMessage={uiText(
        live.state === "active" ? "liveStateActive" : "liveStateIdle",
        live.statusMessage,
      )}
      permissionMessage={permissionMessage}
      endConfirmationMessage={endConfirmationMessage}
      aheadLabel={aheadLabel}
      nextSegmentName={nextSegment?.name}
      nextSegmentWindLabel={
        nextSegment
          ? `${formatNumber(nextSegment.wind.magnitudeKph, locale)} ${t.speedUnit} · ${nextSegment.wind.kind === "headwind" ? t.headwind : nextSegment.wind.kind === "tailwind" ? t.tailwind : t.crosswind}`
          : undefined
      }
      mapText={commonMapText(ridePlan, rideStatus)}
      roadLabels={roadLabels}
      layers={rideLayers}
      privacyMessage={t.foregroundOnly}
      entryLabel={ridePlan?.points[0]?.name}
      onChooseRoute={() => {
        setRideStartIntent(null);
        setRecordingOnlyRide(false);
        setTab("plan");
      }}
      onReviewRoute={() => {
        if (!confirmedRecord) return;
        setRideStartIntent(null);
        openRouteDetail(ridePlan ?? routePlanFromRecord(confirmedRecord));
      }}
      onShowPermissionExplanation={() => {
        setRideStartIntent(null);
        live.prepareStart();
      }}
      onRequestPermission={live.requestPermissionAndStart}
      onCancelPermission={() => {
        setRideStartIntent(null);
        live.cancelPermission();
      }}
      onOpenSettings={() => setSettingsOpen(true)}
      onRetryPermission={live.retryPermission}
      onStartRide={() => {
        setRideStartIntent(null);
        live.prepareStart();
      }}
      onConnectFromLocation={connectConfirmedRouteFromLocation}
      onRequestEndRide={live.requestEnd}
      onCancelEndRide={live.cancelEnd}
      onConfirmEndRide={live.confirmEnd}
      onChooseAnotherRoute={() => {
        setRideStartIntent(null);
        setRecordingOnlyRide(false);
        setConfirmedRouteId(null);
        setTab("plan");
      }}
      onSaveCompletion={saveCompletion}
      onRetrySaveCompletion={saveCompletion}
      onDiscardCompletion={discardCompletion}
      onExportCompletion={() => void exportCompletion()}
    />
  ) : (
    <ProfileScreen
      t={t}
      copy={t}
      rtl={rtl}
      styles={screenStyles}
      palette={palette}
      formatNumber={(value, options) => formatNumber(value, locale, options)}
      distanceDisplay={distanceDisplay}
      profile={{
        name: preferences.displayName || (rtl ? "راكب نسيم" : "Naseem rider"),
        detail: t.location,
        statusLabel: uiText("youProfileStatus", "Local profile"),
      }}
      collections={profileCollections}
      activities={storedActivities}
      connection={{
        providerLabel: "Strava",
        statusLabel: uiText("notConnected", "Not connected"),
        detail: stravaMessage || t.stravaNotConfigured,
        actionLabel: t.connectReadOnly,
      }}
      privacy={{
        id: "privacy",
        icon: "map",
        title: t.privacySources,
        description: t.privacyCopy,
      }}
      settings={{
        id: "settings",
        icon: "settings",
        title: t.settings,
        description: uiText(
          "youSettingsBody",
          "Manage language, appearance, permissions, and local preferences.",
        ),
      }}
      onOpenCollection={(kind) => {
        setTab("plan");
        if (kind === "imports")
          setSelectedRouteId(
            storedRouteRecords.find((record) => record.origin === "gpx")?.id ??
              null,
          );
      }}
      onOpenRoute={(item) => openRouteDetail(item.route)}
      onConnectionAction={() => {
        setStravaMessage(t.stravaNotConfigured);
        showAppAlert(t.connectStrava, t.stravaNotConfigured);
      }}
      onPrivacyAction={openPrivacy}
      onSettingsAction={() => setSettingsOpen(true)}
    />
  );
  const ownsMapViewport = Boolean(
    detailRouteId || manualMode || live.state === "active",
  );

  return (
    <SafeAreaView style={shellStyles.safe}>
      <StatusBar style={theme === "light" ? "dark" : "light"} />
      <View style={shellStyles.appShell}>
        <View style={[shellStyles.topbar, rtl && shellStyles.rtl]}>
          <View style={shellStyles.brandBlock}>
            <Text style={shellStyles.brand}>{t.brandName}</Text>
            <Text style={shellStyles.location}>
              {detailRouteId
                ? uiText("routeDetail", "Route detail")
                : settingsOpen
                  ? t.settings
                  : t[tab]}
            </Text>
          </View>
        </View>
        {ownsMapViewport ? (
          <View style={shellStyles.surface}>{content}</View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={shellStyles.scroll}
            contentContainerStyle={shellStyles.content}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        )}
        {!settingsOpen && !detailRouteId && !manualMode && live.state !== "active" && (
          <View style={[shellStyles.tabbar, rtl && shellStyles.rtl]}>
            {(["home", "plan", "ride", "you"] as Tab[]).map((item) => (
              <TabButton
                key={item}
                active={tab === item}
                icon={
                  item === "home"
                    ? "home"
                    : item === "plan"
                      ? "map"
                      : item === "ride"
                        ? "pulse"
                        : "person"
                }
                label={t[item]}
                styles={shellStyles}
                palette={palette}
                onPress={() => setTab(item)}
              />
            ))}
          </View>
        )}
      </View>
      <WebAppAlert
        alert={webAlert}
        palette={palette}
        rtl={rtl}
        onDismiss={() => setWebAlert(null)}
      />
    </SafeAreaView>
  );
}

function WebAppAlert({
  alert: webAlert,
  palette,
  rtl,
  onDismiss,
}: {
  alert: WebAlertState | null;
  palette: Palette;
  rtl: boolean;
  onDismiss: () => void;
}) {
  if (Platform.OS !== "web" || !webAlert) return null;

  const confirmation = webAlert.buttons.length > 1;
  const handleButtonPress = (button: AppAlertButton) => {
    onDismiss();
    button.onPress?.();
  };

  return (
    <View style={webAlertStyles.backdrop}>
      <View
        testID="web-app-alert"
        role={confirmation ? "alertdialog" : "alert"}
        accessibilityLiveRegion="assertive"
        accessibilityViewIsModal
        accessibilityLabel={`${webAlert.title}. ${webAlert.message}`}
        aria-modal={true}
        style={[
          webAlertStyles.card,
          { backgroundColor: palette.bg, borderColor: palette.line },
          rtl && webAlertStyles.rtl,
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[
            webAlertStyles.title,
            { color: palette.ink },
            rtl && webAlertStyles.textRight,
            rtl && { fontFamily: FONT_ARABIC_BOLD },
          ]}
        >
          {webAlert.title}
        </Text>
        <Text
          style={[
            webAlertStyles.message,
            { color: palette.muted },
            rtl && webAlertStyles.textRight,
            rtl && { fontFamily: FONT_ARABIC_REGULAR },
          ]}
        >
          {webAlert.message}
        </Text>
        <View
          style={[webAlertStyles.actions, rtl && webAlertStyles.rtl]}
        >
          {webAlert.buttons.map((button) => {
            const destructive = button.style === "destructive";
            const cancel = button.style === "cancel";
            return (
              <Pressable
                key={button.text}
                accessibilityRole="button"
                accessibilityLabel={button.text}
                onPress={() => handleButtonPress(button)}
                style={({ pressed }) => [
                  webAlertStyles.action,
                  {
                    backgroundColor: destructive
                      ? palette.cautionSoft
                      : cancel
                        ? palette.bg
                        : palette.ink,
                    borderColor: destructive
                      ? palette.caution
                      : cancel
                        ? palette.line
                        : palette.ink,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    webAlertStyles.actionText,
                    {
                      color: destructive
                        ? palette.caution
                        : cancel
                          ? palette.ink
                          : palette.bg,
                    },
                    rtl && { fontFamily: FONT_ARABIC_BOLD },
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const webAlertStyles = StyleSheet.create({
  host: { flex: 1 },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    elevation: 1000,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(16, 42, 46, 0.72)",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    gap: 14,
    padding: 20,
    borderWidth: 1,
    borderRadius: 22,
  },
  title: {
    fontFamily: FONT_BOLD,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
  },
  message: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  action: {
    minHeight: 48,
    minWidth: 96,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    fontWeight: "900",
  },
  rtl: { flexDirection: "row-reverse" },
  textRight: { textAlign: "right" },
});

function viewForRecord(
  record: RouteRecord,
  language: Language,
): CanonicalRouteView {
  // A ready road match must always expose current analysis to review surfaces.
  // This also repairs records created during the v1/v2 transition that have
  // geometry but no persisted analysis snapshot yet.
  const plan = displayPlanForRecord(record, language);
  return {
    ...plan,
    revision: record.revision,
    origin: record.origin,
    ownership: record.ownership,
    geometryKind: record.geometry.kind,
    geometryStatus: record.geometry.status,
    roadEvidenceStatus: record.roadEvidenceStatus,
    departureAt: plan.departureAt,
    arrivalAt: plan.arrivalAt,
    name: localizeName(plan.name, plan.nameAr, language),
    points: plan.points.map((point) => ({
      ...point,
      name: localizeName(point.name, point.nameAr, language),
    })),
  };
}
function analyseSurfaceRecord(
  record: RouteRecord | null,
  departureAt: string,
  departureWind: WindForecast | undefined,
  hourlyWind: BahrainConditions["hourly"],
  forecastRunAt?: string,
  forecastSource?: string,
) {
  if (
    !record ||
    record.geometry.status !== "ready" ||
    record.geometry.kind === "waypoint_trace"
  )
    return null;
  try {
    return analyseRouteRevision({
      route: record,
      departureAt,
      wind: departureWind,
      hourlyWind,
      forecastRunAt,
      forecastSource,
    });
  } catch {
    return null;
  }
}
function explainSurfaceRun(
  run: ReturnType<typeof analyseRouteRevision>["run"],
  t: typeof copy.en,
  language: Language,
  distanceDisplay: ReturnType<typeof createDistanceDisplay>,
) {
  return explainRun(
    run,
    (value) => distanceDisplay.formatDistance(value),
    {
      paused: t.comparisonPaused,
      headwindAndTailwind: (headwind, headwindKm, tailwind, tailwindKm) =>
        language === "ar"
          ? `${headwind} تحمل الرياح الأمامية الأقوى عبر ${headwindKm}؛ وتكون ${tailwind} أكثر ملاءمة عبر ${tailwindKm}.`
          : `${headwind} carries the stronger headwind across ${headwindKm}; ${tailwind} is more favourable across ${tailwindKm}.`,
      headwind: (name, distanceKm) =>
        language === "ar"
          ? `${name} تحمل الرياح الأمامية الأقوى عبر ${distanceKm}؛ خصص لها جهداً ووقتاً أكبر.`
          : `${name} carries the stronger headwind across ${distanceKm}; allow more effort and time there.`,
      tailwind: (name, distanceKm) =>
        language === "ar"
          ? `${name} أكثر ملاءمة عبر ${distanceKm}.`
          : `${name} is the more favourable section across ${distanceKm}.`,
      mixed:
        language === "ar"
          ? "يتغير أثر الرياح عبر مقاطع المسار المسماة."
          : "Wind effect is mixed across the named route segments.",
      segmentName: (segment) =>
        language === "ar" && segment.nameAr ? segment.nameAr : segment.name,
    },
  );
}
function recordFromView(
  plan: CanonicalRouteView,
  origin: RouteRecord["origin"],
  ownership: RouteRecord["ownership"],
  kind: RouteRecord["geometry"]["kind"],
  status: RouteRecord["geometry"]["status"],
): RouteRecord {
  return routeRecordFromPlan(plan, {
    origin,
    ownership,
    geometry: { kind, status, source: plan.geometrySource },
    roadEvidenceStatus: plan.roadEvidenceStatus ?? "unknown",
    provenance: { source: plan.source },
    revision: plan.revision ?? 1,
  });
}
function recordWithAnalysis(
  record: RouteRecord,
  plan: RoutePlan,
  run?: ReturnType<typeof analyseRouteRevision>["run"],
): RouteRecord {
  const next = routeRecordFromPlan(plan, {
    origin: record.origin,
    ownership: record.ownership,
    geometry: {
      kind: record.geometry.kind,
      status: record.geometry.status,
      source: record.geometry.source,
    },
    roadEvidenceStatus: record.roadEvidenceStatus,
    provenance: record.provenance,
    revision: record.revision,
    familyId: record.familyId,
    variantId: record.variantId,
    revisionId: record.revisionId,
  });
  const baseAnalysis = next.analysis;
  if (run && baseAnalysis) {
    next.analysis = {
      ...baseAnalysis,
      routeId: run.routeId,
      routeRevision: run.routeRevision,
      analysisRunId: run.id,
      ...(run.forecastRunAt ? { forecastRunAt: run.forecastRunAt } : {}),
      ...(run.forecastSource ? { forecastSource: run.forecastSource } : {}),
      confidence: run.confidence,
    };
  }
  return next;
}
function displayPlanForRecord(
  record: RouteRecord,
  language: Language,
  departureAt?: string,
  departureWind?: WindForecast,
  hourlyWind: Array<{
    time: string;
    speed: number;
    directionFrom: number;
    gusts?: number;
  }> = [],
  forecastRunAt?: string,
  forecastSource?: string,
): CanonicalRouteView {
  const raw = routePlanFromRecord(record);
  if (
    record.geometry.status === "ready" &&
    record.geometry.kind !== "waypoint_trace"
  ) {
    try {
      return localizePlanForRecord(
        record,
        analyseRouteRevision({
          route: record,
          departureAt: departureAt ?? raw.departureAt ?? new Date(),
          wind: departureWind,
          hourlyWind,
          forecastRunAt,
          forecastSource,
        }).plan,
        language,
      );
    } catch {
      return localizePlanForRecord(record, raw, language);
    }
  }
  return localizePlanForRecord(record, raw, language);
}
function localizePlanForRecord(
  record: RouteRecord,
  plan: RoutePlan,
  language: Language,
): CanonicalRouteView {
  return {
    ...localizePlan(plan, language),
    origin: record.origin,
    ownership: record.ownership,
    geometryKind: record.geometry.kind,
    geometryStatus: record.geometry.status,
    roadEvidenceStatus: record.roadEvidenceStatus,
    revision: record.revision,
    routeStatus: routeStatusForRecord(record),
  };
}
function localizePlan(plan: RoutePlan, language: Language): RoutePlan {
  return {
    ...plan,
    name: localizeName(plan.name, plan.nameAr, language),
    points: plan.points.map((point) => ({
      ...point,
      name: localizeName(point.name, point.nameAr, language),
    })),
    segments: plan.segments.map((segment) => ({
      ...segment,
      name: localizeName(segment.name, segment.nameAr, language),
    })),
  };
}
function localizeName(
  name: string,
  nameAr: string | undefined,
  language: Language,
) {
  return language === "ar" && nameAr ? nameAr : name;
}
function routeStatusForRecord(
  record: RouteRecord,
): Exclude<RouteStatus, "failed"> {
  if (record.geometry.status === "matching") return "matching";
  if (
    record.geometry.kind === "road_matched" &&
    record.geometry.status === "ready"
  )
    return "ready";
  if (
    record.geometry.kind === "recorded_trace" &&
    record.geometry.status === "ready"
  )
    return "trace_ready";
  if (record.geometry.status === "unavailable") return "unavailable";
  return "draft";
}
function uniqueRecords(records: RouteRecord[]) {
  const byId = new Map<string, RouteRecord>();
  records.forEach((record) => {
    const existing = byId.get(record.id);
    if (!existing || record.revision >= existing.revision)
      byId.set(record.id, record);
  });
  return [...byId.values()];
}
function uniqueActivities(activities: ActivityDraft[]) {
  const byId = new Map<string, ActivityDraft>();
  activities.forEach((activity) => byId.set(activity.id, activity));
  return [...byId.values()];
}
function isValidActivityStorage(raw: string) {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Boolean(
      parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        (parsed as { version?: unknown }).version === 1 &&
        Array.isArray((parsed as { activities?: unknown }).activities),
    );
  } catch {
    return false;
  }
}
function isValidRouteStoragePayload(raw: string) {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return true;
    if (!parsed || typeof parsed !== "object") return false;
    const value = parsed as { version?: unknown; routes?: unknown };
    return (value.version === 1 || value.version === 2) && Array.isArray(value.routes);
  } catch {
    return false;
  }
}
function upsertRecords(records: RouteRecord[], record: RouteRecord) {
  return uniqueRecords([
    ...records.filter((candidate) => candidate.id !== record.id),
    record,
  ]);
}
function surfaceItem(
  record: RouteRecord,
  language: Language,
  t: typeof copy.en,
  distanceDisplay: ReturnType<typeof createDistanceDisplay>,
): RouteSurfaceItem {
  const plan = displayPlanForRecord(record, language);
  const sourceLabel =
    record.ownership === "catalog"
      ? t.previewRoute
      : record.origin === "gpx"
        ? t.importedTrack
        : record.origin === "drawn"
          ? t.drawnRoute
          : record.origin === "generated"
            ? t.generatedRoute
            : record.provenance.source;
  return {
    route: plan,
    meta: {
      ownership: record.ownership,
      origin: record.origin,
      geometryKind: record.geometry.kind,
      geometryStatus: record.geometry.status,
      roadEvidenceStatus: record.roadEvidenceStatus,
      revision: record.revision,
      ownershipLabel: record.ownership === "personal" ? t.yours : t.sample,
      provenanceLabel: sourceLabel,
      sourceLabel,
    },
    display: {
      name: plan.name,
      distance: distanceDisplay.formatDistance(plan.distanceKm),
      movingTime: plan.durationMinutes
        ? `${formatNumber(
            plan.durationMinutes,
            localeForLanguage(language),
          )} ${t.minutes}`
        : undefined,
    },
  };
}
function windForDeparture(
  conditions: BahrainConditions | null,
  departureAt: Date,
): WindForecast | undefined {
  if (!conditions) return undefined;
  if (!conditions.hourly.length) return conditions.wind;
  return conditions.hourly.reduce(
    (closest, item) =>
      Math.abs(new Date(item.time).getTime() - departureAt.getTime()) <
      Math.abs(new Date(closest.time).getTime() - departureAt.getTime())
        ? item
        : closest,
    conditions.hourly[0],
  );
}
function BootScreen({ palette, rtl }: { palette: Palette; rtl: boolean }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: palette.accent,
          }}
        />
        <Text
          style={{
            color: palette.ink,
            fontFamily: rtl ? FONT_ARABIC_BOLD : FONT_EXTRABOLD,
            fontSize: 18,
            letterSpacing: rtl ? 0 : 2.2,
          }}
        >
          {rtl ? "نسيم" : "NASEEM"}
        </Text>
        <Text
          style={{
            color: palette.muted,
            fontFamily: rtl ? FONT_ARABIC_MEDIUM : FONT_MEDIUM,
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {rtl ? "جارٍ تجهيز خطة الركوب" : "Preparing your riding plan"}
        </Text>
      </View>
    </SafeAreaView>
  );
}
function TabButton({
  active,
  icon,
  label,
  styles,
  palette,
  onPress,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  styles: ReturnType<typeof createShellStyles>;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.tabButton}
    >
      <View style={[styles.tabIcon, active && styles.tabIconActive]}>
        <Icon
          name={icon}
          color={active ? palette.accent : palette.muted}
          size={18}
        />
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}
function createShellStyles(palette: Palette, rtl: boolean) {
  const regular = rtl ? FONT_ARABIC_REGULAR : FONT_REGULAR;
  const medium = rtl ? FONT_ARABIC_MEDIUM : FONT_MEDIUM;
  const semibold = rtl ? FONT_ARABIC_SEMIBOLD : FONT_SEMIBOLD;
  const bold = rtl ? FONT_ARABIC_BOLD : FONT_BOLD;
  const extraBold = rtl ? FONT_ARABIC_BOLD : FONT_EXTRABOLD;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    appShell: {
      flex: 1,
      width: "100%",
      maxWidth: 820,
      alignSelf: "center",
      backgroundColor: palette.bg,
    },
    scroll: { flex: 1 },
    surface: { flex: 1, minHeight: 0, width: "100%" },
    content: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 16 },
    topbar: {
      minHeight: 67,
      paddingHorizontal: 16,
      paddingTop: 11,
      paddingBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: palette.bg,
      borderBottomWidth: 1,
      borderBottomColor: palette.line,
    },
    rtl: { flexDirection: "row-reverse" },
    brandBlock: { gap: 2 },
    brand: {
      color: palette.ink,
      fontFamily: extraBold,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "800",
      letterSpacing: rtl ? 0 : 2.2,
    },
    location: {
      color: palette.muted,
      fontFamily: regular,
      fontSize: 12,
      lineHeight: 18,
    },
    topActions: { flexDirection: "row", gap: 8 },
    topAction: {
      minHeight: 42,
      paddingHorizontal: 11,
      justifyContent: "center",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.line,
      backgroundColor: palette.panel,
    },
    topActionText: {
      color: palette.ink,
      fontFamily: semibold,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "600",
    },
    tabbar: {
      minHeight: 78,
      marginHorizontal: 12,
      marginBottom: 10,
      paddingHorizontal: 6,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: palette.nav,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 21,
      flexDirection: "row",
      justifyContent: "space-around",
    },
    tabButton: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    tabIcon: {
      width: 42,
      height: 31,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    tabIconActive: {
      backgroundColor: palette.accentSoft,
      borderWidth: 1,
      borderColor: palette.accent,
    },
    tabLabel: {
      color: palette.muted,
      fontFamily: medium,
      fontSize: rtl ? 12 : 11,
      lineHeight: 18,
      fontWeight: "500",
    },
    tabLabelActive: {
      color: palette.accent,
      fontFamily: bold,
      fontWeight: "700",
    },
  });
}
