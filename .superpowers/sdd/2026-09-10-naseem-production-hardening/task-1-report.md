# Task 1 implementation report

## Scope

Implemented the map surface, geometry rendering, and provider fallback hardening in the files allowed by Task 1. The worktree contained unrelated pre-existing changes; only the scoped map files and this report are staged for the Task 1 commit.

## TDD evidence

- Added scoped regression coverage for unavailable geometry, dashed non-road geometry, finite coordinate validation, safe control placement, and provider fallback without a key.
- The first focused run was intentionally RED: 107 tests ran with 101 passing and 6 failing on the new behavior.
- The additional point-only drawn-preview assertion was also run before its implementation and failed as expected.
- After the smallest production changes, the focused command is GREEN with 108/108 tests passing.

## Implementation

- Road styling is strict: only finite, in-range geometry explicitly marked `geometryKind: "road_matched"` and `geometryStatus: "ready"` can be a solid line.
- Recorded, waypoint, GPX, and drawn/manual previews are dashed; unavailable, explicitly absent, malformed, or non-renderable geometry cannot create a straight authoritative route line.
- Named route markers remain available when no line can be rendered, with rider-facing labels derived from point names rather than URLs, source IDs, or internal geometry terms.
- Web map placement, drag/pan, wheel/double-click zoom, Fit route, and marker hit targets remain wired through the supplied callbacks. An optional active endpoint now has a visible and accessible crosshair state; the renderer does not mutate route state or start matching.
- Web controls use a shared bottom safe-zone calculation for phone and desktop surfaces. Native controls remain above the same navigation/sheet clearance while native pan, pinch, zoom, marker targets, and provider attribution behavior remain intact.
- Web keeps the visible OpenStreetMap tile attribution and native keeps the existing `react-native-maps` default. No Google Maps provider, dependency, key, or configuration path was added.

## Verification

- `npm.cmd test -- src/mapModel.test.ts src/mapPreviewContract.test.ts` — PASS (108/108).
- `npm.cmd run typecheck` — PASS.
- `git diff --check` — PASS.

## Concerns

- Native iOS/Android runtime behavior, OS permission prompts, and device-specific map attribution were not exercised on a physical device in this worktree.
- `mapGeometryStatus` retains a compatibility result for legacy metadata-less direct callers, while the actual map line model uses the strict renderer status so those coordinates cannot appear as a solid road route.
