import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Icon, type IconName } from "./Icon";
import { StatusBadge } from "./UiPatterns";
import type { DistanceUnit } from "./distanceDisplay";
import { DARK, type Palette } from "./designTokens";
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
} from "./fonts";
import type { Language } from "./i18n";
import {
  getPrivacyCenterCopy,
  LOCATION_STATUS_COPY,
  type LocationPermissionStatus,
  type PrivacyCenterCopy,
} from "./appPreferences";
import {
  getStravaDisclosure,
  STRAVA_CONNECTION_STATE,
  type StravaConnectionState,
} from "./api";

export type SettingsTheme = "light" | "dark";
export type SettingsDistanceUnit = DistanceUnit;
export type PermissionStatus = LocationPermissionStatus;

export type SettingsProfile = {
  name: string;
  email?: string;
  initials?: string;
  statusLabel?: string;
};

export type SettingsScreenProps = {
  palette?: Palette;
  language?: Language;
  theme?: SettingsTheme;
  profile?: SettingsProfile;
  distanceUnit?: SettingsDistanceUnit;
  notificationsEnabled?: boolean;
  backgroundRefreshEnabled?: boolean;
  locationPermission?: PermissionStatus;
  stravaStatus?: StravaConnectionState;
  onBack?: () => void;
  onEditProfile?: () => void;
  onThemeChange?: (theme: SettingsTheme) => void;
  onLanguageChange?: (language: Language) => void;
  onDistanceUnitChange?: (unit: SettingsDistanceUnit) => void;
  onNotificationsChange?: (enabled: boolean) => void;
  onBackgroundRefreshChange?: (enabled: boolean) => void;
  onRequestLocationPermission?: () => void | Promise<PermissionStatus | void>;
  onOpenPrivacy?: () => void;
  onExportData?: () => void;
  onSignOut?: () => void;
  onDeleteData?: () => void;
};

type SettingsCopy = {
  settings: string;
  subtitle: string;
  back: string;
  ridingPreferences: string;
  ridingPreferencesHint: string;
  editPreferences: string;
  appearance: string;
  appearanceHint: string;
  light: string;
  dark: string;
  language: string;
  languageHint: string;
  english: string;
  arabic: string;
  distanceUnits: string;
  distanceUnitsHint: string;
  kilometres: string;
  miles: string;
  locationNotifications: string;
  locationNotificationsHint: string;
  notifications: string;
  notificationsHint: string;
  enabled: string;
  disabled: string;
  backgroundRefresh: string;
  backgroundRefreshHint: string;
  location: string;
  locationGranted: string;
  locationDenied: string;
  locationLimited: string;
  locationUndetermined: string;
  locationPending: string;
  locationUnavailable: string;
  allowLocation: string;
  manage: string;
  close: string;
  requesting: string;
  shareOrDownload: string;
  data: string;
  dataHint: string;
  privacyCenter: string;
  privacyCenterHint: string;
  exportData: string;
  exportDataHint: string;
  deleteData: string;
  deleteDataHint: string;
  deleteTitle: string;
  deleteBody: string;
  keepData: string;
  deletePermanently: string;
  cancel: string;
  version: string;
  unavailable: string;
};

