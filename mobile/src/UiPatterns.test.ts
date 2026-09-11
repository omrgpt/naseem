import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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
const runtimeRequire = createRequire(import.meta.url);
const runtimeReact = runtimeRequire('react') as { createElement: (...args: any[]) => any };
const renderToStaticMarkup = runtimeRequire('react-dom/server').renderToStaticMarkup as (element: any) => string;

type CapturedProps = Record<string, any>;

let runtimeUi: Record<string, any> | null = null;
let capturedPressables: CapturedProps[] = [];
let capturedViews: CapturedProps[] = [];
let capturedModals: CapturedProps[] = [];
let runtimePlatformOS = 'web';

function loadUiPatternsForRuntime() {
  if (runtimeUi) return runtimeUi;
  const moduleApi = runtimeRequire('node:module') as { _load: Function };
  const originalLoad = moduleApi._load;
  const reactNativeStub = {
    Modal: (props: CapturedProps) => {
      capturedModals.push(props);
      return runtimeReact.createElement('modal', null, props.children);
    },
    Platform: { get OS() { return runtimePlatformOS; } },
    Pressable: (props: CapturedProps) => {
      capturedPressables.push(props);
      return runtimeReact.createElement('pressable', null, props.children);
    },
    StyleSheet: { create: (styles: Record<string, any>) => styles },
    Text: (props: CapturedProps) => runtimeReact.createElement('text', null, props.children),
    View: (props: CapturedProps) => {
      capturedViews.push(props);
      return runtimeReact.createElement('view', null, props.children);
    },
  };
  moduleApi._load = function (request: string, parent: unknown, isMain: boolean) {
    if (request === 'react-native') return reactNativeStub;
    if (request === './Icon' || /[\\/]Icon$/.test(request)) return { Icon: () => null };
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const loadedUi = runtimeRequire('./UiPatterns.tsx') as Record<string, any>;
    runtimeUi = loadedUi;
    return loadedUi;
  } finally {
    moduleApi._load = originalLoad;
  }
}

function renderPrimitive(name: string, props: CapturedProps, platformOS = 'web') {
  const ui = loadUiPatternsForRuntime();
  capturedPressables = [];
  capturedViews = [];
  capturedModals = [];
  runtimePlatformOS = platformOS;
  try {
    renderToStaticMarkup(runtimeReact.createElement(ui[name], props));
  } finally {
    runtimePlatformOS = 'web';
  }
  return { pressables: capturedPressables, views: capturedViews, modals: capturedModals };
}

