import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { LIGHT, type Palette } from './designTokens';
import { FONT_ARABIC_BOLD, FONT_ARABIC_REGULAR, FONT_BOLD, FONT_EXTRABOLD, FONT_MEDIUM, FONT_REGULAR } from './fonts';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const toneFor = (tone: Tone, palette: Palette) => {
  if (tone === 'warning') return { background: palette.cautionSoft, foreground: palette.caution };
  if (tone === 'danger') return { background: palette.cautionSoft, foreground: palette.caution };
  if (tone === 'success') return { background: palette.accentSoft, foreground: palette.accent };
  return { background: palette.panelAlt, foreground: palette.accent };
};

type FocusTarget = { focus?: () => void } | null;
export type AccessibleFocusRef = { current: FocusTarget };

export type AccessibleChoiceOption = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};

export type AccessibleNavigationItem = {
  id: string;
  label: string;
  icon?: IconName;
  hint?: string;
  disabled?: boolean;
};

export type AccessiblePointItem = {
  id: string;
  label: string;
  detail?: string;
  disabled?: boolean;
};

const DEFAULT_PALETTE = LIGHT;

export function isKeyboardActivationKey(key: unknown) {
  return key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Space';
}

export function choiceIndexForKey(
  key: unknown,
  index: number,
  count: number,
  rtl = false,
  disabledIndexes: readonly number[] = [],
) {
  if (count <= 0) return null;
  const disabled = new Set(disabledIndexes);
  const direction =
    key === 'ArrowDown' || (!rtl && key === 'ArrowRight') || (rtl && key === 'ArrowLeft')
      ? 1
      : key === 'ArrowUp' || (!rtl && key === 'ArrowLeft') || (rtl && key === 'ArrowRight')
        ? -1
        : key === 'Home'
          ? 1
          : key === 'End'
            ? -1
            : 0;
  if (!direction) return null;
  let candidate = key === 'Home' ? -1 : key === 'End' ? count : index;
  for (let step = 0; step < count; step += 1) {
    candidate = (candidate + direction + count) % count;
    if (!disabled.has(candidate)) return candidate;
  }
  return null;
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.getAttribute('aria-hidden') !== 'true');
}

type InertSnapshot = {
  element: HTMLElement;
  inert: boolean;
  hadInertAttribute: boolean;
  ariaHidden: string | null;
};

function isolateDocumentBackground(dialog: HTMLElement | null) {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || !dialog) return () => undefined;
  const snapshots = new Map<HTMLElement, InertSnapshot>();
  let branch: HTMLElement | null = dialog;
  while (branch?.parentElement) {
    const parent: HTMLElement = branch.parentElement;
    Array.from(parent.children).forEach((child) => {
      if (!(child instanceof HTMLElement) || child === branch || child.contains(dialog)) return;
      if (!snapshots.has(child)) {
        const inertElement = child as HTMLElement & { inert?: boolean };
        snapshots.set(child, {
          element: child,
          inert: Boolean(inertElement.inert),
          hadInertAttribute: child.hasAttribute('inert'),
          ariaHidden: child.getAttribute('aria-hidden'),
        });
      }
      const inertElement = child as HTMLElement & { inert?: boolean };
      inertElement.inert = true;
      child.setAttribute('inert', '');
      child.setAttribute('aria-hidden', 'true');
    });
    if (parent === document.body) break;
    branch = parent;
  }
  return () => {
    snapshots.forEach(({ element, inert, hadInertAttribute, ariaHidden }) => {
      const inertElement = element as HTMLElement & { inert?: boolean };
      inertElement.inert = inert;
      if (hadInertAttribute) element.setAttribute('inert', '');
      else element.removeAttribute('inert');
      if (ariaHidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', ariaHidden);
    });
  };
}

function scheduleTask(callback: () => void) {
  if (typeof requestAnimationFrame === 'function') {
    const frame = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(frame);
  }
  const timeout = setTimeout(callback, 0);
  return () => clearTimeout(timeout);
}

