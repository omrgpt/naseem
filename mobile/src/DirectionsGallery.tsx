import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { RoutePlan } from "./domain";
import { Icon } from "./Icon";
import { MapPreview } from "./MapPreview";
import {
  FONT_BOLD,
  FONT_EXTRABOLD,
  FONT_MEDIUM,
  FONT_REGULAR,
  FONT_SEMIBOLD,
} from "./fonts";

type DirectionId = "untitled" | "uiverse" | "blocks" | "modern" | "reui";

type Direction = {
  id: DirectionId;
  source: string;
  sourceUrl: string;
  title: string;
  thesis: string;
  bg: string;
  panel: string;
  panelAlt: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentSoft: string;
};

const DIRECTIONS: Direction[] = [
  {
    id: "untitled",
    source: "Untitled UI · Metrics + application dashboard",
    sourceUrl: "https://www.untitledui.com/react/components/metrics",
    title: "Evidence dashboard",
    thesis:
      "A quiet, structured decision surface where every metric earns its place beside the route.",
    bg: "#F5F7F8",
    panel: "#FFFFFF",
    panelAlt: "#EAF1F0",
    ink: "#102A2E",
    muted: "#657477",
    line: "#D9E3E1",
    accent: "#087A74",
    accentSoft: "#DDF2EC",
  },
  {
    id: "uiverse",
    source: "Uiverse · open-source elements + interaction states",
    sourceUrl: "https://uiverse.io/elements",
    title: "Signal playground",
    thesis:
      "A sharper, more expressive instrument with tactile controls, layered states, and a strong live signal.",
    bg: "#0A0C12",
    panel: "#141821",
    panelAlt: "#202634",
    ink: "#F6F7FB",
    muted: "#9FA9BA",
    line: "#303849",
    accent: "#8CF7C8",
    accentSoft: "#163A32",
  },
  {
    id: "blocks",
    source: "Blocks.so · shadcn dashboard blocks",
    sourceUrl: "https://blocks.so/dashboard",
    title: "Operations board",
    thesis:
      "A dense but calm control board for scanning route status, weather, and saved rides quickly.",
    bg: "#F8FAFC",
    panel: "#FFFFFF",
    panelAlt: "#F1F5F9",
    ink: "#172033",
    muted: "#64748B",
    line: "#E2E8F0",
    accent: "#2563EB",
    accentSoft: "#DBEAFE",
  },
  {
    id: "modern",
    source: "Modern UI · animated CTA + expressive display",
    sourceUrl: "https://modern-ui.org/components",
    title: "Color signal",
    thesis:
      "A more energetic route companion where the best window becomes a visible, memorable call to action.",
    bg: "#111326",
    panel: "#1B1F3A",
    panelAlt: "#272C4D",
    ink: "#F8FAFF",
    muted: "#AEB7D8",
    line: "#3A426B",
    accent: "#FFB86B",
    accentSoft: "#4A3542",
  },
  {
    id: "reui",
    source: "ReUI · timeline + composable shadcn grammar",
    sourceUrl: "https://reui.io/components/timeline",
    title: "Route notebook",
    thesis:
      "The route sequence is the interface: each segment carries its wind, road evidence, and confidence in order.",
    bg: "#F4F1EB",
    panel: "#FFFDF8",
    panelAlt: "#EAE3D6",
    ink: "#29271F",
    muted: "#7A766B",
    line: "#D8D0C2",
    accent: "#B35B3D",
    accentSoft: "#F2D8CB",
  },
];

