# Task 6 report — accessibility primitives, dialogs, navigation, and safe areas

## Scope

Implemented only the Task 6 surface in `mobile/src/UiPatterns.tsx`, `mobile/src/screenStyles.ts`, `mobile/src/UiPatterns.test.ts`, and `mobile/src/mapAccessibility.test.ts`. No app shell, screen, route, or map renderer files were changed.

## Implemented

- Added reusable `AccessibleDialog` behavior: dialog role and labelled title, native modal semantics, web focus containment, Escape and Cancel handling, inert/`aria-hidden` background isolation, and trigger/previous-focus restoration.
- Added `AccessibleChoiceGroup` radio semantics with roving `tabIndex`, selection state, Enter/Space activation, and arrow/Home/End navigation; added `AccessibleSwitch` with checked state and keyboard toggling.
- Added `AccessibleNavigation` link/current-state semantics, `AccessibleHeading`, `AccessibleLandmark`, and a focus-revealed `SkipToContent` link.
- Added visible focus treatment and shared 44px target sizing for reusable controls, route-point lists, and map-marker fallbacks.
- Added phone/desktop bottom-navigation and sheet safe-zone constants/styles, including browser safe-area environment support.
- Added keyboard-accessible `AccessiblePointList` and `AccessibleMapMarker` primitives with stable selection announcements, plus reusable status/error live regions and progress announcements.
- Corrected the Task 1 map accessibility expectation so metadata-less pilot geometry remains `pilot`; map renderers were not edited.

## Verification

- TDD RED: the new focused assertions initially reported 9 failures and 3 passes.
- TDD GREEN: `npm.cmd exec -- tsx --test src/UiPatterns.test.ts src/mapAccessibility.test.ts` — 12 passed.
- Package test command: `npm.cmd test -- src/UiPatterns.test.ts src/mapAccessibility.test.ts` — 171 passed.
- `git diff --check` — passed.
- `npm.cmd run typecheck` reports only pre-existing/out-of-scope errors in `src/screens/LiveRideScreen.tsx` (lines 154 and 439) and `src/useLiveRideSession.ts` (line 518); none of the four scoped files produce a type error.
