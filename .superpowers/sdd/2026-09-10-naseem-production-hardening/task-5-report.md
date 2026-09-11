# Task 5 — Privacy center, external data disclosures, and Settings feedback

Status: implemented in the scoped worktree.

## Changes

- Added bilingual structured disclosures for route matching, weather refresh, and the actual Strava OAuth state.
- Replaced the Settings sources-only privacy action with a concrete, scrollable privacy center covering stored and temporary data, location timing, external coordinates, retention, export/share, deletion, and Strava.
- Added explicit Settings location pending, denied, unavailable, limited, undetermined, and granted copy/state handling while preserving existing callback compatibility.
- Hardened preference parsing against malformed JSON, partial values, invalid string booleans, and shared mutable defaults.
- Added weather refresh state helpers for loading, last-good timestamp preservation, actionable failure, retry, bounded in-memory caching, defensive response parsing, and explicit refresh disclosure.

## TDD and verification evidence

- RED: focused preference/weather tests initially failed on mutable preference defaults, missing privacy/location disclosure contracts, missing weather refresh state, missing cache diagnostics, and missing failed-refresh state.
- GREEN: `npx.cmd tsx --test src/appPreferences.test.ts src/weather.test.ts` — 14/14 passed.
- `npm.cmd run typecheck` — passed.
- `git diff --check` — passed.
- Web smoke check: Expo web preview opened Settings and the privacy center successfully. Console output contained only pre-existing Chrome-extension errors and an existing `shadow*` deprecation warning.

## Scope concern

App/Onboarding/You composition remains outside this task’s allowed files; the reusable disclosure and privacy-center contracts are exported for that integration. The final full suite passed 173/173 without changing those out-of-scope files.
