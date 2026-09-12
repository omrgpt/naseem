# Task 4 — Live Ride correctness and recovery

Status: IN PROGRESS

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
