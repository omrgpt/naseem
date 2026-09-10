# NASEEM Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task with a fresh implementer and a scoped review after every task.

**Goal:** Make the NASEEM Bike app usable for a first real ride tomorrow by correcting the observed route, map, live-ride, privacy, accessibility, responsive-layout, onboarding, and Arabic/RTL failures without weakening route-safety truth.

**Architecture:** Preserve the existing Expo SDK 57 / React Native architecture and canonical `RouteRecord` model. Each task owns a disjoint file set; the final orchestration task is the only task allowed to change `mobile/App.tsx`. The map remains provider-neutral: web keeps a visible-attribution tile provider as the safe default, native keeps `react-native-maps`, and Google Maps is opt-in only when the feasibility investigation confirms a safe configured path.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6, `react-native-maps`, `react-native-web`, Node.js 22.13+.

**Spec:** `docs/ux-recovery-handoff.md`, `docs/nbh-live-guidance-architecture.md`, and the current user request authorizing implementation of all six persona findings.

## Global Constraints

- Work only in the isolated branch `codex/naseem-release-fixes`; do not reset, clean, or overwrite the user’s original checkout.
- Use a fresh Luna Max implementer for each task and a separate scoped reviewer after each implementer.
- Every production behavior change must have a failing automated test first, then a minimal implementation, then a passing focused test.
- Never request, grant, or simulate real location permission in browser verification; native GPS behavior must be labeled unverified unless tested on a device.
- Expo SDK 57 remains the floor: React Native 0.86, React 19.2.3, React Native Web 0.21, and Node.js 22.13.x or newer.
- Route-following is offered only for `geometry.status === "ready"` and authoritative road-matched geometry; waypoint, drawn, recorded, unavailable, or pending geometry remains preview/recording-only.
- No customer-facing copy may expose pilot, owner-policy, internal ID, debug, or implementation vocabulary.
- English and Arabic must use the same keys and placeholders; Arabic must set the web document `lang="ar"` and `dir="rtl"`, use logical layout properties, and format numbers/times through the shared locale functions.
- Google Maps must never be enabled without explicit configured keys, attribution/license compliance, and a working fallback. A missing key must leave the app buildable and usable.
- Do not add turn-by-turn navigation, automatic rerouting, background tracking, Strava OAuth, or safety certification as part of this plan.

---

### Task 1: Map surface, geometry rendering, and provider adapter

**Files:**
- Modify: `mobile/src/MapPreview.web.tsx`
- Modify: `mobile/src/MapPreview.native.tsx`
- Modify: `mobile/src/MapPreview.tsx`
- Modify: `mobile/src/mapModel.ts`
- Modify: `mobile/src/mapPreviewContract.ts`
- Test: `mobile/src/mapModel.test.ts`
- Test: `mobile/src/mapPreviewContract.test.ts`
- Optional create: `mobile/src/mapProvider.ts` and `mobile/src/mapProvider.test.ts` only if the adapter keeps provider selection isolated.

**Interfaces:** The existing map components continue to consume route geometry, waypoints, layers, `onPressMap`, `onSelectPoint`, `showUserLocation`, and map mode props. The renderer must not mutate `RouteRecord` or infer route readiness from a global flag.

**Required behavior:**

- Render dense road geometry as the only solid route line. Render recorded/waypoint/drawn traces as dashed preview lines. Render no route line for unavailable or empty geometry; show named points and one actionable state message instead.
- Make the map use the available phone/desktop surface without allowing the fixed bottom bar or sheet to cover zoom/Fit controls. On web, support pointer click/tap placement, drag/pan, wheel/double-click zoom, and explicit Fit route; on native, preserve pan/pinch/zoom and native marker hit targets.
- When placing a point, expose the active endpoint and a visible crosshair/pin state. A map press selects the active endpoint only; it must not silently overwrite the other endpoint or start matching before both endpoints are explicitly committed.
- Keep route/access, forecast, selection, and live-position layers visually and semantically separate. Every marker must have a rider-facing label with no raw URL, source ID, or internal geometry term.
- Keep OSM attribution on web and native source attribution where required. Add a provider adapter only if the Google Maps investigator verifies a configured Expo path; default to the existing provider when the key is absent.

