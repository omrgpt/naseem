import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LIGHT } from './designTokens';

const palette = LIGHT;

const GOOGLE_FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700;800&family=Noto+Sans:wght@400;500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap';

type FilterKey = 'all' | 'product' | 'arabic' | 'safe';

type FontCandidate = {
  id: string;
  rank: string;
  name: string;
  englishFont: string;
  arabicFont: string;
  badge: string;
  tagline: string;
  tradeoff: string;
  bestFor: string;
  filters: FilterKey[];
  accent: string;
  recommended?: boolean;
};

const candidates: FontCandidate[] = [
  {
    id: 'inter-noto-arabic',
    rank: '01',
    name: 'Inter + Noto Sans Arabic',
    englishFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    arabicFont: "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif",
    badge: 'BALANCED DEFAULT',
    tagline: 'Calm, crisp, and dependable across the full rider journey.',
    tradeoff: 'The most neutral option; it gives the brand room to speak through color and route evidence.',
    bestFor: 'Product UI, metrics, navigation, and the primary web shell.',
    filters: ['all', 'product', 'safe'],
    accent: palette.accent,
    recommended: true,
  },
  {
    id: 'ibm-plex',
    rank: '02',
    name: 'IBM Plex Sans + IBM Plex Sans Arabic',
    englishFont: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    arabicFont: "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif",
    badge: 'TECHNICAL EDITORIAL',
    tagline: 'A little more character for an instrument that wants to feel considered.',
    tradeoff: 'Distinctive texture and sturdy numerals, with a slightly more engineered voice in compact labels.',
    bestFor: 'Route intelligence, evidence rows, and data-heavy detail screens.',
    filters: ['all', 'product'],
    accent: '#5A68A6',
  },
  {
    id: 'noto-sans',
    rank: '03',
    name: 'Noto Sans + Noto Sans Arabic',
    englishFont: "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    arabicFont: "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif",
    badge: 'COVERAGE FIRST',
    tagline: 'The broad, unshowy choice for content that needs to travel well.',
    tradeoff: 'Excellent glyph coverage and predictable rhythm; less distinctive at the brand layer.',
    bestFor: 'Longer bilingual copy, source notes, help text, and future localization.',
    filters: ['all', 'product', 'safe'],
    accent: '#6D7D7F',
  },
  {
    id: 'source-sans',
    rank: '04',
    name: 'Source Sans 3 + Noto Sans Arabic',
    englishFont: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    arabicFont: "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif",
    badge: 'READABLE UTILITY',
    tagline: 'Open counters and generous rhythm make small copy feel lighter.',
    tradeoff: 'Friendly and easy to scan, though it has less edge than Inter in a compact control row.',
    bestFor: 'Settings, onboarding, empty states, and secondary explanatory copy.',
    filters: ['all', 'product'],
    accent: '#C47B51',
  },
  {
    id: 'tajawal-inter',
    rank: '05',
    name: 'Tajawal + Inter',
    englishFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    arabicFont: "'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif",
    badge: 'WARM ARABIC',
    tagline: 'A more human Arabic voice while English stays tight and contemporary.',
    tradeoff: 'The scripts feel intentionally distinct; shared sizing needs a little more tuning in mixed rows.',
    bestFor: 'Arabic-forward moments, community copy, and culturally warm entry points.',
    filters: ['all', 'arabic'],
    accent: '#B26365',
  },
  {
    id: 'cairo-inter',
    rank: '06',
    name: 'Cairo + Inter',
    englishFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    arabicFont: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif",
    badge: 'EXPRESSIVE ARABIC',
    tagline: 'A clear Arabic signature with more presence at display sizes.',
    tradeoff: 'Recognizable and lively, but the Arabic shapes can feel too assertive for dense telemetry.',
    bestFor: 'Campaign moments, hero copy, and a deliberately Arabic-led surface.',
    filters: ['all', 'arabic'],
    accent: '#8D62A6',
  },
  {
    id: 'system-noto',
    rank: '07',
    name: 'SF / Segoe + Noto Arabic',
    englishFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    arabicFont: "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif",
    badge: 'PLATFORM NATIVE',
    tagline: 'The fastest path to a familiar web surface with no required font asset.',
    tradeoff: 'Performance and resilience are excellent; the English texture changes slightly from OS to OS.',
    bestFor: 'Offline-safe states, system utility, and a deliberately native-feeling shell.',
    filters: ['all', 'safe'],
    accent: '#3F7B8A',
  },
];

