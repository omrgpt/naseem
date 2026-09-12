# Task 2 — Real endpoint picker and manual sketch road-check state

Status: `IN PROGRESS`

## Review follow-up fix round

- Exact worktree: `C:\\Users\\PC\\Documents\\ChatGPT\\Bike\\.worktrees\\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Owned product/test files: `mobile/App.tsx`,
  `mobile/src/screens/RoutesScreen.tsx`, `mobile/src/routeBuilder.ts`,
  `mobile/src/routeLifecycle.ts` only if the existing transition seam requires
  it, `mobile/src/routeBuilder.test.ts`, and
  `mobile/src/appIntegration.test.ts`.
- Owned evidence files: this checkpoint and
  `.superpowers/sdd/2026-09-12-release-continuation/task-2-report.md`.
- Intended tests: focused route-builder/App runtime transitions, full mobile
  suite, typecheck, committed and working-tree `git diff --check`, and English
  plus Arabic browser checks. No native-runtime claim.
- Resume step: add the failing endpoint, stroke-capture, invalidation,
  artifact-retention, stroke-history, runtime-transition, Arabic, and copy
  tests; run focused RED; then implement the smallest green changes.

## Fix round RED evidence

- Focused command: `npx.cmd tsx --test src/routeBuilder.test.ts src/appIntegration.test.ts`
- Result: **RED** — 34 tests executed, 27 passed, 7 failed.
- Expected failures: stale typed endpoint still retained its coordinate;
  `preparePlannerMatch`, pointer/touch stroke capture, raw-vs-routing artifact,
  stroke-preserving move/remove, and manual match-session invalidation seams
  were not yet implemented. The runtime integration test failed first because
  `preparePlannerMatch` was not exported.

## Verification follow-up RED evidence

- Browser smoke exposed an Arabic road-check failure message rendered in
  English. Focused assertion command:
  `npx.cmd tsx --test src/appIntegration.test.ts`
- Result: **RED** — 18 tests executed, 17 passed, 1 failed because the manual
  failure branch still used the English `manualRoadCheckFailed` fallback
  instead of the localized `t.routeMatchFailure` copy.

## Scope-copy RED evidence

- Focused command: `npx.cmd tsx --test src/appIntegration.test.ts`
- Result: **RED** — 18 tests executed, 17 passed, 1 failed because the ready
  action label had drifted to `Use as a reviewed plan` instead of preserving
  the required explicit `Use as a non-navigation plan` action boundary.

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

## Independent review gate

- Review status: **BLOCKED — NOT APPROVED**.
- Review report: `.superpowers/sdd/2026-09-12-release-continuation/task-2-review-report.md`.
- Review checkpoint: `docs/superpowers/checkpoints/task-2-endpoint-picker-review.md`.
- Verified blockers: stale typed endpoints can still be matched; the current
  map path creates one-point strokes rather than capturing freehand movement;
  manual edits do not cancel in-flight matching; simplified routing points can
  replace the retained artifact; move/remove flatten stroke history; and the
  critical integration tests are source-regex checks.
- Minor follow-ups: Arabic endpoint labels and non-navigation copy clarity.
- Resume by using the original Task 2 agent’s saved context and the durable
  follow-up brief at
  `.superpowers/sdd/2026-09-12-release-continuation/task-2-fix-brief.md`.