const COPY: Record<Language, SettingsCopy> = {
  en: {
    settings: "Settings",
    subtitle: "Language, appearance, location, and saved data.",
    back: "Back",
    ridingPreferences: "Riding preferences",
    ridingPreferencesHint: "Name, riding goals, and the distance units you use.",
    editPreferences: "Edit",
    appearance: "Appearance",
    appearanceHint: "Choose a light or dark surface.",
    light: "Light",
    dark: "Dark",
    language: "Language",
    languageHint: "Choose the language for labels and reading order.",
    english: "English",
    arabic: "العربية",
    distanceUnits: "Distance units",
    distanceUnitsHint: "Choose kilometres (km) or miles (mi) for distances.",
    kilometres: "Kilometres (km)",
    miles: "Miles (mi)",
    locationNotifications: "Location & notifications",
    locationNotificationsHint:
      "Location is never requested while you browse. It may be requested after you choose Current location or Start ride.",
    notifications: "Notifications",
    notificationsHint: "Ride windows and meaningful weather changes.",
    enabled: "On",
    disabled: "Off",
    backgroundRefresh: "Weather refresh",
    backgroundRefreshHint: "Refresh conditions before you open a planned ride.",
    location: "Location access",
    locationGranted: "Allowed",
    locationDenied: "Not allowed",
    locationLimited: "Limited",
    locationUndetermined: "Not requested",
    locationPending: "Requesting location…",
    locationUnavailable: "Unavailable",
    allowLocation: "Allow location",
    manage: "Manage",
    close: "Close",
    requesting: "Waiting…",
    shareOrDownload: "Share or download",
    data: "Data",
    dataHint:
      "Saved routes, rides, and preferences stay on this device. Export or delete them whenever you choose.",
    privacyCenter: "Privacy center",
    privacyCenterHint: "See what is stored, sent for a request, retained, shared, or deleted.",
    exportData: "Share or download saved data",
    exportDataHint:
      "Share or download a JSON copy with saved data and precise recorded location samples.",
    deleteData: "Delete saved routes and rides",
    deleteDataHint:
      "Remove saved routes and rides from this device; your settings stay unchanged.",
    deleteTitle: "Delete saved routes and rides?",
    deleteBody:
      "This will remove every saved route and ride from this device. Your language and other settings will stay unchanged. You can cancel now; confirmed deletion cannot be undone.",
    keepData: "Keep my data",
    deletePermanently: "Delete permanently",
    cancel: "Cancel",
    version: "Naseem · v1.0",
    unavailable: "Unavailable",
  },
  ar: {
    settings: "الإعدادات",
    subtitle: "اللغة والمظهر والموقع والبيانات المحفوظة.",
    back: "رجوع",
    ridingPreferences: "تفضيلات الركوب",
    ridingPreferencesHint: "اسمك وأهدافك ووحدة المسافة التي تستخدمها.",
    editPreferences: "تعديل",
    appearance: "المظهر",
    appearanceHint: "اختر مظهراً فاتحاً أو داكناً.",
    light: "فاتح",
    dark: "داكن",
    language: "اللغة",
    languageHint: "اختر لغة العناوين واتجاه القراءة.",
    english: "English",
    arabic: "العربية",
    distanceUnits: "وحدة المسافة",
    distanceUnitsHint: "اختر الكيلومترات (كم) أو الأميال (ميل) لعرض المسافات.",
    kilometres: "الكيلومترات (كم)",
    miles: "الأميال (ميل)",
    locationNotifications: "الموقع والإشعارات",
    locationNotificationsHint:
      "لا يُطلب الموقع أثناء التصفح. قد يُطلب بعد اختيار الموقع الحالي أو بدء الرحلة.",
    notifications: "الإشعارات",
    notificationsHint: "فترات الركوب والتغيرات المهمة في الطقس.",
    enabled: "مفعّلة",
    disabled: "متوقفة",
    backgroundRefresh: "تحديث الطقس",
    backgroundRefreshHint: "حدّث الظروف قبل فتح رحلة مخطط لها.",
    location: "الوصول إلى الموقع",
    locationGranted: "مسموح",
    locationDenied: "غير مسموح",
    locationLimited: "محدود",
    locationUndetermined: "لم يُحدد",
    locationPending: "جارٍ طلب الموقع…",
    locationUnavailable: "غير متاح",
    allowLocation: "السماح بالموقع",
    manage: "إدارة",
    close: "إغلاق",
    requesting: "بانتظار النتيجة…",
    shareOrDownload: "مشاركة أو تنزيل",
    data: "البيانات",
    dataHint:
      "تبقى المسارات والرحلات والتفضيلات المحفوظة على هذا الجهاز. صدّرها أو احذفها متى شئت.",
    privacyCenter: "مركز الخصوصية",
    privacyCenterHint: "تعرّف على ما يُحفظ وما يُرسل وما يُحتفظ به وما يمكنك مشاركته أو حذفه.",
    exportData: "مشاركة أو تنزيل البيانات المحفوظة",
    exportDataHint:
      "شارك أو نزّل نسخة JSON تتضمن البيانات المحفوظة وعينات الموقع المسجلة الدقيقة.",
    deleteData: "حذف المسارات والرحلات المحفوظة",
    deleteDataHint:
      "أزل المسارات والرحلات المحفوظة من هذا الجهاز؛ وستبقى إعداداتك كما هي.",
    deleteTitle: "حذف المسارات والرحلات المحفوظة؟",
    deleteBody:
      "سيؤدي ذلك إلى إزالة جميع المسارات والرحلات المحفوظة من هذا الجهاز. ستبقى لغتك وإعداداتك الأخرى دون تغيير. يمكنك الإلغاء الآن؛ ولا يمكن التراجع بعد تأكيد الحذف.",
    keepData: "الاحتفاظ ببياناتي",
    deletePermanently: "حذف نهائياً",
    cancel: "إلغاء",
    version: "نسيم · ١.٠",
    unavailable: "غير متاح",
  },
};

