import { Platform, Pressable, Text, View } from "react-native";
import { Icon } from "../Icon";
import { createScreenStyles } from "../screenStyles";
import type { ActivityDraft } from "../domain";
import {
  type ProfileAction,
  type ProfileScreenProps,
  type RouteCollection,
  type RouteCollectionKind,
  type RouteSurfaceItem,
} from "../screenTypes";

type ProfileCopy = {
  title: string;
  subtitle: string;
  rider: string;
  routesTitle: string;
  routesHint: string;
  planRoute: string;
  viewAll: string;
  importedRoutes: string;
  viewImports: string;
  emptyRoutes: string;
  savedRidesTitle: string;
  savedRidesHint: string;
  emptyRides: string;
  emptyRidesHint: string;
  connectionsPrivacyTitle: string;
  connectionsPrivacyHint: string;
  historyTitle: string;
  historyDescription: string;
  noConnection: string;
  privacyTitle: string;
  privacyDescription: string;
  settingsTitle: string;
  settingsDescription: string;
  open: string;
  openRoute: string;
  km: string;
  recordingOnly: string;
  sample: string;
  yours: string;
  imported: string;
  routePreview: string;
  roadRouteReady: string;
  routeVersion: string;
  openRide: string;
  rideSummary: string;
  routeSnapshot: string;
  forecastSnapshot: string;
  noForecastSnapshot: string;
};

type ProfileScreenPropsWithActivities = ProfileScreenProps & {
  /** Task 9 supplies the summary destination without changing this screen's presentation contract. */
  onOpenActivity?: (activity: ActivityDraft) => void;
};

const PROFILE_COPY: Record<"en" | "ar", ProfileCopy> = {
  en: {
    title: "You",
    subtitle: "Saved routes, rides, and preferences.",
    rider: "Rider",
    routesTitle: "My routes",
    routesHint: "Routes you save for your rides.",
    planRoute: "Plan a route",
    viewAll: "View all",
    importedRoutes: "Imported routes",
    viewImports: "View imports",
    emptyRoutes: "No saved routes yet.",
    savedRidesTitle: "Saved rides",
    savedRidesHint: "Rides you choose to save.",
    emptyRides: "No saved rides yet.",
    emptyRidesHint: "Complete a ride and choose Save ride to keep it here.",
    connectionsPrivacyTitle: "Connections & privacy",
    connectionsPrivacyHint: "Optional history and privacy controls.",
    historyTitle: "Strava history (optional)",
    historyDescription:
      "Import past rides after you choose to connect it. It does not provide live location to Naseem.",
    noConnection: "No history connection is active.",
    privacyTitle: "Privacy & data",
    privacyDescription: "See what the app stores and how location is used.",
    settingsTitle: "Settings",
    settingsDescription: "Language, units, appearance, and ride preferences.",
    open: "Open",
    openRoute: "Open route",
    km: "km",
    recordingOnly: "Recording without a planned route",
    sample: "Sample",
    yours: "Yours",
    imported: "Imported",
    routePreview: "Route preview",
    roadRouteReady: "Road route ready",
    routeVersion: "Route version",
    openRide: "Open ride",
    rideSummary: "Ride summary",
    routeSnapshot: "Route snapshot",
    forecastSnapshot: "Forecast snapshot saved",
    noForecastSnapshot: "No forecast snapshot",
  },
  ar: {
    title: "ملفك المحلي",
    subtitle: "مساراتك ورحلاتك وتفضيلاتك.",
    rider: "راكب",
    routesTitle: "مساراتي",
    routesHint: "المسارات التي تحفظها لرحلاتك.",
    planRoute: "خطّط لمسار",
    viewAll: "عرض الكل",
    importedRoutes: "المسارات المستوردة",
    viewImports: "عرض الاستيرادات",
    emptyRoutes: "لا توجد مسارات محفوظة بعد.",
    savedRidesTitle: "الرحلات المحفوظة",
    savedRidesHint: "الرحلات التي تختار حفظها.",
    emptyRides: "لا توجد رحلات محفوظة بعد.",
    emptyRidesHint: "أكمل رحلة واختر حفظ الرحلة لتظهر هنا.",
    connectionsPrivacyTitle: "الاتصالات والخصوصية",
    connectionsPrivacyHint: "سجل اختياري وأدوات للخصوصية.",
    historyTitle: "سجل رحلات Strava (اختياري)",
    historyDescription:
      "استورد رحلاتك السابقة بعد اختيار الربط. ولا يوفر موقعك المباشر لنسيم.",
    noConnection: "لا يوجد اتصال بسجل الرحلات.",
    privacyTitle: "الخصوصية والبيانات",
    privacyDescription: "تعرّف على ما يحفظه التطبيق وكيف يُستخدم الموقع.",
    settingsTitle: "الإعدادات",
    settingsDescription: "اللغة والوحدات والمظهر وتفضيلات الرحلة.",
    open: "فتح",
    openRoute: "فتح المسار",
    km: "كم",
    recordingOnly: "تسجيل بدون مسار مخطط",
    sample: "عينة",
    yours: "مسارك",
    imported: "مستورد",
    routePreview: "معاينة المسار",
    roadRouteReady: "مسار طرق جاهز",
    routeVersion: "إصدار المسار",
    openRide: "فتح الرحلة",
    rideSummary: "ملخص الرحلة",
    routeSnapshot: "لقطة المسار",
    forecastSnapshot: "لقطة التوقعات محفوظة",
    noForecastSnapshot: "لا توجد لقطة توقعات",
  },
};

