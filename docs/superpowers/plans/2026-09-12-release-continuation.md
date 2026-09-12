# NASEEM Release Continuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task with a fresh implementer and a scoped review after every task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the verified remaining NASEEM usability, map, Live Ride, accessibility, Arabic/RTL, and recovery gaps without weakening route truth or losing work across agent interruptions.

**Architecture:** Preserve the existing Expo/React Native architecture and canonical `RouteRecord` readiness boundary. Make map layout parent-driven, keep one rider-facing state model across Home/Plan/Review/Ride, route manual sketches through explicit draft and road-check states, and keep all durable progress in Git plus checkpoint reports.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19.2, TypeScript, `react-native-maps`, the existing web OSM renderer, Node tests through `tsx`, and browser/CUA viewport verification.

**Spec:** `docs/ux-recovery-handoff.md`, `docs/nbh-live-guidance-architecture.md`, `docs/superpowers/checkpoints/2026-09-12-continuation.md`, and the audit reports beside that checkpoint.

## Global Constraints

- Work only in `C:\Users\PC\Documents\ChatGPT\Bike\.worktrees\naseem-release-fixes` on `codex/naseem-release-fixes`.
- Use `gpt-5.6-luna` with maximum reasoning for every delegated implementer and reviewer.
- Every production behavior change starts with a failing test, then minimal code, then a passing focused test and full typecheck.
- Every agent must write `IN PROGRESS` before editing and `COMPLETE` or `BLOCKED` with commit/files/tests/resume details before returning.
- Route-following requires explicit authoritative `road_matched` + `ready` geometry; previews, sketches, GPX, unavailable, and pending states cannot start navigation.
- Browsing/reviewing never requests location; only an explicit ride/current-location action may cross that boundary.
- English and Arabic expose the same state and placeholders; Arabic must remain RTL, readable, and free of English fallback in dynamic recovery states.
- Touch targets remain at least 44px; fixed navigation and sheets may not cover map controls or primary actions at 390x844, 320x568, 1280x720, or 1536x864.
- Do not add Google Maps without verified configured keys, licensing/attribution, and a working fallback; do not add turn-by-turn navigation, rerouting, background tracking, Strava OAuth, or safety claims.
- Never reset, clean, overwrite unrelated dirty files, or close a running agent.

---

### Task 1: Parent-driven map and decision-sheet safe areas

**Files:**
- Modify: `mobile/src/MapPreview.web.tsx`
- Modify: `mobile/src/MapPreview.tsx`
- Modify: `mobile/src/mapPreviewContract.ts`
- Modify: `mobile/src/screens/RouteDetailScreen.tsx`
- Modify: `mobile/src/screenStyles.ts`
- Test: `mobile/src/mapPreviewContract.test.ts`
- Test: `mobile/src/mapModel.test.ts` only for new pure viewport helpers

**Interfaces:** Consume existing map modes, route geometry, markers, map controls, and Route Detail props. Produce an explicit available-map-rectangle/inset contract without changing route readiness or endpoint-selection ownership.

- [ ] Add failing pure tests for parent width/height, bottom sheet/nav obstruction, control safe zones, and desktop/mobile map rectangles.
- [ ] Verify the focused tests fail for the missing available-rectangle behavior.
- [ ] Make web map sizing fill its parent and use measured dimensions rather than `viewportWidth - 32` and a fixed full-screen height. Preserve attribution and gesture/keyboard controls.
- [ ] Make Route Detail use a phone bottom sheet and a desktop map-plus-decision-panel layout where space allows; ensure Fit uses the unobscured map rectangle.
- [ ] Keep native behavior compatible and do not invent provider geometry.
- [ ] Run focused tests, full mobile tests, typecheck, and CUA at 390x844, 320x568, 1280x720, and 1536x864.

### Task 2: Real endpoint picker and manual sketch road-check state

**Files:**
- Modify: `mobile/App.tsx`
- Modify: `mobile/src/screens/RoutesScreen.tsx`
- Modify: `mobile/src/routeBuilder.ts`
- Modify: `mobile/src/routeLifecycle.ts` only for the existing transition seam
- Test: `mobile/src/routeBuilder.test.ts`
- Test: `mobile/src/appIntegration.test.ts`

**Interfaces:** Preserve existing route callbacks and canonical lifecycle APIs. Use the Task 1 map contract and keep all user points ordered.

- [ ] Add failing tests for real-map endpoint selection, committed-vs-typed points, two-endpoint validation, sketch retention, explicit road-check success/failure, and whole-stroke undo.
- [ ] Verify the tests fail before production changes.
- [ ] Replace `EmptyBuilderMap` with the existing real map renderer in editor mode, with active endpoint, crosshair, visible selected-point summary, and confirmation.
- [ ] Represent a manual sketch as an explicit draft/preview; add `Check against mapped roads` through `beginRouteMatching` and retain the sketch on failure.
- [ ] Keep `Use as a non-navigation plan`, `Edit`, `Save locally`, and `Discard` separate; never enable Live Ride from unknown geometry.
- [ ] Preserve all intermediate points through Add stop/Edit and simplify freehand input before routing without changing user-visible endpoints.
- [ ] Run focused route/integration tests, full suite, typecheck, and phone/Arabic editor checks.

### Task 3: One rider-facing identity, status, and Plan/Home flow

