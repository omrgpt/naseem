# SDD ledger — plan: docs/superpowers/plans/2026-09-10-user-first-bike-experience.md

## Preflight plan scan

| Scope | Files/interfaces | Check | Ruling or result |
|---|---|---|---|
| Task 1 ↔ Task 3 | Task 1 owns `MapPreview*` and the `mode`/editor contract; Task 3 consumes it from `RoutesScreen` and `RouteDetailScreen`. | Task 3 must not redesign renderer internals. | Sequential handoff is coherent; Task 1 produces the map contract before Task 3 uses it. |
| Task 1 ↔ Task 7 | Task 1 owns renderer behavior; Task 7 wires shell layout and route-geometry resolution. | Both affect full-screen map behavior but at different boundaries. | Coherent; Task 7 may only change renderer props through the declared contract and must not duplicate map rendering. |
| Task 2 ↔ Task 6 | Task 2 may add focused Home/onboarding copy assertions; Task 6 owns the final `i18n.ts`/`i18n.test.ts` rewrite. | Shared copy keys are a sequential dependency. | Task 2 uses existing keys or narrowly scoped assertions; Task 6 is the sole owner of final copy and parity cleanup. |
| Task 3 ↔ Task 7 | Task 3 changes screen behavior; Task 7 changes `App.tsx`/`screenTypes.ts` integration. | Screen callback contracts must remain explicit. | Coherent; Task 7 integrates after Task 3 and resolves any type-only changes without changing Plan semantics. |
| Task 4 ↔ Task 7 | Task 4 consumes live screen props; Task 7 passes live state and chooses scroll/non-scroll shell mode. | Live map and shell can otherwise fight over height/scrolling. | Coherent; Task 4 owns live content, Task 7 owns container mode and prop wiring. |
| Task 5 ↔ Task 6 | Task 5 consumes copy; Task 6 removes internal language. | You/Settings could reintroduce terms during UI edits. | Task 6 runs after Task 5 and scans both English and Arabic customer strings. |
| Task 6 ↔ Task 7 | Task 7 uses `t` keys and screen labels. | Missing keys would fail typecheck or render fallback text. | Task 7 integrates only after the copy catalog is complete; no inline internal copy is added in App. |
| Task 1 ↔ Task 8 | Task 8 verifies dense geometry/preview fallback and control safe zones. | QA depends on renderer output. | Coherent; QA is a final gate and does not edit production renderer code. |
| Task 2 self-check | `Onboarding.tsx`, `TodayScreen.tsx`, focused assertions, CUA checks. | The test/implementation scope matches. | Clean; location permission remains outside Home/onboarding. |
| Task 3 self-check | `RoutesScreen.tsx`, `RouteDetailScreen.tsx`, map contract, route tests. | The screen owns draw/review decisions and the map owns rendering. | Clean; no domain truth mutation is required. |
| Task 4 self-check | `LiveRideScreen.tsx`, matcher/progress/lifecycle tests. | The screen renders state; hook/domain remain authoritative. | Clean; no location watcher changes are implied. |
| Task 5 self-check | `ProfileScreen.tsx`, `SettingsScreen.tsx`, preference tests. | Existing callbacks remain the interface. | Clean; data deletion remains explicit and isolated. |
| Task 6 self-check | `i18n.ts`, `i18n.test.ts`, `DESIGN.md`. | Copy rewrite and documentation are aligned. | Clean; preview terminology is retained only as a separate honest status. |
| Task 7 self-check | `App.tsx`, `screenStyles.ts`, optional `screenTypes.ts`/`routeRouter.ts`. | Integration changes are testable with full suite/typecheck/UI flow. | Clean; no new storage schema or permission timing is introduced. |
| Task 8 self-check | `PHONE_TESTING.md`, QA report. | QA artifacts are distinct from production code. | Clean; final claims require fresh command and visual evidence. |

## Rulings

- Ruling: code implementers will run sequentially, while read-only audits may run in parallel — the current workspace is untracked and shared, so sequential write ownership minimizes collisions; the cost is wall-clock time.
- Ruling: when router geometry is unavailable, the UI will show a clearly dashed preview rather than synthesize a smooth road path — route truth is more important than visual polish; the cost is a less satisfying fallback map.
- Ruling: Strava behavior is an interaction reference only and will be sourced from public official help, not authenticated app scraping or user data — this avoids unauthorized transmission and copying; the cost is less visual fidelity to private Strava UI.
- Ruling: “idiot-proof” means obvious actions, honest state, recoverable errors, and no hidden location request; it does not authorize adding navigation/safety claims — the cost is that Live Ride remains intentionally bounded.

## Task 1 — map useful canvas

- Implementer: Socrates (`gpt-5.6-luna`, max), commit `bfa59f2c606fb2beba43ad29129afee0d870e40b`.
- Scoped files: `mobile/src/MapPreview.tsx`, `mobile/src/MapPreview.web.tsx`, `mobile/src/MapPreview.native.tsx`, `mobile/src/mapModel.ts`, `mobile/src/mapModel.test.ts`.
- Verification: focused map tests and full TypeScript check reported green; controller reran the focused command and observed 53/53 tests passing and `tsc --noEmit` passing.
- Review: the first reviewer process stalled and was shut down; a second focused reviewer also stalled and was shut down. Controller review of the scoped diff and rendered Arabic map found the implementation aligned with the brief: dense `route.geometry` is rendered when present, waypoint fallback is visibly dashed, loop endpoints are capped, controls expose 44px targets, and existing props remain compatible. Native runtime remains unverified without a device/emulator. Follow-up integration work must supply real road geometry for the NBH review instead of treating the five supplied waypoints as smooth roads.
- Status: accepted with the native-runtime limitation recorded; continue to Task 2.

