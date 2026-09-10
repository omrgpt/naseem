import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import type { Palette } from './designTokens';
import { FONT_ARABIC_BOLD, FONT_ARABIC_REGULAR, FONT_BOLD, FONT_EXTRABOLD, FONT_MEDIUM, FONT_REGULAR } from './fonts';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const toneFor = (tone: Tone, palette: Palette) => {
  if (tone === 'warning') return { background: palette.cautionSoft, foreground: palette.caution };
  if (tone === 'danger') return { background: palette.cautionSoft, foreground: palette.caution };
  if (tone === 'success') return { background: palette.accentSoft, foreground: palette.accent };
  return { background: palette.panelAlt, foreground: palette.accent };
};

export function NoticeAlert({
  tone = 'info',
  title,
  description,
  palette,
  rtl = false,
}: {
  tone?: Tone;
  title: string;
  description: string;
  palette: Palette;
  rtl?: boolean;
}) {
  const colors = toneFor(tone, palette);
  const noticeIsUrgent = tone === 'warning' || tone === 'danger';
  const noticeAccessibilityLabel = `${title}. ${description}`;
  const noticeAccessibilityRole = noticeIsUrgent ? 'alert' : 'text';
  const noticeLiveRegion = noticeIsUrgent ? 'assertive' : 'polite';
  const noticeRole = noticeIsUrgent ? 'alert' : 'status';
  return (
    <View
      accessible
      accessibilityLabel={noticeAccessibilityLabel}
      accessibilityLiveRegion={noticeLiveRegion}
      accessibilityRole={noticeAccessibilityRole}
      aria-live={noticeLiveRegion}
      role={noticeRole}
      style={[styles.notice, { backgroundColor: colors.background, borderColor: colors.foreground }, rtl && styles.rtl]}
    >
      <View style={[styles.noticeDot, { backgroundColor: colors.foreground }]} />
      <View style={styles.noticeCopy}>
        <Text style={[styles.noticeTitle, { color: colors.foreground }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{title}</Text>
        <Text style={[styles.noticeDescription, { color: palette.muted }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_REGULAR }]}>{description}</Text>
      </View>
    </View>
  );
}

export function StatusBadge({
  label,
  tone = 'info',
  palette,
}: {
  label: string;
  tone?: Tone;
  palette: Palette;
}) {
  const colors = toneFor(tone, palette);
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="none"
      accessibilityRole="text"
      aria-live="off"
      role="status"
      style={[styles.badge, { backgroundColor: colors.background }]}
    >
      <View style={[styles.badgeDot, { backgroundColor: colors.foreground }]} />
      <Text style={[styles.badgeText, { color: colors.foreground }]}>{label}</Text>
    </View>
  );
}

export function ButtonWithIcon({
  label,
  icon,
  onPress,
  palette,
  variant = 'primary',
  rtl = false,
  disabled = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  palette: Palette;
  variant?: 'primary' | 'outline' | 'danger';
  rtl?: boolean;
  disabled?: boolean;
}) {
  const primary = variant === 'primary';
  const danger = variant === 'danger';
  const foreground = primary ? palette.bg : danger ? palette.caution : palette.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? palette.ink : palette.panel,
          borderColor: danger ? palette.caution : primary ? palette.ink : palette.line,
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
        },
        rtl && styles.rtl,
      ]}
    >
      <View style={[styles.buttonIconBubble, { backgroundColor: primary ? palette.bg : palette.accentSoft }]}><Icon name={icon} color={foreground} size={17} /></View>
      <Text style={[styles.buttonText, { color: foreground }, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{label}</Text>
      {primary && <View style={[styles.buttonArrow, { backgroundColor: palette.bg }]}><Icon name="chevron" color={palette.ink} size={14} /></View>}
    </Pressable>
  );
}

export function RouteStatsCard({
  title,
  items,
  palette,
  rtl = false,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
  palette: Palette;
  rtl?: boolean;
}) {
  return (
    <View style={[styles.statsCard, { backgroundColor: palette.ink, borderColor: palette.line }, rtl && styles.rtl]}>
      <View style={[styles.statsHeader, rtl && styles.rtl]}>
        <Text style={[styles.statsTitle, { color: palette.bg }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{title}</Text>
        <Text style={[styles.statsHint, { color: palette.accent }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>ROUTE SNAPSHOT</Text>
      </View>
      <View style={[styles.statsRow, rtl && styles.rtl]}>
        {items.map((item, index) => (
          <View key={item.label} style={[styles.statItem, index < items.length - 1 && { borderRightWidth: 1, borderRightColor: palette.line }]}>
            <Text style={[styles.statValue, { color: palette.bg }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{item.value}</Text>
            <Text style={[styles.statLabel, { color: palette.bg }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_REGULAR }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProgressReadout({
  label,
  value,
  subtitle,
  progress,
  palette,
  rtl = false,
}: {
  label: string;
  value: string;
  subtitle: string;
  progress: number;
  palette: Palette;
  rtl?: boolean;
}) {
  const boundedProgress = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.progressCard, { backgroundColor: palette.ink }, rtl && styles.rtl]}>
      <Text style={[styles.progressLabel, { color: palette.bg }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{label}</Text>
      <Text style={[styles.progressValue, { color: palette.bg }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{value}</Text>
      <Text style={[styles.progressSubtitle, { color: palette.bg }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_REGULAR }]}>{subtitle}</Text>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 1, now: boundedProgress }} style={[styles.progressTrack, { backgroundColor: palette.line }]}>
        <View style={[styles.progressFill, { backgroundColor: palette.accent, width: `${boundedProgress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rtl: { flexDirection: 'row-reverse' },
  textRight: { textAlign: 'right' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderWidth: 1, borderRadius: 16 },
  noticeDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  noticeCopy: { flex: 1, gap: 3 },
  noticeTitle: { fontFamily: FONT_BOLD, fontSize: 12, fontWeight: '900' },
  noticeDescription: { fontFamily: FONT_REGULAR, fontSize: 12, lineHeight: 18 },
  badge: { minHeight: 27, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: 'transparent' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontFamily: FONT_BOLD, fontSize: 10, fontWeight: '900' },
  button: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 9, borderWidth: 1, borderRadius: 18 },
  buttonIconBubble: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonArrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  buttonText: { flex: 1, fontFamily: FONT_BOLD, fontSize: 13, fontWeight: '900' },
  statsCard: { gap: 14, padding: 18, borderWidth: 1, borderRadius: 20 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statsTitle: { fontFamily: FONT_BOLD, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  statsHint: { fontFamily: FONT_BOLD, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, gap: 3, paddingHorizontal: 8 },
  statValue: { fontFamily: FONT_EXTRABOLD, fontSize: 21, fontWeight: '900' },
  statLabel: { fontFamily: FONT_MEDIUM, fontSize: 10, fontWeight: '700', opacity: 0.68 },
  progressCard: { gap: 7, padding: 19, borderRadius: 20 },
  progressLabel: { fontFamily: FONT_BOLD, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.68 },
  progressValue: { fontFamily: FONT_EXTRABOLD, fontSize: 38, fontWeight: '900' },
  progressSubtitle: { fontFamily: FONT_REGULAR, fontSize: 12, lineHeight: 18, opacity: 0.72 },
  progressTrack: { height: 7, overflow: 'hidden', borderRadius: 999, marginTop: 7 },
  progressFill: { height: '100%', borderRadius: 999 },
});
