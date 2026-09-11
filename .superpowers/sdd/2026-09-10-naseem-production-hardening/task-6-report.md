# Task 6 report — accessibility primitives, dialogs, navigation, and safe areas

## Scope

Implemented only the Task 6 surface in `mobile/src/UiPatterns.tsx`, `mobile/src/screenStyles.ts`, `mobile/src/UiPatterns.test.ts`, and `mobile/src/mapAccessibility.test.ts`. No app shell, screen, route, or map renderer files were changed.

## Implemented

- Added reusable `AccessibleDialog` behavior: dialog role and labelled title, native modal semantics, web focus containment, Escape and Cancel handling, inert/`aria-hidden` background isolation, and trigger/previous-focus restoration.
- Added `AccessibleChoiceGroup` radio semantics with roving `tabIndex`, selection state, Enter/Space activation, and arrow/Home/End navigation; added `AccessibleSwitch` with checked state and keyboard toggling.
- Added `AccessibleNavigation` state-changing button/current-state semantics, `AccessibleHeading`, `AccessibleLandmark`, and a focus-revealed `SkipToContent` link.
- Added visible focus treatment and shared 44px target sizing for reusable controls, route-point lists, and map-marker fallbacks.
- Added phone/desktop bottom-navigation and sheet safe-zone constants/styles, including browser safe-area environment support.
- Added keyboard-accessible `AccessiblePointList` and `AccessibleMapMarker` primitives with stable selection announcements, plus reusable status/error live regions and progress announcements.
- Corrected the Task 1 map accessibility expectation so metadata-less pilot geometry remains `pilot`; map renderers were not edited.

## Fix round

- Made `Pressable` the sole owner of Enter/Space activation for switches, radio activation, route points, markers, and navigation. Radio `onKeyDown` now handles arrow/Home/End movement only, preventing callback double-fires.
- Changed state-changing navigation items to `button` semantics with `aria-pressed` and `aria-current`; Enter/Space continue through the native Pressable path.
- Made the web dialog backdrop fixed to the viewport with stacking and pointer coverage, and gated native Escape hooks with `closeOnEscape`.
- Moved progress updates to one stable visually-hidden polite live region while retaining the accessible progressbar value, avoiding duplicate announcements.
- Added rendered-prop callback-count tests for Enter and Space, navigation activation, and native dialog escape gating.

## Third fix round

- Restored Space-only keyboard handlers for web radio and switch roles; Enter remains Pressable-owned, with runtime callback-count coverage proving one activation per key.
- Made the web dialog backdrop programmatically non-focusable with `tabIndex={-1}` while retaining fixed viewport coverage, stacking, and pointer interception.
- Corrected dialog Cancel fallback control flow so an explicit `onCancel` does not also invoke `onDismiss` when it returns `void`.
- Restructured accessible route points as `list` → `listitem` → `button` and kept the selection live region outside the list topology.

## Verification

- Initial-round TDD GREEN: `npm.cmd exec -- tsx --test src/UiPatterns.test.ts src/mapAccessibility.test.ts` — 12 passed.
- Fix-round TDD RED: the callback-count and review regression assertions reported 6 expected failures and 9 passes.
- Fix-round TDD GREEN: `npm.cmd exec -- tsx --test src/UiPatterns.test.ts src/mapAccessibility.test.ts` — 15 passed.
- Package relevant-suite run: `npm.cmd test -- src/UiPatterns.test.ts src/mapAccessibility.test.ts` — 176 passed.
- `git diff --check` — passed.
- `npm.cmd run typecheck` — passed.
- Third-round TDD RED: the new regression assertions reported 7 expected failures and 11 passes.
- Third-round TDD GREEN: `npm.cmd exec -- tsx --test src/UiPatterns.test.ts src/mapAccessibility.test.ts` — 18 passed.
- Final package relevant-suite run: `npm.cmd test -- src/UiPatterns.test.ts src/mapAccessibility.test.ts` — 194 passed.
- Final `npm.cmd run typecheck` — passed.