**Tests:** Add failing cases for unavailable geometry rendering no line, dashed non-road geometry, endpoint selection ownership, finite coordinates, control visibility, and provider fallback without a key. Run `npm.cmd test -- src/mapModel.test.ts src/mapPreviewContract.test.ts` and confirm the new assertions fail before implementation, then pass after implementation.

**Acceptance:** A 390x844 phone viewport and a 1280x720 desktop viewport show a legible map, no straight chord pretending to be a road route, controls above the navigation/sheet safe zone, an obvious active endpoint, and the same route status in the visual map and accessible text.

---

### Task 2: Route builder, manual sketch, samples, and endpoint state

**Files:**
- Modify: `mobile/src/routeBuilder.ts`
- Modify: `mobile/src/screens/RoutesScreen.tsx`
- Modify: `mobile/src/screens/screenTypes.ts`
- Test: `mobile/src/routeBuilder.test.ts`
- Test: `mobile/src/routeCatalog.test.ts`

**Interfaces:** Preserve the existing builder state shape and screen callback surface; the final App integration task will wire callbacks. A committed endpoint must be distinguishable from text currently being typed. Use the existing coordinate and `RouteRecord` types rather than adding a second route model.

**Required behavior:**

- Make the primary Plan actions distinct: `Plan your first route`, `Browse sample routes`, and `Build from Start and Destination`. Remove duplicate `Review route`/`Preview without location` actions when they lead to the same surface.
- Treat Start and Destination as explicit selections. Close or mark suggestions after commit, show selected chips/labels, keep the selected point while editing its text until the user clears it, and do not match typed-but-uncommitted text.
- Validate empty endpoints and identical Start/Destination before calling the router, with localized actionable messages. Preserve committed points during Retry/Edit points and say which point is still selected.
- Give `Choose on map` an explicit active-endpoint mode, a confirmation step, and a visible selected-point summary. Do not generate or match until both endpoints are confirmed.
- Keep road-following as the default. Put straight-line/off-grid behind Advanced, make its warning persistent, support a real point list plus Undo/Redo/Clear, and make Done retain the draft with `Use as a non-navigation plan`, `Save locally`, `Edit`, and `Discard` decisions.
- Add `Use this route`/`Select this route` to sample detail and make every `Choose another route` control open the same route chooser. Add a clear recovery action after a failed loop generation.

**Tests:** Add failing cases for committed-vs-typed endpoints, equal endpoints, edit preservation, sample selection, duplicate-action removal, manual sketch retention, and deterministic loop failure recovery. Run `npm.cmd test -- src/routeBuilder.test.ts src/routeCatalog.test.ts` through red/green cycles.

**Acceptance:** A beginner can build or browse a route without guessing whether text was committed, can recover from router failure without losing points, can select a sample as the active route, and can save or discard a manual sketch instead of losing it.

---

### Task 3: Route truth, matching, lifecycle, and consistent readiness

**Files:**
- Modify: `mobile/src/routeRouter.ts`
- Modify: `mobile/src/routeMatcher.ts`
- Modify: `mobile/src/routeLifecycle.ts`
- Modify: `mobile/src/routeRepository.ts`
- Modify: `mobile/src/routeEngine.ts`
- Modify: `mobile/src/domain.ts` only for a necessary contract correction
- Test: `mobile/src/routeRouter.test.ts`
- Test: `mobile/src/routeMatcher.test.ts`
- Test: `mobile/src/routeLifecycle.test.ts`
- Test: `mobile/src/routeEngine.test.ts`

**Interfaces:** Keep `RouteRecord`, `RouteGeometry`, `routeMatchingSucceeded`, `routeMatchingFailed`, `routeIsNavigable`, and `resolveRoadGeometryDetailed` compatible with existing callers. Do not change screen components in this task.

**Required behavior:**

- A successful provider response must validate complete legs, geometry, endpoints, cumulative distance, and metadata before setting `geometry.status` to `ready`. A failed or incomplete response must produce one `unavailable`/`waypoint_trace` state with no authoritative solid line.
- Remove any stale global matching state. Every visible route card, route detail, map, and ride gate must derive from the same `RouteRecord` geometry/evidence status.
- Keep provisional waypoint distance separate from authoritative routed distance. Do not expose final ETA/wind ranking or `routeIsNavigable` until road matching succeeds.
- Fix route identity selection so changing a route cannot retarget an active snapshot. Reverse must create a clear draft/revision or be unavailable for a shared-start loop; it must never silently produce two identical endpoints.
- Keep `RouteOrigin`, `RouteOwnership`, source/provenance, revision, and catalog/personal separation explicit across reload and selection.