const filterOptions: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All stacks' },
  { key: 'product', label: 'Product UI' },
  { key: 'arabic', label: 'Arabic-led' },
  { key: 'safe', label: 'Safe fallback' },
];

function useFontCatalogHead() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.title = 'Naseem — Font catalog';
    const addedNodes: HTMLElement[] = [];

    const addLink = (rel: string, href: string, marker: string, crossOrigin?: string) => {
      if (document.head.querySelector(`[data-naseem-font-catalog="${marker}"]`)) return;
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      link.dataset.naseemFontCatalog = marker;
      if (crossOrigin) link.crossOrigin = crossOrigin;
      document.head.appendChild(link);
      addedNodes.push(link);
    };

    addLink('preconnect', 'https://fonts.googleapis.com', 'preconnect-google');
    addLink('preconnect', 'https://fonts.gstatic.com', 'preconnect-gstatic', 'anonymous');
    addLink('stylesheet', GOOGLE_FONT_STYLESHEET, 'stylesheet');

    if (!document.head.querySelector('[data-naseem-font-catalog="globals"]')) {
      const style = document.createElement('style');
      style.dataset.naseemFontCatalog = 'globals';
      style.textContent = `
        html, body, #root { min-height: 100%; }
        body { margin: 0; background: ${palette.bg}; }
        *, *::before, *::after { box-sizing: border-box; }
      `;
      document.head.appendChild(style);
      addedNodes.push(style);
    }

    return () => {
      addedNodes.forEach((node) => node.remove());
    };
  }, []);
}

