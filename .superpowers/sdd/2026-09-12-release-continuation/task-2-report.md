# Task 2 report — endpoint picker and manual sketch road-check state

Status: `COMPLETE`

## Outcome

Task 2’s review follow-up is implemented and verified in the requested
worktree. Planner endpoints cannot be matched from stale typed text; an
explicit map pick and confirmation is required. Manual input is a real draft
freehand stroke on the existing map surface, with lift-to-end capture and
whole-stroke editing. Road checking uses the canonical route lifecycle, while
raw sketch data, preview state, and authoritative `road_matched/ready` state
remain separate.

## Worktree and commits

- Worktree: `C:\\Users\\PC\\Documents\\ChatGPT\\Bike\\.worktrees\\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Task 2 implementation: `77cad24 feat(naseem): add real endpoint and sketch road checks`
- Review follow-up fixes:
  - `23fea4a fix(naseem): harden endpoint and sketch lifecycle`
  - `956a4d8 fix(naseem): localize manual match failure`
  - `1fa8cbc fix(naseem): keep manual plan action non-navigational`

The implementation stayed within the requested Task 2 product/test scope.
`mobile/src/routeLifecycle.ts` was inspected but not modified because the
existing `beginRouteMatching`, `routeMatchingSucceeded`, and
`routeMatchingFailed` seam already provided the needed authority boundary.
Task 1 map-sizing files and unrelated dirty/untracked files were preserved.

## Fix-round changes

`mobile/App.tsx` now invalidates stale planner and manual matching work on
text edits and manual edits, prepares planner input only when committed labels
and coordinates agree, and keeps raw manual artifacts separate from matched
records. Matching begins through `beginRouteMatching`; only a validated
successful response enters `routeMatchingSucceeded` and canonical ready
`road_matched` state. Failure retains the sketch through
`routeMatchingFailed`, including localized Arabic failure copy.

`mobile/src/screens/RoutesScreen.tsx` uses the real `MapPreview` in endpoint
editor mode and overlays a measured map-bound stroke surface for pointer/touch
capture. Lift ends a stroke. It shows selected-point summaries and explicit
confirmation, preserves separate Use/Edit/Save/Discard decisions, uses clear
non-navigation-plan copy, and localizes endpoint/manual-check labels in
Arabic/RTL.

`mobile/src/routeBuilder.ts` adds stale-input preparation, map-surface
coordinate conversion, explicit stroke capture/session invalidation helpers,
raw-versus-routing manual artifacts, and stroke-preserving move/remove
operations. Routing simplification never replaces retained sketch data.

The focused tests include runtime transition coverage for stale endpoint
rejection, canonical matching success/failure, late-result invalidation, and
the non-navigation gate, alongside stroke and artifact behavior tests.

## TDD evidence

The fix round began with failing tests:

1. `npx.cmd tsx --test src/routeBuilder.test.ts src/appIntegration.test.ts`
   — **34 total, 27 passed, 7 failed** for the new endpoint, stroke,
   artifact, history, and session seams.
2. `npx.cmd tsx --test src/appIntegration.test.ts` — **18 total, 17 passed,
   1 failed** for the Arabic failure-copy regression.
3. `npx.cmd tsx --test src/appIntegration.test.ts` — **18 total, 17 passed,
   1 failed** for the non-navigation action-label regression.

Each RED result was recorded in the checkpoint before its corresponding
production fix.

## Final verification evidence

- Focused GREEN:
  `npx.cmd tsx --test src/routeBuilder.test.ts src/appIntegration.test.ts`
  — **35 passed, 0 failed**.
- Full mobile suite: `npm.cmd test` — **264 passed, 0 failed**.
- Typecheck: `npm.cmd run typecheck` — **exit 0** (`tsc --noEmit`).
- Working-tree diff check: `git diff --check` — **exit 0**; only Git
  line-ending normalization warnings were emitted for pre-existing unrelated
  files.

## Browser verification

After starting the task-owned Expo web server on port 8083, the English flow
confirmed the following in the real map editor: typed endpoint text remained
uncommitted, a map pick exposed a selected coordinate and confirmation action,
and confirmation committed the endpoint. Manual drag across the map captured
9 ordered points; lift ended the stroke, undo removed the whole stroke, redo
restored it, and mapped-road checking failed without removing the sketch.

The Arabic/RTL flow displayed `البداية` and `الوجهة`, Arabic map-picker and
manual stroke instructions, Arabic mapped-road action text, and the localized
failure message while retaining the sketch. The Chrome web viewport reported
1536×639; a temporary IAB/SSR check reported 1280×720. No native phone,
emulator, or 390×844 result is claimed, and no location request or permission
was used.

The task-owned server session `77230` was stopped with Ctrl+C after browser
checks, exited 0, and a follow-up listener check returned `PORT_8083_FREE`.

## Remaining concerns and resume step

The live browser run reached the provider/network failure path, so a
provider-backed browser success response was not claimed. The canonical
successful `road_matched/ready` transition and navigation gate are covered by
the runtime integration tests. Native phone/emulator drag and a deterministic
provider-backed success smoke test are the next resume step if that environment
becomes available; they do not block this Task 2 closure.

The web console also showed non-blocking React Native Web deprecation/text-node
warnings and unrelated Chrome extension errors. No functional browser
transition failed, and these warnings were not part of the scoped Task 2 fix.

## Exact files

- `mobile/App.tsx`
- `mobile/src/screens/RoutesScreen.tsx`
- `mobile/src/routeBuilder.ts`
- `mobile/src/routeBuilder.test.ts`
- `mobile/src/appIntegration.test.ts`
- `docs/superpowers/checkpoints/task-2-endpoint-picker.md`
- `.superpowers/sdd/2026-09-12-release-continuation/task-2-report.md`

`mobile/src/routeLifecycle.ts` was inspected and left unchanged.