export function DirectionsGallery({ route }: { route: RoutePlan }) {
  const [selected, setSelected] = useState<DirectionId | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>NASEEM / UI DIRECTIONS</Text>
            <Text style={styles.title}>
              Five different worlds for the same ride.
            </Text>
            <Text style={styles.subtitle}>
              These are five complete visual directions—not five navigation
              tabs. Scroll the entire page; every source has its own
              composition, controls, map treatment, and content hierarchy.
            </Text>
          </View>
          <View style={styles.count}>
            <Text style={styles.countValue}>05</Text>
            <Text style={styles.countLabel}>directions</Text>
          </View>
        </View>

        <View style={styles.sourceRail}>
          {DIRECTIONS.map((direction, index) => (
            <View key={direction.id} style={styles.sourceRailItem}>
              <View
                style={[
                  styles.sourceRailDot,
                  { backgroundColor: direction.accent },
                ]}
              />
              <Text style={styles.sourceRailLabel}>
                {index + 1}. {direction.source.split(" · ")[0]}
              </Text>
            </View>
          ))}
        </View>

        {DIRECTIONS.map((direction, index) => (
          <DirectionCard
            key={direction.id}
            direction={direction}
            index={index}
            route={route}
            selected={selected === direction.id}
            onSelect={() => setSelected(direction.id)}
          />
        ))}

        <View style={styles.footerNote}>
          <Text style={styles.footerTitle}>
            {selected
              ? `Selected: ${DIRECTIONS.find((direction) => direction.id === selected)?.title}`
              : "Choose one direction after seeing all five."}
          </Text>
          <Text style={styles.footerCopy}>
            Tell me the number or title. Then I’ll rebuild the real app screens
            in that visual language instead of mixing references into one
            generic shell.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DirectionCard({
  direction,
  index,
  route,
  selected,
  onSelect,
}: {
  direction: Direction;
  index: number;
  route: RoutePlan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <View
      style={[
        styles.directionCard,
        { backgroundColor: direction.panel, borderColor: direction.line },
        selected && { borderColor: direction.accent, borderWidth: 2 },
      ]}
    >
      <View style={styles.directionHeader}>
        <View style={styles.directionHeaderCopy}>
          <Text style={[styles.directionIndex, { color: direction.accent }]}>
            DIRECTION {String(index + 1).padStart(2, "0")}
          </Text>
          <Text style={[styles.directionSource, { color: direction.muted }]}>
            {direction.source}
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(direction.sourceUrl)}
          style={[styles.sourceButton, { borderColor: direction.line }]}
        >
          <Text style={[styles.sourceButtonText, { color: direction.ink }]}>
            Open source
          </Text>
          <Icon name="chevron" color={direction.accent} size={13} />
        </Pressable>
      </View>
      <Text style={[styles.directionTitle, { color: direction.ink }]}>
        {direction.title}
      </Text>
      <Text style={[styles.directionThesis, { color: direction.muted }]}>
        {direction.thesis}
      </Text>
      <DirectionPreview direction={direction} route={route} />
      <View style={styles.directionFooter}>
        <View style={styles.patternTags}>
          {patternTags(direction.id).map((tag) => (
            <View
              key={tag}
              style={[
                styles.patternTag,
                { backgroundColor: direction.accentSoft },
              ]}
            >
              <Text
                style={[styles.patternTagText, { color: direction.accent }]}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={onSelect}
          style={[
            styles.chooseButton,
            { backgroundColor: selected ? direction.accent : direction.ink },
          ]}
        >
          <Text
            style={[
              styles.chooseButtonText,
              { color: selected ? direction.bg : direction.panel },
            ]}
          >
            {selected ? "Selected for preview" : "Choose this direction"}
          </Text>
          <Icon
            name="chevron"
            color={selected ? direction.bg : direction.panel}
            size={14}
          />
        </Pressable>
      </View>
    </View>
  );
}

function DirectionPreview({
  direction,
  route,
}: {
  direction: Direction;
  route: RoutePlan;
}) {
  if (direction.id === "untitled")
    return <UntitledPreview direction={direction} route={route} />;
  if (direction.id === "uiverse")
    return <UiversePreview direction={direction} route={route} />;
  if (direction.id === "blocks")
    return <BlocksPreview direction={direction} route={route} />;
  if (direction.id === "modern")
    return <ModernPreview direction={direction} route={route} />;
  return <ReuiPreview direction={direction} route={route} />;
}

function PreviewShell({
  direction,
  children,
}: {
  direction: Direction;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.previewShell,
        { backgroundColor: direction.bg, borderColor: direction.line },
      ]}
    >
      {children}
    </View>
  );
}

function PreviewHeader({
  direction,
  label = "NASEEM",
}: {
  direction: Direction;
  label?: string;
}) {
  return (
    <View style={styles.previewHeader}>
      <Text style={[styles.previewBrand, { color: direction.ink }]}>
        {label}
      </Text>
      <View style={styles.previewHeaderActions}>
        <View
          style={[
            styles.previewHeaderDot,
            { backgroundColor: direction.accent },
          ]}
        />
        <Text style={[styles.previewHeaderLabel, { color: direction.muted }]}>
          Bahrain / route preview
        </Text>
      </View>
    </View>
  );
}

function UntitledPreview({
  direction,
  route,
}: {
  direction: Direction;
  route: RoutePlan;
}) {
  return (
    <PreviewShell direction={direction}>
      <PreviewHeader direction={direction} />
      <View style={styles.untitledHero}>
        <View>
          <Text style={[styles.previewEyebrow, { color: direction.muted }]}>
            NEXT RIDING WINDOW
          </Text>
          <Text style={[styles.untitledTime, { color: direction.ink }]}>
            17:40
          </Text>
          <Text style={[styles.previewCopy, { color: direction.muted }]}>
            Forecast context for later segments
          </Text>
        </View>
        <View
          style={[styles.cleanBadge, { backgroundColor: direction.accentSoft }]}
        >
          <Text style={[styles.cleanBadgeText, { color: direction.accent }]}>
            Forecast ready
          </Text>
        </View>
      </View>
      <MetricGrid
        direction={direction}
        items={[
          ["Distance", `${route.distanceKm.toFixed(1)} km`],
          ["Moving time", `${route.durationMinutes} min`],
          ["Finish context", route.arrivalLabel],
        ]}
      />
      <MapPreview
        route={route}
        compact
        mapText={{
          native: "Route evidence map",
          web: "Road geometry preview",
          fit: "Fit route",
          loop: "loop",
        }}
      />
      <ActionButton direction={direction} label="See route intelligence" />
    </PreviewShell>
  );
}

function UiversePreview({
  direction,
  route,
}: {
  direction: Direction;
  route: RoutePlan;
}) {
  return (
    <PreviewShell direction={direction}>
      <PreviewHeader direction={direction} label="NASEEM // SIGNAL" />
      <View style={styles.uiverseHero}>
        <View style={styles.uiverseOrb}>
          <View
            style={[
              styles.uiverseOrbInner,
              { backgroundColor: direction.accent },
            ]}
          />
        </View>
        <View style={styles.uiverseHeroCopy}>
          <Text style={[styles.previewEyebrow, { color: direction.accent }]}>
            LIVE SIGNAL
          </Text>
          <Text style={[styles.uiverseTitle, { color: direction.ink }]}>
            Ride when the wind turns.
          </Text>
          <Text style={[styles.previewCopy, { color: direction.muted }]}>
            A tactile control surface for the next good window.
          </Text>
        </View>
      </View>
      <View style={[styles.uiversePanel, { borderColor: direction.line }]}>
        <View style={styles.uiversePanelTop}>
          <Text style={[styles.panelTitle, { color: direction.ink }]}>
            Nasser bin Hamad Loop
          </Text>
          <View
            style={[
              styles.uiversePill,
              { backgroundColor: direction.accentSoft },
            ]}
          >
            <Text style={[styles.uiversePillText, { color: direction.accent }]}>
              ROAD-MATCHED
            </Text>
          </View>
        </View>
        <MapPreview
          route={route}
          compact
          mapText={{
            native: "Signal map",
            web: "Road geometry preview",
            fit: "Fit route",
            loop: "loop",
          }}
        />
        <View style={styles.uiverseMetrics}>
          <SignalMetric
            direction={direction}
            label="wind"
            value="14"
            unit="km/h"
          />
          <SignalMetric
            direction={direction}
            label="gusts"
            value="21"
            unit="km/h"
          />
          <SignalMetric
            direction={direction}
            label="finish"
            value={route.arrivalLabel}
            unit=""
          />
        </View>
      </View>
      <SpectrumButton direction={direction} label="Open route intelligence" />
    </PreviewShell>
  );
}

function BlocksPreview({
  direction,
  route,
}: {
  direction: Direction;
  route: RoutePlan;
}) {
  return (
    <PreviewShell direction={direction}>
      <PreviewHeader direction={direction} label="Naseem dashboard" />
      <View style={styles.blocksTop}>
        <View>
          <Text style={[styles.previewEyebrow, { color: direction.muted }]}>
            TODAY
          </Text>
          <Text style={[styles.blocksTitle, { color: direction.ink }]}>
            Know the ride before you roll.
          </Text>
        </View>
        <View style={[styles.blocksFilter, { borderColor: direction.line }]}>
          <Text style={[styles.blocksFilterText, { color: direction.ink }]}>
            Tonight
          </Text>
          <Icon name="chevron" color={direction.muted} size={13} />
        </View>
      </View>
      <View style={styles.blocksGrid}>
        <BlockMetric
          direction={direction}
          label="Temperature"
          value="40°"
          detail="Open-Meteo"
        />
        <BlockMetric
          direction={direction}
          label="Air quality"
          value="105"
          detail="AQI"
        />
        <BlockMetric
          direction={direction}
          label="Wind"
          value="14"
          detail="km/h"
        />
      </View>
      <View style={[styles.blocksRouteRow, { borderColor: direction.line }]}>
        <View
          style={[
            styles.blocksRouteIcon,
            { backgroundColor: direction.accentSoft },
          ]}
        >
          <Icon name="route" color={direction.accent} size={16} />
        </View>
        <View style={styles.blocksRouteCopy}>
          <Text style={[styles.panelTitle, { color: direction.ink }]}>
            {route.name}
          </Text>
          <Text style={[styles.previewCopy, { color: direction.muted }]}>
            {route.distanceKm.toFixed(1)} km · {route.arrivalLabel} finish
            context
          </Text>
        </View>
        <Icon name="chevron" color={direction.accent} size={15} />
      </View>
      <ActionButton direction={direction} label="Compare departure times" />
    </PreviewShell>
  );
}

function ModernPreview({
  direction,
  route,
}: {
  direction: Direction;
  route: RoutePlan;
}) {
  return (
    <PreviewShell direction={direction}>
      <PreviewHeader direction={direction} label="NASEEM / COLOR SIGNAL" />
      <View style={styles.modernHero}>
        <Text style={[styles.modernTitle, { color: direction.ink }]}>
          The next good window is{" "}
          <Text style={{ color: direction.accent }}>17:40.</Text>
        </Text>
        <Text style={[styles.previewCopy, { color: direction.muted }]}>
          The outbound leg has the stronger headwind. Leaving now keeps the
          return more favourable.
        </Text>
        <View style={styles.rainbowRail}>
          {["#FF6B6B", "#FFB86B", "#8CF7C8", "#7CC7FF", "#B69CFF"].map(
            (color) => (
              <View
                key={color}
                style={[styles.rainbowSegment, { backgroundColor: color }]}
              />
            ),
          )}
        </View>
      </View>
      <View
        style={[styles.modernMapFrame, { backgroundColor: direction.panel }]}
      >
        <Text style={[styles.panelTitle, { color: direction.ink }]}>
          Route preview
        </Text>
        <MapPreview
          route={route}
          compact
          mapText={{
            native: "Color signal map",
            web: "Road geometry preview",
            fit: "Fit route",
            loop: "loop",
          }}
        />
      </View>
      <SpectrumButton direction={direction} label="Take the good window" />
    </PreviewShell>
  );
}

function ReuiPreview({
  direction,
  route,
}: {
  direction: Direction;
  route: RoutePlan;
}) {
  return (
    <PreviewShell direction={direction}>
      <PreviewHeader direction={direction} label="NASEEM / ROUTE NOTEBOOK" />
      <View style={styles.reuiHeader}>
        <Text style={[styles.reuiTitle, { color: direction.ink }]}>
          Route intelligence
        </Text>
        <Text style={[styles.previewCopy, { color: direction.muted }]}>
          {route.name} · {route.distanceKm.toFixed(1)} km
        </Text>
      </View>
      <View style={styles.reuiBody}>
        <View style={styles.reuiTimeline}>
          {route.segments.slice(0, 4).map((segment, index) => (
            <View key={segment.id} style={styles.reuiTimelineRow}>
              <View style={styles.reuiRail}>
                <View
                  style={[
                    styles.reuiNode,
                    { backgroundColor: direction.accent },
                  ]}
                >
                  <Text style={[styles.reuiNodeText, { color: direction.bg }]}>
                    {index + 1}
                  </Text>
                </View>
                {index < Math.min(route.segments.length, 4) - 1 && (
                  <View
                    style={[
                      styles.reuiConnector,
                      { backgroundColor: direction.line },
                    ]}
                  />
                )}
              </View>
              <View style={styles.reuiSegmentCopy}>
                <Text style={[styles.panelTitle, { color: direction.ink }]}>
                  {segment.name}
                </Text>
                <Text style={[styles.previewCopy, { color: direction.muted }]}>
                  {segment.arrivalLabel} · {segment.wind.kind}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <MapPreview
          route={route}
          compact
          mapText={{
            native: "Evidence timeline map",
            web: "Road geometry preview",
            fit: "Fit route",
            loop: "loop",
          }}
        />
      </View>
      <ActionButton direction={direction} label="Review evidence" />
    </PreviewShell>
  );
}

function MetricGrid({
  direction,
  items,
}: {
  direction: Direction;
  items: string[][];
}) {
  return (
    <View style={[styles.metricGrid, { borderColor: direction.line }]}>
      {items.map(([label, value]) => (
        <View key={label} style={styles.metricGridCell}>
          <Text style={[styles.metricGridValue, { color: direction.ink }]}>
            {value}
          </Text>
          <Text style={[styles.metricGridLabel, { color: direction.muted }]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function BlockMetric({
  direction,
  label,
  value,
  detail,
}: {
  direction: Direction;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <View
      style={[
        styles.blockMetric,
        { backgroundColor: direction.panelAlt, borderColor: direction.line },
      ]}
    >
      <Text style={[styles.blockMetricLabel, { color: direction.muted }]}>
        {label}
      </Text>
      <Text style={[styles.blockMetricValue, { color: direction.ink }]}>
        {value}
      </Text>
      <Text style={[styles.blockMetricDetail, { color: direction.accent }]}>
        {detail}
      </Text>
    </View>
  );
}

function SignalMetric({
  direction,
  label,
  value,
  unit,
}: {
  direction: Direction;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View style={styles.signalMetric}>
      <Text style={[styles.signalMetricLabel, { color: direction.muted }]}>
        {label}
      </Text>
      <Text style={[styles.signalMetricValue, { color: direction.ink }]}>
        {value} <Text style={{ color: direction.accent }}>{unit}</Text>
      </Text>
    </View>
  );
}

function ActionButton({
  direction,
  label,
}: {
  direction: Direction;
  label: string;
}) {
  return (
    <View style={[styles.actionButton, { backgroundColor: direction.ink }]}>
      <Text style={[styles.actionButtonText, { color: direction.panel }]}>
        {label}
      </Text>
      <View style={[styles.actionArrow, { backgroundColor: direction.accent }]}>
        <Icon name="chevron" color={direction.bg} size={14} />
      </View>
    </View>
  );
}

function SpectrumButton({
  direction,
  label,
}: {
  direction: Direction;
  label: string;
}) {
  return (
    <View
      style={[
        styles.spectrumButton,
        { backgroundColor: direction.panelAlt, borderColor: direction.line },
      ]}
    >
      <View style={styles.spectrumButtonRail}>
        {["#FF6B6B", "#FFB86B", "#8CF7C8", "#7CC7FF", "#B69CFF"].map(
          (color) => (
            <View
              key={color}
              style={[styles.spectrumButtonSegment, { backgroundColor: color }]}
            />
          ),
        )}
      </View>
      <Text style={[styles.spectrumButtonText, { color: direction.ink }]}>
        {label}
      </Text>
      <Icon name="chevron" color={direction.accent} size={14} />
    </View>
  );
}

function patternTags(id: DirectionId) {
  if (id === "untitled") return ["metric cards", "badge groups", "page header"];
  if (id === "uiverse")
    return ["interactive states", "tactile CTA", "signal badge"];
  if (id === "blocks") return ["dashboard grid", "shadcn card", "filter bar"];
  if (id === "modern") return ["expressive CTA", "color rail", "hero action"];
  return ["timeline", "evidence rows", "composable card"];
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#E9EDF0" },
  screen: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 22,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
  },
  headerCopy: { flex: 1, gap: 8 },
  kicker: {
    color: "#2563EB",
    fontFamily: FONT_BOLD,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "900",
  },
  title: {
    color: "#172033",
    fontFamily: FONT_EXTRABOLD,
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -0.8,
  },
  subtitle: {
    maxWidth: 700,
    color: "#5B6674",
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    lineHeight: 21,
  },
  count: {
    minWidth: 82,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#172033",
  },
  countValue: {
    color: "#FFFFFF",
    fontFamily: FONT_EXTRABOLD,
    fontSize: 26,
    lineHeight: 29,
  },
  countLabel: {
    color: "#B9C5D4",
    fontFamily: FONT_MEDIUM,
    fontSize: 10,
    marginTop: 2,
  },
  sourceRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#D7DEE5",
  },
  sourceRailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 10,
  },
  sourceRailDot: { width: 7, height: 7, borderRadius: 4 },
  sourceRailLabel: {
    color: "#687482",
    fontFamily: FONT_SEMIBOLD,
    fontSize: 11,
  },
  directionCard: { gap: 14, padding: 18, borderRadius: 24, borderWidth: 1 },
  directionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  directionHeaderCopy: { flex: 1, gap: 3 },
  directionIndex: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    letterSpacing: 1.1,
    fontWeight: "900",
  },
  directionSource: { fontFamily: FONT_REGULAR, fontSize: 11, lineHeight: 16 },
  sourceButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 11,
  },
  sourceButtonText: { fontFamily: FONT_BOLD, fontSize: 10, fontWeight: "900" },
  directionTitle: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  directionThesis: {
    maxWidth: 760,
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    lineHeight: 19,
  },
  previewShell: { gap: 14, padding: 18, borderRadius: 20, borderWidth: 1 },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  previewBrand: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 13,
    letterSpacing: 1.5,
  },
  previewHeaderActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewHeaderDot: { width: 7, height: 7, borderRadius: 4 },
  previewHeaderLabel: { fontFamily: FONT_MEDIUM, fontSize: 10 },
  previewEyebrow: {
    fontFamily: FONT_BOLD,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "900",
  },
  previewCopy: { fontFamily: FONT_REGULAR, fontSize: 11, lineHeight: 16 },
  untitledHero: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  untitledTime: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 42,
    lineHeight: 45,
    letterSpacing: -1.2,
  },
  cleanBadge: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9 },
  cleanBadgeText: { fontFamily: FONT_BOLD, fontSize: 10, fontWeight: "900" },
  metricGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 11,
  },
  metricGridCell: { flex: 1, gap: 3, paddingHorizontal: 8 },
  metricGridValue: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 17,
    fontWeight: "900",
  },
  metricGridLabel: { fontFamily: FONT_MEDIUM, fontSize: 10 },
  actionButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 9,
    borderRadius: 15,
  },
  actionButtonText: {
    flex: 1,
    paddingHorizontal: 7,
    fontFamily: FONT_BOLD,
    fontSize: 12,
    fontWeight: "900",
  },
  actionArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  uiverseHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 8,
  },
  uiverseOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#425067",
  },
  uiverseOrbInner: { width: 30, height: 30, borderRadius: 15 },
  uiverseHeroCopy: { flex: 1, gap: 5 },
  uiverseTitle: { fontFamily: FONT_EXTRABOLD, fontSize: 24, lineHeight: 27 },
  uiversePanel: {
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: "#10141D",
  },
  uiversePanelTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  panelTitle: { fontFamily: FONT_BOLD, fontSize: 12, fontWeight: "900" },
  uiversePill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  uiversePillText: {
    fontFamily: FONT_BOLD,
    fontSize: 8,
    letterSpacing: 0.6,
    fontWeight: "900",
  },
  uiverseMetrics: { flexDirection: "row", gap: 6 },
  signalMetric: { flex: 1, gap: 3, paddingTop: 6 },
  signalMetricLabel: {
    fontFamily: FONT_MEDIUM,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  signalMetricValue: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 16,
    fontWeight: "900",
  },
  spectrumButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderRadius: 15,
  },
  spectrumButtonRail: {
    width: 34,
    height: 28,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 8,
  },
  spectrumButtonSegment: { flex: 1 },
  spectrumButtonText: {
    flex: 1,
    fontFamily: FONT_BOLD,
    fontSize: 12,
    fontWeight: "900",
  },
  blocksTop: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  blocksTitle: {
    maxWidth: 500,
    fontFamily: FONT_EXTRABOLD,
    fontSize: 24,
    lineHeight: 28,
  },
  blocksFilter: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  blocksFilterText: { fontFamily: FONT_SEMIBOLD, fontSize: 10 },
  blocksGrid: { flexDirection: "row", gap: 8 },
  blockMetric: {
    flex: 1,
    minHeight: 86,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderRadius: 13,
  },
  blockMetricLabel: { fontFamily: FONT_MEDIUM, fontSize: 9 },
  blockMetricValue: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 22,
    fontWeight: "900",
  },
  blockMetricDetail: { fontFamily: FONT_BOLD, fontSize: 9, fontWeight: "900" },
  blocksRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  blocksRouteIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  blocksRouteCopy: { flex: 1, gap: 3 },
  modernHero: { gap: 10, paddingVertical: 6 },
  modernTitle: {
    fontFamily: FONT_EXTRABOLD,
    fontSize: 29,
    lineHeight: 33,
    letterSpacing: -0.6,
  },
  rainbowRail: {
    height: 9,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 6,
    marginTop: 3,
  },
  rainbowSegment: { flex: 1 },
  modernMapFrame: { gap: 9, padding: 12, borderRadius: 18 },
  reuiHeader: { gap: 4, paddingBottom: 4 },
  reuiTitle: { fontFamily: FONT_EXTRABOLD, fontSize: 27, lineHeight: 31 },
  reuiBody: { gap: 14 },
  reuiTimeline: { gap: 1 },
  reuiTimelineRow: { flexDirection: "row", gap: 10, minHeight: 44 },
  reuiRail: { width: 22, alignItems: "center" },
  reuiNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  reuiNodeText: { fontFamily: FONT_BOLD, fontSize: 10, fontWeight: "900" },
  reuiConnector: { width: 2, flex: 1, marginVertical: 2 },
  reuiSegmentCopy: { flex: 1, gap: 2, paddingTop: 1 },
  directionFooter: { gap: 12 },
  patternTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  patternTag: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  patternTagText: { fontFamily: FONT_BOLD, fontSize: 9, fontWeight: "900" },
  chooseButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
    borderRadius: 14,
  },
  chooseButtonText: {
    flex: 1,
    fontFamily: FONT_BOLD,
    fontSize: 12,
    fontWeight: "900",
  },
  footerNote: {
    gap: 6,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#172033",
  },
  footerTitle: {
    color: "#FFFFFF",
    fontFamily: FONT_BOLD,
    fontSize: 15,
    fontWeight: "900",
  },
  footerCopy: {
    color: "#B9C5D4",
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    lineHeight: 18,
  },
});
