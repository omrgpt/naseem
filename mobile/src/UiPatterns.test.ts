import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./UiPatterns.tsx', import.meta.url), 'utf8');
const screenStylesSource = readFileSync(new URL('./screenStyles.ts', import.meta.url), 'utf8');
const noticeSource = source.slice(
  source.indexOf('export function NoticeAlert'),
  source.indexOf('export function StatusBadge'),
);
const badgeSource = source.slice(
  source.indexOf('export function StatusBadge'),
  source.indexOf('export function ButtonWithIcon'),
);

test('NoticeAlert exposes a labelled live alert/status region', () => {
  assert.match(noticeSource, /accessible/);
  assert.match(noticeSource, /accessibilityLabel=\{noticeAccessibilityLabel\}/);
  assert.match(noticeSource, /accessibilityLiveRegion=\{noticeLiveRegion\}/);
  assert.match(noticeSource, /accessibilityRole=\{noticeAccessibilityRole\}/);
  assert.match(noticeSource, /role=\{noticeRole\}/);
  assert.match(noticeSource, /aria-live=\{noticeLiveRegion\}/);
  assert.match(noticeSource, /const noticeRole =/);
  assert.match(noticeSource, /const noticeLiveRegion =/);
});

test('StatusBadge exposes one labelled status without a live announcement', () => {
  assert.match(badgeSource, /accessible/);
  assert.match(badgeSource, /accessibilityLabel=\{label\}/);
  assert.match(badgeSource, /accessibilityRole="text"/);
  assert.match(badgeSource, /role="status"/);
  assert.match(badgeSource, /accessibilityLiveRegion="none"/);
  assert.match(badgeSource, /aria-live="off"/);
  assert.doesNotMatch(badgeSource, /accessibilityLiveRegion="(?:polite|assertive)"/);
  assert.doesNotMatch(badgeSource, /aria-live="(?:polite|assertive)"/);
});

test('AccessibleDialog exposes a labelled modal with focus containment and restoration', () => {
  const dialogSource = source.slice(source.indexOf('export function AccessibleDialog'));
  assert.match(dialogSource, /export function AccessibleDialog/);
  assert.match(dialogSource, /role="dialog"/);
  assert.match(dialogSource, /aria-modal=\{true\}/);
  assert.match(dialogSource, /aria-labelledby=\{dialogTitleId\}/);
  assert.match(dialogSource, /accessibilityViewIsModal/);
  assert.match(dialogSource, /onAccessibilityEscape=\{handleCancel\}/);
  assert.match(dialogSource, /onRequestClose=\{handleCancel\}/);
  assert.match(dialogSource, /key === ['"]Escape['"]/);
  assert.match(dialogSource, /['"]Tab['"]/);
  assert.match(dialogSource, /document\.addEventListener\(['"]keydown['"]/);
  assert.match(source, /inert/);
  assert.match(dialogSource, /triggerRef/);
  assert.match(dialogSource, /activeBeforeOpen/);
  assert.match(dialogSource, /cancelLabel/);
});

test('choice groups use native radio semantics and roving keyboard selection', () => {
  const choiceSource = source.slice(source.indexOf('export function AccessibleChoiceGroup'));
  assert.match(choiceSource, /accessibilityRole="radiogroup"/);
  assert.match(choiceSource, /role="radiogroup"/);
  assert.match(choiceSource, /accessibilityRole="radio"/);
  assert.match(choiceSource, /role="radio"/);
  assert.match(choiceSource, /aria-checked=\{selected\}/);
  assert.match(choiceSource, /choiceIndexForKey/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /ArrowUp/);
  assert.match(choiceSource, /tabIndex=\{index === activeIndex \? 0 : -1\}/);
});

test('switches expose checked state and toggle on keyboard activation', () => {
  const switchSource = source.slice(source.indexOf('export function AccessibleSwitch'));
  assert.match(switchSource, /accessibilityRole="switch"/);
  assert.match(switchSource, /role="switch"/);
  assert.match(switchSource, /accessibilityState=\{\{ checked: value/);
  assert.match(switchSource, /aria-checked=\{value\}/);
  assert.match(switchSource, /Space/);
  assert.match(switchSource, /Enter/);
  assert.match(switchSource, /onValueChange\(!value\)/);
});

test('navigation exposes current destinations as links and headings/landmarks support skip navigation', () => {
  assert.match(source, /export function AccessibleNavigation/);
  const navigationSource = source.slice(source.indexOf('export function AccessibleNavigation'));
  assert.match(navigationSource, /role="navigation"/);
  assert.match(navigationSource, /accessibilityRole="link"/);
  assert.match(navigationSource, /aria-current/);
  assert.match(source, /export function AccessibleHeading/);
  assert.match(source, /role="heading"/);
  assert.match(source, /aria-level/);
  assert.match(source, /export function AccessibleLandmark/);
  assert.match(source, /export function SkipToContent/);
  assert.match(source, /targetRef/);
  assert.match(source, /href/);
});

test('live regions and progress readouts keep status, error, and progress announcements stable', () => {
  assert.match(source, /export function AccessibleLiveRegion/);
  const liveSource = source.slice(source.indexOf('export function AccessibleLiveRegion'));
  assert.match(liveSource, /aria-live/);
  assert.match(liveSource, /aria-atomic=\{true\}/);
  assert.match(liveSource, /role=\{liveRole\}/);
  const progressSource = source.slice(source.indexOf('export function ProgressReadout'));
  assert.match(progressSource, /accessibilityLabel=\{progressAccessibilityLabel\}/);
  assert.match(progressSource, /accessibilityLiveRegion="polite"/);
  assert.match(progressSource, /aria-valuetext=\{value\}/);
});

test('shared primitives make route points and markers keyboard-selectable', () => {
  assert.match(source, /export function AccessiblePointList/);
  assert.match(source, /export function AccessibleMapMarker/);
  const pointSource = source.slice(source.indexOf('export function AccessiblePointList'));
  assert.match(pointSource, /accessibilityRole="list"/);
  assert.match(pointSource, /accessibilityRole="button"/);
  assert.match(pointSource, /aria-pressed/);
  assert.match(source, /key === ['"]Enter['"]/);
  assert.match(source, /key === ['"]Space['"]/);
  assert.match(pointSource, /selected/);
});

test('shared screen styles reserve safe zones, visible focus, and 44px action targets', () => {
  assert.match(screenStylesSource, /MIN_TOUCH_TARGET\s*=\s*44/);
  assert.match(screenStylesSource, /BOTTOM_NAV_SAFE_ZONE/);
  assert.match(screenStylesSource, /SHEET_SAFE_ZONE/);
  assert.match(screenStylesSource, /env\(safe-area-inset-bottom\)/);
  assert.match(screenStylesSource, /focusRing/);
  assert.match(screenStylesSource, /minHeight:\s*MIN_TOUCH_TARGET/);
  assert.match(screenStylesSource, /paddingBottom:\s*BOTTOM_NAV_SAFE_ZONE/);
  assert.match(screenStylesSource, /paddingBottom:\s*SHEET_SAFE_ZONE/);
});