**Tests:** Add failing cases for a provider response with numeric geometry but incomplete legs, matching failure clearing final metrics, stale state after edit, active snapshot immutability, route selection identity, and equal reverse endpoints. Run focused router/matcher/lifecycle/engine tests red then green.

**Acceptance:** No unavailable route can look route-ready, planner and Ride never disagree about route distance/status, and active rides remain pinned to the reviewed route revision.

---

### Task 4: Live ride permission, active states, completion recovery, and export

**Files:**
- Modify: `mobile/src/useLiveRideSession.ts`
- Modify: `mobile/src/screens/LiveRideScreen.tsx`
- Modify: `mobile/src/rideRecording.ts`
- Modify: `mobile/src/activityRepository.ts`
- Test: `mobile/src/rideRecording.test.ts`
- Test: `mobile/src/activityRepository.test.ts`

**Interfaces:** Preserve the existing watcher/session hook API used by App. Return explicit states for ready, explanation, requesting, active, denied, unavailable, ending, completed draft, save failed, saved, discarded, and exported.

**Required behavior:**

- Keep route-following unavailable unless Task 3 reports a ready road route. Recording-only mode must say `Start recording`/`Recording active`/`End recording`, not `Start live ride`, and must never promise route progress.
- After the user confirms the in-product explanation, show a visible requesting state. On web denial/unavailability, stay on the Ride screen with `Location not allowed` or `Location unavailable in this browser`, plus `Try again`, `Open settings` where supported, and a no-location escape.
- Keep the selected route summary above the start action, make the active map dominant, and show only remaining distance/ETA, next segment, GPS/match confidence, and End ride.
- Make pause/resume available for recording where the current platform supports it, and give stale/off-corridor states concrete controls: last fix, retry location, pause, continue recording, and end.
- Surface pending completion drafts after reload in a recoverable banner/inbox. Make Save, Retry save, Discard with confirmation, and Export explicit. On web, create a browser download/Blob fallback rather than only raising an unavailable alert. Saved rides must be openable from You.
- Clarify that a temporary local draft may contain samples until saved or discarded; preserve route and forecast snapshots immutably.

**Tests:** Add failing state-machine cases for permission denial/unavailable, recording-only labels, pause/resume, pending-draft hydration, save failure/retry, discard, browser export fallback, and history opening. Run the focused recording/activity tests red then green.

**Acceptance:** A real user can understand every permission outcome, never gets trapped in the web loop, can recover a just-ended ride after reload, and can save/export/discard with no silent data loss.

---

### Task 5: Privacy center, external data disclosures, and Settings feedback

**Files:**
- Modify: `mobile/src/SettingsScreen.tsx`
- Modify: `mobile/src/weather.ts`
- Modify: `mobile/src/api.ts`
- Modify: `mobile/src/appPreferences.ts`
- Test: `mobile/src/appPreferences.test.ts`
- Test: `mobile/src/weather.test.ts`

**Interfaces:** Keep preference persistence and weather request helpers backward-compatible. Expose data-flow descriptions as structured values so English and Arabic screens cannot drift.

**Required behavior:**

- Replace the sources-only `Privacy & data` dialog with a concise privacy center answering what is stored, what is temporarily retained, when location is used, what route/weather coordinates leave the device, retention, export/share scope, deletion scope, and Strava’s actual configured/unconfigured state.
- Correct absolute copy to say location is never requested passively, but may be requested when starting a live ride or explicitly choosing Current location. Make Settings `Allow location/Manage` report pending, denied, unavailable, or granted rather than doing nothing.
- Add explicit data-flow copy before route matching and weather refresh; use the existing provider names/URLs but never claim local-only storage means no network request.
- Rename export to communicate sharing and show included fields/precise traces. Preserve a local-only browser download option when possible.
- Rename or disable Strava Connect when OAuth is not implemented; do not promise a connection with a Done-only modal.
- Add weather refresh loading, updated timestamp, failure status, and a retry action. Preserve the existing bounded cache behavior.

**Tests:** Add failing cases for malformed preference recovery, privacy disclosure fields, location status copy, weather refresh state, and export/share wording. Run focused preferences/weather tests red then green.

**Acceptance:** A privacy-conscious rider can answer where data goes, can see when Settings actions succeed/fail, and never mistakes an information modal for a working integration.