export function AccessibleDialog({
  visible,
  title,
  description,
  children,
  onDismiss,
  onCancel,
  cancelLabel,
  palette = DEFAULT_PALETTE,
  rtl = false,
  triggerRef,
  initialFocusRef,
  titleId,
  descriptionId,
  testID,
  closeOnEscape = true,
}: {
  visible: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  onDismiss: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  palette?: Palette;
  rtl?: boolean;
  triggerRef?: AccessibleFocusRef;
  initialFocusRef?: AccessibleFocusRef;
  titleId?: string;
  descriptionId?: string;
  testID?: string;
  closeOnEscape?: boolean;
}) {
  const dialogRef = useRef<any>(null);
  const generatedId = useId().replace(/:/g, '-');
  const dialogTitleId = titleId ?? `accessible-dialog-title-${generatedId}`;
  const dialogDescriptionId = descriptionId ?? `accessible-dialog-description-${generatedId}`;
  const dismissRef = useRef(onDismiss);
  const cancelRef = useRef(onCancel);
  const [cancelFocused, setCancelFocused] = useState(false);
  dismissRef.current = onDismiss;
  cancelRef.current = onCancel;

  const handleCancel = useCallback(() => {
    cancelRef.current?.() ?? dismissRef.current();
  }, []);

  const focusInitial = useCallback(() => {
    const explicitTarget = initialFocusRef?.current;
    if (explicitTarget?.focus) {
      explicitTarget.focus();
      return;
    }
    const dialogElement =
      Platform.OS === 'web' && typeof HTMLElement !== 'undefined' && dialogRef.current instanceof HTMLElement
        ? (dialogRef.current as HTMLElement)
        : null;
    const firstFocusable = getFocusableElements(dialogElement)[0];
    if (firstFocusable) {
      firstFocusable.focus();
      return;
    }
    dialogRef.current?.focus?.();
  }, [initialFocusRef]);

  const handleDialogKeyDown = useCallback(
    (event: any) => {
      if (event?.defaultPrevented) return;
      const key = event?.key;
      if (key === 'Escape' && closeOnEscape) {
        event.preventDefault?.();
        handleCancel();
        return;
      }
      if (key !== 'Tab') return;
      const dialogElement =
        Platform.OS === 'web' && typeof HTMLElement !== 'undefined' && dialogRef.current instanceof HTMLElement
          ? (dialogRef.current as HTMLElement)
          : null;
      const focusable = getFocusableElements(dialogElement);
      if (!focusable.length) {
        event.preventDefault?.();
        dialogRef.current?.focus?.();
        return;
      }
      const current = typeof document !== 'undefined' ? document.activeElement : null;
      const currentIndex = focusable.indexOf(current as HTMLElement);
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusable.length - 1
          : currentIndex - 1
        : currentIndex === focusable.length - 1 || currentIndex < 0
          ? 0
          : currentIndex + 1;
      event.preventDefault?.();
      focusable[nextIndex]?.focus();
    },
    [closeOnEscape, handleCancel],
  );

  useEffect(() => {
    if (!visible) return undefined;
    const isWeb = Platform.OS === 'web' && typeof document !== 'undefined';
    const activeBeforeOpen = isWeb ? (document.activeElement as HTMLElement | null) : null;
    const restoreBackground = isWeb
      ? isolateDocumentBackground(
          typeof HTMLElement !== 'undefined' && dialogRef.current instanceof HTMLElement
            ? (dialogRef.current as HTMLElement)
            : null,
        )
      : () => undefined;
    const cancelInitialFocus = scheduleTask(focusInitial);
    const handleDocumentKeyDown = (event: KeyboardEvent) => handleDialogKeyDown(event);
    if (isWeb) document.addEventListener('keydown', handleDocumentKeyDown, true);
    return () => {
      cancelInitialFocus();
      if (isWeb) document.removeEventListener('keydown', handleDocumentKeyDown, true);
      restoreBackground();
      scheduleTask(() => {
        const target = triggerRef?.current;
        if (target?.focus) target.focus();
        else activeBeforeOpen?.focus();
      });
    };
  }, [focusInitial, handleDialogKeyDown, triggerRef, visible]);

  if (!visible) return null;

  const dialogContent = (
    <Pressable
      accessible={false}
      onPress={(event: any) => {
        if (event?.target === event?.currentTarget) handleCancel();
      }}
      style={styles.dialogBackdrop}
    >
      <View
        ref={dialogRef}
        testID={testID}
        accessible
        accessibilityLabel={title}
        accessibilityLabelledBy={dialogTitleId}
        accessibilityViewIsModal
        accessibilityRole="none"
        onAccessibilityEscape={handleCancel}
        {...({ onKeyDown: handleDialogKeyDown } as any)}
        role="dialog"
        aria-modal={true}
        aria-labelledby={dialogTitleId}
        {...(description ? { 'aria-describedby': dialogDescriptionId } : {})}
        tabIndex={-1}
        style={[styles.dialogCard, { backgroundColor: palette.bg, borderColor: palette.line }, rtl && styles.rtl]}
      >
        <Text nativeID={dialogTitleId} accessibilityRole="header" role="heading" style={[styles.dialogTitle, { color: palette.ink }, rtl && styles.textRight]}>
          {title}
        </Text>
        {description ? (
          <Text nativeID={dialogDescriptionId} style={[styles.dialogDescription, { color: palette.muted }, rtl && styles.textRight]}>
            {description}
          </Text>
        ) : null}
        <View style={styles.dialogBody}>{children}</View>
        {cancelLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            onPress={handleCancel}
            onFocus={() => setCancelFocused(true)}
            onBlur={() => setCancelFocused(false)}
            style={({ pressed }) => [styles.dialogCancel, cancelFocused && styles.focusRing, { borderColor: palette.line, opacity: pressed ? 0.78 : 1 }]}
          >
            <Text style={[styles.dialogCancelText, { color: palette.ink }, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{cancelLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );

  return Platform.OS === 'web' ? (
    dialogContent
  ) : (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleCancel} onShow={focusInitial}>
      {dialogContent}
    </Modal>
  );
}

export function AccessibleChoiceGroup({
  label,
  options,
  value,
  onChange,
  palette = DEFAULT_PALETTE,
  rtl = false,
}: {
  label: string;
  options: readonly AccessibleChoiceOption[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  palette?: Palette;
  rtl?: boolean;
}) {
  const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
  const firstEnabledIndex = options.findIndex((option) => !option.disabled);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : Math.max(0, firstEnabledIndex);
  const optionRefs = useRef<Array<any>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const disabledIndexes = options.flatMap((option, index) => (option.disabled ? [index] : []));

  const selectOption = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    optionRefs.current[index]?.focus?.();
  };

  const handleOptionKeyDown = (event: any, index: number) => {
    if (isKeyboardActivationKey(event?.key)) {
      event.preventDefault?.();
      selectOption(index);
      return;
    }
    const nextIndex = choiceIndexForKey(event?.key, index, options.length, rtl, disabledIndexes);
    if (nextIndex === null) return;
    event.preventDefault?.();
    selectOption(nextIndex);
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      role="radiogroup"
      {...({ 'aria-orientation': 'vertical' } as any)}
      style={styles.choiceGroup}
    >
      <Text style={[styles.choiceGroupLabel, { color: palette.ink }, rtl && styles.textRight]}>{label}</Text>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            accessible
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityHint={option.hint}
            accessibilityState={{ selected, checked: selected, disabled: option.disabled }}
            role="radio"
            aria-checked={selected}
            aria-disabled={option.disabled || undefined}
            tabIndex={index === activeIndex ? 0 : -1}
            disabled={option.disabled}
            onPress={() => selectOption(index)}
            {...({ onKeyDown: (event: any) => handleOptionKeyDown(event, index) } as any)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(null)}
            style={({ pressed }) => [
              styles.choiceOption,
              { backgroundColor: palette.panel, borderColor: palette.line, opacity: option.disabled ? 0.48 : pressed ? 0.78 : 1 },
              selected && { backgroundColor: palette.accentSoft, borderColor: palette.accent },
              focusedIndex === index && styles.focusRing,
              rtl && styles.rtl,
            ]}
          >
            <View style={[styles.choiceIndicator, { borderColor: selected ? palette.accent : palette.muted }]}>
              {selected ? <View style={[styles.choiceIndicatorDot, { backgroundColor: palette.accent }]} /> : null}
            </View>
            <View style={styles.choiceCopy}>
              <Text style={[styles.choiceLabel, { color: palette.ink }, rtl && styles.textRight]}>{option.label}</Text>
              {option.hint ? <Text style={[styles.choiceHint, { color: palette.muted }, rtl && styles.textRight]}>{option.hint}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AccessibleSwitch({
  label,
  value,
  onValueChange,
  hint,
  palette = DEFAULT_PALETTE,
  rtl = false,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  hint?: string;
  palette?: Palette;
  rtl?: boolean;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const handleKeyDown = (event: any) => {
    if (disabled || !isKeyboardActivationKey(event?.key)) return;
    event.preventDefault?.();
    onValueChange(!value);
  };
  return (
    <Pressable
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value, disabled }}
      role="switch"
      aria-checked={value}
      aria-disabled={disabled || undefined}
      {...({ 'aria-keyshortcuts': 'Space Enter' } as any)}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      {...({ onKeyDown: handleKeyDown } as any)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.switch, { backgroundColor: palette.panel, borderColor: palette.line, opacity: disabled ? 0.48 : pressed ? 0.78 : 1 }, focused && styles.focusRing, rtl && styles.rtl]}
    >
      <View style={[styles.switchTrack, { backgroundColor: value ? palette.accent : palette.line }]}>
        <View style={[styles.switchThumb, { backgroundColor: palette.bg, transform: [{ translateX: value ? 18 : 2 }] }]} />
      </View>
      <Text style={[styles.switchLabel, { color: palette.ink }, rtl && styles.textRight]}>{label}</Text>
    </Pressable>
  );
}

export function AccessibleNavigation({
  items,
  currentId,
  onChange,
  label = 'Primary navigation',
  palette = DEFAULT_PALETTE,
  rtl = false,
}: {
  items: readonly AccessibleNavigationItem[];
  currentId: string;
  onChange: (id: string) => void;
  label?: string;
  palette?: Palette;
  rtl?: boolean;
}) {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  return (
    <View role="navigation" accessibilityLabel={label} style={[styles.navigation, { backgroundColor: palette.nav, borderColor: palette.line }, rtl && styles.rtl]}>
      {items.map((item) => {
        const current = item.id === currentId;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="link"
            accessibilityLabel={item.label}
            accessibilityHint={item.hint}
            accessibilityState={{ selected: current, disabled: item.disabled }}
            role="link"
            {...({ 'aria-current': current ? 'page' : undefined } as any)}
            disabled={item.disabled}
            onPress={() => onChange(item.id)}
            onFocus={() => setFocusedId(item.id)}
            onBlur={() => setFocusedId(null)}
            style={({ pressed }) => [
              styles.navigationItem,
              { opacity: item.disabled ? 0.48 : pressed ? 0.78 : 1 },
              current && { backgroundColor: palette.accentSoft },
              focusedId === item.id && styles.focusRing,
            ]}
          >
            {item.icon ? <Icon name={item.icon} color={current ? palette.accent : palette.muted} size={18} /> : null}
            <Text style={[styles.navigationLabel, { color: current ? palette.accent : palette.muted }, current && { fontFamily: FONT_BOLD }, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AccessibleHeading({
  children,
  level = 2,
  style,
}: {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  style?: any;
}) {
  return (
    <Text accessibilityRole="header" role="heading" {...({ 'aria-level': level } as any)} style={[styles.heading, style]}>
      {children}
    </Text>
  );
}

export function AccessibleLandmark({
  children,
  role,
  label,
  nativeID,
  style,
}: {
  children: ReactNode;
  role: 'banner' | 'main' | 'navigation' | 'complementary' | 'contentinfo' | 'region' | 'search' | 'form';
  label?: string;
  nativeID?: string;
  style?: any;
}) {
  return (
    <View role={role as any} accessibilityLabel={label} nativeID={nativeID} style={[styles.landmark, style]}>
      {children}
    </View>
  );
}

export function SkipToContent({
  label = 'Skip to content',
  targetId = 'main-content',
  targetRef,
  onSkip,
}: {
  label?: string;
  targetId?: string;
  targetRef?: AccessibleFocusRef;
  onSkip?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const handleSkip = (event?: any) => {
    event?.preventDefault?.();
    onSkip?.();
    if (targetRef?.current?.focus) targetRef.current.focus();
    else if (Platform.OS === 'web' && typeof document !== 'undefined') document.getElementById(targetId)?.focus();
  };
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      role="link"
      {...({ href: `#${targetId}` } as any)}
      onPress={handleSkip}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.skipLink, focused && styles.skipLinkVisible]}
    >
      <Text style={styles.skipLinkText}>{label}</Text>
    </Pressable>
  );
}

export function AccessibleLiveRegion({
  message,
  kind = 'status',
}: {
  message: string;
  kind?: 'status' | 'error';
}) {
  const isError = kind === 'error';
  const liveRole = isError ? 'alert' : 'status';
  const liveRegion = isError ? 'assertive' : 'polite';
  return (
    <View
      accessible
      accessibilityLabel={message}
      accessibilityLiveRegion={liveRegion}
      accessibilityRole={isError ? 'alert' : 'text'}
      role={liveRole}
      aria-live={liveRegion}
      aria-atomic={true}
      style={styles.liveRegion}
    >
      <Text>{message}</Text>
    </View>
  );
}

export function AccessibleMapMarker({
  label,
  onSelect,
  selected = false,
  children,
  palette = DEFAULT_PALETTE,
}: {
  label: string;
  onSelect: () => void;
  selected?: boolean;
  children?: ReactNode;
  palette?: Palette;
}) {
  const [focused, setFocused] = useState(false);

  const handleKeyDown = (event: any) => {
    if (!isKeyboardActivationKey(event?.key)) return;
    event.preventDefault?.();
    onSelect();
  };
  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      role="button"
      aria-pressed={selected}
      hitSlop={4}
      onPress={onSelect}
      {...({ onKeyDown: handleKeyDown } as any)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.mapMarker, { backgroundColor: palette.panel, borderColor: selected ? palette.accent : palette.line, opacity: pressed ? 0.78 : 1 }, focused && styles.focusRing]}
    >
      {children ?? <Text style={[styles.mapMarkerText, { color: palette.ink }]}>{label}</Text>}
    </Pressable>
  );
}

export function AccessiblePointList({
  label,
  points,
  selectedId,
  onSelect,
  palette = DEFAULT_PALETTE,
  rtl = false,
  selectedAnnouncement,
}: {
  label: string;
  points: readonly AccessiblePointItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  palette?: Palette;
  rtl?: boolean;
  selectedAnnouncement?: string;
}) {
  const [focusedPointId, setFocusedPointId] = useState<string | null>(null);

  const selectedPoint = points.find((point) => point.id === selectedId);
  const announcement = selectedAnnouncement ?? (selectedPoint ? `${selectedPoint.label} selected` : '');
  return (
    <View accessibilityRole="list" accessibilityLabel={label} role="list" style={styles.pointList}>
      <Text style={[styles.pointListLabel, { color: palette.ink }, rtl && styles.textRight]}>{label}</Text>
      {points.map((point, index) => {
        const selected = point.id === selectedId;
        const handleKeyDown = (event: any) => {
          if (!isKeyboardActivationKey(event?.key)) return;
          event.preventDefault?.();
          if (!point.disabled) onSelect(point.id);
        };
        return (
          <Pressable
            key={point.id}
            accessibilityRole="button"
            accessibilityLabel={point.detail ? `${point.label}. ${point.detail}` : point.label}
            accessibilityState={{ selected, disabled: point.disabled }}
            role="button"
            aria-pressed={selected}
            aria-disabled={point.disabled || undefined}
            {...({ 'aria-posinset': index + 1, 'aria-setsize': points.length } as any)}
            disabled={point.disabled}
            onPress={() => onSelect(point.id)}
            {...({ onKeyDown: handleKeyDown } as any)}
            onFocus={() => setFocusedPointId(point.id)}
            onBlur={() => setFocusedPointId(null)}
            style={({ pressed }) => [styles.pointListItem, { borderColor: palette.line, opacity: point.disabled ? 0.48 : pressed ? 0.78 : 1 }, selected && { backgroundColor: palette.accentSoft, borderColor: palette.accent }, focusedPointId === point.id && styles.focusRing, rtl && styles.rtl]}
          >
            <View style={[styles.pointListIndex, { backgroundColor: selected ? palette.accent : palette.ink }]}>
              <Text style={[styles.pointListIndexText, { color: palette.bg }]}>{index + 1}</Text>
            </View>
            <View style={styles.pointListCopy}>
              <Text style={[styles.pointListItemLabel, { color: palette.ink }, rtl && styles.textRight]}>{point.label}</Text>
              {point.detail ? <Text style={[styles.pointListItemDetail, { color: palette.muted }, rtl && styles.textRight]}>{point.detail}</Text> : null}
            </View>
          </Pressable>
        );
      })}
      <AccessibleLiveRegion message={announcement} />
    </View>
  );
}

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
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      role="button"
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? palette.ink : palette.panel,
          borderColor: danger ? palette.caution : primary ? palette.ink : palette.line,
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
        },
        focused && styles.focusRing,
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
  const progressAccessibilityLabel = `${label}: ${value}. ${subtitle}`;
  return (
    <View style={[styles.progressCard, { backgroundColor: palette.ink }, rtl && styles.rtl]}>
      <Text style={[styles.progressLabel, { color: palette.bg }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{label}</Text>
      <Text style={[styles.progressValue, { color: palette.bg }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_BOLD }]}>{value}</Text>
      <Text style={[styles.progressSubtitle, { color: palette.bg }, rtl && styles.textRight, rtl && { fontFamily: FONT_ARABIC_REGULAR }]}>{subtitle}</Text>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={progressAccessibilityLabel}
        accessibilityLiveRegion="polite"
        accessibilityValue={{ min: 0, max: 1, now: boundedProgress, text: value }}
        role="progressbar"
        aria-live="polite"
        aria-valuetext={value}
        style={[styles.progressTrack, { backgroundColor: palette.line }]}
      >
        <View style={[styles.progressFill, { backgroundColor: palette.accent, width: `${boundedProgress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rtl: { flexDirection: 'row-reverse' },
  textRight: { textAlign: 'right' },
  dialogBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(16, 42, 46, 0.72)' },
  dialogCard: { width: '100%', maxWidth: 520, gap: 14, padding: 20, borderWidth: 1, borderRadius: 22 },
  dialogTitle: { fontFamily: FONT_BOLD, fontSize: 20, lineHeight: 27, fontWeight: '900' },
  dialogDescription: { fontFamily: FONT_REGULAR, fontSize: 14, lineHeight: 21 },
  dialogBody: { gap: 10 },
  dialogCancel: { minHeight: 44, minWidth: 88, alignSelf: 'flex-end', paddingHorizontal: 14, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dialogCancelText: { fontFamily: FONT_BOLD, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  focusRing: { borderWidth: 2, borderColor: '#087A74', shadowColor: '#087A74', shadowOpacity: 0.35, shadowRadius: 3 },
  choiceGroup: { gap: 8 },
  choiceGroupLabel: { fontFamily: FONT_BOLD, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  choiceOption: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 13 },
  choiceIndicator: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  choiceIndicatorDot: { width: 10, height: 10, borderRadius: 5 },
  choiceCopy: { flex: 1, gap: 1 },
  choiceLabel: { fontFamily: FONT_MEDIUM, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  choiceHint: { fontFamily: FONT_REGULAR, fontSize: 12, lineHeight: 18 },
  switch: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 13 },
  switchTrack: { width: 40, height: 24, borderRadius: 12, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10 },
  switchLabel: { flex: 1, fontFamily: FONT_MEDIUM, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  navigation: { minHeight: 78, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-around', gap: 4, padding: 6, borderWidth: 1, borderRadius: 21 },
  navigationItem: { minHeight: 44, minWidth: 44, flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8, borderRadius: 13 },
  navigationLabel: { fontFamily: FONT_MEDIUM, fontSize: 11, lineHeight: 18, fontWeight: '500' },
  heading: { fontFamily: FONT_BOLD, fontSize: 20, lineHeight: 27, fontWeight: '700' },
  landmark: { width: '100%' },
  skipLink: { position: 'absolute', top: -80, left: 16, zIndex: 1000, minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#102A2E', alignItems: 'center', justifyContent: 'center' },
  skipLinkVisible: { top: 8 },
  skipLinkText: { color: '#FFFFFF', fontFamily: FONT_BOLD, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  liveRegion: { minHeight: 1 },
  mapMarker: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', padding: 4, borderWidth: 1, borderRadius: 22 },
  mapMarkerText: { fontFamily: FONT_BOLD, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  pointList: { gap: 8 },
  pointListLabel: { fontFamily: FONT_BOLD, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  pointListItem: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderRadius: 13 },
  pointListIndex: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pointListIndexText: { fontFamily: FONT_BOLD, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  pointListCopy: { flex: 1, gap: 1 },
  pointListItemLabel: { fontFamily: FONT_MEDIUM, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  pointListItemDetail: { fontFamily: FONT_REGULAR, fontSize: 12, lineHeight: 18 },
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
