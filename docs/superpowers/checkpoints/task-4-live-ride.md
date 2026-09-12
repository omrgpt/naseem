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