function dispatchPressableKeyboard(pressable: CapturedProps, key: string) {
  const event = { key, preventDefault: () => undefined, stopPropagation: () => undefined };
  pressable.onKeyDown?.(event);
  const spaceKey = key === ' ' || key === 'Spacebar';
  const pressableOwnsKey = key === 'Enter' || (spaceKey && (pressable.role === 'button' || pressable.role === 'menuitem'));
  if (pressableOwnsKey) pressable.onPress?.({ nativeEvent: { key } });
}

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
  assert.match(dialogSource, /onAccessibilityEscape=\{closeOnEscape \? handleCancel : undefined\}/);
  assert.match(dialogSource, /onRequestClose=\{closeOnEscape \? handleCancel : undefined\}/);
  assert.match(dialogSource, /key === ['"]Escape['"]/);
  assert.match(dialogSource, /['"]Tab['"]/);
  assert.match(dialogSource, /document\.addEventListener\(['"]keydown['"]/);
  assert.match(source, /dialogBackdropWeb/);
  assert.match(source, /position:\s*['"]fixed['"]/);
  assert.match(source, /zIndex:\s*1000/);
  assert.match(source, /pointerEvents\s*[:=]\s*['"]auto['"]/);
  assert.match(dialogSource, /tabIndex=\{-1\}/);
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
  assert.match(choiceSource, /isSpaceKey/);
  assert.doesNotMatch(choiceSource, /key === ['"]Enter['"]/);
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
  assert.match(switchSource, /isSpaceKey/);
  assert.doesNotMatch(switchSource, /key === ['"]Enter['"]/);
});

test('Pressable owns keyboard activation so primitive callbacks fire once', () => {
  const cases = [
    {
      name: 'AccessibleSwitch',
      props: { label: 'Use current location', value: false, onValueChange: () => undefined },
    },
    {
      name: 'AccessibleChoiceGroup',
      props: { label: 'Departure', options: [{ value: 'morning', label: 'Morning' }], value: 'morning', onChange: () => undefined },
    },
    {
      name: 'AccessiblePointList',
      props: { label: 'Route points', points: [{ id: 'start', label: 'Start' }], selectedId: 'start', onSelect: () => undefined },
    },
    {
      name: 'AccessibleMapMarker',
      props: { label: 'Start', onSelect: () => undefined },
    },
  ];

  for (const item of cases) {
    let callbackCount = 0;
    const props = { ...item.props } as CapturedProps;
    if (item.name === 'AccessibleSwitch') props.onValueChange = () => { callbackCount += 1; };
    if (item.name === 'AccessibleChoiceGroup') props.onChange = () => { callbackCount += 1; };
    if (item.name === 'AccessiblePointList') props.onSelect = () => { callbackCount += 1; };
    if (item.name === 'AccessibleMapMarker') props.onSelect = () => { callbackCount += 1; };
    const rendered = renderPrimitive(item.name, props);
    const pressable = rendered.pressables[0];
    for (const key of ['Enter', ' ']) {
      callbackCount = 0;
      dispatchPressableKeyboard(pressable, key);
      assert.equal(callbackCount, 1, `${item.name} ${key === ' ' ? 'Space' : key} activation count`);
    }
  }
});

test('radio and switch Space handlers activate exactly once while Enter stays Pressable-owned', () => {
  const cases = [
    {
      name: 'AccessibleSwitch',
      props: { label: 'Use current location', value: false, onValueChange: () => undefined },
    },
    {
      name: 'AccessibleChoiceGroup',
      props: { label: 'Departure', options: [{ value: 'morning', label: 'Morning' }], value: 'morning', onChange: () => undefined },
    },
  ];
  for (const item of cases) {
    let callbackCount = 0;
    const props = { ...item.props } as CapturedProps;
    if (item.name === 'AccessibleSwitch') props.onValueChange = () => { callbackCount += 1; };
    if (item.name === 'AccessibleChoiceGroup') props.onChange = () => { callbackCount += 1; };
    const pressable = renderPrimitive(item.name, props).pressables[0];
    dispatchPressableKeyboard(pressable, ' ');
    assert.equal(callbackCount, 1, `${item.name} Space activation count`);
    dispatchPressableKeyboard(pressable, 'Enter');
    assert.equal(callbackCount, 2, `${item.name} Enter activation count`);
  }
});

test('state-changing navigation owns Enter and Space through its button press', () => {
  let callbackCount = 0;
  const rendered = renderPrimitive('AccessibleNavigation', {
    items: [{ id: 'today', label: 'Today' }],
    currentId: 'today',
    onChange: () => { callbackCount += 1; },
  });
  const navButton = rendered.pressables[0];
  assert.equal(navButton.role, 'button');
  assert.equal(navButton['aria-pressed'], true);
  for (const key of ['Enter', ' ']) {
    dispatchPressableKeyboard(navButton, key);
  }
  assert.equal(callbackCount, 2);
});

test('dialog native escape hooks honor closeOnEscape at runtime', () => {
  let callbackCount = 0;
  const rendered = renderPrimitive('AccessibleDialog', {
    visible: true,
    title: 'Privacy',
    closeOnEscape: false,
    onDismiss: () => { callbackCount += 1; },
  }, 'android');
  const modal = rendered.modals[0];
  const dialog = rendered.views.find((props) => props.role === 'dialog');
  modal.onRequestClose?.();
  dialog?.onAccessibilityEscape?.();
  assert.equal(callbackCount, 0);
});

test('dialog backdrop is non-focusable and cancel does not fall through to dismiss', () => {
  let cancelCount = 0;
  let dismissCount = 0;
  const rendered = renderPrimitive('AccessibleDialog', {
    visible: true,
    title: 'Privacy',
    cancelLabel: 'Cancel',
    onCancel: () => { cancelCount += 1; },
    onDismiss: () => { dismissCount += 1; },
  });
  assert.equal(rendered.pressables[0].tabIndex, -1);
  assert.ok(rendered.pressables[0].style.some((style: CapturedProps) => style?.position === 'fixed'));
  rendered.pressables.at(-1)?.onPress?.();
  assert.equal(cancelCount, 1);
  assert.equal(dismissCount, 0);
});

test('point lists keep listitems in the list and announcements outside its topology', () => {
  const rendered = renderPrimitive('AccessiblePointList', {
    label: 'Route points',
    points: [{ id: 'start', label: 'Start' }],
    selectedId: 'start',
    onSelect: () => undefined,
  });
  assert.equal(rendered.views.filter((props) => props.role === 'list').length, 1);
  assert.equal(rendered.views.filter((props) => props.role === 'listitem').length, 1);
  assert.equal(rendered.views.filter((props) => props.role === 'status').length, 1);
});

test('navigation exposes current destinations as links and headings/landmarks support skip navigation', () => {
  assert.match(source, /export function AccessibleNavigation/);
  const navigationSource = source.slice(source.indexOf('export function AccessibleNavigation'));
  assert.match(navigationSource, /role="navigation"/);
  assert.match(navigationSource, /accessibilityRole="button"/);
  assert.match(navigationSource, /role="button"/);
  assert.match(navigationSource, /aria-current/);
  assert.match(navigationSource, /aria-pressed/);
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
  assert.match(progressSource, /<AccessibleLiveRegion message=\{progressAccessibilityLabel\}/);
  assert.doesNotMatch(progressSource, /accessibilityLiveRegion="polite"/);
  assert.doesNotMatch(progressSource, /aria-live="polite"/);
  assert.match(progressSource, /aria-valuetext=\{value\}/);
});

test('shared primitives make route points and markers keyboard-selectable', () => {
  assert.match(source, /export function AccessiblePointList/);
  assert.match(source, /export function AccessibleMapMarker/);
  const pointSource = source.slice(source.indexOf('export function AccessiblePointList'));
  assert.match(pointSource, /accessibilityRole="list"/);
  assert.match(pointSource, /accessibilityRole="button"/);
  assert.match(pointSource, /aria-pressed/);
  assert.match(pointSource, /role="listitem"/);
  assert.match(pointSource, /pointListContainer/);
  assert.match(pointSource, /<AccessibleLiveRegion message=\{announcement\}/);
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
