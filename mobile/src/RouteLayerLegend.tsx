import { StyleSheet, Text, View } from "react-native";
import type { Palette } from "./designTokens";
import {
  FONT_ARABIC_BOLD,
  FONT_ARABIC_REGULAR,
  FONT_BOLD,
  FONT_REGULAR,
} from "./fonts";
import {
  confidenceLabel,
  layerColor,
  type RouteLayer,
} from "./routeConditions";

export function RouteLayerLegend({
  layers,
  palette,
  rtl = false,
  title = "Map layers",
}: {
  layers: RouteLayer[];
  palette: Palette;
  rtl?: boolean;
  title?: string;
}) {
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: palette.panelAlt, borderColor: palette.line },
      ]}
      accessibilityRole="list"
      accessibilityLabel={rtl ? "طبقات الخريطة" : title}
    >
      <Text
        style={[
          styles.title,
          {
            color: palette.ink,
            fontFamily: rtl ? FONT_ARABIC_BOLD : FONT_BOLD,
          },
          rtl && styles.textRight,
        ]}
      >
        {rtl ? "طبقات الخريطة" : title}
      </Text>
      {layers.map((layer) => (
        <View
          key={layer.id}
          style={[styles.row, rtl && styles.rowRtl]}
          accessible
          accessibilityLabel={
            rtl ? layer.accessibleLabelAr : layer.accessibleLabel
          }
        >
          <View
            style={[styles.dot, { backgroundColor: layerColor(layer.tone) }]}
          />
          <View style={styles.copy}>
            <View style={[styles.head, rtl && styles.rowRtl]}>
              <Text
                style={[
                  styles.label,
                  {
                    color: palette.ink,
                    fontFamily: rtl ? FONT_ARABIC_BOLD : FONT_BOLD,
                  },
                  rtl && styles.textRight,
                ]}
              >
                {rtl ? layer.labelAr : layer.label}
              </Text>
              <Text
                style={[
                  styles.confidence,
                  {
                    color: palette.muted,
                    fontFamily: rtl ? FONT_ARABIC_REGULAR : FONT_REGULAR,
                  },
                  rtl && styles.textRight,
                ]}
              >
                {confidenceLabel(layer.confidence, rtl)}
              </Text>
            </View>
            <Text
              style={[
                styles.detail,
                {
                  color: palette.muted,
                  fontFamily: rtl ? FONT_ARABIC_REGULAR : FONT_REGULAR,
                },
                rtl && styles.textRight,
              ]}
            >
              {rtl ? layer.detailAr : layer.detail}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  title: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  rowRtl: { flexDirection: "row-reverse" },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  copy: { flex: 1, gap: 2 },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  label: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  confidence: { fontSize: 10, lineHeight: 15 },
  detail: { fontSize: 12, lineHeight: 18 },
  textRight: { textAlign: "right" },
});
