import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./UiPatterns.tsx', import.meta.url), 'utf8');
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
