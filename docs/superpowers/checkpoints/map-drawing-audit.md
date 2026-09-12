# Map drawing audit — Descartes

Status: `COMPLETE`  
Agent: `01a092e9-bc42-7ee1-8ccd-e0b601535d68`  
Model: `gpt-5.6-luna` / max reasoning  
Runtime: not available (`http://localhost:8092` refused; no browser surface)

## Evidence

- `npm.cmd test`: 238 passed.
- `npm.cmd run typecheck`: passed.
- No files were changed by the agent.

## Key findings

1. `MapPreview` exposes only `onMapPress`; there is no stroke lifecycle or
   pencil mode. Web movement is always map panning, while taps add isolated
   points.
2. `routeBuilder.ts` and the manual App path connect raw points with
   geodesic straight chords. There is no road/trail snapping or dense geometry
   for freehand input.
3. `RoutesScreen.tsx` uses `EmptyBuilderMap` before a route exists, so endpoint
   selection starts on a simulated surface without roads, pan, or zoom.
4. “Full-screen” maps are fixed at roughly 448px, leaving limited phone space
   for precise drawing.
5. Draft identity/geometry changes can reset the map camera during editing.
6. Undo/redo operates point-by-point rather than on complete strokes; there is
   no lift-to-end and tap-pencil-to-continue behavior.
7. Pending endpoint selection is confirmed outside the map and does not pass
   the active endpoint hint into the map renderer.
8. Manual output is stored as `recorded_trace`, which can leak recorded-track
   semantics even though it is an unsnapped user sketch.
9. Raw freehand samples need simplification and a bounded router request before
   they can be rendered or matched without performance problems.

## Required acceptance behavior

- Tap mode adds one waypoint; drag pans without adding one.
- Pencil mode captures a curved stroke without panning; lift ends it and a
  later pencil gesture continues with a new stroke.
- Undo removes/restores one whole stroke.
- Road matching returns dense curved geometry when available; failure stays an
  explicitly labelled unsnapped sketch.
- Camera stays put while drawing; Fit is explicit.
- Start/destination placement is visible on the actual map.
- Web/native interaction semantics remain aligned and large input remains
  responsive.

Reference: [Strava Creating Routes on Mobile](https://support.strava.com/en-us/articles/15401660-creating-routes-on-mobile).