---

### Task 6: Accessibility primitives, dialogs, navigation, and PC safe-area layout

**Files:**
- Modify: `mobile/src/UiPatterns.tsx`
- Modify: `mobile/src/screenStyles.ts`
- Modify: `mobile/src/UiPatterns.test.ts`
- Modify: `mobile/src/mapAccessibility.test.ts`

**Interfaces:** Keep exported visual primitives and props compatible with existing screens. Provide reusable `AccessibleDialog`, `AccessibleChoiceGroup`, `AccessibleSwitch`, and navigation state primitives where existing primitives are insufficient.

**Required behavior:**

- Give dialogs `role="dialog"`, labelled titles, modal focus containment, Escape/Cancel support where appropriate, inert background, and focus restoration to the trigger.
- Give the four bottom destinations semantic navigation with an exposed current state. If tabs remain, implement a real tablist/tabpanel pattern; otherwise use nav links/buttons with `aria-current`.
- Make radio groups keyboard-operable with native semantics or correct roving tabindex; expose switch `aria-checked` and Space behavior; expose departure selection state.
- Add real headings/landmarks and a skip-to-content path. Preserve visible focus rings and target sizes of at least 44px for actionable controls.
- Reserve fixed navigation and sheet safe zones on desktop and phone. Do not let map controls, route actions, or lower You/Settings rows sit under the fixed bar.
- Make map point lists and marker selection keyboard-accessible with announcements; status/progress/error messages must use stable live/status regions.

**Tests:** Add failing semantic assertions for dialog focus, keyboard radios/switches, selected navigation, headings/landmarks, target size, safe-zone padding, and point-list accessibility. Run `npm.cmd test -- src/UiPatterns.test.ts src/mapAccessibility.test.ts` red then green.

**Acceptance:** Keyboard/screen-reader-style traversal can reach every primary action; modals do not leak focus; map controls are not mis-hit as navigation; and the same UI is usable at phone and PC sizes.

---

### Task 7: Route detail, sample editing, and responsive decision sheet

**Files:**
- Modify: `mobile/src/screens/RouteDetailScreen.tsx`
- Modify: `mobile/src/screens/ProfileScreen.tsx`
- Test: `mobile/src/routeDetailScreen.test.ts`

**Interfaces:** Keep the route detail callback names used by App, but make their effects explicit (`onUseRoute`, `onChangeRoute`, `onAddStop`, `onReverse`, `onEditPoints`, `onRetry`). Do not change App in this task.

**Required behavior:**

- Use one scrollable decision sheet that reveals all content with mouse wheel, trackpad, touch swipe, and keyboard focus. Keep Back and the primary route action sticky and reserve bottom safe padding.
- Show route identity, source/ownership, exact current geometry state, start/finish, distance/time, and ride availability by default; keep deep evidence behind a clearly labelled disclosure.
- Make Add stop open an in-context ordered-stop editor, Reverse show a changed preview or a clear unavailable explanation, and Edit points preserve committed endpoints. Never return to Plan without explaining the transition.
- Make `Choose another route` consistently open route selection. Make a selected sample clearly selectable and distinguish `Sample`, `Yours`, and `Imported`.
- Correct partial-route provenance so reference distance and displayed preview distance cannot be mistaken for the same route. Replace `Recorded track` when it is not the rider’s recording.
- Make saved ride rows open the ride summary and expose the route/forecast snapshot relationship.

**Tests:** Add failing route-detail cases for scrollable content contract, in-context Add stop, reverse behavior, chooser consistency, source/ownership wording, partial-route label, and saved-ride opening. Run the focused test red then green.

**Acceptance:** A rider can review and act on every route detail at 1280x720 or 390x844 without hidden controls, stale route context, or misleading sample provenance.

---

### Task 8: Onboarding, Arabic/RTL content, font sizing, and locale parity

**Files:**
- Modify: `mobile/src/Onboarding.tsx`
- Modify: `mobile/src/i18n.ts`
- Modify: `mobile/src/fonts.ts`
- Test: `mobile/src/Onboarding.test.ts`
- Test: `mobile/src/i18n.test.ts`

**Interfaces:** Preserve `Language`, translation key types, onboarding callback signatures, and shared locale/time/number formatters.

**Required behavior:**

