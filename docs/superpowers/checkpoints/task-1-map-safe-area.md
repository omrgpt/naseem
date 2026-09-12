# Task 1 — Parent-driven map and decision-sheet safe areas

Status: COMPLETE

- Worktree: `C:\Users\PC\Documents\ChatGPT\Bike\.worktrees\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Current HEAD before Task 1 edits: `5f191a8704e478a1baa9efd89ec65e96e7722595`
- Existing unrelated dirty/untracked files are preserved and will not be staged.

## Owned files

- `mobile/src/MapPreview.web.tsx`
- `mobile/src/MapPreview.tsx`
- `mobile/src/mapPreviewContract.ts`
- `mobile/src/screens/RouteDetailScreen.tsx`
- `mobile/src/screenStyles.ts`
- `mobile/src/mapPreviewContract.test.ts`
- `mobile/src/mapModel.test.ts` (pure viewport helpers only)
- This checkpoint file

## Intended verification

- Add pure RED tests for available-map rectangles, bottom obstruction, control
  safe zones, and mobile/desktop layout calculations.
- `npm.cmd test -- src/mapPreviewContract.test.ts src/mapModel.test.ts` RED,
  then GREEN.
- `npm.cmd test`
- `npm.cmd run typecheck`
- `git diff --check`
- Inspect the four required viewports: `390x844`, `320x568`, `1280x720`, and
  `1536x864`.

## RED checkpoint

- Command: `npm.cmd test -- src/mapPreviewContract.test.ts src/mapModel.test.ts`
- Result: **RED** — 241 tests executed, 238 passed, 3 failed.
- Expected failures: the three new available-rectangle, obstruction-safe-zone,
  and phone/desktop layout tests reported the production helpers as undefined.

## Initial resume step (completed)

Implement the pure contract/layout helpers, then wire the measured web map and
Route Detail composition without touching route readiness or geometry logic.

## Viewport follow-up RED checkpoint

- Required viewport: `320x568`
- Reproduction: the Fit route control overlaps the Route Detail Change route
  action because the fixed baseline bottom safe zone leaves no room between the
  top action bar and the phone sheet.
- Added failing test: `route detail controls fit between a small phone top bar and sheet`
- Result: **RED** — 242 tests executed, 241 passed, 1 failed (`96 !== 36`)
- Next step: make explicit top and bottom obstruction insets usable by the
  pure control layout, pass the Route Detail top-bar inset, and rerun the
  required viewport checks.

## Viewport follow-up observation

- Stable checks now pass for map bounds, sheet obstruction, top-bar control
  clearance, attribution containment, and document overflow at all four
  required viewports.
- Additional renderer issue observed on `390x844` and `320x568`: the OSM
  attribution sits in the same bottom-right band as the zoom controls.
- Next step: place attribution on the inline-start edge, opposite the
  direction-aware controls, then repeat viewport and terminal verification.

## Completion record

- Implementation commit: `becaff3`
- Exact changed product/test files:
  - `mobile/src/MapPreview.web.tsx`
  - `mobile/src/MapPreview.tsx`
  - `mobile/src/mapPreviewContract.ts`
  - `mobile/src/screens/RouteDetailScreen.tsx`
  - `mobile/src/screenStyles.ts`
  - `mobile/src/mapPreviewContract.test.ts`
- Allowed file inspected but unchanged: `mobile/src/mapModel.test.ts`
- Required report: `.superpowers/sdd/2026-09-12-release-continuation/task-1-report.md`
- Checkpoint file: `docs/superpowers/checkpoints/task-1-map-safe-area.md`
- Focused GREEN: `npm.cmd test -- src/mapPreviewContract.test.ts src/mapModel.test.ts` — 242/242 passed.
- Full mobile suite: `npm.cmd test` — 242/242 passed.
- Typecheck: `npm.cmd run typecheck` — passed with no diagnostics.
- Diff check: `git diff --check` — passed; only existing LF/CRLF warnings.

### Required viewport checks

- `390x844`: PASS — map stayed in the viewport; 27.2px sheet overlap was
  bounded; controls cleared the top actions and sheet; attribution cleared
  controls; no document overflow.
- `320x568`: PASS — Fit/+/− occupied `y=134.2..280.2`, below the top actions
  and above the sheet at `y=289`; attribution cleared controls; no overflow.
- `1280x720`: PASS — desktop map and decision panel were horizontally split
  with a 16px gap; controls and attribution stayed within the map; no overflow.
- `1536x864`: PASS — desktop map and decision panel were horizontally split
  with a 16px gap; controls and attribution stayed within the map; no overflow.

## Concerns

- Native iOS/Android runtime behavior, device safe-area reporting, and native
  map interaction still require a physical device or emulator; no native
  runtime success is claimed.

## Next resume step

No further Task 1 implementation remains. If resumed, re-read this checkpoint
and proceed with the next continuation-plan task from its own brief; do not
reopen Task 1 unless new viewport evidence contradicts this record.
