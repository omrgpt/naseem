# Task 4 — Live Ride correctness and recovery

Status: BLOCKED

## Worktree and branch

- Worktree: `C:\Users\PC\Documents\ChatGPT\Bike\.worktrees\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Pre-edit HEAD: `6c9d0ce` (`docs: checkpoint endpoint and live ride handoffs`)
- Existing unrelated dirty/untracked files are preserved and will not be staged.

## Owned files

- `mobile/src/useLiveRideSession.ts`
- `mobile/src/screens/LiveRideScreen.tsx`
- `mobile/src/routeMatcher.ts`
- `mobile/src/routeProgress.ts` only if the matcher contract requires it
- `mobile/src/rideRecording.ts`
- `mobile/src/routeMatcher.test.ts`
- `mobile/src/routeProgress.test.ts`
- `mobile/src/rideRecording.test.ts`
- This checkpoint and `.superpowers/sdd/2026-09-12-release-continuation/task-4-report.md`

## Intended verification

- RED then GREEN focused tests for shared-loop finish using previous progress,
  first-fix waiting, ETA duration, recording-only telemetry/labels, reachable
  recovery controls, zero-fix warning, and save/export busy/error states.
- `npm.cmd test -- src/routeMatcher.test.ts src/routeProgress.test.ts src/rideRecording.test.ts`
- `npm.cmd test`
- `npm.cmd run typecheck`
- `git diff --check`
- Browser/CUA check at `390x844` in Arabic RTL without granting or simulating
  location; inspect active recovery, recording-only, zero-fix, and completion
  save/export states where the browser flow permits.
- Native iOS/Android runtime is not in scope for this verification.

## Resume step

Add the first failing matcher regression test, run the focused RED command, then
make the smallest matcher change that propagates the prior progress. Continue
with the remaining live-session, recording, UI, and persistence tests in the
owned files, saving inspectable commits and updating this checkpoint at each
meaningful stopping point.

## RED evidence — matcher propagation

- Added `stateful matcher resolves a shared loop finish from the previous progress`
  to `mobile/src/routeMatcher.test.ts`.
- Command: `npx.cmd --no-install tsx --test src/routeMatcher.test.ts src/routeProgress.test.ts src/rideRecording.test.ts`
- Result: **RED** — 29 tests executed, 28 passed, 1 failed as expected.
- Failure: shared-loop finish returned `state: "uncertain"` instead of
  `state: "matched"`; the production matcher still discards the prior progress
  before calling `routeProgress`.

## GREEN evidence — matcher propagation

- `matchRoutePosition` now passes the previous progress to `routeProgress` and
  treats a late shared-loop entry as the finish; the projection helper leaves
  reverse hysteresis to the stateful matcher.
- Command: `npx.cmd --no-install tsx --test src/routeMatcher.test.ts src/routeProgress.test.ts src/rideRecording.test.ts`
- Result: **GREEN** — 29 tests executed, 29 passed, 0 failed.
- Existing reverse-movement, shared-entry ambiguity, and direct loop-projection
  tests remained green.

## RED evidence — live state, recording, recovery, and completion contracts

- Added failing pure tests in `mobile/src/rideRecording.test.ts` for explicit
  waiting/near/away/uncertain/stale states, recording-only telemetry and
  localized labels, recoverable active-draft checkpoints, zero-fix completion,
  reachable recovery actions, and save/export busy/error states.
- Command: `npx.cmd --no-install tsx --test src/routeMatcher.test.ts src/routeProgress.test.ts src/rideRecording.test.ts`
- Result: **RED** — 36 tests executed, 29 passed, 7 failed as expected because
  the new recording/recovery contracts are not implemented yet.

## GREEN evidence — live state, recording, recovery, and completion contracts

- Implemented the pure contracts in `mobile/src/rideRecording.ts`, including
  explicit location states, recovery actions and Arabic/English labels,
  recording-only telemetry, active-draft checkpoints, zero-fix completion,
  and save/export action-state mapping.
- Command: `npx.cmd --no-install tsx --test src/routeMatcher.test.ts src/routeProgress.test.ts src/rideRecording.test.ts`
- Result: **GREEN** — 36 tests executed, 36 passed, 0 failed.
- The Arabic first-fix copy was verified to contain the explicit `الموقع`
  wording required by the recovery contract.

## RED evidence — duration semantics

- Added a focused regression test proving that remaining ride time is a
  duration (`42 min` for 52 total minutes at 20% progress), not an arrival
  clock value.
- Command: `npx.cmd --no-install tsx --test src/routeMatcher.test.ts src/routeProgress.test.ts src/rideRecording.test.ts`
- Result: **RED** — 37 tests executed, 36 passed, 1 failed because the
  duration contract did not exist yet.

## GREEN evidence — duration semantics and session propagation

- Added `remainingRideDurationMinutes` and changed the session to format ETA
  as a remaining duration. The session now also propagates explicit location
  state, recording-only distance/time/fix telemetry, and active-draft
  checkpoints without changing the route-readiness gate or watcher boundary.
- Focused command: `npx.cmd --no-install tsx --test src/routeMatcher.test.ts src/routeProgress.test.ts src/rideRecording.test.ts`
- Result: **GREEN** — 37 tests executed, 37 passed, 0 failed.
- Typecheck command: `npm.cmd run typecheck`
- Result: **GREEN** — `tsc --noEmit` completed successfully.

## GREEN evidence — live session and phone ride sheet

- Wired the tested contracts into `mobile/src/useLiveRideSession.ts` and
  `mobile/src/screens/LiveRideScreen.tsx`: first-fix waiting, away/near/
  uncertain/stale recovery copy, duration ETA, recording-only telemetry,
  active-draft checkpoint propagation, zero-fix warning, and save/export
  busy/error presentation.
- Active route content is now scrollable inside a bounded phone sheet, with a
  persistent wrapped action bar that keeps retry, pause/resume, and end
  reachable. The recording-only branch retains the no-route-progress and
  foreground-only boundaries.
- Focused command: `npx.cmd --no-install tsx --test src/routeMatcher.test.ts src/routeProgress.test.ts src/rideRecording.test.ts`
- Result: **GREEN** — 37 tests executed, 37 passed, 0 failed.
- Typecheck command: `npm.cmd run typecheck`
- Result: **GREEN** — `tsc --noEmit` completed successfully.
- Diff check command: `git diff --check -- mobile/src/useLiveRideSession.ts mobile/src/screens/LiveRideScreen.tsx mobile/src/routeMatcher.ts mobile/src/routeProgress.ts mobile/src/rideRecording.ts mobile/src/routeMatcher.test.ts mobile/src/routeProgress.test.ts mobile/src/rideRecording.test.ts docs/superpowers/checkpoints/task-4-live-ride.md`
- Result: **GREEN** — no whitespace errors in the owned diff.

## Terminal verification

- Implementation HEAD before the final documentation commits: `0e82e2c`
  (`fix(ride): preserve live watcher callbacks`).
- Documentation commits: `00964ce` (terminal checkpoint update) and `6372630`
  (required Task 4 report).
- Task 4 implementation commits, in order:
  - `b75c5d5` — resolve shared-loop finish progress.
  - `da5a802` — checkpoint live telemetry and recovery contracts.
  - `49d0fe7` — make live recovery controls reachable.
  - `c09c18d` — keep Arabic recovery fallbacks local.
  - `94733d4` — clear recovery controls after ending.
  - `0e82e2c` — preserve live watcher callbacks.
- Owned-file status: clean; unrelated modified and untracked files remain
  untouched and unstaged.
- Focused command:
  `npx.cmd --no-install tsx --test src/routeMatcher.test.ts src/routeProgress.test.ts src/rideRecording.test.ts`
  — **GREEN**, 37 tests, 37 passed, 0 failed.
- Full mobile command: `npm.cmd test` — **BLOCKED**, 263 tests, 260 passed,
  3 failed. The failures are the existing `appIntegration.test.ts` source
  shape checks for planner text editing, manual-road simplification, and
  ordered planner points. They inspect the preserved dirty `mobile/App.tsx`
  changes; no Task 4 commit touches `mobile/App.tsx`.
- Typecheck command: `npm.cmd run typecheck` — **BLOCKED** by the existing
  working-copy error `mobile/App.tsx(1647,27): error TS2304: Cannot find name
  'simplifyCoordinatesForRouting'`. The dirty App file removed that import;
  the pre-edit committed version retains it. `mobile/App.tsx` is outside the
  Task 4 ownership boundary and was not changed.
- Diff checks: `git diff --check` and the owned-file `git diff --check` both
  exited 0. Git emitted only LF/CRLF normalization warnings; no whitespace
  errors were reported.
- Browser check: the task-owned Expo web server ran from this exact worktree
  on port 8092 (PID 9992 verified by command line), then was stopped and the
  port rechecked with no listener remaining. At an explicit `390x844` viewport,
  Arabic RTL settings, route chooser, recording-only setup, and the
  foreground-only permission explanation were visible. The recording-only
  screen stated that route progress is not shown; Start opened the explanation
  without a browser location request, and Cancel returned without granting
  access. The viewport was reset and the user browser tab was left in English
  with location still Not requested. No native-runtime claim was made.
- The browser emitted two existing React Native web warnings, both
  `Unexpected text node: . A text node cannot be a child of a <View>.`; their
  source was not attributable to the owned Task 4 files during this check and
  remains a follow-up concern.

## Terminal status and resume

Task 4 product work is complete within the stated ownership boundary, but the
release continuation is **BLOCKED** until the preserved dirty Task 2/App
integration changes are reconciled by their owner (or explicitly authorized
for this task). Do not edit or discard those files as part of this checkpoint.

Resume step: preserve the six implementation commits above, reconcile the
missing `simplifyCoordinatesForRouting` import and the three App integration
source-shape expectations outside this scope, rerun `npm.cmd test` and
`npm.cmd run typecheck`, then repeat the `390x844` Arabic RTL browser pass and
change this checkpoint to COMPLETE only if those checks are green. The final
report is `.superpowers/sdd/2026-09-12-release-continuation/task-4-report.md`.