const defaultProfile: SettingsProfile = { name: "Naseem rider" };

export function SettingsScreen({
  palette = DARK,
  language = "en",
  theme = "dark",
  profile = defaultProfile,
  distanceUnit = "km",
  notificationsEnabled = true,
  backgroundRefreshEnabled = true,
  locationPermission = "undetermined",
  stravaStatus = STRAVA_CONNECTION_STATE,
  onBack,
  onEditProfile,
  onThemeChange,
  onLanguageChange,
  onDistanceUnitChange,
  onNotificationsChange,
  onBackgroundRefreshChange,
  onRequestLocationPermission,
  onExportData,
  onDeleteData,
}: SettingsScreenProps) {
  const t = COPY[language];
  const rtl = language === "ar";
  const styles = useMemo(() => createStyles(palette, rtl), [palette, rtl]);
  const [notifications, setNotifications] = useState(notificationsEnabled);
  const [backgroundRefresh, setBackgroundRefresh] = useState(
    backgroundRefreshEnabled,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [localLocationPermission, setLocalLocationPermission] =
    useState<PermissionStatus>(() => normalizePermissionStatus(locationPermission));

  useEffect(() => setNotifications(notificationsEnabled), [notificationsEnabled]);
  useEffect(
    () => setBackgroundRefresh(backgroundRefreshEnabled),
    [backgroundRefreshEnabled],
  );
  useEffect(
    () => setLocalLocationPermission(normalizePermissionStatus(locationPermission)),
    [locationPermission],
  );

  const updateNotifications = (enabled: boolean) => {
    setNotifications(enabled);
    onNotificationsChange?.(enabled);
  };

  const updateBackgroundRefresh = (enabled: boolean) => {
    setBackgroundRefresh(enabled);
    onBackgroundRefreshChange?.(enabled);
  };

  const locationCopy = LOCATION_STATUS_COPY[language][localLocationPermission];
  const locationLabel = locationCopy.label;
  const locationTone = locationToneFor(localLocationPermission);
  const initials = profile.initials || getInitials(profile.name);
  const privacy = getPrivacyCenterCopy(language);

  const requestLocation = async () => {
    if (!onRequestLocationPermission || localLocationPermission === "pending") return;
    setLocalLocationPermission("pending");
    try {
      const result = await onRequestLocationPermission();
      if (result && isPermissionStatus(result)) setLocalLocationPermission(result);
    } catch {
      setLocalLocationPermission("unavailable");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, logicalRow(rtl, styles)]}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.back}
              onPress={onBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.backIcon, rtl && styles.backIconRtl]}>
                <Icon name="chevron" color={palette.ink} size={15} />
              </View>
              <Text style={[styles.backText, rtl && styles.textRight]}>
                {t.back}
              </Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Text style={[styles.headerMeta, rtl && styles.textRight]}>
            {t.version}
          </Text>
        </View>

        <View style={[styles.titleBlock, rtl && styles.alignEnd]}>
          <Text style={[styles.title, rtl && styles.textRight]}>{t.settings}</Text>
          <Text style={[styles.subtitle, rtl && styles.textRight]}>
            {t.subtitle}
          </Text>
        </View>

        <View style={[styles.profileSummary, logicalRow(rtl, styles)]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={[styles.profileName, rtl && styles.textRight]}>
              {profile.name}
            </Text>
            <Text style={[styles.profileHint, rtl && styles.textRight]}>
              {t.ridingPreferences}
            </Text>
          </View>
        </View>

        <SettingsSection
          title={t.language}
          hint={t.languageHint}
          styles={styles}
          rtl={rtl}
        >
          <SettingRow
            icon="route"
            title={t.language}
            description={t.languageHint}
            styles={styles}
            rtl={rtl}
          >
            <SegmentedControl
              value={language}
              options={[
                { value: "en" as const, label: t.english },
                { value: "ar" as const, label: t.arabic },
              ]}
              onChange={onLanguageChange}
              styles={styles}
              rtl={rtl}
              accessibilityLabel={t.language}
            />
          </SettingRow>
          {onDistanceUnitChange ? (
            <SettingRow
              icon="route"
              title={t.distanceUnits}
              description={t.distanceUnitsHint}
              styles={styles}
              rtl={rtl}
            >
              <SegmentedControl
                value={distanceUnit}
                options={[
                  { value: "km" as const, label: t.kilometres },
                  { value: "mi" as const, label: t.miles },
                ]}
                onChange={onDistanceUnitChange}
                styles={styles}
                rtl={rtl}
                accessibilityLabel={t.distanceUnits}
              />
            </SettingRow>
          ) : (
            <ActionRow
              icon="route"
              title={t.distanceUnits}
              description={t.distanceUnitsHint}
              actionLabel={t.editPreferences}
              onPress={onEditProfile}
              disabled={!onEditProfile}
              styles={styles}
              rtl={rtl}
              palette={palette}
              unavailableLabel={t.unavailable}
            />
          )}
        </SettingsSection>

        <SettingsSection
          title={t.appearance}
          hint={t.appearanceHint}
          styles={styles}
          rtl={rtl}
        >
          <SettingRow
            icon="wind"
            title={t.appearance}
            description={t.appearanceHint}
            styles={styles}
            rtl={rtl}
          >
            <SegmentedControl
              value={theme}
              options={[
                { value: "light" as const, label: t.light },
                { value: "dark" as const, label: t.dark },
              ]}
              onChange={onThemeChange}
              styles={styles}
              rtl={rtl}
              accessibilityLabel={t.appearance}
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection
          title={t.locationNotifications}
          hint={t.locationNotificationsHint}
          styles={styles}
          rtl={rtl}
        >
          <SettingRow
            icon="map"
            title={t.location}
            description={locationCopy.description}
            styles={styles}
            rtl={rtl}
          >
            <StatusBadge label={locationLabel} tone={locationTone} palette={palette} />
          </SettingRow>
          {localLocationPermission !== "granted" ? (
            <ActionRow
              icon="map"
              title={t.allowLocation}
              description={locationCopy.description}
              actionLabel={locationCopy.actionLabel}
              onPress={() => void requestLocation()}
              disabled={!onRequestLocationPermission || localLocationPermission === "pending"}
              styles={styles}
              rtl={rtl}
              palette={palette}
              unavailableLabel={
                localLocationPermission === "pending" ? t.requesting : t.unavailable
              }
            />
          ) : null}
          <SettingRow
            icon="pulse"
            title={t.notifications}
            description={t.notificationsHint}
            styles={styles}
            rtl={rtl}
          >
            <Toggle
              value={notifications}
              onChange={updateNotifications}
              label={`${t.notifications}: ${notifications ? t.enabled : t.disabled}`}
              palette={palette}
              styles={styles}
            />
          </SettingRow>
          <SettingRow
            icon="wind"
            title={t.backgroundRefresh}
            description={t.backgroundRefreshHint}
            styles={styles}
            rtl={rtl}
          >
            <Toggle
              value={backgroundRefresh}
              onChange={updateBackgroundRefresh}
              label={`${t.backgroundRefresh}: ${backgroundRefresh ? t.enabled : t.disabled}`}
              palette={palette}
              styles={styles}
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection title={t.data} hint={t.dataHint} styles={styles} rtl={rtl}>
          <ActionRow
            icon="route"
            title={t.privacyCenter}
            description={t.privacyCenterHint}
            actionLabel={t.manage}
            onPress={() => setPrivacyOpen(true)}
            disabled={false}
            styles={styles}
            rtl={rtl}
            palette={palette}
            unavailableLabel={t.unavailable}
          />
          <ActionRow
            icon="map"
            title={t.exportData}
            description={t.exportDataHint}
            actionLabel={t.shareOrDownload}
            onPress={onExportData}
            disabled={!onExportData}
            styles={styles}
            rtl={rtl}
            palette={palette}
            unavailableLabel={t.unavailable}
          />
        </SettingsSection>

        <View style={styles.deleteSection}>
          <Text style={[styles.deleteSectionTitle, rtl && styles.textRight]}>
            {t.deleteData}
          </Text>
          <Text style={[styles.deleteSectionHint, rtl && styles.textRight]}>
            {t.deleteDataHint}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.deleteData}
            accessibilityHint={t.deleteDataHint}
            accessibilityState={{ disabled: !onDeleteData }}
            disabled={!onDeleteData}
            onPress={() => setConfirmDelete(true)}
            style={({ pressed }) => [
              styles.destructiveRow,
              logicalRow(rtl, styles),
              !onDeleteData && styles.disabled,
              pressed && onDeleteData && styles.pressed,
            ]}
          >
            <View style={styles.destructiveIcon}>
              <Icon name="stop" color={palette.caution} size={16} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={[styles.destructiveTitle, rtl && styles.textRight]}>
                {t.deleteData}
              </Text>
              <Text style={[styles.rowDescription, rtl && styles.textRight]}>
                {t.deleteDataHint}
              </Text>
            </View>
            {onDeleteData ? (
              <Icon name="chevron" color={palette.caution} size={15} />
            ) : (
              <Text style={[styles.unavailableText, rtl && styles.textRight]}>
                {t.unavailable}
              </Text>
            )}
          </Pressable>
          {confirmDelete ? (
            <ConfirmationPanel
              title={t.deleteTitle}
              body={t.deleteBody}
              cancelLabel={t.keepData}
              confirmLabel={t.deletePermanently}
              onCancel={() => setConfirmDelete(false)}
              onConfirm={() => {
                setConfirmDelete(false);
                onDeleteData?.();
              }}
              styles={styles}
              rtl={rtl}
              palette={palette}
              destructive
            />
          ) : null}
        </View>
      </ScrollView>
      <PrivacyCenter
        visible={privacyOpen}
        language={language}
        palette={palette}
        content={privacy}
        stravaStatus={stravaStatus}
        onClose={() => setPrivacyOpen(false)}
      />
    </SafeAreaView>
  );
}

