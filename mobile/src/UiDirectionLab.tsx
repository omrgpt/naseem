import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

type LibraryId = 'panelui' | 'reusables' | 'aniui';
type Tone = 'teal' | 'copper' | 'violet' | 'muted';

const colors = {
  bg: '#080A0B',
  panel: '#111618',
  panelRaised: '#171D1F',
  line: '#2B3436',
  ink: '#F4F7F6',
  muted: '#9DA8A8',
  teal: '#68E0D1',
  copper: '#F0A46A',
  violet: '#A995FF',
  green: '#61D48B',
  white: '#FFFFFF',
};

const directions: Record<LibraryId, {
  label: string;
  strapline: string;
  runtime: string;
  install: string;
  primitives: string[];
  implementation: string;
  note: string;
  accent: string;
}> = {
  panelui: {
    label: 'PanelUI',
    strapline: 'Finished panel system',
    runtime: 'Expo 57 · Uniwind',
    install: 'npx create-panelui-app@latest',
    primitives: ['Card', 'Alert', 'Badge', 'Progress', 'Button', 'Text'],
    implementation: 'Compound components + theme tokens',
    note: 'The most complete starting point for the current route dashboard.',
    accent: colors.teal,
  },
  reusables: {
    label: 'React Native Reusables',
    strapline: 'shadcn-style primitives',
    runtime: 'Expo 56 · NativeWind',
    install: 'npx @react-native-reusables/cli@latest init',
    primitives: ['Button', 'Text', 'Icon', 'Slot', 'CVA'],
    implementation: 'Copy-paste primitives + className variants',
    note: 'The cleanest option when we want to own every component detail.',
    accent: colors.copper,
  },
  aniui: {
    label: 'AniUI',
    strapline: 'Animated primitive kit',
    runtime: 'Expo 57 · Uniwind',
    install: 'npx @aniui/cli init',
    primitives: ['Alert', 'Badge', 'Button', 'Card', 'Progress', 'Text'],
    implementation: 'CVA variants + native animation-ready primitives',
    note: 'The best candidate if motion becomes part of the product language.',
    accent: colors.violet,
  },
};

function TonePill({ children, tone = 'muted' }: { children: string; tone?: Tone }) {
  const toneColor = tone === 'teal' ? colors.teal : tone === 'copper' ? colors.copper : tone === 'violet' ? colors.violet : colors.muted;
  return (
    <View style={[styles.pill, { borderColor: `${toneColor}55`, backgroundColor: `${toneColor}12` }]}>
      <Text style={[styles.pillText, { color: toneColor }]}>{children}</Text>
    </View>
  );
}

function RouteLine({ accent }: { accent: string }) {
  return (
    <View style={styles.routeLine} accessibilityLabel="Route evidence: Saar to Budaiya to Karbabad">
      <View style={[styles.routeSegment, { backgroundColor: accent }]} />
      <View style={[styles.routeSegment, { backgroundColor: colors.copper }]} />
      <View style={[styles.routeSegment, { backgroundColor: colors.muted }]} />
      <View style={[styles.routeDot, { backgroundColor: accent, left: '4%' }]} />
      <View style={[styles.routeDot, { backgroundColor: colors.copper, left: '48%' }]} />
      <View style={[styles.routeDot, { backgroundColor: colors.muted, right: '4%' }]} />
    </View>
  );
}

