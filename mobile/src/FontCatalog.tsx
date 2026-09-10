import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type FontStack = {
  id: string;
  name: string;
  english: string;
  arabic: string;
  family: string;
  mood: string;
  strength: string;
  tradeoff: string;
  recommended?: boolean;
};

const fontStacks: FontStack[] = [
  {
    id: "inter-noto",
    name: "Inter + Noto Sans Arabic",
    english: "Inter",
    arabic: "Noto Sans Arabic",
    family: 'Inter, "Noto Sans Arabic", Arial, sans-serif',
    mood: "Clean, modern, product-focused",
    strength: "Best overall balance for Naseem",
    tradeoff:
      "Needs bundled/web font files for a fully consistent native release.",
  },
  {
    id: "plex",
    name: "IBM Plex Sans + IBM Plex Sans Arabic",
    english: "IBM Plex Sans",
    arabic: "IBM Plex Sans Arabic",
    family: '"IBM Plex Sans", "IBM Plex Sans Arabic", Arial, sans-serif',
    mood: "Technical, precise, instrument-like",
    strength: "Excellent for route data and evidence labels",
    tradeoff: "Slightly more technical and less soft than Inter.",
  },
  {
    id: "noto",
    name: "Noto Sans + Noto Sans Arabic",
    english: "Noto Sans",
    arabic: "Noto Sans Arabic",
    family: '"Noto Sans", "Noto Sans Arabic", Arial, sans-serif',
    mood: "Neutral, dependable, highly legible",
    strength: "Safest coverage across scripts and weights",
    tradeoff:
      "Less distinctive; can feel generic without strong spacing and hierarchy.",
  },
  {
    id: "source-noto",
    name: "Source Sans 3 + Noto Sans Arabic",
    english: "Source Sans 3",
    arabic: "Noto Sans Arabic",
    family: '"Source Sans 3", "Noto Sans Arabic", Arial, sans-serif',
    mood: "Warm, editorial, easy to scan",
    strength: "Comfortable for longer explanations and source notes",
    tradeoff: "Less punchy for large dashboard numbers.",
  },
  {
    id: "tajawal",
    name: "Tajawal + Inter",
    english: "Inter",
    arabic: "Tajawal",
    family: "Inter, Tajawal, Arial, sans-serif",
    mood: "Arabic-first, friendly, regional",
    strength: "Makes Arabic feel intentional rather than substituted",
    tradeoff: "The two scripts have a more visibly different personality.",
  },
  {
    id: "cairo",
    name: "Cairo + Inter",
    english: "Inter",
    arabic: "Cairo",
    family: "Inter, Cairo, Arial, sans-serif",
    mood: "Confident, expressive, high-energy",
    strength: "Strong headings and short Arabic labels",
    tradeoff: "Can feel too promotional for quiet route evidence.",
  },
  {
    id: "manrope",
    name: "Manrope + Noto Sans Arabic",
    english: "Manrope",
    arabic: "Noto Sans Arabic",
    family: 'Manrope, "Noto Sans Arabic", Arial, sans-serif',
    mood: "Contemporary, geometric, premium",
    strength: "Beautiful numbers and compact navigation labels",
    tradeoff: "Needs careful line-height tuning in Arabic body copy.",
    recommended: true,
  },
  {
    id: "system",
    name: "System UI + Noto Sans Arabic",
    english: "SF Pro / Segoe UI",
    arabic: "Noto Sans Arabic",
    family:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Arabic", sans-serif',
    mood: "Native, quiet, platform-aware",
    strength: "Lowest operational risk and best OS integration",
    tradeoff: "Chrome and iPhone will not look perfectly identical.",
  },
];

const googleFontHref =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700;800&family=Noto+Sans:wght@400;500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap";