export function PrivacyCenter({
  visible,
  language,
  palette,
  content,
  stravaStatus = STRAVA_CONNECTION_STATE,
  onClose,
}: {
  visible: boolean;
  language: Language;
  palette: Palette;
  content: PrivacyCenterCopy;
  stravaStatus?: StravaConnectionState;
  onClose: () => void;
}) {
  const rtl = language === "ar";
  const t = COPY[language];
  const styles = useMemo(() => createStyles(palette, rtl), [palette, rtl]);
  const strava = getStravaDisclosure(language, stravaStatus);
  const titleId = `privacy-center-title-${language}`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View
          accessible
          accessibilityRole="none"
          accessibilityLabel={content.title}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          role="dialog"
          aria-modal={true}
          aria-labelledby={titleId}
          style={styles.privacyModal}
        >
          <View style={[styles.privacyHeader, logicalRow(rtl, styles)]}>
            <Text
              nativeID={titleId}
              accessibilityRole="header"
              role="heading"
              style={[styles.privacyTitle, rtl && styles.textRight]}
            >
              {content.title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.close}
              onPress={onClose}
              style={({ pressed }) => [
                styles.privacyClose,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.privacyCloseText, rtl && styles.textRight]}>
                {t.close}
              </Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.privacyScroll}
            contentContainerStyle={styles.privacyContent}
            showsVerticalScrollIndicator
          >
            <Text style={[styles.privacyIntro, rtl && styles.textRight]}>
              {content.intro}
            </Text>
            <PrivacySection section={content.storedData} styles={styles} rtl={rtl} />
            <PrivacySection section={content.temporaryData} styles={styles} rtl={rtl} />
            <PrivacySection section={content.locationTiming} styles={styles} rtl={rtl} />
            <PrivacySection
              section={content.routeMatching}
              meta={`${content.routeMatching.providerName}\n${content.routeMatching.coordinates}\n${content.routeMatching.retention}\n${content.routeMatching.providerUrls.join("\n")}`}
              styles={styles}
              rtl={rtl}
            />
            <PrivacySection
              section={content.weatherRefresh}
              meta={`${content.weatherRefresh.providerName}\n${content.weatherRefresh.coordinates}\n${content.weatherRefresh.retention}\n${content.weatherRefresh.providerUrls.join("\n")}`}
              styles={styles}
              rtl={rtl}
            />
            <PrivacySection section={content.retention} styles={styles} rtl={rtl} />
            <PrivacySection section={content.exportShare} styles={styles} rtl={rtl} />
            <PrivacySection section={content.deletion} styles={styles} rtl={rtl} />
            <PrivacySection
              section={{ title: strava.title, body: strava.body }}
              meta={`${strava.statusLabel} · ${strava.actionLabel}`}
              styles={styles}
              rtl={rtl}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PrivacySection({
  section,
  meta,
  styles,
  rtl,
}: {
  section: { title: string; body: string };
  meta?: string;
  styles: ReturnType<typeof createStyles>;
  rtl: boolean;
}) {
  return (
    <View style={styles.privacySection}>
      <Text style={[styles.privacySectionTitle, rtl && styles.textRight]}>
        {section.title}
      </Text>
      <Text style={[styles.privacyBody, rtl && styles.textRight]}>
        {section.body}
      </Text>
      {meta ? (
        <Text selectable style={[styles.privacyMeta, rtl && styles.textRight]}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

function SettingsSection({
  title,
  hint,
  styles,
  rtl,
  children,
}: {
  title: string;
  hint: string;
  styles: ReturnType<typeof createStyles>;
  rtl: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeading, rtl && styles.alignEnd]}>
        <Text style={[styles.sectionTitle, rtl && styles.textRight]}>{title}</Text>
        <Text style={[styles.sectionHint, rtl && styles.textRight]}>{hint}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  description,
  styles,
  rtl,
  children,
}: {
  icon: IconName;
  title: string;
  description: string;
  styles: ReturnType<typeof createStyles>;
  rtl: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.settingRow, logicalRow(rtl, styles)]}>
      <View style={styles.settingIcon}>
        <Icon name={icon} color={styles.iconColor.color} size={17} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, rtl && styles.textRight]}>{title}</Text>
        <Text style={[styles.rowDescription, rtl && styles.textRight]}>
          {description}
        </Text>
      </View>
      <View style={styles.rowAccessory}>{children}</View>
    </View>
  );
}

