# Task 1 handoff report

Status: `DONE_WITH_CONCERNS`

Base commit: `e61a4747de3023c42d736a7c588045ab5a5c75e5`

## Exact implementation files changed

- `mobile/src/MapPreview.tsx`
- `mobile/src/MapPreview.web.tsx`
- `mobile/src/MapPreview.native.tsx`
- `mobile/src/mapModel.ts`
- `mobile/src/mapModel.test.ts`

The requested report artifact is this file. No screens, `App.tsx`, i18n, route truth, or unrelated project files were changed.

## Verification

Run from `mobile`:

```powershell
npm.cmd test -- --test-name-pattern=mapModel
```

Observed output: exit code `0`; `tests 53`, `pass 53`, `fail 0`, `cancelled 0`.

```powershell
npm.cmd run typecheck
```

Observed output: exit code `0`; `tsc --noEmit` produced no diagnostics.

Additional checks:

- `git diff --cached --check` passed for the scoped staged files.
- The running Expo web preview rendered the compact map with its route, loop `S/E` marker, representative markers, and OpenStreetMap attribution.
- The full-screen route map accessibility tree exposed the route status, all preserved marker descriptions, attribution, and visible `Fit route`, `Zoom in`, and `Zoom out` controls.

## Design decisions

- `mapLinePoints` and `mapLineModel` make `route.geometry` the sole road-following line source. Missing geometry remains a waypoint preview, with a dashed line and preview status even when a stale request says `matched`.
- `mapSegmentIndexForLine` uses cumulative geometry distances when available and only falls back to an index ratio. Selection is limited to visual emphasis; route/access suitability data is never rewritten.
- `mapMarkerPoints` samples dense routes to a requested maximum, keeps representative endpoints, and removes a loop's duplicate finish candidate so the shared start/finish is one `S/E` marker.
- `MapPreview.tsx` now owns the shared `MapText`/`MapPreviewProps` contract and delegates to the platform renderers. Existing callers keep the same props.
- The web renderer uses the selected line geometry, OSM tiles with visible attribution, dashed preview geometry, drag/pan, wheel and double-tap zoom, keyboard controls, Fit route, center tap-to-add, tile failure copy, live position rendering, and accessible route/marker summaries. Vertical drags claim the map gesture and `touchAction: none` prevents surrounding page scrolling.
- The native renderer uses `react-native-maps` with scroll/zoom enabled, actual line geometry bounds in `fitToCoordinates` after map readiness and route-geometry changes, native provider configuration copy, accessible markers, user position, and Fit/Zoom controls in both full and minimal map modes.
- Overlay controls reserve logical inline safe zones and use minimum 44 px targets; RTL layout is applied at the web map boundary and with logical positioning.

## Concerns / remaining limitation

- A native iOS/Android device or emulator was not available in this environment, so native behavior was verified by TypeScript plus code-path review rather than an on-device interaction run.
- The CUA full-screen screenshot capture timed out at the tool boundary, but its accessibility tree completed and the compact rendered screenshot was captured successfully. This is a verification-tool limitation, not an application error.
