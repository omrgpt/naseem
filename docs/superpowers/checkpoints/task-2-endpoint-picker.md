# Task 2 — Real endpoint picker and manual sketch road-check state

Status: `COMPLETE`

## Final fix-round scope

- Exact worktree: `C:\\Users\\PC\\Documents\\ChatGPT\\Bike\\.worktrees\\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Task 2 implementation context: `77cad24 feat(naseem): add real endpoint and sketch road checks`.
- Fix-round commits: `23fea4a`, `956a4d8`, and `1fa8cbc`.
- Owned product files: `mobile/App.tsx`,
  `mobile/src/screens/RoutesScreen.tsx`, `mobile/src/routeBuilder.ts`, and
  `mobile/src/routeLifecycle.ts` only if the existing transition seam required
  a change.
- Owned test files: `mobile/src/routeBuilder.test.ts` and
  `mobile/src/appIntegration.test.ts`.
- Owned evidence files: this checkpoint and
  `.superpowers/sdd/2026-09-12-release-continuation/task-2-report.md`.
- `mobile/src/routeLifecycle.ts` was inspected and left unchanged because its
  existing canonical matching seam was sufficient. Task 1 map-sizing files,
  unrelated dirty files, and unrelated untracked files were not staged or
  changed.
- Intended verification: focused route-builder/runtime transitions, full
  mobile suite, typecheck, diff check, English and Arabic browser checks, and
  explicit shutdown of the task-owned Expo server. No native-runtime claim.
- Resume step: if further evidence is required, use an actual phone/emulator
  with a deterministic mapped-road success fixture to verify native drag and
  provider-backed `road_matched` success. This is follow-up validation, not an
  unresolved Task 2 blocker.

## Fix-round RED evidence

- Initial focused RED command:
  `npx.cmd tsx --test src/routeBuilder.test.ts src/appIntegration.test.ts`
- Result: **RED** — 34 tests executed, 27 passed, 7 failed. The failures
  covered stale typed endpoints, missing planner preparation, pointer/touch
  stroke capture, raw-versus-routing artifact retention, stroke-preserving
  move/remove, and manual match-session invalidation. The runtime integration
  test initially failed because `preparePlannerMatch` was not exported.
- Localization RED command:
  `npx.cmd tsx --test src/appIntegration.test.ts`
- Result: **RED** — 18 tests executed, 17 passed, 1 failed because manual
  match failure still used English fallback copy instead of
  `t.routeMatchFailure`.
- Scope-copy RED command:
  `npx.cmd tsx --test src/appIntegration.test.ts`
- Result: **RED** — 18 tests executed, 17 passed, 1 failed because the ready
  action label had drifted to `Use as a reviewed plan` instead of the required
  explicit `Use as a non-navigation plan` boundary.

## Fix-round GREEN and delivered behavior

- Typed endpoint text now clears the committed endpoint unless it exactly
  matches the committed point label; matching preparation rejects stale or
  incomplete planner input until an explicit map pick and confirmation.
- The existing real map renderer remains in editor mode with an active
  endpoint crosshair, selected-point summary, and explicit confirmation. It
  does not request location.
- Manual mode captures ordered pointer/touch movement on the existing map
  surface and ends a stroke on lift/cancel. Draft/preview geometry is explicit;
  whole-stroke undo/redo, move, and remove preserve stroke history.
- Manual edits invalidate in-flight matching sessions. Late results cannot
  overwrite the edited sketch.
- Raw manual points and the simplified routing payload are separate artifacts;
  simplification is routing-only and does not replace the retained raw sketch
  or successful matching artifact.
- “Check against mapped roads” goes through canonical `beginRouteMatching`.
  Only a validated successful response can pass through
  `routeMatchingSucceeded` to authoritative `road_matched/ready` state.
  Failure passes through `routeMatchingFailed`, retains the sketch, and keeps
  recovery state as `waypoint_trace/unavailable`.
- “Use as a non-navigation plan”, “Edit”, “Save locally”, and “Discard” stay
  separate. Use is a non-navigation plan decision; Save locally deliberately
  stores the draft/raw artifact; no preview, sketch, GPX, or unavailable
  geometry becomes authoritative ready road geometry.
- Add stop/Edit retain intermediate planner points, while only the routing
  payload is simplified.
- Endpoint labels, manual road-check copy, and failure copy are localized for
  Arabic/RTL.

## Final verification

- Focused GREEN command:
  `npx.cmd tsx --test src/routeBuilder.test.ts src/appIntegration.test.ts`
  — **35 tests, 35 passed, 0 failed**.
- Full mobile suite: `npm.cmd test` — **264 tests, 264 passed, 0 failed**.
- Typecheck: `npm.cmd run typecheck` — **exit 0**, `tsc --noEmit`.
- Diff check: `git diff --check` — **exit 0**. Git emitted only the existing
  LF-to-CRLF working-copy warnings for unrelated files.
- English browser check: task-owned Expo web surface at
  `http://localhost:8083/`; typed endpoint showed an uncommitted helper,
  map selection showed the selected coordinate and confirmation controls,
  and explicit confirmation committed the endpoint. Manual drag captured 9
  ordered points and ended on lift; undo removed the complete stroke and redo
  restored it. Road checking displayed the mapped-road failure while retaining
  the sketch.
- Arabic browser check: Arabic endpoint labels `البداية` and `الوجهة`, RTL
  map-picker copy, Arabic manual stroke instructions, Arabic mapped-road action,
  and localized failure copy were observed. The retained points remained after
  failure.
- Browser evidence was observed on the Chrome web surface at 1536×639; a
  temporary IAB/SSR check reported 1280×720. No native phone/emulator or
  390×844 result is claimed, and no location permission/request was used.
- Task-owned Expo server session `77230` was stopped with Ctrl+C after the
  browser checks; the process exited 0 and a subsequent listener check returned
  `PORT_8083_FREE`.

## Exact scoped files

- `mobile/App.tsx`
- `mobile/src/screens/RoutesScreen.tsx`
- `mobile/src/routeBuilder.ts`
- `mobile/src/routeBuilder.test.ts`
- `mobile/src/appIntegration.test.ts`
- `docs/superpowers/checkpoints/task-2-endpoint-picker.md`
- `.superpowers/sdd/2026-09-12-release-continuation/task-2-report.md`

`mobile/src/routeLifecycle.ts` was inspected but unchanged.

## Remaining concerns

- The browser path exercised the provider/network failure branch; a
  provider-backed mapped-road success was verified by runtime/unit transition
  tests, not claimed as a live browser result.
- Native phone/emulator drag, exact phone viewport behavior, and native map
  provider rendering remain the resume step above.
- Non-blocking console noise was observed during the web smoke check: existing
  React Native Web `shadow*` and `pointerEvents` deprecation warnings, a
  repeated unexpected text-node warning around `RoutesScreen.tsx`, and
  unrelated Chrome extension errors. No UI transition failure was attributed
  to that console noise.
