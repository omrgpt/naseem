# Map visual and responsive checkpoint

Status: COMPLETE (read-only audit)

Agent: `01a092e9-bd05-76b2-90f0-1eb23383211f`

Verified release source/runtime:

- Worktree: `C:\Users\PC\Documents\ChatGPT\Bike\.worktrees\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Runtime: `http://localhost:8092`
- Final audit HEAD: `9b5c999`
- No product files were edited or committed.

## P1 findings

- Web/native map sizing is fixed at roughly 448px and is not constrained by
  the actual unobscured desktop surface. Route detail has no map knowledge of
  sheet/nav occlusion, so Fit can place lower markers and controls beneath the
  sheet or fixed bottom navigation.
- The builder’s `Choose on map` surface is still `EmptyBuilderMap`: a blank
  press panel with no OSM roads, place names, scale, or geographic context.
- At 320x568 the route title and long status badge share a non-wrapping row;
  `NBH Loop` collapses to one character per line.

## P2 findings

- Desktop map width is capped near 728px inside a wider card, leaving an
  unintended right gutter; the layout needs an intentional map/decision-panel
  composition or parent-driven 100% sizing.
- After matching failure, the route card still says `road check not complete`
  while the map says `Route unavailable` and removes the line. Propagate one
  status to card, map, accessible text, and review.
- Provider failure categories are typed but collapsed into one generic UI
  state; preserve a safe rider message while retaining retry diagnostics.
- Live Ride has selected-segment support in the map model but does not pass the
  active segment for visual focus/following.
- Web drag/touch ownership (`touchAction: none`) can prevent surrounding page
  scrolling; pointer-centered zoom and a clear gesture alternative are needed.
- Tile loading has no stable loading/last-good/retry state.

## Measured runtime evidence

- 390x844 Plan: OSM loaded; map about 358x446 inside the card; controls worked,
  but attribution entered the bottom-nav overlap region.
- 320x568 Plan: bottom nav began around y=468 while the 448px map extended
  beyond the content viewport; title wrapping was visibly broken.
- 1280x720 Plan: map extended to about y=699 while bottom navigation covered
  the lower region; waypoints/attribution were obscured.
- 1536x864 Plan: shell about 820px, card about 788px, map about 726px.
- 390x844 route detail: controls remained reachable and the sheet scrolled.
- 1280x720 route detail: sheet covered zoom-out/zoom-in and lower waypoints;
  Fit did not resolve the occlusion.

## Preserve

Dense road geometry is preferred, preview lines are visually distinct,
waypoints are capped, loop endpoints are deduplicated, and metadata survives
persistence. Native conclusions remain source-based because no device or
emulator was available.

## Verification

- Mobile tests: 238/238 passed.
- Mobile typecheck: passed.
- Browser checks were run at 390x844, 320x568, 1280x720, and 1536x864.
- Native device/emulator, provider SLA/licensing, tile failure, and native map
  runtime remain unverified.

## Resume point

Implement a measured available-map-rect/inset contract and an intentional
desktop map-plus-sheet layout. Then replace the blank picker with the real map
renderer, fix narrow route-header wrapping, propagate unavailable status, and
rerun the four viewport checks.