**Files:**
- Modify: `mobile/src/screens/TodayScreen.tsx`
- Modify: `mobile/src/screens/RoutesScreen.tsx`
- Modify: `mobile/src/screens/RouteDetailScreen.tsx`
- Modify: `mobile/src/screens/ProfileScreen.tsx`
- Test: existing screen/pure route tests and any focused helpers added in these files

**Interfaces:** Consume the canonical selected route and matching status from App. Do not duplicate route truth in screen-local flags.

- [ ] Add failing assertions for sample vs selected vs ready identity, one Retry action, explained departure choices, custom-route labels, saved-route collection navigation, and Save confirmation.
- [ ] Move route-entry choices before the sample card; keep advanced tools progressive and keep the sample clearly optional.
- [ ] Use one status vocabulary across Home, Plan, Review, and Ride; propagate unavailable state rather than leaving “road check pending” on a failed route.
- [ ] Remove NBH-specific labels from custom-route Ride actions, preserve sample provenance, and make View all open a real saved-route collection.
- [ ] Add a clear save confirmation/name path and confirm discard for non-empty sketches.
- [ ] Run focused tests, typecheck, and viewport checks in English and Arabic.

### Task 4: Live Ride correctness and recovery

**Files:**
- Modify: `mobile/src/useLiveRideSession.ts`
- Modify: `mobile/src/screens/LiveRideScreen.tsx`
- Modify: `mobile/src/routeMatcher.ts`
- Modify: `mobile/src/routeProgress.ts` only if required by the matcher contract
- Modify: `mobile/src/rideRecording.ts`
- Test: `mobile/src/routeMatcher.test.ts`
- Test: `mobile/src/routeProgress.test.ts`
- Test: `mobile/src/rideRecording.test.ts`

**Interfaces:** Preserve watcher/session callbacks and canonical activity draft persistence. Do not request real permission in browser verification.

- [ ] Add failing tests for previous-progress loop finish, first-fix waiting, ETA duration, recording-only telemetry/labels, reachable recovery controls, zero-fix warning, and save/export busy/error states.
- [ ] Fix matcher progress propagation and ensure shared loop finish resolves using previous progress.
- [ ] Add explicit away/near/waiting/uncertain/stale states, a scrollable phone sheet with a safe-area action bar, and recording-only distance/time/fix telemetry.
- [ ] Complete Arabic Live recovery strings, propagate browser export state through persistence, and checkpoint active drafts where the existing storage boundary permits.
- [ ] Run focused and full tests, typecheck, and browser checks at 390x844/Arabic RTL without granting location.

### Task 5: Accessibility, settings, onboarding, and Arabic parity

**Files:**
- Modify: `mobile/src/UiPatterns.tsx`
- Modify: `mobile/src/SettingsScreen.tsx`
- Modify: `mobile/src/Onboarding.tsx`
- Modify: `mobile/src/i18n.ts`
- Modify: `mobile/src/screenStyles.ts` only for shared logical/target styles
- Test: `mobile/src/UiPatterns.test.ts`
- Test: `mobile/src/i18n.test.ts`
- Test: `mobile/src/Onboarding.test.ts`

**Interfaces:** Preserve exported primitive props and existing callbacks. Keep privacy/data wording local and honest.

- [ ] Add failing AX/copy tests for focus-trapped alerts/delete/privacy dialogs, headings, selected navigation, reduced motion, onboarding field errors, contrast/44px controls, and dynamic Arabic Live recovery keys.
- [ ] Route alerts and destructive confirmation through reusable accessible dialog behavior with initial focus, Tab containment, Escape, background isolation, and focus restoration.
- [ ] Make navigation semantic, screen titles headings, and read-only map markers non-focusable while keeping editing controls reachable.
- [ ] Make Settings profile edit/deletion feedback reachable and remove duplicated/generic first-use hierarchy.
- [ ] Complete English/Arabic customer copy and document `lang`/`dir`, logical RTL layout, and no internal/pilot/debug vocabulary.
- [ ] Run focused and full tests, typecheck, and representative English/Arabic browser checks.

### Task 6: Adversarial persona study and final release gate

**Files:**
- Create/update: `docs/superpowers/checkpoints/personas/*.md`
- Update: `mobile/PHONE_TESTING.md` only for verified remaining native checks

**Interfaces:** Consume the integrated build and all checkpoint reports. This task is read-only against product code.

- [ ] Spawn five independent Luna Max personas only after Tasks 1–5 are integrated: impatient first-time rider, Arabic RTL rider, no-location rider, rider starting away from route entry, and rider recovering from save failure.
- [ ] Have each persona use the app extensively, then send a follow-up asking for exact screen/steps, expected-vs-actual, severity, dislike, and feature requests; wait for the second terminal response before closing.
- [ ] Save every persona response to its own durable report; failed/limited agents are recorded as blocked, never treated as passing.
- [ ] Run fresh full tests, typecheck, Expo Doctor, diff checks, and CUA at 390x844/320x568/1280x720/1536x864 in English and Arabic.
- [ ] Verify no solid line appears for unavailable/unmatched geometry and no customer surface exposes raw internal/pilot/policy vocabulary.
- [ ] Record native iOS/Android GPS/permission/map-provider gaps explicitly; do not claim them tested without a device.
