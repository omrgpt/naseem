# Route-builder and geometry checkpoint

Status: COMPLETE (read-only audit)

Agent: `01a092e9-bdf7-7e53-9cc7-ac09b78cff32` (Curie)

Verified checkout at audit time:

- Worktree: `C:\Users\PC\Documents\ChatGPT\Bike\.worktrees\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- HEAD: `779093e`

## Evidence

- Mobile tests: 238/238 passed.
- Mobile typecheck: passed.
- API tests: 17/17 passed through the mobile `tsx` runtime because API-local
  dependencies were not installed; do not represent this as a local API
  install/typecheck pass.
- `http://localhost:8092`: HTTP 200.
- The routing provider returned a 1,054-point LineString for a 50,301.4 m
  route with five waypoints, confirming that dense road geometry is available
  when the routing lifecycle is actually invoked.

## Findings

- Draw/Done never calls `beginRouteMatching`,
  `resolveRoadGeometryDetailed`, or `routeMatchingSucceeded`.
- Manual paths are stored as `recorded_trace/ready` with unknown road evidence,
  so they cannot become authoritative navigation routes.
- Catalog fixtures still contain sparse five-point chords; they must remain
  previews, not navigation truth.
- GPX imports intentionally remain un-routed, but current copy promises a road
  check that the rider cannot initiate.
- Add-stop/edit paths can keep only the first and last points and discard
  intermediate geometry.
- The direct matcher does not retain previous progress, making retry/recovery
  less resilient.

## Safe implementation seam

Keep an explicit draft/sketch state. Add an explicit rider action such as
`Check against mapped roads`, then send the simplified draft through the
existing routing lifecycle. On failure, retain the sketch and offer retry/edit;
never replace it with a fake road line or enable navigation from unknown
geometry. Freehand input must be simplified before routing and must preserve
ordered endpoints/intermediate points.

## Resume point

Implement the map stroke contract and manual-route state transition first,
then add tests proving: draw remains a draft, road-check success requires
authoritative geometry/evidence, failed checks retain the draft, and undo/redo
operates on whole strokes.