export function FontCatalog() {
  useFontCatalogHead();
  const { width } = useWindowDimensions();
  const compact = width < 860;
  const narrow = width < 560;
  const [filter, setFilter] = useState<FilterKey>('all');
  const [activeId, setActiveId] = useState('inter-noto-arabic');

  const visibleCandidates = useMemo(
    () => candidates.filter((candidate) => filter === 'all' || candidate.filters.includes(filter)),
    [filter],
  );
  const activeCandidate = candidates.find((candidate) => candidate.id === activeId) ?? candidates[0];

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
      accessibilityLabel="Naseem bilingual font catalog"
    >
      <View style={styles.shell}>
        <View style={[styles.topbar, compact && styles.topbarCompact]}>
          <View style={styles.brandLockup}>
            <Text style={styles.brand}>NASEEM</Text>
            <Text style={styles.brandArabic}>نسيم</Text>
            <Text style={styles.brandMeta}>TYPE SYSTEM / 01</Text>
          </View>
          <View style={styles.webPill}>
            <View style={styles.webPillDot} />
            <Text style={styles.webPillText}>WEB-ONLY SPECIMEN</Text>
          </View>
        </View>

        <View style={[styles.hero, compact && styles.heroCompact]}>
          <View style={styles.heroCopy}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.eyebrow}>FONT CATALOG</Text>
              <View style={styles.eyebrowRule} />
              <Text style={styles.eyebrowNote}>07 BILINGUAL CANDIDATES</Text>
            </View>
            <Text style={[styles.heroTitle, compact && styles.heroTitleCompact, narrow && styles.heroTitleNarrow]}>
              A voice that can carry the ride.
            </Text>
            <Text style={[styles.heroSubtitle, compact && styles.heroSubtitleCompact]}>
              A focused comparison of English and Arabic stacks for a calm, evidence-led cycling product. The right pairing should disappear into the interface until the rider needs it to speak.
            </Text>
            <View style={styles.heroProofRow}>
              <View style={styles.heroProofItem}>
                <Text style={styles.heroProofValue}>02</Text>
                <Text style={styles.heroProofLabel}>scripts in one shell</Text>
              </View>
              <View style={styles.heroProofDivider} />
              <View style={styles.heroProofItem}>
                <Text style={styles.heroProofValue}>01</Text>
                <Text style={styles.heroProofLabel}>default to ship first</Text>
              </View>
            </View>
          </View>

          <View style={[styles.heroSpecimen, compact && styles.heroSpecimenCompact]}>
            <View style={styles.specimenHeader}>
              <Text style={styles.specimenEyebrow}>RECOMMENDED START</Text>
              <Text style={styles.specimenIndex}>01 / 07</Text>
            </View>
            <Text style={[styles.heroEnglish, { fontFamily: candidates[0].englishFont }]}>Know the ride before you roll.</Text>
            <Text style={[styles.heroArabic, { fontFamily: candidates[0].arabicFont }]}>اعرف الرحلة قبل أن تنطلق</Text>
            <View style={styles.specimenLine} />
            <View style={styles.specimenFooter}>
              <View>
                <Text style={styles.specimenMetaLabel}>ENGLISH</Text>
                <Text style={styles.specimenMetaValue}>Inter</Text>
              </View>
              <View style={styles.specimenFooterDivider} />
              <View>
                <Text style={[styles.specimenMetaLabel, styles.specimenMetaLabelArabic]}>العربية</Text>
                <Text style={[styles.specimenMetaValue, { fontFamily: candidates[0].arabicFont }]}>Noto Sans Arabic</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.statsStrip, narrow && styles.statsStripNarrow]}>
          <Stat value="07" label="candidate stacks" />
          <View style={styles.statsDivider} />
          <Stat value="02" label="writing systems" />
          <View style={styles.statsDivider} />
          <Stat value="01" label="recommended default" accent />
          <View style={styles.statsSource}>
            <Text style={styles.statsSourceLabel}>SYSTEM NOTE</Text>
            <Text style={styles.statsSourceCopy}>Every sample keeps a system fallback.</Text>
          </View>
        </View>

        <View style={[styles.sectionHeader, compact && styles.sectionHeaderCompact]}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionEyebrow}>COMPARE IN CONTEXT</Text>
            <Text style={styles.sectionTitle}>One shell, seven possible voices.</Text>
            <Text style={styles.sectionSubtitle}>Read the same product moment in each pairing. Select a card to keep its stack in focus.</Text>
          </View>
          <View style={styles.focusPlate}>
            <Text style={styles.focusLabel}>CURRENT FOCUS</Text>
            <Text style={styles.focusValue}>{activeCandidate.name}</Text>
          </View>
        </View>

        <View style={[styles.filterRow, compact && styles.filterRowCompact]}>
          {filterOptions.map((option) => {
            const selected = filter === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(option.key)}
                style={[styles.filterButton, selected && styles.filterButtonActive]}
              >
                <Text style={[styles.filterButtonText, selected && styles.filterButtonTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.grid, compact && styles.gridCompact]}>
          {visibleCandidates.map((candidate) => (
            <FontCard
              key={candidate.id}
              candidate={candidate}
              compact={compact}
              active={candidate.id === activeId}
              onPress={() => setActiveId(candidate.id)}
            />
          ))}
        </View>

          <View style={[styles.recommendation, compact && styles.recommendationCompact]}>
          <View style={styles.recommendationMain}>
            <View style={styles.recommendationHeader}>
              <Text style={styles.recommendationEyebrow}>RECOMMENDATION</Text>
              <Text style={styles.recommendationRank}>01 / 07</Text>
            </View>
            <Text style={styles.recommendationTitle}>Start with Inter + Noto Sans Arabic.</Text>
            <Text style={styles.recommendationCopy}>
              It keeps English and Arabic equally quiet, gives numerals enough authority for route evidence, and leaves the product&apos;s teal route line to carry the signature. It is the strongest default before the interface has enough content to justify a more expressive voice.
            </Text>
            <View style={styles.reasonList}>
              <Reason index="01" title="Steady rhythm" copy="A neutral x-height keeps controls, metrics, and map labels in the same register." />
              <Reason index="02" title="Reliable Arabic" copy="Noto Sans Arabic brings broad coverage without forcing a display personality onto utility copy." />
              <Reason index="03" title="Easy to evolve" copy="The pairing can move toward IBM Plex or Tajawal later without changing the content model." />
            </View>
          </View>

          <View style={[styles.recommendationAside, compact && styles.recommendationAsideCompact]}>
            <Text style={styles.asideEyebrow}>SHIP THE BASELINE</Text>
            <Text style={styles.asideTitle}>One pairing, three layers.</Text>
            <View style={styles.decisionRows}>
              <DecisionRow label="English UI" value="Inter" fontFamily={candidates[0].englishFont} />
              <DecisionRow label="Arabic UI" value="Noto Sans Arabic" fontFamily={candidates[0].arabicFont} arabic />
              <DecisionRow label="Offline fallback" value="SF · Segoe · sans-serif" />
            </View>
            <Text style={styles.asideNote}>Use the same stack for navigation, route evidence, and the first web launch. Add a display face only when a real content moment asks for it.</Text>
          </View>
        </View>

        <View style={[styles.footerNote, narrow && styles.footerNoteNarrow]}>
          <View style={styles.footerNoteIndex}><Text style={styles.footerNoteIndexText}>07</Text></View>
          <View style={styles.footerNoteCopy}>
            <Text style={styles.footerNoteEyebrow}>WEB FONT LOADING</Text>
            <Text style={styles.footerNoteText}>Google-hosted fonts are progressive enhancement only. If the request is blocked or the rider is offline, every specimen keeps a readable platform fallback.</Text>
          </View>
          <Text style={[styles.footerBrand, narrow && styles.footerBrandNarrow]}>NASEEM / نسيم</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function FontCard({
  candidate,
  compact,
  active,
  onPress,
}: {
  candidate: FontCandidate;
  compact: boolean;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Preview ${candidate.name} font pairing`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        active && styles.cardActive,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardAccentRow}>
        <View style={[styles.cardAccentMark, { backgroundColor: candidate.accent }]} />
        <Text style={styles.cardRank}>{candidate.rank}</Text>
        <Text style={styles.cardBadge}>{candidate.badge}</Text>
        {candidate.recommended && <Text style={styles.recommendedPill}>RECOMMENDED</Text>}
      </View>
      <Text style={styles.cardTitle}>{candidate.name}</Text>
      <Text style={styles.cardTagline}>{candidate.tagline}</Text>

      <View style={styles.samplePanel}>
        <View style={styles.sampleHeader}>
          <Text style={styles.sampleLabel}>ENGLISH / 16 PX</Text>
          <Text style={styles.sampleMetric}>Aa 123</Text>
        </View>
        <Text style={[styles.englishSample, { fontFamily: candidate.englishFont }]}>Know the ride before you roll.</Text>
        <View style={styles.sampleDivider} />
        <View style={styles.sampleHeader}>
          <Text style={styles.sampleLabel}>العربية / 16 PX</Text>
          <Text style={styles.sampleMetric}>أب ١٢٣</Text>
        </View>
        <Text style={[styles.arabicSample, { fontFamily: candidate.arabicFont }]}>اعرف الرحلة قبل أن تنطلق</Text>
        <Text style={[styles.arabicSubsample, { fontFamily: candidate.arabicFont }]}>نسيم / مسار الصباح</Text>
      </View>

      <View style={styles.cardDetails}>
        <Detail label="TRADEOFF" value={candidate.tradeoff} />
        <Detail label="BEST FOR" value={candidate.bestFor} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterLabel}>{active ? 'FOCUSED PREVIEW' : 'SELECT TO FOCUS'}</Text>
        <View style={styles.cardFooterLine} />
        <Text style={styles.cardFooterStack}>{candidate.rank} / 07</Text>
      </View>
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Reason({ index, title, copy }: { index: string; title: string; copy: string }) {
  return (
    <View style={styles.reasonRow}>
      <View style={styles.reasonIndex}><Text style={styles.reasonIndexText}>{index}</Text></View>
      <View style={styles.reasonCopy}>
        <Text style={styles.reasonTitle}>{title}</Text>
        <Text style={styles.reasonDescription}>{copy}</Text>
      </View>
    </View>
  );
}

function DecisionRow({ label, value, fontFamily, arabic = false }: { label: string; value: string; fontFamily?: string; arabic?: boolean }) {
  return (
    <View style={styles.decisionRow}>
      <Text style={styles.decisionLabel}>{label}</Text>
      <Text style={[styles.decisionValue, arabic && styles.decisionValueArabic, fontFamily ? { fontFamily } : undefined]}>{value}</Text>
    </View>
  );
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.bg },
  content: { paddingBottom: 64 },
  shell: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 32 },
  topbar: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: palette.line },
  topbarCompact: { flexDirection: 'column', alignItems: 'flex-start', gap: 12, paddingVertical: 16 },
  brandLockup: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  brand: { color: palette.ink, fontSize: 15, fontWeight: '900', letterSpacing: 2.6 },
  brandArabic: { color: palette.accent, fontFamily: "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif", fontSize: 15, fontWeight: '700' },
  brandMeta: { color: palette.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginLeft: 4 },
  webPill: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: palette.line, borderRadius: 999, paddingHorizontal: 11, backgroundColor: palette.panel },
  webPillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.accent },
  webPillText: { color: palette.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  hero: { flexDirection: 'row', alignItems: 'stretch', gap: 30, paddingTop: 58, paddingBottom: 42 },
  heroCompact: { flexDirection: 'column', paddingTop: 42, gap: 24 },
  heroCopy: { flex: 1, maxWidth: 720, justifyContent: 'center', gap: 15 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  eyebrow: { color: palette.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  eyebrowRule: { width: 28, height: 1, backgroundColor: palette.accent },
  eyebrowNote: { color: palette.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
  heroTitle: { color: palette.ink, maxWidth: 700, fontSize: 58, lineHeight: 62, fontWeight: '800', letterSpacing: -2.4 },
  heroTitleCompact: { fontSize: 44, lineHeight: 48, letterSpacing: -1.6 },
  heroTitleNarrow: { fontSize: 36, lineHeight: 40, letterSpacing: -1.2 },
  heroSubtitle: { color: palette.muted, maxWidth: 625, fontSize: 15, lineHeight: 23 },
  heroSubtitleCompact: { maxWidth: 700 },
  heroProofRow: { flexDirection: 'row', alignItems: 'center', gap: 17, marginTop: 5 },
  heroProofItem: { gap: 2 },
  heroProofValue: { color: palette.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.4 },
  heroProofLabel: { color: palette.muted, fontSize: 10, fontWeight: '700' },
  heroProofDivider: { width: 1, height: 30, backgroundColor: palette.line },
  heroSpecimen: { width: 350, minHeight: 292, justifyContent: 'space-between', padding: 25, borderRadius: 18, backgroundColor: palette.ink, shadowColor: palette.shadow, shadowOpacity: 0.13, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  heroSpecimenCompact: { width: '100%', minHeight: 250 },
  specimenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  specimenEyebrow: { color: '#8AD3C9', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  specimenIndex: { color: '#9FB9B6', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  heroEnglish: { color: '#F4F8F6', fontSize: 27, lineHeight: 31, fontWeight: '600', letterSpacing: -0.5, marginTop: 26 },
  heroArabic: { color: '#F4F8F6', fontSize: 25, lineHeight: 36, fontWeight: '600', textAlign: 'right', marginTop: 12 },
  specimenLine: { height: 1, backgroundColor: '#385351', marginTop: 25, marginBottom: 16 },
  specimenFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  specimenFooterDivider: { width: 1, height: 27, backgroundColor: '#385351' },
  specimenMetaLabel: { color: '#7FA19C', fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  specimenMetaLabelArabic: { textAlign: 'right' },
  specimenMetaValue: { color: '#F4F8F6', fontSize: 11, fontWeight: '700', marginTop: 4 },
  statsStrip: { minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: 24, paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.line },
  statsStripNarrow: { alignItems: 'stretch', flexDirection: 'column', gap: 15 },
  stat: { minWidth: 118, gap: 2 },
  statValue: { color: palette.ink, fontSize: 25, lineHeight: 28, fontWeight: '900', letterSpacing: -0.8 },
  statValueAccent: { color: palette.accent },
  statLabel: { color: palette.muted, fontSize: 10, fontWeight: '800' },
  statsDivider: { width: 1, height: 34, backgroundColor: palette.line },
  statsSource: { flex: 1, alignItems: 'flex-end', gap: 4 },
  statsSourceLabel: { color: palette.caution, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statsSourceCopy: { color: palette.muted, fontSize: 10, textAlign: 'right' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, paddingTop: 56, paddingBottom: 20 },
  sectionHeaderCompact: { flexDirection: 'column', alignItems: 'stretch', paddingTop: 42, gap: 18 },
  sectionHeaderCopy: { flex: 1, gap: 8 },
  sectionEyebrow: { color: palette.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  sectionTitle: { color: palette.ink, fontSize: 27, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8 },
  sectionSubtitle: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  focusPlate: { minWidth: 220, borderLeftWidth: 3, borderColor: palette.accent, paddingLeft: 13, paddingVertical: 5, gap: 4 },
  focusLabel: { color: palette.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  focusValue: { color: palette.ink, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 18 },
  filterRowCompact: { paddingBottom: 15 },
  filterButton: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: palette.line, borderRadius: 999, paddingHorizontal: 14, backgroundColor: palette.panel },
  filterButtonActive: { borderColor: palette.accent, backgroundColor: palette.accent },
  filterButtonText: { color: palette.muted, fontSize: 11, fontWeight: '900' },
  filterButtonTextActive: { color: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridCompact: { flexDirection: 'column' },
  card: { width: '48%', flexGrow: 1, minWidth: 340, padding: 19, borderWidth: 1, borderColor: palette.line, borderRadius: 16, backgroundColor: palette.panel, shadowColor: palette.shadow, shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  cardCompact: { width: '100%', minWidth: 0 },
  cardActive: { borderColor: palette.accent, shadowOpacity: 0.1, shadowRadius: 15 },
  cardPressed: { opacity: 0.82 },
  cardAccentRow: { minHeight: 18, flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardAccentMark: { width: 8, height: 8, borderRadius: 4 },
  cardRank: { color: palette.ink, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  cardBadge: { color: palette.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  recommendedPill: { color: palette.accent, fontSize: 8, fontWeight: '900', letterSpacing: 0.6, borderWidth: 1, borderColor: palette.accentSoft, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 'auto', backgroundColor: palette.accentSoft },
  cardTitle: { color: palette.ink, fontSize: 18, lineHeight: 22, fontWeight: '900', letterSpacing: -0.4, marginTop: 13 },
  cardTagline: { color: palette.muted, minHeight: 36, fontSize: 12, lineHeight: 18, marginTop: 5 },
  samplePanel: { minHeight: 161, justifyContent: 'center', marginTop: 18, padding: 15, borderRadius: 12, backgroundColor: palette.panelAlt },
  sampleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sampleLabel: { color: palette.accent, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  sampleMetric: { color: palette.muted, fontSize: 9, fontWeight: '700' },
  englishSample: { color: palette.ink, fontSize: 19, lineHeight: 24, fontWeight: '600', marginTop: 9 },
  sampleDivider: { height: 1, backgroundColor: palette.line, marginVertical: 13 },
  arabicSample: { color: palette.ink, fontSize: 20, lineHeight: 30, fontWeight: '600', textAlign: 'right', marginTop: 7 },
  arabicSubsample: { color: palette.muted, fontSize: 11, lineHeight: 17, textAlign: 'right', marginTop: 4 },
  cardDetails: { gap: 12, paddingTop: 17 },
  detailBlock: { gap: 4 },
  detailLabel: { color: palette.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  detailValue: { color: palette.ink, fontSize: 11, lineHeight: 17 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17, paddingTop: 12, borderTopWidth: 1, borderColor: palette.line },
  cardFooterLabel: { color: palette.accent, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  cardFooterLine: { flex: 1, height: 1, backgroundColor: palette.line },
  cardFooterStack: { color: palette.muted, fontSize: 9, fontWeight: '800' },
  recommendation: { flexDirection: 'row', gap: 28, marginTop: 52, padding: 25, borderWidth: 1, borderColor: '#A6D9D3', borderLeftWidth: 4, borderRadius: 16, backgroundColor: palette.accentSoft },
  recommendationCompact: { flexDirection: 'column', gap: 24 },
  recommendationMain: { flex: 1, gap: 12 },
  recommendationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recommendationEyebrow: { color: palette.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  recommendationRank: { color: palette.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  recommendationTitle: { color: palette.ink, maxWidth: 640, fontSize: 29, lineHeight: 34, fontWeight: '900', letterSpacing: -0.9 },
  recommendationCopy: { color: palette.ink, maxWidth: 690, fontSize: 13, lineHeight: 20 },
  reasonList: { gap: 12, marginTop: 5 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  reasonIndex: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: palette.accent },
  reasonIndexText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  reasonCopy: { flex: 1, gap: 2 },
  reasonTitle: { color: palette.ink, fontSize: 11, fontWeight: '900' },
  reasonDescription: { color: palette.muted, fontSize: 11, lineHeight: 16 },
  recommendationAside: { width: 280, padding: 18, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.72)' },
  recommendationAsideCompact: { width: '100%' },
  asideEyebrow: { color: palette.caution, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  asideTitle: { color: palette.ink, fontSize: 16, lineHeight: 20, fontWeight: '900', marginTop: 7, marginBottom: 17 },
  decisionRows: { gap: 12 },
  decisionRow: { gap: 3 },
  decisionLabel: { color: palette.muted, fontSize: 9, fontWeight: '800' },
  decisionValue: { color: palette.ink, fontSize: 12, fontWeight: '900' },
  decisionValueArabic: { textAlign: 'right' },
  asideNote: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 19 },
  footerNote: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 29, borderBottomWidth: 1, borderColor: palette.line },
  footerNoteNarrow: { alignItems: 'flex-start', flexWrap: 'wrap' },
  footerNoteIndex: { width: 33, height: 33, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: palette.ink },
  footerNoteIndexText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  footerNoteCopy: { flex: 1, gap: 4 },
  footerNoteEyebrow: { color: palette.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  footerNoteText: { color: palette.muted, maxWidth: 690, fontSize: 11, lineHeight: 17 },
  footerBrand: { color: palette.ink, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  footerBrandNarrow: { width: '100%', marginLeft: 46 },
});

export default FontCatalog;