function ActionRow({
  icon,
  title,
  description,
  actionLabel,
  onPress,
  disabled,
  styles,
  rtl,
  palette,
  unavailableLabel,
}: {
  icon: IconName;
  title: string;
  description: string;
  actionLabel: string;
  onPress?: () => void;
  disabled: boolean;
  styles: ReturnType<typeof createStyles>;
  rtl: boolean;
  palette: Palette;
  unavailableLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        logicalRow(rtl, styles),
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.settingIcon}>
        <Icon
          name={icon}
          color={disabled ? palette.muted : palette.accent}
          size={17}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, disabled && styles.disabledText, rtl && styles.textRight]}>
          {title}
        </Text>
        <Text style={[styles.rowDescription, rtl && styles.textRight]}>
          {description}
        </Text>
      </View>
      <View style={[styles.inlineAction, disabled && styles.inlineActionDisabled]}>
        <Text style={[styles.inlineActionText, disabled && styles.disabledText]}>
          {disabled ? unavailableLabel : actionLabel}
        </Text>
      </View>
    </Pressable>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  styles,
  rtl,
  accessibilityLabel,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange?: (value: T) => void;
  styles: ReturnType<typeof createStyles>;
  rtl: boolean;
  accessibilityLabel: string;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.segmented, logicalRow(rtl, styles)]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{
              checked: selected,
              selected,
              disabled: !onChange,
            }}
            aria-checked={selected}
            disabled={!onChange}
            hitSlop={4}
            onPress={() => onChange?.(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                selected && styles.segmentTextSelected,
                rtl && styles.arabicText,
                rtl && styles.textRight,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Toggle({
  value,
  onChange,
  label,
  palette,
  styles,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  palette: Palette;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.toggle,
        value && {
          backgroundColor: palette.accent,
          borderColor: palette.accent,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
    </Pressable>
  );
}

function ConfirmationPanel({
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  styles,
  rtl,
  palette,
  destructive = false,
}: {
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  styles: ReturnType<typeof createStyles>;
  rtl: boolean;
  palette: Palette;
  destructive?: boolean;
}) {
  return (
    <View
      style={[
        styles.confirmation,
        destructive && styles.confirmationDanger,
        rtl && styles.alignEnd,
      ]}
    >
      <Text style={[styles.confirmationTitle, rtl && styles.textRight]}>
        {title}
      </Text>
      <Text style={[styles.confirmationBody, rtl && styles.textRight]}>
        {body}
      </Text>
      <View style={[styles.confirmationActions, logicalRow(rtl, styles)]}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.secondaryButtonText, rtl && styles.textRight]}>
            {cancelLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onConfirm}
          style={({ pressed }) => [
            styles.dangerButton,
            { borderColor: palette.caution, backgroundColor: palette.cautionSoft },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.dangerButtonText, rtl && styles.textRight]}>
            {confirmLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function normalizePermissionStatus(status: PermissionStatus): PermissionStatus {
  return status === "granted" ||
    status === "denied" ||
    status === "pending" ||
    status === "unavailable" ||
    status === "undetermined" ||
    status === "limited"
    ? status
    : "undetermined";
}

function isPermissionStatus(value: unknown): value is PermissionStatus {
  return (
    value === "granted" ||
    value === "denied" ||
    value === "pending" ||
    value === "unavailable" ||
    value === "undetermined" ||
    value === "limited"
  );
}

function locationToneFor(status: PermissionStatus) {
  if (status === "granted") return "success" as const;
  if (status === "denied" || status === "unavailable") return "danger" as const;
  return "warning" as const;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "N";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function logicalRow(
  rtl: boolean,
  styles: ReturnType<typeof createStyles>,
) {
  return rtl && Platform.OS !== "web" ? styles.rowRtl : undefined;
}

function createStyles(palette: Palette, rtl: boolean) {
  const regular = rtl ? FONT_ARABIC_REGULAR : FONT_REGULAR;
  const medium = rtl ? FONT_ARABIC_MEDIUM : FONT_MEDIUM;
  const semibold = rtl ? FONT_ARABIC_SEMIBOLD : FONT_SEMIBOLD;
  const bold = rtl ? FONT_ARABIC_BOLD : FONT_BOLD;
  const extraBold = rtl ? FONT_ARABIC_BOLD : FONT_EXTRABOLD;

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    content: {
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 48,
      gap: 20,
    },
    modalBackdrop: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      backgroundColor: "rgba(0, 0, 0, 0.72)",
    },
    privacyModal: {
      width: "100%",
      maxWidth: 720,
      maxHeight: "88%",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 20,
      backgroundColor: palette.panel,
    },
    privacyHeader: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderBottomColor: palette.line,
    },
    privacyTitle: {
      flex: 1,
      color: palette.ink,
      fontFamily: bold,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: "900",
    },
    privacyClose: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 10,
    },
    privacyCloseText: {
      color: palette.ink,
      fontFamily: semibold,
      fontSize: 11,
      lineHeight: 17,
      fontWeight: "800",
    },
    privacyScroll: { flexShrink: 1 },
    privacyContent: { gap: 14, padding: 18, paddingBottom: 24 },
    privacyIntro: {
      color: palette.ink,
      fontFamily: regular,
      fontSize: 13,
      lineHeight: 20,
    },
    privacySection: {
      gap: 5,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: palette.line,
    },
    privacySectionTitle: {
      color: palette.ink,
      fontFamily: semibold,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "800",
    },
    privacyBody: {
      color: palette.muted,
      fontFamily: regular,
      fontSize: 12,
      lineHeight: 19,
    },
    privacyMeta: {
      color: palette.accent,
      fontFamily: medium,
      fontSize: 10,
      lineHeight: 16,
    },
    header: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    rowRtl: { flexDirection: "row-reverse" },
    alignEnd: { alignItems: "flex-end" },
    textRight: { textAlign: "right" },
    backButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 6,
      borderRadius: 12,
    },
    backIcon: { transform: [{ rotate: "180deg" }] },
    backIconRtl: { transform: [{ rotate: "0deg" }] },
    backText: {
      color: palette.ink,
      fontFamily: semibold,
      fontSize: 12,
      fontWeight: "800",
    },
    headerMeta: {
      color: palette.muted,
      fontFamily: medium,
      fontSize: 10,
      fontWeight: "700",
    },
    titleBlock: { gap: 7, paddingTop: 4 },
    title: {
      color: palette.ink,
      fontFamily: extraBold,
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "900",
      letterSpacing: -0.6,
    },
    subtitle: {
      maxWidth: 520,
      color: palette.muted,
      fontFamily: regular,
      fontSize: 13,
      lineHeight: 20,
    },
    profileSummary: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 4,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.accent,
    },
    avatarText: {
      color: palette.bg,
      fontFamily: extraBold,
      fontSize: 17,
      fontWeight: "900",
    },
    profileCopy: { flex: 1, minWidth: 0, gap: 3 },
    profileName: {
      color: palette.ink,
      fontFamily: bold,
      fontSize: 16,
      lineHeight: 23,
      fontWeight: "900",
    },
    profileHint: {
      color: palette.muted,
      fontFamily: regular,
      fontSize: 12,
      lineHeight: 18,
    },
    section: { gap: 10 },
    sectionHeading: { gap: 4, paddingHorizontal: 2 },
    sectionTitle: {
      color: palette.ink,
      fontFamily: bold,
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "900",
    },
    sectionHint: {
      color: palette.muted,
      fontFamily: regular,
      fontSize: 12,
      lineHeight: 18,
    },
    sectionBody: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 18,
      backgroundColor: palette.panel,
    },
    settingRow: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.line,
    },
    settingIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.accentSoft,
    },
    iconColor: { color: palette.accent },
    rowCopy: { flex: 1, minWidth: 0, gap: 3 },
    rowTitle: {
      color: palette.ink,
      fontFamily: semibold,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "800",
    },
    rowDescription: {
      color: palette.muted,
      fontFamily: regular,
      fontSize: 11,
      lineHeight: 17,
    },
    rowAccessory: {
      flexShrink: 1,
      minWidth: 0,
      maxWidth: "58%",
      alignItems: "stretch",
    },
    segmented: {
      width: "100%",
      minHeight: 44,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "stretch",
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 11,
      padding: 3,
      backgroundColor: palette.bg,
    },
    segment: {
      minHeight: 38,
      minWidth: 56,
      flexGrow: 1,
      flexBasis: 56,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 7,
      borderRadius: 8,
    },
    segmentSelected: { backgroundColor: palette.ink },
    segmentText: {
      color: palette.muted,
      fontFamily: semibold,
      fontSize: 10,
      lineHeight: 16,
      fontWeight: "800",
    },
    segmentTextSelected: { color: palette.bg },
    arabicText: { fontFamily: FONT_ARABIC_SEMIBOLD, fontSize: 11, lineHeight: 18 },
    toggle: {
      width: 56,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: palette.line,
      padding: 5,
      justifyContent: "center",
      backgroundColor: palette.bg,
    },
    toggleKnob: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: palette.muted,
    },
    toggleKnobOn: { alignSelf: "flex-end", backgroundColor: palette.bg },
    inlineAction: {
      minHeight: 36,
      minWidth: 62,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: 10,
    },
    inlineActionDisabled: { borderColor: palette.line },
    inlineActionText: {
      color: palette.accent,
      fontFamily: semibold,
      fontSize: 10,
      lineHeight: 16,
      fontWeight: "800",
    },
    deleteSection: {
      gap: 9,
      padding: 14,
      borderWidth: 1,
      borderColor: palette.caution,
      borderRadius: 18,
      backgroundColor: palette.cautionSoft,
    },
    deleteSectionTitle: {
      color: palette.caution,
      fontFamily: bold,
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "900",
    },
    deleteSectionHint: {
      color: palette.ink,
      fontFamily: regular,
      fontSize: 12,
      lineHeight: 18,
    },
    destructiveRow: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingHorizontal: 4,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: palette.caution,
    },
    destructiveIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.bg,
    },
    destructiveTitle: {
      color: palette.caution,
      fontFamily: semibold,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "800",
    },
    disabled: { opacity: 0.6 },
    disabledText: { color: palette.muted },
    unavailableText: {
      color: palette.muted,
      fontFamily: medium,
      fontSize: 10,
      lineHeight: 16,
      fontWeight: "700",
    },
    confirmation: {
      marginTop: 4,
      padding: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 14,
      backgroundColor: palette.bg,
    },
    confirmationDanger: { borderColor: palette.caution },
    confirmationTitle: {
      color: palette.ink,
      fontFamily: bold,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "900",
    },
    confirmationBody: {
      color: palette.muted,
      fontFamily: regular,
      fontSize: 11,
      lineHeight: 17,
    },
    confirmationActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 4,
    },
    secondaryButton: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 11,
      backgroundColor: palette.panel,
    },
    secondaryButtonText: {
      color: palette.ink,
      fontFamily: semibold,
      fontSize: 11,
      lineHeight: 17,
      fontWeight: "800",
    },
    dangerButton: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 11,
    },
    dangerButtonText: {
      color: palette.caution,
      fontFamily: semibold,
      fontSize: 11,
      lineHeight: 17,
      fontWeight: "800",
    },
    pressed: { opacity: 0.72 },
  });
}

export default SettingsScreen;
