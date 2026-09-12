# Task 2 — Real endpoint picker and manual sketch road-check state

Status: `COMPLETE`

## Worktree and branch

- Worktree: `C:\\Users\\PC\\Documents\\ChatGPT\\Bike\\.worktrees\\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Pre-implementation HEAD: `f9f87fd`
- Implementation commit: `77cad24 feat(naseem): add real endpoint and sketch road checks`
- Documentation commits: `f731485` (checkpoint) and `13c9fbd` (report)

## Owned files changed

- `mobile/App.tsx`
- `mobile/src/screens/RoutesScreen.tsx`
- `mobile/src/routeBuilder.ts`
- `mobile/src/routeBuilder.test.ts`
- `mobile/src/appIntegration.test.ts`
- This checkpoint

`mobile/src/routeLifecycle.ts` was inspected and not changed: the existing
`beginRouteMatching`, `routeMatchingSucceeded`, and `routeMatchingFailed` seam
was sufficient. Task 1 map-sizing files, unrelated dirty files, and unrelated
untracked files were not staged or changed.

## Delivered behavior

- Replaced the builder's `EmptyBuilderMap` with the existing real map renderer.
  Editor mode shows the active endpoint/crosshair, selected-point summary, and
  explicit confirmation; it never requests location.
- Kept manual/freehand input as an explicit draft/preview with whole-stroke
  undo/redo state and raw-sketch retention.
- Added “Check against mapped roads” through canonical
  `beginRouteMatching`, with authoritative `road_matched/ready` only after a
  successful routed response. Failure retains the sketch and records
  `waypoint_trace/unavailable` recovery state.
- Kept “Use as a non-navigation plan”, “Save locally”, “Edit”, and “Discard”
  as separate decisions. Use does not navigate; Save stores the current draft
  or matched record locally.
- Preserved intermediate planner points through Add stop/Edit and simplified
  only the routing payload, preserving raw manual points and endpoints.

## Verification evidence

- TDD RED: `npx.cmd tsx --test src/routeBuilder.test.ts src/appIntegration.test.ts`
  — 28 tests, 21 passed, 7 failed before implementation.
- Focused GREEN: same command — 28 tests, 28 passed, 0 failed.
- Full mobile suite: `npm.cmd test` — 248 tests, 248 passed, 0 failed.
- Typecheck: `npm.cmd run typecheck` — passed (`tsc --noEmit`, exit 0).
- Diff check: `git diff --check` — passed (exit 0; only normal LF/CRLF
  conversion warnings).
- Browser/CUA phone-sized check used the Expo web surface at
  `http://localhost:8083/` with a 390×844 viewport. English and Arabic/RTL
  endpoint editing showed the real map, active crosshair, selected coordinate,
  confirmation controls, and Arabic manual road-check copy. No location
  permission was granted and no native-runtime result is claimed.

## Concerns and resume step

- A real routed-road success was not claimed from the browser smoke check;
  provider/network failure remains a supported path and preserves the raw
  sketch. Native-device validation is still a future step.
- Manual map placements currently form one-point strokes; the stroke seam is
  explicit and undo removes a complete stroke. Native drag/stylus behavior was
  not claimed.
- Resume by running the Expo SDK 57 app on an actual phone, exercising both
  mapped-road success and failure retention, then continue with the next
  release-continuation task.