export function FontCatalog() {
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState("manrope");
  const compact = width < 820;

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const existing = document.getElementById("naseem-font-catalog");
    if (existing) return;
    const link = document.createElement("link");
    link.id = "naseem-font-catalog";
    link.rel = "stylesheet";
    link.href = googleFontHref;
    document.head.appendChild(link);
  }, []);

  const selectedStack = useMemo(
    () => fontStacks.find((stack) => stack.id === selected) ?? fontStacks[0],
    [selected],
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={[styles.shell, compact && styles.shellCompact]}>
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Text style={styles.eyebrow}>NASEEM · FONT LAB</Text>
            <Text style={styles.title}>Choose the voice of the ride.</Text>
            <Text style={styles.subtitle}>
              A real English / Arabic comparison for the product—not a font
              list.
            </Text>
          </View>
          <View style={styles.arabicMark}>
            <Text style={styles.arabicMarkText}>نسيم</Text>
            <Text style={styles.arabicMarkCaption}>
              Bahrain cycling intelligence
            </Text>
          </View>
        </View>

        <View style={styles.recommendation}>
          <View style={styles.recommendationCopy}>
            <Text style={styles.recommendationEyebrow}>
              CURRENT RECOMMENDATION
            </Text>
            <Text
              style={[
                styles.recommendationTitle,
                { fontFamily: selectedStack.family },
              ]}
            >
              {selectedStack.name}
            </Text>
            <Text style={styles.recommendationText}>
              {selectedStack.strength}. This is the stack currently selected for
              the preview.
            </Text>
          </View>
          <View style={styles.recommendationChip}>
            <Text style={styles.recommendationChipText}>Selected</Text>
          </View>
        </View>

        <View style={styles.samplePanel}>
          <View style={styles.sampleHeader}>
            <View>
              <Text style={styles.sectionLabel}>LIVE SAMPLE</Text>
              <Text
                style={[
                  styles.sampleHeading,
                  { fontFamily: selectedStack.family },
                ]}
              >
                Know the ride before you roll.
              </Text>
            </View>
            <Text
              style={[
                styles.sampleHeadingArabic,
                { fontFamily: selectedStack.family },
              ]}
            >
              {"اعرف الرحلة قبل أن تنطلق"}
            </Text>
          </View>
          <View
            style={[styles.sampleGrid, compact && styles.sampleGridCompact]}
          >
            <View style={styles.sampleColumn}>
              <Text style={styles.sampleLabel}>English</Text>
              <Text
                style={[
                  styles.sampleBody,
                  { fontFamily: selectedStack.family },
                ]}
              >
                Forecast conditions are named by route segment. Route/access
                evidence is shown separately.
              </Text>
              <Text
                style={[
                  styles.sampleMetric,
                  { fontFamily: selectedStack.family },
                ]}
              >
                21.8 <Text style={styles.sampleUnit}>km</Text>
              </Text>
              <Text
                style={[
                  styles.sampleMeta,
                  { fontFamily: selectedStack.family },
                ]}
              >
                Road-matched · high confidence
              </Text>
            </View>
            <View style={[styles.sampleColumn, styles.sampleColumnArabic]}>
              <Text style={styles.sampleLabel}>العربية</Text>
              <Text
                style={[
                  styles.sampleBody,
                  styles.arabicText,
                  { fontFamily: selectedStack.family },
                ]}
              >
                {
                  "تواجه أول ١٢ كم رياحاً أقوى. تصبح العودة أكثر ملاءمة مع استقرار الرحلة."
                }
              </Text>
              <Text
                style={[
                  styles.sampleMetric,
                  styles.arabicText,
                  { fontFamily: selectedStack.family },
                ]}
              >
                ٥٠٫٣ <Text style={styles.sampleUnit}>كم</Text>
              </Text>
              <Text
                style={[
                  styles.sampleMeta,
                  styles.arabicText,
                  { fontFamily: selectedStack.family },
                ]}
              >
                {"مطابق للطرق · ثقة عالية"}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.stackGrid, compact && styles.stackGridCompact]}>
          {fontStacks.map((stack) => {
            const active = stack.id === selected;
            return (
              <Pressable
                key={stack.id}
                onPress={() => setSelected(stack.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.stackCard,
                  compact && styles.stackCardCompact,
                  active && styles.stackCardActive,
                ]}
              >
                <View style={styles.stackCardTop}>
                  <Text style={styles.stackName}>{stack.name}</Text>
                  {stack.recommended && (
                    <Text style={styles.bestTag}>BEST START</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stackPreviewEnglish,
                    { fontFamily: stack.family },
                  ]}
                >
                  Route intelligence · 17:40 · 21.8 km
                </Text>
                <Text
                  style={[
                    styles.stackPreviewArabic,
                    { fontFamily: stack.family },
                  ]}
                >
                  {"ذكاء المسار · ١٧:٤٠ · ٥٠٫٣ كم"}
                </Text>
                <Text style={styles.stackMood}>{stack.mood}</Text>
                <Text style={styles.stackStrength}>{stack.strength}</Text>
                <Text style={styles.stackTradeoff}>{stack.tradeoff}</Text>
                <View
                  style={[
                    styles.stackChoice,
                    active && styles.stackChoiceActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stackChoiceText,
                      active && styles.stackChoiceTextActive,
                    ]}
                  >
                    {active ? "Selected for preview" : "Preview this stack"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerTitle}>My recommendation</Text>
          <Text style={styles.footerText}>
            Start with Manrope + Noto Sans Arabic. It gives the product a
            compact, contemporary rhythm while keeping Arabic legible; the app
            preview uses this pair today.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#090A0B" },
  content: { padding: 24, paddingBottom: 56 },
  shell: { width: "100%", maxWidth: 1120, alignSelf: "center", gap: 20 },
  shellCompact: { gap: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
    paddingVertical: 12,
  },
  brandBlock: { flex: 1, gap: 8 },
  eyebrow: {
    color: "#8BE0D4",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    color: "#F5F1E9",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    maxWidth: 700,
  },
  subtitle: { color: "#9FA9A9", fontSize: 14, lineHeight: 20, maxWidth: 640 },
  arabicMark: { alignItems: "flex-end", gap: 3, paddingTop: 4 },
  arabicMarkText: {
    color: "#F5F1E9",
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800",
  },
  arabicMarkCaption: { color: "#879493", fontSize: 11 },
  recommendation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#24524E",
    backgroundColor: "#102A28",
  },
  recommendationCopy: { flex: 1, gap: 6 },
  recommendationEyebrow: {
    color: "#8BE0D4",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  recommendationTitle: { color: "#F5F1E9", fontSize: 19, fontWeight: "800" },
  recommendationText: { color: "#B7C7C4", fontSize: 13, lineHeight: 19 },
  recommendationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#69D6C8",
  },
  recommendationChipText: { color: "#09201E", fontSize: 11, fontWeight: "900" },
  samplePanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2A3031",
    backgroundColor: "#141617",
    padding: 20,
    gap: 18,
  },
  sampleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  sectionLabel: {
    color: "#7F918F",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 6,
  },
  sampleHeading: {
    color: "#F5F1E9",
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
  },
  sampleHeadingArabic: {
    color: "#F5F1E9",
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    textAlign: "right",
    maxWidth: 320,
  },
  sampleGrid: { flexDirection: "row", gap: 18 },
  sampleGridCompact: { flexDirection: "column" },
  sampleColumn: {
    flex: 1,
    gap: 9,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#1C1F20",
  },
  sampleColumnArabic: { alignItems: "flex-end" },
  sampleLabel: {
    color: "#8BE0D4",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  sampleBody: { color: "#E6EBE7", fontSize: 17, lineHeight: 26 },
  arabicText: { textAlign: "right" },
  sampleMetric: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    marginTop: 4,
  },
  sampleUnit: { color: "#91A09E", fontSize: 14, fontWeight: "600" },
  sampleMeta: { color: "#94A19F", fontSize: 12 },
  stackGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  stackGridCompact: { flexDirection: "column" },
  stackCard: {
    width: "31%",
    minWidth: 250,
    padding: 17,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2A3031",
    backgroundColor: "#111314",
    gap: 8,
  },
  stackCardCompact: { width: "100%", minWidth: 0 },
  stackCardActive: { borderColor: "#69D6C8", backgroundColor: "#142523" },
  stackCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  stackName: {
    flex: 1,
    color: "#F5F1E9",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
  },
  bestTag: {
    color: "#09201E",
    backgroundColor: "#69D6C8",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 8,
    fontWeight: "900",
  },
  stackPreviewEnglish: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    marginTop: 6,
  },
  stackPreviewArabic: {
    color: "#D9E2DF",
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "600",
    textAlign: "right",
  },
  stackMood: {
    color: "#8BE0D4",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },
  stackStrength: { color: "#CDD8D4", fontSize: 12, lineHeight: 17 },
  stackTradeoff: { color: "#899694", fontSize: 11, lineHeight: 16 },
  stackChoice: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#394544",
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 4,
  },
  stackChoiceActive: { borderColor: "#69D6C8", backgroundColor: "#1D4A45" },
  stackChoiceText: { color: "#AAB6B2", fontSize: 10, fontWeight: "800" },
  stackChoiceTextActive: { color: "#E7FFFA" },
  footerNote: {
    gap: 7,
    padding: 18,
    borderLeftWidth: 3,
    borderLeftColor: "#C7805E",
    backgroundColor: "#171514",
  },
  footerTitle: { color: "#F5F1E9", fontSize: 14, fontWeight: "800" },
  footerText: { color: "#AAB6B2", fontSize: 13, lineHeight: 20, maxWidth: 820 },
});
