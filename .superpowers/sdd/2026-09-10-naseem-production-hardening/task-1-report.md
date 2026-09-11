# Task 1 implementation report

## Scope

Implemented the map surface, geometry rendering, and provider fallback hardening in the files allowed by Task 1. The worktree contained unrelated pre-existing changes; only the scoped map files and this report are staged for the Task 1 commit.

## TDD evidence

- Added scoped regression coverage for unavailable geometry, dashed non-road geometry, finite coordinate validation, safe control placement, and provider fallback without a key.
- The first focused run was intentionally RED: 107 tests ran with 101 passing and 6 failing on the new behavior.
- The additional point-only drawn-preview assertion was also run before its implementation and failed as expected.
- After the smallest production changes, the focused command is GREEN with 108/108 tests passing.

## Fix-round reviewer follow-up

- Added a second RED cycle for the reviewer findings: the focused command ran 114 tests, with 107 passing and 7 failing for the missing fallback, viewport helpers, strict coordinate guards, distinct geometry states, hit-size contract, and layer-boundary contract.
- The native renderer now calls the provider selector and renders a rider-facing named-point fallback instead of mounting `react-native-maps` on Android without the existing native key. Configured native builds retain the existing provider default; web remains OpenStreetMap.
- Marker-only previews now have validated display points, shared bounds/center data, and fit behavior on both web and native. These viewport coordinates are never passed to a line renderer.
- Coordinate validation is centralized, rejects null/non-numeric/out-of-range/pole coordinates, filters malformed route points, guards native map presses and user markers, and clamps Web Mercator input to a finite projection range.
- The map contract documents and tests that forecast data and durable selection state remain screen-owned. The renderer receives only route/access evidence, read-only focus/endpoint hints, callbacks, and supplied live-position coordinates.
- Added distinct rider-facing unavailable, draft, and no-geometry labels, plus 44px marker hit targets on web and native.

## Implementation

- Road styling is strict: only finite, in-range geometry explicitly marked `geometryKind: "road_matched"` and `geometryStatus: "ready"` can be a solid line.
- Recorded, waypoint, GPX, and drawn/manual previews are dashed; unavailable, explicitly absent, malformed, or non-renderable geometry cannot create a straight authoritative route line.
- Named route markers remain available when no line can be rendered, with rider-facing labels derived from point names rather than URLs, source IDs, or internal geometry terms.
- Web map placement, drag/pan, wheel/double-click zoom, Fit route, and marker hit targets remain wired through the supplied callbacks. An optional active endpoint now has a visible and accessible crosshair state; the renderer does not mutate route state or start matching.
- Web controls use a shared bottom safe-zone calculation for phone and desktop surfaces. Native controls remain above the same navigation/sheet clearance while native pan, pinch, zoom, marker targets, and provider attribution behavior remain intact.
- Web keeps the visible OpenStreetMap tile attribution and native keeps the existing `react-native-maps` default. No Google Maps provider, dependency, key, or configuration path was added.

## Verification

- `npm.cmd test -- src/mapModel.test.ts src/mapPreviewContract.test.ts` — PASS (114/114).
- `npm.cmd run typecheck` — PASS.
- `git diff --check` — PASS.

## Concerns

- Native iOS/Android runtime behavior, OS permission prompts, and device-specific map attribution were not exercised on a physical device in this worktree.
- `mapGeometryStatus` is retained only as a documented non-rendering compatibility adapter for legacy direct callers; the actual map line model uses strict explicit geometry metadata and never uses that adapter for line status or viewport fitting.
- No native physical device was available for this round, so Android/iOS provider runtime behavior, OS permissions, and native attribution still require device verification.