function RouteSpecimen({ library, compact }: { library: LibraryId; compact: boolean }) {
  const direction = directions[library];
  const [ready, setReady] = useState(true);
  const isPanel = library === 'panelui';
  const isReusable = library === 'reusables';

  return (
    <View style={[styles.specimen, { borderColor: `${direction.accent}66`, borderRadius: isReusable ? 12 : 20 }]}>
      <View style={[styles.specimenRule, { backgroundColor: direction.accent }]} />
      <View style={styles.specimenHeader}>
        <View style={styles.specimenHeading}>
          <Text style={styles.eyebrow}>SAME PRODUCT SPECIMEN</Text>
          <Text style={styles.specimenTitle}>North coast loop</Text>
          <Text style={styles.specimenSubtitle}>Saar · Budaiya · Karbabad</Text>
        </View>
        <TonePill tone={library === 'panelui' ? 'teal' : library === 'reusables' ? 'copper' : 'violet'}>
          {ready ? 'Ready' : 'Paused'}
        </TonePill>
      </View>

      <RouteLine accent={direction.accent} />

      <View style={[styles.specimenStats, compact && styles.specimenStatsCompact]}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>42.8</Text>
          <Text style={styles.statLabel}>km route</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>1h 46m</Text>
          <Text style={styles.statLabel}>estimated</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: direction.accent }]}>12 km/h</Text>
          <Text style={styles.statLabel}>crosswind</Text>
        </View>
      </View>

      <View style={[styles.specimenAlert, { borderColor: `${colors.copper}55`, backgroundColor: `${colors.copper}12` }]}>
        <Text style={[styles.alertLabel, { color: colors.copper }]}>WIND NOTE</Text>
        <Text style={styles.alertCopy}>Leave before 09:00 to keep the exposed coast section comfortable.</Text>
      </View>

      <View style={styles.specimenActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ready ? 'Pause specimen ride' : 'Resume specimen ride'}
          onPress={() => setReady((value) => !value)}
          style={({ pressed }) => [
            styles.specimenPrimary,
            {
              backgroundColor: isReusable ? 'transparent' : direction.accent,
              borderColor: direction.accent,
              borderWidth: isReusable ? 1 : 0,
              opacity: pressed ? 0.78 : 1,
            },
          ]}
        >
          <Text style={[styles.specimenPrimaryText, { color: isReusable ? direction.accent : colors.bg }]}>
            {ready ? 'Start ride' : 'Resume ride'}
          </Text>
        </Pressable>
        <View style={styles.specimenSecondary}>
          <Text style={styles.specimenSecondaryText}>{isPanel ? 'Card + Alert' : isReusable ? 'Button + Text' : 'Card + Badge'}</Text>
        </View>
      </View>
    </View>
  );
}

function PrimitiveList({ library }: { library: LibraryId }) {
  const direction = directions[library];
  return (
    <View style={styles.primitiveList}>
      {direction.primitives.map((primitive, index) => (
        <View key={primitive} style={styles.primitiveRow}>
          <Text style={[styles.primitiveIndex, { color: direction.accent }]}>{String(index + 1).padStart(2, '0')}</Text>
          <Text style={styles.primitiveName}>{primitive}</Text>
          <Text style={styles.primitiveHint}>{index === 0 ? 'primary' : index === 1 ? 'content' : 'primitive'}</Text>
        </View>
      ))}
    </View>
  );
}

function MapDecisionPanel() {
  return (
    <View style={styles.mapDecision}>
      <View style={styles.mapDecisionHeader}>
        <View style={styles.mapDecisionCopy}>
          <Text style={styles.eyebrow}>MAP DECISION</Text>
          <Text style={styles.sectionTitle}>Map is parked, not forced</Text>
          <Text style={styles.bodyCopy}>
            The current map is visually noisy and does not explain why a route is good. This replacement specimen makes the evidence readable first: route segments, wind direction, source, and confidence.
          </Text>
        </View>
        <TonePill tone="copper">No map</TonePill>
      </View>
      <View style={styles.evidenceRail}>
        <View style={[styles.evidenceBlock, { borderTopColor: colors.teal }]}>
          <Text style={styles.evidenceValue}>92%</Text>
          <Text style={styles.evidenceLabel}>dedicated lanes</Text>
        </View>
        <View style={[styles.evidenceBlock, { borderTopColor: colors.copper }]}>
          <Text style={styles.evidenceValue}>3</Text>
          <Text style={styles.evidenceLabel}>wind segments</Text>
        </View>
        <View style={[styles.evidenceBlock, { borderTopColor: colors.violet }]}>
          <Text style={styles.evidenceValue}>High</Text>
          <Text style={styles.evidenceLabel}>route confidence</Text>
        </View>
      </View>
      <Text style={styles.footnote}>If this direction feels better, the existing Leaflet-style map can be removed from the primary journey instead of receiving more controls.</Text>
    </View>
  );
}

