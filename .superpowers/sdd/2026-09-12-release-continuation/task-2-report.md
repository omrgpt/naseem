# Task 2 report — endpoint picker and manual sketch road-check state

Status: `COMPLETE`

## Execution

- Worktree: `C:\\Users\\PC\\Documents\\ChatGPT\\Bike\\.worktrees\\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Pre-implementation HEAD: `f9f87fd`
- Implementation commit: `77cad24 feat(naseem): add real endpoint and sketch road checks`
- Documentation commits: `f731485` (checkpoint) and `13c9fbd` (report)

The implementation stayed within Task 2 scope. `mobile/src/routeLifecycle.ts`
was not modified because its existing canonical matching transition seam already
provided the required success/failure authority boundary. Task 1 map sizing
files and unrelated dirty/untracked files were left untouched.

## Changes

`mobile/App.tsx` now tracks planner intermediate points, Add stop/Edit state,
and an explicit manual sketch/matching state. Manual road checking builds a
draft record, calls `beginRouteMatching`, resolves the simplified routing
payload, and only promotes a successful response through
`routeMatchingSucceeded`. Failure uses `routeMatchingFailed`, retains the raw
sketch, and never promotes preview, sketch, GPX, or unavailable geometry to
authoritative `road_matched/ready`.

`mobile/src/screens/RoutesScreen.tsx` uses the existing real `MapPreview` in
editor mode, including active endpoint/crosshair, selected-point summary, and
explicit confirmation. Manual and planner editor states render draft/preview
geometry without location access. The manual panel keeps Check against mapped
roads, Use as a non-navigation plan, Save locally, Edit, and Discard separate,
with Arabic/RTL copy for the road-check action.

`mobile/src/routeBuilder.ts` adds explicit manual stroke state and complete
stroke undo/redo, plus routing-payload simplification that preserves endpoints
and leaves the raw coordinate list unchanged. Manual plans are explicitly
`waypoint_trace/draft` with provisional distance metadata.

## Tests and checks

1. RED first: `npx.cmd tsx --test src/routeBuilder.test.ts src/appIntegration.test.ts`
   — 28 total, 21 passed, 7 failed as expected for the missing seams.
2. Focused GREEN: same command — 28 passed, 0 failed.
3. Full mobile suite: `npm.cmd test` — 248 passed, 0 failed.
4. Typecheck: `npm.cmd run typecheck` — passed with exit code 0.
5. `git diff --check` — passed with exit code 0; Git reported only line-ending
   normalization warnings.
6. Browser/CUA check: Expo web at `http://localhost:8083/`, viewport 390×844.
   English and Arabic/RTL endpoint-editor flows showed the real map,
   crosshair, selected-point confirmation, and Arabic manual road-check UI.
   The manual check became enabled after two points. No location permission or
   native-runtime claim was used.

## Concerns / resume

The browser check did not claim a provider-backed mapped-road success; the
network failure/unavailable path was verified in code and retains the sketch.
Native phone testing of successful and failed matching remains the resume step.
The current UI records individual map placements as explicit one-point strokes;
whole-stroke undo/redo behavior is covered without claiming native drag input.

## Files and commits

Changed for Task 2:

- `mobile/App.tsx`
- `mobile/src/screens/RoutesScreen.tsx`
- `mobile/src/routeBuilder.ts`
- `mobile/src/routeBuilder.test.ts`
- `mobile/src/appIntegration.test.ts`
- `docs/superpowers/checkpoints/task-2-endpoint-picker.md`
- `.superpowers/sdd/2026-09-12-release-continuation/task-2-report.md`

`mobile/src/routeLifecycle.ts` was inspected but unchanged. Implementation is
in `77cad24`; the checkpoint and report are committed in `f731485` and
`13c9fbd` respectively.