## Task 2 — first-run Home and onboarding

- Implementer: controller-local surgical pass after two Luna Max workers stalled before editing; commit `b6277c7`.
- Scoped files: `mobile/src/Onboarding.tsx`, `mobile/src/screens/TodayScreen.tsx`, plus the task report.
- Verification: controller ran the full mobile suite: 53/53 passed; `npm.cmd run typecheck` passed with no diagnostics.
- Review: a fresh Luna Max reviewer was dispatched but stalled before returning a verdict and was shut down. Controller reviewed the changed copy/layout paths and confirmed the local country/unit fixes, no location request in onboarding, honest no-route copy, and scoped file ownership. Remaining internal catalog/status copy is explicitly deferred to Task 6; the default NBH selection is deferred to Task 7.
- Status: accepted with deferred catalog/shell concerns; continue to Task 3.

## Task 3 — Plan and route review

- Implementer: controller-local bounded pass after one Luna Max worker stalled; commits `006616b` and `bb3df14`.
- Scoped files: `mobile/src/screens/RoutesScreen.tsx`, `mobile/src/screens/RouteDetailScreen.tsx`, plus the task report.
- Verification: controller reran the full mobile suite: 53/53 passed; `npm.cmd run typecheck` and `git diff --check` passed.
- Review: the dispatched Luna Max reviewer stalled before returning a verdict and was shut down. Controller review caught and fixed the missing map in imported/generated review cards before accepting the task. The plan/detail paths now gate preview-only start actions, use the tapped point rather than a hard-coded center, make route sketches honest/recoverable, and give preview detail a clear recovery action. Remaining shell geometry resolution and translation-key replacement are deferred to Tasks 6–7.
- Status: accepted with deferred shell/catalog concerns; continue to Task 4.

## Task 4 — Live Ride and recovery

- Implementer: controller-local bounded pass after one Luna Max worker stalled; commit `55bcdb8`.
- Scoped files: `mobile/src/screens/LiveRideScreen.tsx`, `mobile/src/useLiveRideSession.ts`, `mobile/src/rideRecording.ts`, `mobile/src/rideRecording.test.ts`, plus the task report.
- Verification: controller ran the full mobile suite: 55/55 passed; `npm.cmd run typecheck` and `git diff --check` passed.
- Review: a fresh Luna Max reviewer was dispatched but stalled before returning a verdict and was shut down. Controller review confirmed the active-snapshot recovery path, current-time stale matching, timestamp gap counting, recording-only null route context, and vertical RTL action layout. Durable failed-save persistence remains intentionally deferred to Task 7; native watcher behavior remains a final-QA risk.
- Status: accepted with deferred persistence/catalog concerns; continue to Task 5.

## Task 5 — You and Settings

- Implemented and accepted through the Profile/Settings passes; the primary
  integration commit is `7461a9c`, with follow-up copy/settings commits
  `e781ce3` and `e74331e`.
- Profile now reads as a local personal hub with actionable empty states and
  optional history wording. Settings exposes language, units, appearance,
  location timing, privacy/data, export, and explicit saved-route/ride
  deletion.
- Status: complete; native device permission/screen-reader behavior remains a
  final human-owned QA boundary.

## Task 6 — bilingual copy and RTL parity

- Implemented by Linnaeus (`gpt-5.6-luna`, max), commit `25c770c`, with
  rider-facing copy cleanup `c088fd0`, unit preference wiring `736aa8b`, and
  planner wording/scroll follow-up `3a3b6d0`.
- English and Arabic catalog parity, interpolation, RTL presentation, Arabic
  numerals/time formatting, and customer-language scans are covered by tests.
- Status: complete; final CUA checks are recorded in Task 8.

## Task 7 — shell, route resolution, and integration

- Implementer: controller-local integration pass while six-agent pool was
  occupied; commit `323c511` (`feat(shell): integrate explicit route review`).
- Scoped changes: `mobile/App.tsx`, `mobile/src/screenTypes.ts`,
  `mobile/src/mapModel.ts`, `mobile/src/mapModel.test.ts`,
  `mobile/src/routeRouter.ts`, and `mobile/src/routeRouter.test.ts`.
- Follow-up hardening added route identity preservation (`98102c0`), current
  location control (`2b7f6b9`), route detail recovery actions (`02fe21e`),
  stricter live-route readiness (`351ee13`), preview status recovery
  (`95ffa37`), router response validation (`d5f08c2`), and distance preference
  conversion (`736aa8b`).
- Verification: the final mobile suite is **101/101 passed**;
  `npm.cmd run typecheck` and `git diff --check` pass. Report:
  `.superpowers/sdd/2026-09-10-user-first-bike-experience/task-7-report.md`.
- Status: complete; final English/Arabic CUA and adversarial checks are in
  Task 8.

## Task 8 — adversarial usability and accessibility release gate

- Final QA used six parallel Luna Max read-only/audit slots and waited for
  completed reports; no agent was cancelled for a missing one-minute verdict.
- Verified English/Arabic web AX and screenshot flows across Home, Plan, route
  review, Ride entry, You, and Settings. Map truth, attribution, controls,
  location timing, recovery, units, and rider-facing copy are recorded in
  `task-8-report.md` and
  `docs/superpowers/plans/2026-09-10-user-first-bike-experience-qa.md`.
- Status: complete for the web handoff with no P0/P1 implementation blocker;
  native device/emulator and production TestFlight checks remain explicitly
  required before public release.

## Final verification

- `npm.cmd test`: **101 passed, 0 failed**.
- `npm.cmd run typecheck`: passed, no diagnostics.
- `git diff --check`: passed.