export function UiDirectionLab() {
  const { width } = useWindowDimensions();
  const compact = width < 820;
  const [library, setLibrary] = useState<LibraryId>('panelui');
  const direction = directions[library];
  const routeLabel = useMemo(() => `${direction.label} · ${direction.strapline}`, [direction]);

  useEffect(() => {
    if (typeof document !== 'undefined') document.title = 'Naseem native UI direction lab';
  }, []);

  const openMode = (mode: 'fonts' | 'catalog') => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.search = `?${mode}=1`;
      return;
    }
    Linking.openURL(`http://localhost:8081/?${mode}=1`).catch(() => undefined);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.brand}>NASEEM / نسيم</Text>
            <Text style={styles.kicker}>NATIVE UI DIRECTION LAB</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable onPress={() => openMode('fonts')} style={styles.topAction}><Text style={styles.topActionText}>Fonts</Text></Pressable>
            <Pressable onPress={() => openMode('catalog')} style={styles.topAction}><Text style={styles.topActionText}>Catalog</Text></Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>THREE ISOLATED EXPO STARTERS</Text>
          <Text style={styles.heroTitle}>Same route. Three UI systems.</Text>
          <Text style={styles.heroCopy}>
            Pick the visual language before we move anything into the production app. These are separate sandboxes, so none of the CLIs can destabilise Naseem.
          </Text>
        </View>

        <View style={[styles.libraryTabs, compact && styles.libraryTabsCompact]}>
          {(Object.keys(directions) as LibraryId[]).map((id) => {
            const item = directions[id];
            const selected = id === library;
            return (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setLibrary(id)}
                style={({ pressed }) => [styles.libraryTab, selected && { borderColor: item.accent, backgroundColor: `${item.accent}12` }, pressed && styles.pressed]}
              >
                <View style={[styles.libraryDot, { backgroundColor: item.accent }]} />
                <View style={styles.libraryTabCopy}>
                  <Text style={styles.libraryLabel}>{item.label}</Text>
                  <Text style={styles.libraryStrapline}>{item.strapline}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.selectionLine}>
          <Text style={styles.selectionLabel}>Showing</Text>
          <Text style={[styles.selectionValue, { color: direction.accent }]}>{routeLabel}</Text>
          <Text style={styles.selectionHint}>Tap a tab to compare.</Text>
        </View>

        <View style={[styles.mainGrid, compact && styles.mainGridCompact]}>
          <RouteSpecimen library={library} compact={compact} />
          <View style={styles.detailsPanel}>
            <Text style={styles.eyebrow}>WHAT CHANGES</Text>
            <Text style={styles.sectionTitle}>{direction.label} component map</Text>
            <Text style={styles.bodyCopy}>{direction.note}</Text>
            <PrimitiveList library={library} />
            <View style={styles.implementationNote}>
              <Text style={[styles.noteLabel, { color: direction.accent }]}>IMPLEMENTATION</Text>
              <Text style={styles.noteCopy}>{direction.implementation}</Text>
            </View>
          </View>
        </View>

        <View style={styles.commandPanel}>
          <View style={styles.commandHeader}>
            <View style={styles.commandHeaderCopy}>
              <Text style={styles.eyebrow}>RUNNABLE SANDBOXES</Text>
              <Text style={styles.sectionTitle}>The exact starter commands</Text>
            </View>
            <TonePill tone="teal">Isolated</TonePill>
          </View>
          {(Object.keys(directions) as LibraryId[]).map((id) => (
            <View key={id} style={styles.commandRow}>
              <Text style={[styles.commandLibrary, { color: directions[id].accent }]}>{directions[id].label}</Text>
              <Text selectable style={styles.commandText}>{directions[id].install}</Text>
            </View>
          ))}
          <Text style={styles.footnote}>PanelUI and AniUI use Uniwind. Reusables uses NativeWind. They remain separate until one direction is chosen.</Text>
        </View>

        <MapDecisionPanel />

        <View style={styles.footerNote}>
          <Text style={styles.footerTitle}>What I recommend</Text>
          <Text style={styles.bodyCopy}>
            Start with PanelUI as the baseline, borrow Reusables’ ownership of primitives, and only keep AniUI motion if it improves route comprehension. The next production pass should use the selected specimen—not another catalog of references.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 64, gap: 22 },
  contentCompact: { paddingHorizontal: 16, paddingTop: 16 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  brand: { color: colors.ink, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  kicker: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginTop: 5 },
  topActions: { flexDirection: 'row', gap: 8 },
  topAction: { minHeight: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  topActionText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  hero: { maxWidth: 760, gap: 8, paddingTop: 8 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { color: colors.ink, fontSize: 38, lineHeight: 43, fontWeight: '900', letterSpacing: -0.8 },
  heroCopy: { color: colors.muted, fontSize: 15, lineHeight: 23, maxWidth: 680 },
  libraryTabs: { flexDirection: 'row', gap: 10 },
  libraryTabsCompact: { flexDirection: 'column' },
  libraryTab: { flex: 1, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  libraryDot: { width: 10, height: 10, borderRadius: 5 },
  libraryTabCopy: { flex: 1, gap: 3 },
  libraryLabel: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  libraryStrapline: { color: colors.muted, fontSize: 11 },
  pressed: { opacity: 0.78 },
  selectionLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  selectionLabel: { color: colors.muted, fontSize: 12 },
  selectionValue: { fontSize: 12, fontWeight: '900' },
  selectionHint: { color: colors.muted, fontSize: 11 },
  mainGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  mainGridCompact: { flexDirection: 'column' },
  specimen: { flex: 1.15, minWidth: 0, padding: 20, backgroundColor: colors.panel, borderWidth: 1, overflow: 'hidden', gap: 18 },
  specimenRule: { height: 3, width: 64, borderRadius: 4, marginBottom: 2 },
  specimenHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  specimenHeading: { flex: 1, gap: 4 },
  specimenTitle: { color: colors.ink, fontSize: 23, lineHeight: 27, fontWeight: '900' },
  specimenSubtitle: { color: colors.muted, fontSize: 12 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
  pillText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  routeLine: { height: 30, width: '100%', justifyContent: 'center', position: 'relative' },
  routeSegment: { height: 3, flex: 1, marginHorizontal: 1, borderRadius: 3 },
  routeDot: { position: 'absolute', top: 9, height: 12, width: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.panel },
  specimenStats: { flexDirection: 'row', gap: 10 },
  specimenStatsCompact: { flexWrap: 'wrap' },
  statBlock: { flex: 1, minWidth: 86, gap: 3 },
  statValue: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 10 },
  specimenAlert: { padding: 12, borderWidth: 1, borderRadius: 12, gap: 4 },
  alertLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  alertCopy: { color: colors.ink, fontSize: 12, lineHeight: 17 },
  specimenActions: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  specimenPrimary: { minHeight: 46, flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  specimenPrimaryText: { fontSize: 13, fontWeight: '900' },
  specimenSecondary: { minHeight: 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  specimenSecondaryText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  detailsPanel: { flex: 0.85, minWidth: 0, padding: 20, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 20, gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: '900' },
  bodyCopy: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  primitiveList: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 5 },
  primitiveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36, borderBottomWidth: 1, borderBottomColor: colors.line },
  primitiveIndex: { width: 22, fontSize: 10, fontWeight: '900' },
  primitiveName: { color: colors.ink, flex: 1, fontSize: 12, fontWeight: '800' },
  primitiveHint: { color: colors.muted, fontSize: 10 },
  implementationNote: { marginTop: 5, padding: 12, borderRadius: 12, backgroundColor: colors.panelRaised, gap: 4 },
  noteLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  noteCopy: { color: colors.ink, fontSize: 12, lineHeight: 17 },
  commandPanel: { padding: 20, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 20, gap: 10 },
  commandHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 3 },
  commandHeaderCopy: { gap: 4 },
  commandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40, borderTopWidth: 1, borderTopColor: colors.line },
  commandLibrary: { width: 160, fontSize: 12, fontWeight: '900' },
  commandText: { color: colors.ink, flex: 1, fontSize: 11, fontFamily: Platform.select({ web: 'ui-monospace, SFMono-Regular, Consolas, monospace', default: undefined }) },
  mapDecision: { padding: 20, backgroundColor: '#171310', borderWidth: 1, borderColor: `${colors.copper}66`, borderRadius: 20, gap: 14 },
  mapDecisionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  mapDecisionCopy: { flex: 1, gap: 6 },
  evidenceRail: { flexDirection: 'row', gap: 10 },
  evidenceBlock: { flex: 1, minWidth: 90, paddingTop: 9, borderTopWidth: 2, gap: 3 },
  evidenceValue: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  evidenceLabel: { color: colors.muted, fontSize: 10 },
  footnote: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  footerNote: { maxWidth: 760, gap: 7, paddingBottom: 12 },
  footerTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
});

