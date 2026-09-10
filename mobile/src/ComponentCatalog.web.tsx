import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { MapPreview } from "./MapPreview";
import { Icon } from "./Icon";
import { componentVocabulary, referenceSites } from "./componentVocabulary";
import { LIGHT } from "./designTokens";
import { NBH_LOOP } from "./seed";

type PreviewKind =
  | "shell"
  | "icon"
  | "intro"
  | "toggle"
  | "conditions"
  | "weatherRow"
  | "metric"
  | "window"
  | "map"
  | "mapChrome"
  | "primary"
  | "actions"
  | "routeOption"
  | "departure"
  | "timing"
  | "segment"
  | "evidence"
  | "live"
  | "connection"
  | "privacy"
  | "navigation";

type CatalogItem = {
  id: string;
  group: string;
  title: string;
  codeName: string;
  searchableName: string;
  aliases: string[];
  file: string;
  preview: PreviewKind;
  note?: string;
};

const palette = LIGHT;

const catalogItems: CatalogItem[] = [
  {
    id: "today-screen",
    group: "Screens",
    title: "Today screen",
    codeName: "TodayScreen",
    searchableName: "today dashboard",
    aliases: ["home screen", "weather dashboard", "ride forecast screen"],
    file: "mobile/App.tsx",
    preview: "conditions",
  },
  {
    id: "explore-screen",
    group: "Screens",
    title: "Explore screen",
    codeName: "ExploreScreen",
    searchableName: "route discovery screen",
    aliases: ["route builder", "explore routes", "route creation screen"],
    file: "mobile/App.tsx",
    preview: "routeOption",
  },
  {
    id: "route-screen",
    group: "Screens",
    title: "Route intelligence screen",
    codeName: "RouteScreen",
    searchableName: "route detail screen",
    aliases: [
      "route analysis",
      "wind intelligence screen",
      "route forecast screen",
    ],
    file: "mobile/App.tsx",
    preview: "segment",
  },
  {
    id: "live-screen",
    group: "Screens",
    title: "Live ride screen",
    codeName: "LiveScreen",
    searchableName: "live tracking screen",
    aliases: ["ride tracking", "GPS screen", "active ride screen"],
    file: "mobile/App.tsx",
    preview: "live",
  },
  {
    id: "riding-screen",
    group: "Screens",
    title: "My riding screen",
    codeName: "RidingScreen",
    searchableName: "profile and connections screen",
    aliases: ["account screen", "Strava screen", "privacy screen"],
    file: "mobile/App.tsx",
    preview: "connection",
  },
  {
    id: "app-shell",
    group: "Shell",
    title: "App shell",
    codeName: "App",
    searchableName: "application shell",
    aliases: ["main shell", "app frame", "root layout", "mobile app shell"],
    file: "mobile/App.tsx",
    preview: "shell",
  },
  {
    id: "top-bar",
    group: "Shell",
    title: "Top app bar",
    codeName: "styles.topbar",
    searchableName: "top navigation bar",
    aliases: ["header", "app header", "brand header", "top navigation"],
    file: "mobile/App.tsx",
    preview: "shell",
  },
  {
    id: "theme-toggle",
    group: "Shell",
    title: "Theme toggle",
    codeName: "styles.topAction",
    searchableName: "light dark mode toggle",
    aliases: ["dark mode switch", "theme button", "appearance toggle"],
    file: "mobile/App.tsx",
    preview: "toggle",
  },
  {
    id: "language-toggle",
    group: "Shell",
    title: "Language toggle",
    codeName: "styles.topAction",
    searchableName: "English Arabic switch",
    aliases: ["locale switcher", "RTL toggle", "language button"],
    file: "mobile/App.tsx",
    preview: "toggle",
  },
  {
    id: "page-intro",
    group: "Shared",
    title: "Page intro",
    codeName: "styles.pageIntro",
    searchableName: "screen title and subtitle",
    aliases: ["page heading", "screen header", "hero heading"],
    file: "mobile/App.tsx",
    preview: "intro",
  },
  {
    id: "icon",
    group: "Shared",
    title: "Icon primitive",
    codeName: "Icon",
    searchableName: "interface icon component",
    aliases: ["icons", "glyph", "navigation icon", "action icon"],
    file: "mobile/src/Icon.tsx",
    preview: "icon",
  },
  {
    id: "metric",
    group: "Shared",
    title: "Metric primitive",
    codeName: "Metric",
    searchableName: "label value metric",
    aliases: ["stat", "number label", "data metric"],
    file: "mobile/App.tsx",
    preview: "metric",
  },
  {
    id: "conditions-band",
    group: "Today",
    title: "Current conditions",
    codeName: "styles.conditionBand",
    searchableName: "weather conditions card",
    aliases: [
      "temperature card",
      "weather summary",
      "conditions panel",
      "wind summary",
    ],
    file: "mobile/App.tsx",
    preview: "conditions",
  },
  {
    id: "weather-metric",
    group: "Today",
    title: "Weather metric row",
    codeName: "DataLine",
    searchableName: "weather data row",
    aliases: ["wind row", "gust row", "air quality row", "data line"],
    file: "mobile/App.tsx",
    preview: "weatherRow",
  },
  {
    id: "refresh-weather",
    group: "Today",
    title: "Refresh weather action",
    codeName: "styles.refreshButton",
    searchableName: "refresh weather link",
    aliases: ["reload weather", "refresh button", "update conditions"],
    file: "mobile/App.tsx",
    preview: "actions",
  },
  {
    id: "riding-window",
    group: "Today",
    title: "Riding window banner",
    codeName: "styles.sectionHeader + styles.windowMark",
    searchableName: "recommended riding window",
    aliases: [
      "best time banner",
      "departure window",
      "forecast window",
      "time badge",
    ],
    file: "mobile/App.tsx",
    preview: "window",
  },
  {
    id: "route-map",
    group: "Map",
    title: "Route map",
    codeName: "MapPreview",
    searchableName: "interactive route map",
    aliases: ["map preview", "route canvas", "cycling map", "map component"],
    file: "mobile/src/MapPreview*.tsx",
    preview: "map",
  },
  {
    id: "map-header",
    group: "Map",
    title: "Map title plate",
    codeName: "mapHeaderPlate",
    searchableName: "map route label",
    aliases: ["map overlay", "route map header", "map metadata"],
    file: "mobile/src/MapPreview*.tsx",
    preview: "mapChrome",
  },
  {
    id: "map-zoom",
    group: "Map",
    title: "Map zoom controls",
    codeName: "zoomControls",
    searchableName: "map plus minus controls",
    aliases: ["zoom buttons", "map controls", "zoom in out"],
    file: "mobile/src/MapPreview*.tsx",
    preview: "mapChrome",
  },
  {
    id: "map-legend",
    group: "Map",
    title: "Road evidence legend",
    codeName: "legend",
    searchableName: "road type legend",
    aliases: [
      "map legend",
      "road tier legend",
      "dedicated mixed restricted unknown",
    ],
    file: "mobile/src/MapPreview*.tsx",
    preview: "mapChrome",
  },
  {
    id: "map-fit",
    group: "Map",
    title: "Fit route control",
    codeName: "resetButton",
    searchableName: "fit route button",
    aliases: ["reset map", "recenter route", "fit map"],
    file: "mobile/src/MapPreview*.tsx",
    preview: "mapChrome",
  },
  {
    id: "primary-action",
    group: "Shared",
    title: "Primary action button",
    codeName: "styles.primaryButton",
    searchableName: "primary CTA button",
    aliases: ["main button", "dark action button", "route intelligence CTA"],
    file: "mobile/App.tsx",
    preview: "primary",
  },
  {
    id: "metrics-rail",
    group: "Today",
    title: "Route metrics rail",
    codeName: "styles.dataRail + Metric",
    searchableName: "distance duration arrival metrics",
    aliases: ["metrics strip", "stats rail", "route summary metrics"],
    file: "mobile/App.tsx",
    preview: "metric",
  },
  {
    id: "recommendation",
    group: "Today",
    title: "Best-return callout",
    codeName: "styles.explanation",
    searchableName: "route recommendation callout",
    aliases: ["insight callout", "recommendation block", "wind explanation"],
    file: "mobile/App.tsx",
    preview: "evidence",
  },
  {
    id: "route-actions",
    group: "Explore",
    title: "Route action group",
    codeName: "styles.routeActions",
    searchableName: "route creation actions",
    aliases: [
      "generate import draw buttons",
      "route tools",
      "route action bar",
    ],
    file: "mobile/App.tsx",
    preview: "actions",
  },
  {
    id: "route-option",
    group: "Explore",
    title: "Route selection card",
    codeName: "styles.routeOption",
    searchableName: "selectable route card",
    aliases: [
      "route list item",
      "route picker",
      "saved route row",
      "route option",
    ],
    file: "mobile/App.tsx",
    preview: "routeOption",
  },
  {
    id: "route-top",
    group: "Route intelligence",
    title: "Route top bar",
    codeName: "styles.routeTop",
    searchableName: "route detail navigation",
    aliases: ["back change header", "route toolbar", "detail header"],
    file: "mobile/App.tsx",
    preview: "shell",
  },
  {
    id: "departure-selector",
    group: "Route intelligence",
    title: "Departure selector",
    codeName: "styles.departureRow",
    searchableName: "departure time choices",
    aliases: ["time picker", "earlier recommended later", "departure buttons"],
    file: "mobile/App.tsx",
    preview: "departure",
  },
  {
    id: "timing-result",
    group: "Route intelligence",
    title: "Return forecast result",
    codeName: "styles.timingResult",
    searchableName: "arrival forecast panel",
    aliases: ["ETA result", "return time", "timing summary"],
    file: "mobile/App.tsx",
    preview: "timing",
  },
  {
    id: "segment-row",
    group: "Route intelligence",
    title: "Route segment row",
    codeName: "SegmentRow",
    searchableName: "wind route segment",
    aliases: ["segment list item", "route evidence row", "route section"],
    file: "mobile/App.tsx",
    preview: "segment",
  },
  {
    id: "wind-badge",
    group: "Route intelligence",
    title: "Wind badge",
    codeName: "WindBadge",
    searchableName: "headwind tailwind crosswind badge",
    aliases: ["wind label", "condition badge", "wind chip"],
    file: "mobile/App.tsx",
    preview: "segment",
  },
  {
    id: "evidence-panel",
    group: "Route intelligence",
    title: "Evidence panel",
    codeName: "styles.evidencePanel",
    searchableName: "source confidence evidence panel",
    aliases: ["provenance card", "source panel", "uncertainty panel"],
    file: "mobile/App.tsx",
    preview: "evidence",
  },
  {
    id: "live-state",
    group: "Live ride",
    title: "Live ride status card",
    codeName: "styles.liveState",
    searchableName: "GPS live tracking status",
    aliases: ["tracking status", "location status", "ride state card"],
    file: "mobile/App.tsx",
    preview: "live",
  },
  {
    id: "live-readout",
    group: "Live ride",
    title: "Remaining route readout",
    codeName: "styles.liveReadout",
    searchableName: "live distance and ETA",
    aliases: ["remaining route", "ride progress", "live ETA"],
    file: "mobile/App.tsx",
    preview: "timing",
  },
  {
    id: "connection-panel",
    group: "My riding",
    title: "Strava connection card",
    codeName: "styles.connectionPanel",
    searchableName: "read only Strava connector",
    aliases: ["integration card", "connect Strava", "activity import"],
    file: "mobile/App.tsx",
    preview: "connection",
  },
  {
    id: "privacy-panel",
    group: "My riding",
    title: "Privacy and sources panel",
    codeName: "styles.sourcePanel",
    searchableName: "privacy data sources controls",
    aliases: ["privacy card", "data controls", "delete data panel"],
    file: "mobile/App.tsx",
    preview: "privacy",
  },
  {
    id: "delete-confirmation",
    group: "My riding",
    title: "Delete confirmation panel",
    codeName: "styles.deleteConfirmPanel",
    searchableName: "delete saved routes confirmation",
    aliases: ["destructive confirmation", "delete modal", "confirm deletion"],
    file: "mobile/App.tsx",
    preview: "evidence",
  },
  {
    id: "bottom-navigation",
    group: "Shell",
    title: "Bottom tab navigation",
    codeName: "TabButton + styles.tabbar",
    searchableName: "mobile bottom navigation",
    aliases: ["tab bar", "primary navigation", "Today Explore Live My riding"],
    file: "mobile/App.tsx",
    preview: "navigation",
  },
  {
    id: "21st-dashboard-activities",
    group: "21st references",
    title: "Dashboard activities",
    codeName: "ExampleUsage / dashboard-activities",
    searchableName: "activity feed dashboard",
    aliases: ["team activity feed", "dashboard activities", "activity list"],
    file: "21st reference: dashboard-activities.tsx",
    preview: "live",
    note: "Reference only: no activity feed is in the current cycling pilot.",
  },
  {
    id: "21st-interactive-map",
    group: "21st references",
    title: "Advanced interactive map",
    codeName: "AdvancedMap",
    searchableName: "Leaflet interactive map",
    aliases: [
      "react leaflet map",
      "searchable map",
      "map markers",
      "map layers",
      "map polygons",
    ],
    file: "21st reference: interactive-map.tsx",
    preview: "map",
    note: "Web-only reference. Native iOS/Android stays on MapPreview.native.tsx for parity and permissions.",
  },
  {
    id: "21st-button-with-icon",
    group: "21st references",
    title: "Button with icon",
    codeName: "ButtonWithIcon / ButtonWithIconDemo",
    searchableName: "icon action button",
    aliases: ["button with leading icon", "icon CTA", "lucide button"],
    file: "21st reference: button-witn-icon.tsx",
    preview: "primary",
    note: "Adapted in the app as ButtonWithIcon in mobile/src/UiPatterns.tsx.",
  },
  {
    id: "21st-freelancer-stats",
    group: "21st references",
    title: "Freelancer stats card",
    codeName: "FreelancerStatsCard",
    searchableName: "ranked stats card",
    aliases: ["earnings stats", "availability card", "ranking card"],
    file: "21st reference: stats-card.tsx",
    preview: "metric",
    note: "Reference only: earnings/ranking do not belong in the cycling pilot.",
  },
  {
    id: "21st-workout-summary",
    group: "21st references",
    title: "Workout summary card",
    codeName: "WorkoutSummaryCard",
    searchableName: "workout activity summary",
    aliases: [
      "run summary",
      "activity detail card",
      "distance duration calories",
    ],
    file: "21st reference: workout-summary-card.tsx",
    preview: "timing",
    note: "Pattern maps to route summary; the app uses RouteStatsCard instead of mock workout data.",
  },
  {
    id: "21st-colorful-button",
    group: "21st references",
    title: "Colorful button",
    codeName: "ButtonColorful",
    searchableName: "decorative colorful CTA",
    aliases: ["gradient button", "colorful action", "animated button"],
    file: "21st reference: button-colorful.tsx",
    preview: "primary",
    note: "Not used: high-saturation decoration conflicts with the route-evidence visual language.",
  },
  {
    id: "21st-admonition",
    group: "21st references",
    title: "Admonition",
    codeName: "Admonition",
    searchableName: "semantic callout",
    aliases: [
      "tip callout",
      "warning callout",
      "info callout",
      "success callout",
    ],
    file: "21st reference: admonition.tsx",
    preview: "evidence",
    note: "Adapted as NoticeAlert in mobile/src/UiPatterns.tsx.",
  },
  {
    id: "21st-notice-alert",
    group: "21st references",
    title: "Notice alert",
    codeName: "NoticeAlert",
    searchableName: "notice status alert",
    aliases: [
      "info alert",
      "success alert",
      "warning alert",
      "destructive alert",
    ],
    file: "21st reference: notice-alert.tsx",
    preview: "evidence",
    note: "Adapted for fallback weather and provider notices.",
  },
  {
    id: "21st-marketing-dashboard",
    group: "21st references",
    title: "Marketing dashboard",
    codeName: "MarketingDashboard",
    searchableName: "team activity dashboard",
    aliases: ["team dashboard", "hours dashboard", "member activity"],
    file: "21st reference: dashboard-1.tsx",
    preview: "metric",
    note: "Reference only: team management is outside the current rider journey.",
  },
  {
    id: "21st-theme-switch",
    group: "21st references",
    title: "Theme switch",
    codeName: "ThemeSwitch",
    searchableName: "light dark theme switch",
    aliases: ["dark mode switch", "appearance toggle", "theme button"],
    file: "21st reference: theme-switch-button.tsx",
    preview: "toggle",
    note: "Already adapted through the app shell theme action.",
  },
  {
    id: "21st-futuristic-nav",
    group: "21st references",
    title: "Futuristic navigation",
    codeName: "LumaBar",
    searchableName: "futuristic nav bar",
    aliases: ["LumaBar", "glowing navigation", "decorative bottom nav"],
    file: "21st reference: futuristic-nav.tsx",
    preview: "navigation",
    note: "Reference only: the app keeps a quiet accessible tab bar.",
  },
  {
    id: "21st-limelight-nav",
    group: "21st references",
    title: "Limelight navigation",
    codeName: "LimelightNav",
    searchableName: "animated icon tab bar",
    aliases: [
      "limelight nav",
      "active navigation indicator",
      "icon navigation",
    ],
    file: "21st reference: limelight-nav.tsx",
    preview: "navigation",
    note: "The existing TabButton is the native-safe adaptation.",
  },
  {
    id: "21st-health-stat-card",
    group: "21st references",
    title: "Health stat card",
    codeName: "HealthStatCard",
    searchableName: "health goals stat card",
    aliases: [
      "sleep hydration exercise card",
      "health overview",
      "goal progress card",
    ],
    file: "21st reference: health-stat-card.tsx",
    preview: "conditions",
    note: "Reference only for now; health integrations are not in the pilot scope.",
  },
  {
    id: "21st-activity-stats-card",
    group: "21st references",
    title: "Activity stats card",
    codeName: "ActivityStatsCard",
    searchableName: "activity comparison chart",
    aliases: [
      "bar chart stats",
      "current previous chart",
      "weekly activity card",
    ],
    file: "21st reference: stats-card.tsx",
    preview: "metric",
    note: "Future candidate for My riding after activity data is connected.",
  },
  {
    id: "21st-status-demo",
    group: "21st references",
    title: "Status badge set",
    codeName: "StatusDemo",
    searchableName: "status badges lifecycle",
    aliases: [
      "pending badge",
      "failed badge",
      "success badge",
      "in progress badge",
      "review badge",
    ],
    file: "21st reference: status.tsx",
    preview: "segment",
    note: "Adapted as StatusBadge/WindBadge for route evidence.",
  },
  {
    id: "21st-heatmap",
    group: "21st references",
    title: "Heatmap chart",
    codeName: "HeatmapChart",
    searchableName: "calendar activity heatmap",
    aliases: ["heatmap", "activity intensity", "contribution chart"],
    file: "21st reference: heatmaps.tsx",
    preview: "metric",
    note: "Reference only: no historical activity data source exists yet.",
  },
  {
    id: "21st-category-bar-chart",
    group: "21st references",
    title: "Category bar chart",
    codeName: "Component / category-bar-chart",
    searchableName: "categorical bar chart",
    aliases: ["category chart", "distribution bars", "bar chart component"],
    file: "21st reference: category-bar-chart.tsx",
    preview: "metric",
    note: "Reference only; route evidence is currently more useful as a legend and segment list.",
  },
];