export function ProfileScreen({
  palette,
  rtl = false,
  formatNumber,
  formatTime,
  distanceDisplay,
  profile,
  collections = [],
  activities = [],
  connection,
  onOpenCollection,
  onOpenRoute,
  onConnectionAction,
  onPrivacyAction,
  onSettingsAction,
  onOpenActivity,
}: ProfileScreenPropsWithActivities) {
  const styles = createScreenStyles(palette, rtl);
  const text = PROFILE_COPY[rtl ? "ar" : "en"];
  const routes = collectionFor("my-routes", collections);
  const imports = collectionFor("imports", collections);
  const visibleImports = imports?.items.length ? imports : undefined;

  return (
    <View style={[styles.screen, rtl && styles.screenRtl]}>
      <View style={styles.intro}>
        <Text style={[styles.title, rtl && styles.textRight]}>
          {text.title}
        </Text>
        <Text style={[styles.subtitle, rtl && styles.textRight]}>
          {text.subtitle}
        </Text>
      </View>

      <View
        style={[styles.profileHeader, logicalRow(rtl, styles)]}
        accessibilityLabel={profile.name || text.rider}
      >
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {initials(profile.name || text.rider)}
          </Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={[styles.profileName, rtl && styles.textRight]}>
            {profile.name || text.rider}
          </Text>
          {profile.detail ? (
            <Text style={[styles.profileDetail, rtl && styles.textRight]}>
              {profile.detail}
            </Text>
          ) : null}
        </View>
      </View>

      <RoutesSection
        collection={routes}
        imports={visibleImports}
        styles={styles}
        rtl={rtl}
        text={text}
        palette={palette}
        formatNumber={formatNumber}
        distanceDisplay={distanceDisplay}
        onOpenCollection={onOpenCollection}
        onOpenRoute={onOpenRoute}
      />

      <ActivitySection
        activities={activities}
        styles={styles}
        rtl={rtl}
        text={text}
        formatNumber={formatNumber}
        distanceDisplay={distanceDisplay}
        formatTime={formatTime}
        onOpenActivity={onOpenActivity}
      />

      <View style={styles.profileSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
            {text.connectionsPrivacyTitle}
          </Text>
          <Text style={[styles.sectionDescription, rtl && styles.textRight]}>
            {text.connectionsPrivacyHint}
          </Text>
        </View>
        <View style={styles.profileList}>
          <ConnectionRow
            connection={connection}
            styles={styles}
            palette={palette}
            rtl={rtl}
            text={text}
            onPress={onConnectionAction}
          />
          <ProfileActionRow
            action={{
              id: "privacy",
              icon: "map",
              title: text.privacyTitle,
              description: text.privacyDescription,
              actionLabel: onPrivacyAction ? text.open : undefined,
            }}
            styles={styles}
            palette={palette}
            rtl={rtl}
            onPress={onPrivacyAction}
          />
          <ProfileActionRow
            action={{
              id: "settings",
              icon: "settings",
              title: text.settingsTitle,
              description: text.settingsDescription,
              actionLabel: onSettingsAction ? text.open : undefined,
            }}
            styles={styles}
            palette={palette}
            rtl={rtl}
            onPress={onSettingsAction}
          />
        </View>
      </View>
    </View>
  );
}

function RoutesSection({
  collection,
  imports,
  styles,
  rtl,
  text,
  palette,
  formatNumber,
  distanceDisplay,
  onOpenCollection,
  onOpenRoute,
}: {
  collection?: RouteCollection;
  imports?: RouteCollection;
  styles: ReturnType<typeof createScreenStyles>;
  rtl: boolean;
  text: ProfileCopy;
  palette: ProfileScreenProps["palette"];
  formatNumber?: ProfileScreenProps["formatNumber"];
  distanceDisplay: ProfileScreenProps["distanceDisplay"];
  onOpenCollection?: ProfileScreenProps["onOpenCollection"];
  onOpenRoute?: ProfileScreenProps["onOpenRoute"];
}) {
  const routeItems = collection?.items ?? [];
  return (
    <View style={styles.profileSection}>
      <View style={[styles.sectionHeader, logicalRow(rtl, styles)]}>
        <View style={styles.profileCopy}>
          <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
            {text.routesTitle}
          </Text>
          <Text style={[styles.sectionDescription, rtl && styles.textRight]}>
            {text.routesHint}
          </Text>
        </View>
        {onOpenCollection ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              routeItems.length ? text.viewAll : text.planRoute
            }
            onPress={() => onOpenCollection("my-routes")}
            style={styles.linkButton}
          >
            <Text style={[styles.linkButtonText, rtl && styles.textRight]}>
              {routeItems.length ? text.viewAll : text.planRoute}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.profileList}>
        {routeItems.length ? (
          routeItems.map((item) => (
            <ProfileRouteRow
              key={item.route.id}
              item={item}
              styles={styles}
              rtl={rtl}
              text={text}
              palette={palette}
              formatNumber={formatNumber}
              distanceDisplay={distanceDisplay}
              onOpen={onOpenRoute}
            />
          ))
        ) : (
          <Text style={[styles.collectionEmpty, rtl && styles.textRight]}>
            {text.emptyRoutes}
          </Text>
        )}
      </View>

      {imports ? (
        <View style={{ marginTop: 4 }}>
          <View style={[styles.sectionHeader, logicalRow(rtl, styles)]}>
            <Text style={[styles.sectionDescription, rtl && styles.textRight]}>
              {text.importedRoutes}
            </Text>
            {onOpenCollection ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text.viewImports}
                onPress={() => onOpenCollection("imports")}
                style={styles.linkButton}
              >
                <Text style={[styles.linkButtonText, rtl && styles.textRight]}>
                  {text.viewImports}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.profileList}>
            {imports.items.map((item) => (
              <ProfileRouteRow
                key={item.route.id}
                item={item}
                styles={styles}
                rtl={rtl}
                text={text}
                palette={palette}
                formatNumber={formatNumber}
                distanceDisplay={distanceDisplay}
                onOpen={onOpenRoute}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ActivitySection({
  activities,
  styles,
  rtl,
  text,
  formatNumber,
  distanceDisplay,
  formatTime,
  onOpenActivity,
}: {
  activities: ActivityDraft[];
  styles: ReturnType<typeof createScreenStyles>;
  rtl: boolean;
  text: ProfileCopy;
  formatNumber?: ProfileScreenProps["formatNumber"];
  distanceDisplay: ProfileScreenProps["distanceDisplay"];
  formatTime?: ProfileScreenProps["formatTime"];
  onOpenActivity?: (activity: ActivityDraft) => void;
}) {
  const saved = activities
    .filter((activity) => activity.completionState === "saved")
    .slice()
    .sort((first, second) => second.endedAt.localeCompare(first.endedAt));

  return (
    <View style={styles.profileSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
          {text.savedRidesTitle}
        </Text>
        <Text style={[styles.sectionDescription, rtl && styles.textRight]}>
          {text.savedRidesHint}
        </Text>
      </View>
      <View style={styles.profileList}>
        {saved.length ? (
          saved.map((activity) => {
            const routeName = activity.routeSnapshot
              ? rtl && activity.routeSnapshot.nameAr
                ? activity.routeSnapshot.nameAr
                : activity.routeSnapshot.name
              : text.recordingOnly;
            const distance = distanceDisplay.formatDistance(
              activity.distanceMeters / 1000,
            );
            const ended = formatTime
              ? formatTime(activity.endedAt)
              : activity.endedAt;
            const routeVersion = activity.routeSnapshot?.revision
              ? `${text.routeVersion} ${formatNumber ? formatNumber(activity.routeSnapshot.revision) : activity.routeSnapshot.revision}`
              : undefined;
            const routeSnapshotLabel = activity.routeSnapshot
              ? [text.routeSnapshot, routeVersion]
                  .filter(Boolean)
                  .join(" · ")
              : text.recordingOnly;
            const forecastSnapshotLabel = activity.forecastSnapshot
              ? text.forecastSnapshot
              : text.noForecastSnapshot;
            const content = (
              <>
                <View style={styles.collectionDot} />
                <View style={styles.profileActionCopy}>
                  <Text
                    style={[styles.profileActionTitle, rtl && styles.textRight]}
                    numberOfLines={2}
                  >
                    {routeName}
                  </Text>
                  <Text
                    style={[
                      styles.profileActionDescription,
                      rtl && styles.textRight,
                    ]}
                    numberOfLines={2}
                  >
                    {distance} · {ended}
                  </Text>
                  <Text
                    style={[
                      styles.profileActionDescription,
                      rtl && styles.textRight,
                    ]}
                    numberOfLines={2}
                  >
                    {routeSnapshotLabel} · {forecastSnapshotLabel}
                  </Text>
                </View>
                {onOpenActivity ? (
                  <Text style={[styles.profileActionLink, rtl && styles.textRight]}>
                    {text.open}
                  </Text>
                ) : null}
              </>
            );
            if (!onOpenActivity) {
              return (
                <View
                  key={activity.id}
                  style={[styles.profileActionRow, logicalRow(rtl, styles)]}
                >
                  {content}
                </View>
              );
            }
            return (
              <Pressable
                key={activity.id}
                testID={`saved-ride-${activity.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${text.openRide}: ${routeName} · ${text.rideSummary}`}
                onPress={() => onOpenActivity(activity)}
                style={({ pressed }) => [
                  styles.profileActionRow,
                  logicalRow(rtl, styles),
                  pressed && styles.disabled,
                ]}
              >
                {content}
              </Pressable>
            );
          })
        ) : (
          <View style={styles.collectionEmpty}>
            <Text
              style={[styles.profileActionDescription, rtl && styles.textRight]}
            >
              {text.emptyRides}
            </Text>
            <Text
              style={[styles.profileActionDescription, rtl && styles.textRight]}
            >
              {text.emptyRidesHint}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ConnectionRow({
  connection,
  styles,
  palette,
  rtl,
  text,
  onPress,
}: {
  connection: ProfileScreenProps["connection"];
  styles: ReturnType<typeof createScreenStyles>;
  palette: ProfileScreenProps["palette"];
  rtl: boolean;
  text: ProfileCopy;
  onPress?: ProfileScreenProps["onConnectionAction"];
}) {
  const title = connection
    ? rtl
      ? `سجل رحلات ${connection.providerLabel} (اختياري)`
      : `${connection.providerLabel} history (optional)`
    : text.historyTitle;
  const description = connection
    ? [connection.statusLabel, text.historyDescription]
        .filter(Boolean)
        .join(" · ")
    : text.noConnection;
  return (
    <ProfileActionRow
      action={{
        id: "history",
        icon: "person",
        title,
        description,
        actionLabel: onPress
          ? connection?.actionLabel ?? text.open
          : undefined,
      }}
      styles={styles}
      palette={palette}
      rtl={rtl}
      onPress={onPress}
    />
  );
}

function ProfileRouteRow({
  item,
  styles,
  rtl,
  text,
  palette,
  formatNumber,
  distanceDisplay,
  onOpen,
}: {
  item: RouteSurfaceItem;
  styles: ReturnType<typeof createScreenStyles>;
  rtl: boolean;
  text: ProfileCopy;
  palette: ProfileScreenProps["palette"];
  formatNumber?: ProfileScreenProps["formatNumber"];
  distanceDisplay: ProfileScreenProps["distanceDisplay"];
  onOpen?: ProfileScreenProps["onOpenRoute"];
}) {
  const name =
    rtl && item.route.nameAr
      ? item.route.nameAr
      : item.display?.name ?? item.route.name;
  const collectionLabel =
    item.meta.origin === "gpx"
      ? text.imported
      : item.meta.ownership === "catalog"
        ? text.sample
        : text.yours;
  const sourceLabel =
    item.meta.sourceLabel ?? item.meta.provenanceLabel ?? text.routePreview;
  const geometryLabel =
    item.meta.geometryLabel ??
    (item.meta.geometryKind === "road_matched" &&
    item.meta.geometryStatus === "ready"
      ? text.roadRouteReady
      : item.meta.origin === "gpx"
        ? text.imported
        : text.routePreview);
  const distance =
    item.display?.distance ?? distanceDisplay.formatDistance(item.route.distanceKm);
  const routeVersion =
    item.meta.revision !== undefined
      ? `${text.routeVersion} ${formatNumber ? formatNumber(item.meta.revision) : item.meta.revision}`
      : undefined;
  const meta = [
    collectionLabel,
    sourceLabel,
    geometryLabel,
    distance,
    item.display?.movingTime,
    routeVersion,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text.openRoute}: ${name}`}
      accessibilityState={{ disabled: !onOpen }}
      onPress={onOpen ? () => onOpen(item) : undefined}
      disabled={!onOpen}
      style={[
        styles.profileActionRow,
        logicalRow(rtl, styles),
        !onOpen && styles.disabled,
      ]}
    >
      <View style={styles.collectionDot} />
      <View style={styles.profileActionCopy}>
        <Text
          style={[styles.profileActionTitle, rtl && styles.textRight]}
          numberOfLines={2}
        >
          {name}
        </Text>
        <Text
          style={[styles.profileActionDescription, rtl && styles.textRight]}
          numberOfLines={2}
        >
          {meta}
        </Text>
      </View>
      <View
        style={{
          minWidth: 18,
          alignItems: "center",
          transform: [{ rotate: rtl ? "180deg" : "0deg" }],
        }}
      >
        <Icon name="chevron" color={palette.accent} size={14} />
      </View>
    </Pressable>
  );
}

function ProfileActionRow({
  action,
  styles,
  palette,
  rtl,
  onPress,
}: {
  action: ProfileAction;
  styles: ReturnType<typeof createScreenStyles>;
  palette: ProfileScreenProps["palette"];
  rtl: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.profileActionIcon}>
        <Icon name={action.icon} color={palette.accent} size={17} />
      </View>
      <View style={styles.profileActionCopy}>
        <Text style={[styles.profileActionTitle, rtl && styles.textRight]}>
          {action.title}
        </Text>
        <Text
          style={[styles.profileActionDescription, rtl && styles.textRight]}
          numberOfLines={3}
        >
          {action.description}
        </Text>
      </View>
      {action.actionLabel ? (
        <Text style={[styles.profileActionLink, rtl && styles.textRight]}>
          {action.actionLabel}
        </Text>
      ) : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={[styles.profileActionRow, logicalRow(rtl, styles)]}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.title}
      accessibilityState={{ disabled: false }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.profileActionRow,
        logicalRow(rtl, styles),
        pressed && styles.disabled,
      ]}
    >
      {content}
    </Pressable>
  );
}

function collectionFor(
  kind: RouteCollectionKind,
  collections: RouteCollection[],
) {
  return collections.find((collection) => collection.kind === kind);
}

function logicalRow(
  rtl: boolean,
  styles: ReturnType<typeof createScreenStyles>,
) {
  return rtl && Platform.OS !== "web" ? styles.rtlRow : undefined;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "N"
  );
}