- Make the final onboarding CTA match its destination and preserve a completion summary. Add a reachable `Edit riding preferences`/`Replay setup` path through existing callback contracts; do not erase routes or rides.
- Ensure every visible string has English and Arabic parity, including endpoint names, route states, weather, permission outcomes, manual drawing, and recovery actions. Remove raw `Start ·`, `Finish ·`, internal status words, and mixed-language values from customer surfaces.
- Set document language/direction on web and keep native direction behavior explicit. Use logical start/end layout decisions in screen styles; do not rely on isolated `row-reverse` patches.
- Format all times, numbers, distances, and loop inputs through the locale helpers. Arabic operational text must be at least 14/22 body, 12/18 metadata, and 13/20 controls; remove uppercase/wide letter spacing and synthetic 900 weights from Arabic.
- Make long Arabic names wrap without clipping and keep `العربية` selection, Back placement, tabs, map controls, and endpoint names consistent.

**Tests:** Add failing parity cases for onboarding completion, replay/edit, missing translation keys/placeholders, `lang`/`dir`, Arabic numerals and time, and no English route endpoints. Run focused onboarding/i18n tests red then green.

**Acceptance:** A first-time Arabic rider can complete setup, understand the resulting route state, and use the same Plan/Route/Ride journey without clipped or untranslated controls.

---

### Task 9: App orchestration and end-to-end integration

**Files:**
- Modify: `mobile/App.tsx`
- Modify: `mobile/src/appIntegration.test.ts`
- Modify: `mobile/src/appAlert.test.ts` only for integrated alert/state behavior

**Interfaces:** Integrate the completed task contracts without reintroducing screen-local global inference. App owns navigation and composition; screens own presentation; route repository owns route truth; live-ride hook owns watcher state; Settings owns preference controls.

**Required behavior:**

- Make Home, Plan, Route detail, Ride, You, and Settings agree on selected route, route readiness, distance/time, locale, and current action. Onboarding completion must either select a known route or say clearly that the user still needs to choose one.
- Wire map endpoint selection, route-builder commit/recovery, sample selection, manual-sketch retention, route matching state, route-detail actions, live permission outcomes, completion-draft recovery, and saved-ride opening.
- Remove all duplicate/unused pilot/lab/customer-policy branches from the normal customer path while preserving catalog/lab query modes outside the rider flow.
- Use the shared alert presenter for web/native messages; no browser `about:blank` escape on Settings Back or route surfaces. Keep back navigation within the SPA.
- Ensure location is requested only after explicit Current location or Start ride actions, and the web unsupported state is visible.

**Tests:** Add failing integration cases for onboarding-to-Home, Home-to-Plan selection, sample-to-Ride, builder-to-route-detail, permission denial recovery, completion-draft hydration, Settings Back, language/direction propagation, and no implicit location request. Run `npm.cmd test -- src/appIntegration.test.ts src/appAlert.test.ts` red then green.

**Acceptance:** A new user can go from onboarding to route selection to review to a clear Ride-ready state; every failure has a next action; no screen contradicts another; and no unsafe route can start navigation.

---

### Task 10: Final review, rendered verification, and release gate

**Files:**
- Inspect all changed files; do not make unreviewed production changes.
- Update: `mobile/PHONE_TESTING.md` with the exact remaining native-device checklist if needed.

**Required checks:**

- Review every task diff for scope, tests, and regressions; confirm task commits do not overlap in ways that dropped changes.
- Run fresh verification from `mobile`: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run doctor`, and `git diff --check`.
- Start the web preview and render English and Arabic at 390x844 and 1280x720. Exercise onboarding, Home, Plan, map placement, sample selection, route failure, route detail scrolling, Settings, privacy, permission denial/unavailable, and completion recovery without granting location.
- Validate no customer UI contains `pilot`, `owner`, `policy`, raw IDs, raw provider URLs in labels, or false road-ready copy. Validate there is no straight solid line for an unavailable/unmatched route.
- Record native-device gaps explicitly: Android/iOS permission prompt, native map provider/API key, real GPS active/paused/off-route/stale/end, and background behavior remain device checks unless actually exercised.

**Release gate:** Do not call the app ready for tomorrow’s live ride unless web permission fallback is understandable, all route-readiness gates are truthful, completion recovery is visible, and the native test checklist is clearly marked. A build can be functionally complete while still requiring the user’s phone check for OS permission and GPS behavior.
