# Task 2 implementation report

## Scope

Implemented the Task 2 route-planning hardening in the five allowed mobile files only:

- `mobile/src/routeBuilder.ts`
- `mobile/src/screens/RoutesScreen.tsx`
- `mobile/src/screens/screenTypes.ts`
- `mobile/src/routeBuilder.test.ts`
- `mobile/src/routeCatalog.test.ts`

The App shell, translations, map renderers, lifecycle, live ride, and Settings were not changed. Task 1 map files were not changed.

## Implemented behavior

- Added three distinct Plan actions: `Plan your first route`, `Browse sample routes`, and `Build from Start and Destination`; the first action opens the beginner guide, while the other two open their dedicated planning surfaces.
- Kept typed Start/Destination text separate from committed planner points. Suggestions remain available while editing, committed points are preserved during edits and retries, and routing is blocked until both endpoints are committed.
- Added empty, invalid, uncommitted, and identical-endpoint validation with localized, actionable English and Arabic messages.
- Added an active-endpoint map-picker confirmation flow with selected-coordinate summary; selecting a map point does not generate a route before confirmation.
- Kept road-following as the default planner mode and made Advanced sketches explicitly straight-line/off-grid and non-navigation.
- Preserved every manual sketch point through Done, with retained-result actions for using a non-navigation plan, saving locally, editing, or discarding. Edit and Discard have concise Arabic labels in RTL mode.
- Added stable sample selection by route identity, truthful catalog-preview provenance, and `Select this route` sample affordances. Existing navigable route detail continues to expose `Use this route` where safe.
- Added deterministic loop-generation recovery actions (`Try again` and `Edit Start`) while retaining the selected Start point.

## TDD evidence

- Added failing tests first for committed-vs-typed endpoints, empty/equal validation, edit/retry preservation, manual-result retention and decisions, loop recovery, sample identity, distinct Plan actions, catalog provenance, localization, and no-loss manual edit fallback.
- The initial focused package-script run was RED: 114 passing and 8 failing, all from the new requirements.
- Follow-up correction cycles were also tested RED before each targeted fix for duplicate Plan labels, catalog labeling, locale formatting, and manual-edit fallback.
- The direct scoped suite is now GREEN: 17/17 passing.

## Verification

- `npx.cmd tsx --test src/routeBuilder.test.ts src/routeCatalog.test.ts` — PASS, 17/17.
- `npm.cmd run typecheck` — PASS.
- `git diff --check` — PASS for the scoped working-tree changes; the cached scoped diff also passed before commit.
- `npm.cmd test -- src/routeBuilder.test.ts src/routeCatalog.test.ts` — 126/127 passing. The sole failure is the existing out-of-scope `src/mapAccessibility.test.ts` expectation (`matched` vs `pilot`) caused by the Task 1 map hardening commit `b4b8459`; the Task 1 files and test were intentionally left untouched.
- `npm.cmd run web -- --port 8083` — bundle and rendered checks completed for distinct Plan actions, sample selection, endpoint/map-picker confirmation, road-default/Advanced modes, and retained manual-sketch review controls. No native-device run was performed.

## Concerns and follow-up

- Manual save/use/edit/discard and loop retry callbacks are optional at this layer because App integration is outside the Task 2 write set; the compatibility edit path retains the completed result when no callback is supplied. Task 9 can wire the side effects.
- The package test command remains non-green only because of the pre-existing Task 1 map-accessibility mismatch described above.
- Native device behavior, OS permissions, and physical GPS/map interaction were not exercised.