const groups = [
  "All",
  ...Array.from(new Set(catalogItems.map((item) => item.group))),
];

export function ComponentCatalog() {
  const { width } = useWindowDimensions();
  const compact = width < 860;
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  useEffect(() => {
    if (typeof document !== "undefined")
      document.title = "Naseem component catalog";
  }, []);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      catalogItems.filter((item) => {
        const matchesGroup = group === "All" || item.group === group;
        if (!normalizedQuery) return matchesGroup;
        const haystack = [
          item.id,
          item.group,
          item.title,
          item.codeName,
          item.searchableName,
          item.file,
          ...item.aliases,
        ]
          .join(" ")
          .toLowerCase();
        return matchesGroup && haystack.includes(normalizedQuery);
      }),
    [group, normalizedQuery],
  );

  const backToApp = () => {
    if (typeof window !== "undefined") window.location.assign("/");
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.shell}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <View style={styles.headerCopy}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.eyebrow}>NASEEM / نسيم</Text>
              <View style={styles.devPill}>
                <Text style={styles.devPillText}>DEV CATALOG</Text>
              </View>
            </View>
            <Text style={[styles.title, compact && styles.titleCompact]}>
              Name the interface before we redesign it.
            </Text>
            <Text style={styles.subtitle}>
              A searchable visual atlas of the current product UI. Use the exact
              code name or any alias when you tell me what to change.
            </Text>
            <View style={styles.referenceStrip}>
              <View style={styles.referenceCopy}>
                <Text style={styles.referenceLabel}>REFERENCE VOCABULARY</Text>
                <Text style={styles.referenceText}>
                  Names are normalized against the ecosystems below. Library
                  names are search terms; they are not claiming every library
                  exports the same primitive.
                </Text>
              </View>
              <View style={styles.referenceLinks}>
                {referenceSites.map((site) => (
                  <ReferenceLink key={site.label} site={site} />
                ))}
              </View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={backToApp}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Back to app</Text>
            <Icon name="chevron" color={palette.accent} size={15} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchGlyph}>⌕</Text>
            <TextInput
              accessibilityLabel="Search components"
              value={query}
              onChangeText={setQuery}
              placeholder="Search by code name, label, or alias…"
              placeholderTextColor={palette.muted}
              style={styles.searchInput}
            />
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countValue}>{filtered.length}</Text>
            <Text style={styles.countLabel}>shown</Text>
          </View>
        </View>

        <View style={[styles.layout, compact && styles.layoutCompact]}>
          <View style={[styles.sidebar, compact && styles.sidebarCompact]}>
            <Text style={styles.sidebarLabel}>FILTER BY SCREEN</Text>
            <View style={styles.filterList}>
              {groups.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: group === option }}
                  onPress={() => setGroup(option)}
                  style={[
                    styles.filterButton,
                    group === option && styles.filterButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      group === option && styles.filterTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                  <Text
                    style={[
                      styles.filterCount,
                      group === option && styles.filterTextActive,
                    ]}
                  >
                    {option === "All"
                      ? catalogItems.length
                      : catalogItems.filter((item) => item.group === option)
                          .length}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.sidebarNote}>
              <Text style={styles.sidebarNoteTitle}>How to use it</Text>
              <Text style={styles.sidebarNoteCopy}>
                Say “make the route option card more compact” or “restyle
                `SegmentRow`.” I’ll know exactly what you mean.
              </Text>
            </View>
          </View>

          <View style={styles.results}>
            <View style={styles.resultsContent}>
              <View style={styles.resultsHeader}>
                <View>
                  <Text style={styles.resultsTitle}>
                    {group === "All" ? "Every visible building block" : group}
                  </Text>
                  <Text style={styles.resultsSubtitle}>
                    {normalizedQuery
                      ? `Matches for “${query}”`
                      : "Current runtime names, aliases, and source locations"}
                  </Text>
                </View>
                <Text style={styles.resultsMeta}>
                  {filtered.length} / {catalogItems.length}
                </Text>
              </View>
              {filtered.length > 0 ? (
                <View style={styles.grid}>
                  {filtered.map((item) => (
                    <CatalogCard key={item.id} item={item} compact={compact} />
                  ))}
                </View>
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No components found</Text>
                  <Text style={styles.emptyCopy}>
                    Try the screen name, a code identifier, or a phrase like
                    “map” or “delete.”
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function CatalogCard({
  item,
  compact,
}: {
  item: CatalogItem;
  compact: boolean;
}) {
  const vocabulary = componentVocabulary[item.id];
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardGroup}>{item.group.toUpperCase()}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
        <Text style={styles.cardId}>{item.id}</Text>
      </View>
      <View style={styles.preview}>
        <Preview kind={item.preview} />
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.fieldLabel}>EXACT CODE NAME</Text>
        <Text selectable style={styles.codeName}>
          {item.codeName}
        </Text>
        <Text style={styles.fieldLabel}>CANONICAL UI PATTERN</Text>
        <Text selectable style={styles.patternName}>
          {vocabulary.patternName}
        </Text>
        <Text style={styles.fieldLabel}>LIBRARY SEARCH NAMES</Text>
        <View style={styles.libraryNames}>
          {vocabulary.libraryNames.map((name) => (
            <Text selectable key={name} style={styles.libraryName}>
              {name}
            </Text>
          ))}
        </View>
        <Text style={styles.fieldLabel}>SEARCHABLE NAME</Text>
        <Text selectable style={styles.searchableName}>
          {item.searchableName}
        </Text>
        <Text style={styles.fieldLabel}>ALTERNATIVE SEARCH TERMS</Text>
        <View style={styles.aliases}>
          {item.aliases.map((alias) => (
            <Text selectable key={alias} style={styles.alias}>
              {alias}
            </Text>
          ))}
        </View>
        {item.note && (
          <>
            <Text style={styles.fieldLabel}>DECISION</Text>
            <Text style={styles.note}>{item.note}</Text>
          </>
        )}
        <Text style={styles.fieldLabel}>REFERENCE WEBSITES</Text>
        <View style={styles.cardReferenceLinks}>
          {vocabulary.references.map((site) => (
            <ReferenceLink key={site.label} site={site} />
          ))}
        </View>
        <Text style={styles.file}>{item.file}</Text>
      </View>
    </View>
  );
}

function ReferenceLink({ site }: { site: { label: string; url: string } }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open ${site.label} documentation`}
      onPress={() => openReference(site.url)}
      style={styles.referenceLink}
    >
      <Text style={styles.referenceLinkText}>{site.label}</Text>
    </Pressable>
  );
}

function openReference(url: string) {
  if (typeof window !== "undefined")
    window.open(url, "_blank", "noopener,noreferrer");
}

function Preview({ kind }: { kind: PreviewKind }) {
  if (kind === "map")
    return (
      <MapPreview
        route={NBH_LOOP}
        compact
        mapText={{
          native: "Native map",
          web: "Road-matched map preview",
          fit: "Fit route",
          loop: "loop",
          gestures: "Drag · + / -",
          zoomIn: "Zoom in",
          zoomOut: "Zoom out",
          distanceUnit: "km",
        }}
      />
    );
  if (kind === "icon")
    return (
      <View style={previewStyles.iconStrip}>
        <View style={previewStyles.iconSample}>
          <Icon name="home" color={palette.accent} size={18} />
          <Text style={previewStyles.miniMuted}>home</Text>
        </View>
        <View style={previewStyles.iconSample}>
          <Icon name="map" color={palette.accent} size={18} />
          <Text style={previewStyles.miniMuted}>map</Text>
        </View>
        <View style={previewStyles.iconSample}>
          <Icon name="pulse" color={palette.accent} size={18} />
          <Text style={previewStyles.miniMuted}>pulse</Text>
        </View>
        <View style={previewStyles.iconSample}>
          <Icon name="person" color={palette.accent} size={18} />
          <Text style={previewStyles.miniMuted}>person</Text>
        </View>
      </View>
    );
  if (kind === "intro")
    return (
      <View style={previewStyles.intro}>
        <Text style={previewStyles.previewTitle}>
          Know the ride before you roll.
        </Text>
        <Text style={previewStyles.miniMuted}>
          Zallaq, Bahrain · Wednesday 9 September
        </Text>
      </View>
    );
  if (kind === "toggle")
    return (
      <View style={previewStyles.togglePreview}>
        <View
          style={[previewStyles.togglePill, previewStyles.togglePillActive]}
        >
          <Text style={previewStyles.toggleTextActive}>Dark</Text>
        </View>
        <View style={previewStyles.togglePill}>
          <Text style={previewStyles.toggleText}>العربية</Text>
        </View>
      </View>
    );
  if (kind === "conditions")
    return (
      <View style={previewStyles.conditions}>
        <View>
          <Text style={previewStyles.miniLabel}>CURRENT</Text>
          <Text style={previewStyles.temperature}>35°</Text>
          <Text style={previewStyles.miniMuted}>Open-Meteo</Text>
        </View>
        <View style={previewStyles.conditionRows}>
          <MiniMetric icon="wind" label="Wind" value="18 km/h" />
          <MiniMetric icon="pulse" label="Gusts" value="25 km/h" />
          <MiniMetric icon="route" label="Air quality" value="101 AQI" />
        </View>
      </View>
    );
  if (kind === "weatherRow")
    return (
      <View style={previewStyles.weatherRow}>
        <MiniMetric icon="wind" label="Wind" value="18 km/h" />
        <MiniMetric icon="pulse" label="Gusts" value="25 km/h" />
        <MiniMetric icon="route" label="Air quality" value="101 AQI" />
      </View>
    );
  if (kind === "metric")
    return (
      <View style={previewStyles.metricRail}>
        <MiniStat value="21.8 km" label="Distance" />
        <MiniStat value="52 min" label="Moving time" />
        <MiniStat value="Forecast context" label="Route status" />
      </View>
    );
  if (kind === "window")
    return (
      <View style={previewStyles.window}>
        <View>
          <Text style={previewStyles.previewTitle}>
            Forecast context at 17:40
          </Text>
          <Text style={previewStyles.miniMuted}>
            Check the later segments before you ride.
          </Text>
        </View>
        <Text style={previewStyles.windowMark}>17:40</Text>
      </View>
    );
  if (kind === "mapChrome")
    return (
      <View style={previewStyles.mapChrome}>
        <View style={previewStyles.mapSurface}>
          <View style={previewStyles.fakeRoadOne} />
          <View style={previewStyles.fakeRoadTwo} />
          <View style={previewStyles.mapPlate}>
            <Text style={previewStyles.mapPlateTitle}>NBH Loop</Text>
            <Text style={previewStyles.miniMuted}>
              21.8 km · supplied preview
            </Text>
          </View>
          <View style={previewStyles.mapButtons}>
            <Text style={previewStyles.mapButton}>Fit route</Text>
            <Text style={previewStyles.mapButton}>+</Text>
            <Text style={previewStyles.mapButton}>−</Text>
          </View>
          <View style={previewStyles.legend}>
            <LegendDot color={palette.accent} label="Dedicated" />
            <LegendDot color={palette.caution} label="Mixed" />
            <LegendDot color="#6B7B7D" label="Unknown" />
          </View>
        </View>
      </View>
    );
  if (kind === "primary")
    return (
      <View style={previewStyles.actionStack}>
        <View style={previewStyles.primary}>
          <Icon name="route" color={palette.bg} size={16} />
          <Text style={previewStyles.primaryText}>See route intelligence</Text>
          <Icon name="chevron" color={palette.bg} size={14} />
        </View>
      </View>
    );
  if (kind === "actions")
    return (
      <View style={previewStyles.actionStack}>
        <View style={previewStyles.primary}>
          <Text style={previewStyles.primaryText}>Generate a loop</Text>
        </View>
        <View style={previewStyles.outline}>
          <Text style={previewStyles.outlineText}>Import GPX</Text>
        </View>
        <View style={previewStyles.outline}>
          <Text style={previewStyles.outlineText}>Draw route</Text>
        </View>
      </View>
    );
  if (kind === "routeOption")
    return (
      <View style={previewStyles.routeOption}>
        <View
          style={[previewStyles.routeDot, { backgroundColor: palette.accent }]}
        />
        <View style={previewStyles.flex}>
          <Text style={previewStyles.previewTitle}>NBH Loop</Text>
          <Text style={previewStyles.miniMuted}>
            21.8 km · supplied preview
          </Text>
          <Text style={previewStyles.optionEvidence}>
            Route/access evidence pending
          </Text>
        </View>
        <Icon name="chevron" color={palette.accent} size={14} />
      </View>
    );
  if (kind === "departure")
    return (
      <View style={previewStyles.departure}>
        <DepartureCell time="16:40" label="Earlier" />
        <DepartureCell time="17:40" label="Recommended" selected />
        <DepartureCell time="18:40" label="Later" />
      </View>
    );
  if (kind === "timing")
    return (
      <View style={previewStyles.timing}>
        <Text style={previewStyles.miniLabel}>RETURN FORECAST</Text>
        <Text style={previewStyles.timingValue}>19:47</Text>
        <Text style={previewStyles.miniMuted}>
          Leaving at 17:40 · ETA recalculated for wind.
        </Text>
      </View>
    );
  if (kind === "segment")
    return (
      <View style={previewStyles.segment}>
        <View style={previewStyles.segmentIndex}>
          <Text style={previewStyles.segmentIndexText}>1</Text>
        </View>
        <View style={previewStyles.flex}>
          <View style={previewStyles.segmentTitleRow}>
            <Text style={previewStyles.previewTitle}>Northern approach</Text>
            <Text style={previewStyles.miniMuted}>18:08</Text>
          </View>
          <View style={previewStyles.badge}>
            <View
              style={[
                previewStyles.badgeDot,
                { backgroundColor: palette.caution },
              ]}
            />
            <Text style={previewStyles.badgeText}>Headwind</Text>
          </View>
          <Text style={previewStyles.miniMuted}>
            12 km/h · Dedicated · medium confidence
          </Text>
        </View>
      </View>
    );
  if (kind === "evidence")
    return (
      <View style={previewStyles.evidence}>
        <Text style={previewStyles.miniLabel}>VIEW EVIDENCE</Text>
        <Text style={previewStyles.previewTitle}>Road-matched preview</Text>
        <Text style={previewStyles.evidenceCopy}>
          Source and confidence stay beside the recommendation.
        </Text>
      </View>
    );
  if (kind === "live")
    return (
      <View style={previewStyles.live}>
        <View style={previewStyles.liveTop}>
          <View style={previewStyles.liveDot} />
          <Text style={previewStyles.previewTitle}>Live ride active</Text>
        </View>
        <Text style={previewStyles.miniMuted}>
          GPS ±12 m · 26.1812, 50.5320
        </Text>
        <Text style={previewStyles.liveAlert}>Wind changed materially</Text>
      </View>
    );
  if (kind === "connection")
    return (
      <View style={previewStyles.connection}>
        <View style={previewStyles.strava}>
          <Text style={previewStyles.stravaText}>S</Text>
        </View>
        <View style={previewStyles.flex}>
          <Text style={previewStyles.miniLabel}>CONNECT STRAVA</Text>
          <Text style={previewStyles.previewTitle}>
            Bring in your riding history
          </Text>
          <Text style={previewStyles.miniMuted}>Read-only import</Text>
        </View>
      </View>
    );
  if (kind === "privacy")
    return (
      <View style={previewStyles.privacy}>
        <Text style={previewStyles.miniLabel}>PRIVACY AND SOURCES</Text>
        <Text style={previewStyles.previewTitle}>Privacy controls</Text>
        <Text style={previewStyles.miniMuted}>
          Weather, roads, and deletion controls.
        </Text>
        <View style={previewStyles.deleteLine}>
          <Text style={previewStyles.outlineText}>Delete saved route data</Text>
        </View>
      </View>
    );
  if (kind === "navigation")
    return (
      <View style={previewStyles.navigation}>
        <NavCell icon="home" label="Today" active />
        <NavCell icon="map" label="Explore" />
        <NavCell icon="pulse" label="Live ride" />
        <NavCell icon="person" label="My riding" />
      </View>
    );
  return (
    <View style={previewStyles.shell}>
      <View style={previewStyles.shellBar}>
        <Text style={previewStyles.brand}>NASEEM</Text>
        <View style={previewStyles.shellPill}>
          <Text style={previewStyles.miniMuted}>EN</Text>
        </View>
      </View>
      <Text style={previewStyles.shellTitle}>
        Know the ride before you roll.
      </Text>
      <Text style={previewStyles.miniMuted}>
        Quiet instrument · route evidence first
      </Text>
    </View>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: "wind" | "pulse" | "route";
  label: string;
  value: string;
}) {
  return (
    <View style={previewStyles.miniMetric}>
      <Icon name={icon} color={palette.accent} size={14} />
      <View>
        <Text style={previewStyles.miniMuted}>{label}</Text>
        <Text style={previewStyles.miniValue}>{value}</Text>
      </View>
    </View>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={previewStyles.miniStat}>
      <Text style={previewStyles.miniValue}>{value}</Text>
      <Text style={previewStyles.miniMuted}>{label}</Text>
    </View>
  );
}
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={previewStyles.legendItem}>
      <View style={[previewStyles.legendDot, { backgroundColor: color }]} />
      <Text style={previewStyles.legendText}>{label}</Text>
    </View>
  );
}
function DepartureCell({
  time,
  label,
  selected = false,
}: {
  time: string;
  label: string;
  selected?: boolean;
}) {
  return (
    <View
      style={[
        previewStyles.departureCell,
        selected && previewStyles.departureSelected,
      ]}
    >
      <Text
        style={[
          previewStyles.departureTime,
          selected && previewStyles.departureSelectedText,
        ]}
      >
        {time}
      </Text>
      <Text
        style={[
          previewStyles.departureLabel,
          selected && previewStyles.departureSelectedText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
function NavCell({
  icon,
  label,
  active = false,
}: {
  icon: "home" | "map" | "pulse" | "person";
  label: string;
  active?: boolean;
}) {
  return (
    <View style={previewStyles.navCell}>
      <View
        style={[previewStyles.navIcon, active && previewStyles.navIconActive]}
      >
        <Icon
          name={icon}
          color={active ? palette.accent : palette.muted}
          size={15}
        />
      </View>
      <Text
        style={[previewStyles.navLabel, active && previewStyles.navLabelActive]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.bg },
  pageContent: { paddingBottom: 48 },
  shell: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  header: {
    paddingTop: 34,
    paddingBottom: 26,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 28,
  },
  headerCompact: { flexDirection: "column", alignItems: "stretch", gap: 18 },
  headerCopy: { flex: 1, gap: 9 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  eyebrow: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },
  devPill: {
    backgroundColor: palette.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  devPillText: {
    color: palette.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  title: {
    color: palette.ink,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: -1.1,
  },
  titleCompact: { fontSize: 30, lineHeight: 35 },
  subtitle: {
    maxWidth: 720,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  referenceStrip: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
    backgroundColor: palette.panel,
    gap: 10,
  },
  referenceCopy: { gap: 4 },
  referenceLabel: {
    color: palette.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  referenceText: { color: palette.muted, fontSize: 10, lineHeight: 15 },
  referenceLinks: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  referenceLink: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: palette.bg,
  },
  referenceLinkText: { color: palette.accent, fontSize: 10, fontWeight: "900" },
  backButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: palette.panel,
  },
  backButtonText: { color: palette.accent, fontSize: 12, fontWeight: "900" },
  searchRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
  },
  searchBox: {
    flex: 1,
    maxWidth: 760,
    minHeight: 50,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
    backgroundColor: palette.panel,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  searchGlyph: { color: palette.accent, fontSize: 24, lineHeight: 24 },
  searchInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 14,
    outlineStyle: "none",
  } as any,
  countBadge: {
    minHeight: 50,
    minWidth: 82,
    borderRadius: 14,
    backgroundColor: palette.panelAlt,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  countValue: { color: palette.ink, fontSize: 16, fontWeight: "900" },
  countLabel: { color: palette.muted, fontSize: 10, fontWeight: "800" },
  layout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
    paddingTop: 24,
  },
  layoutCompact: { flexDirection: "column" },
  sidebar: { width: 220, gap: 16 },
  sidebarCompact: { width: "100%" },
  sidebarLabel: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  filterList: { gap: 4 },
  filterButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterButtonActive: { backgroundColor: palette.ink },
  filterText: { color: palette.muted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: palette.bg },
  filterCount: { color: palette.muted, fontSize: 10, fontWeight: "900" },
  sidebarNote: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: palette.cautionSoft,
    gap: 6,
  },
  sidebarNoteTitle: { color: palette.caution, fontSize: 11, fontWeight: "900" },
  sidebarNoteCopy: { color: palette.ink, fontSize: 11, lineHeight: 17 },
  results: { flex: 1 },
  resultsContent: { paddingBottom: 20 },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 14,
  },
  resultsTitle: { color: palette.ink, fontSize: 18, fontWeight: "900" },
  resultsSubtitle: { color: palette.muted, fontSize: 12, marginTop: 4 },
  resultsMeta: { color: palette.accent, fontSize: 12, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  card: {
    width: 344,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    overflow: "hidden",
  },
  cardCompact: { width: "100%" },
  cardHeader: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardGroup: {
    color: palette.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 5,
  },
  cardTitle: { color: palette.ink, fontSize: 15, fontWeight: "900" },
  cardId: {
    color: palette.muted,
    fontSize: 9,
    fontWeight: "800",
    maxWidth: 105,
    textAlign: "right",
  },
  preview: {
    minHeight: 156,
    padding: 12,
    backgroundColor: palette.panelAlt,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
    justifyContent: "center",
  },
  cardDetails: { padding: 16, gap: 6 },
  fieldLabel: {
    color: palette.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  codeName: {
    color: palette.ink,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "800",
  },
  patternName: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
  },
  note: { color: palette.muted, fontSize: 11, lineHeight: 17 },
  libraryNames: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  libraryName: {
    color: palette.accent,
    fontSize: 10,
    lineHeight: 14,
    borderWidth: 1,
    borderColor: palette.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: palette.accentSoft,
  },
  searchableName: { color: palette.accent, fontSize: 12, fontWeight: "900" },
  aliases: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  alias: {
    color: palette.muted,
    fontSize: 10,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: palette.bg,
  },
  cardReferenceLinks: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  file: {
    color: palette.muted,
    fontFamily: "monospace",
    fontSize: 9,
    marginTop: 7,
  },
  empty: {
    minHeight: 260,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: palette.line,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 8,
  },
  emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: "900" },
  emptyCopy: { color: palette.muted, fontSize: 12, textAlign: "center" },
});

const previewStyles = StyleSheet.create({
  flex: { flex: 1 },
  iconStrip: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  iconSample: { alignItems: "center", gap: 5 },
  intro: { minHeight: 78, justifyContent: "center", gap: 6 },
  togglePreview: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  togglePill: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: palette.panel,
  },
  togglePillActive: { borderColor: palette.ink, backgroundColor: palette.ink },
  toggleText: { color: palette.muted, fontSize: 11, fontWeight: "900" },
  toggleTextActive: { color: palette.bg, fontSize: 11, fontWeight: "900" },
  conditions: {
    minHeight: 130,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    flexDirection: "row",
    gap: 16,
  },
  conditionRows: {
    flex: 1,
    gap: 9,
    borderLeftWidth: 1,
    borderLeftColor: palette.line,
    paddingLeft: 14,
  },
  miniLabel: {
    color: palette.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  temperature: {
    color: palette.ink,
    fontSize: 29,
    lineHeight: 32,
    fontWeight: "900",
    marginTop: 5,
  },
  miniMuted: { color: palette.muted, fontSize: 10, lineHeight: 15 },
  miniValue: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  miniMetric: { flexDirection: "row", alignItems: "center", gap: 8 },
  weatherRow: {
    minHeight: 78,
    paddingVertical: 10,
    gap: 10,
    justifyContent: "center",
  },
  window: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  previewTitle: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  windowMark: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: "900",
    backgroundColor: palette.accentSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricRail: {
    minHeight: 74,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
    flexDirection: "row",
    alignItems: "center",
  },
  miniStat: { flex: 1, paddingHorizontal: 10, gap: 3 },
  mapChrome: { minHeight: 130 },
  mapSurface: {
    minHeight: 130,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5EEEE",
    position: "relative",
  },
  fakeRoadOne: {
    position: "absolute",
    width: 260,
    height: 9,
    backgroundColor: "#FFFFFF",
    top: 68,
    left: -30,
    transform: [{ rotate: "-19deg" }],
  },
  fakeRoadTwo: {
    position: "absolute",
    width: 270,
    height: 6,
    backgroundColor: "#FFFFFF",
    top: 34,
    left: 78,
    transform: [{ rotate: "27deg" }],
  },
  mapPlate: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  mapPlateTitle: { color: palette.ink, fontSize: 10, fontWeight: "900" },
  mapButtons: {
    position: "absolute",
    right: 9,
    top: 9,
    gap: 4,
    alignItems: "flex-end",
  },
  mapButton: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: "900",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  legend: {
    position: "absolute",
    left: 9,
    bottom: 8,
    flexDirection: "row",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { color: palette.muted, fontSize: 8 },
  actionStack: { gap: 7 },
  primary: {
    minHeight: 39,
    borderRadius: 10,
    paddingHorizontal: 11,
    backgroundColor: palette.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
  },
  primaryText: { color: palette.bg, fontSize: 11, fontWeight: "900" },
  outline: {
    minHeight: 35,
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineText: { color: palette.accent, fontSize: 10, fontWeight: "900" },
  routeOption: {
    minHeight: 84,
    borderRadius: 12,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  routeDot: { width: 9, height: 9, borderRadius: 5 },
  optionEvidence: {
    color: palette.accent,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 3,
  },
  departure: { flexDirection: "row", gap: 6 },
  departureCell: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
    gap: 3,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
  },
  departureSelected: { backgroundColor: palette.ink, borderColor: palette.ink },
  departureTime: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  departureLabel: { color: palette.muted, fontSize: 9, fontWeight: "800" },
  departureSelectedText: { color: palette.bg },
  timing: {
    minHeight: 100,
    padding: 14,
    borderRadius: 12,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 4,
  },
  timingValue: { color: palette.accent, fontSize: 25, fontWeight: "900" },
  segment: {
    flexDirection: "row",
    gap: 9,
    padding: 10,
    borderRadius: 11,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
  },
  segmentIndex: {
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.accent,
  },
  segmentIndexText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  segmentTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: palette.cautionSoft,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { color: palette.caution, fontSize: 9, fontWeight: "900" },
  evidence: {
    minHeight: 105,
    padding: 13,
    borderRadius: 12,
    backgroundColor: palette.cautionSoft,
    gap: 6,
  },
  evidenceCopy: { color: palette.ink, fontSize: 10, lineHeight: 15 },
  live: {
    minHeight: 100,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    gap: 7,
  },
  liveTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D56A3D",
  },
  liveAlert: { color: palette.caution, fontSize: 10, fontWeight: "900" },
  connection: {
    minHeight: 100,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  strava: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FC4C02",
  },
  stravaText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  privacy: {
    minHeight: 112,
    padding: 13,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
    gap: 5,
  },
  deleteLine: {
    minHeight: 30,
    borderWidth: 1,
    borderColor: palette.caution,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  navigation: {
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.nav,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  navCell: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 55,
  },
  navIcon: {
    width: 28,
    height: 22,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconActive: { backgroundColor: palette.accentSoft },
  navLabel: { color: palette.muted, fontSize: 8, fontWeight: "800" },
  navLabelActive: { color: palette.accent },
  shell: {
    minHeight: 130,
    padding: 14,
    borderRadius: 12,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 12,
  },
  shellBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },
  shellPill: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  shellTitle: { color: palette.ink, fontSize: 19, fontWeight: "900" },
});
