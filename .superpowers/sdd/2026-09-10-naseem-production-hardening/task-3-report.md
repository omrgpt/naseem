# Task 3 implementation report — route truth, matching, lifecycle, and readiness

## Scope

Implemented Task 3 in the allowed route/domain files and focused tests only:

- `mobile/src/routeRouter.ts`
- `mobile/src/routeMatcher.ts`
- `mobile/src/routeLifecycle.ts`
- `mobile/src/routeRepository.ts`
- `mobile/src/routeEngine.ts`
- `mobile/src/domain.ts`
- `mobile/src/routeRouter.test.ts`
- `mobile/src/routeMatcher.test.ts`
- `mobile/src/routeLifecycle.test.ts`
- `mobile/src/routeEngine.test.ts`

No screen, `App.tsx`, map, Settings, translation, or other worker-owned files were changed.

## Implemented behavior

- Provider responses now require exactly one successful route, complete positive leg distance/duration metadata, valid bounded geometry, complete snapped waypoint metadata, matching requested/snapped endpoints, ordered cumulative geometry distance, route-vs-geometry distance agreement, leg-vs-route distance agreement, and leg-vs-route duration agreement before returning explicit `road_matched`/`ready`/`authoritative` metadata.
- Router failures remain distinguishable through `resolveRoadGeometryDetailed`; lifecycle failures become one recoverable `waypoint_trace`/`unavailable` record with a separately stored provisional distance and cleared final analysis.
- Added canonical `RoutePlan` readiness/origin/ownership/provenance/distance fields and shared repository readiness gates. Matching, analysis, navigation, and position matching require explicit valid authoritative road geometry; recorded and waypoint previews retain only provisional/preview information without final ETA or wind split.
- Removed route identity inference for personal NBH-shaped routes, preserved catalog/personal linkage and route revision/provenance across adapters, rejected stale/foreign match results, and made cached geometry rebind to the requested route identity without mutable references.
- Active ride snapshots and repository reads are cloned/frozen so later route edits cannot retarget a started ride.
- Reverse now returns an explicit unavailable result for too-few/shared endpoints or a new waypoint draft with reversed cumulative distances, a new revision, and no duplicated endpoints.

## TDD evidence

- The initial focused RED run covered 32 tests: 21 passed and 11 failed on the new unavailable-metrics, readiness, validation, identity, snapshot, and reverse requirements.
- Additional targeted RED cycles caught duration metadata mismatch, route identity/revision staleness, invalid ready geometry, idempotent failure revision changes, stale analysis, and invalid waypoint cumulative indexes before their fixes.
- The final focused route suite is GREEN: 38/38 passing.

## Verification

- `npx.cmd tsx --test src/routeRouter.test.ts src/routeMatcher.test.ts src/routeLifecycle.test.ts src/routeEngine.test.ts` — PASS, 38/38.
- Regression slice `routeCatalog`, `routeAnalysis`, and lifecycle/activity coverage — route-focused assertions PASS; the final full run below also passed.
- `npx.cmd tsx --test src/*.test.ts` — PASS, 173/173.
- `npm.cmd run typecheck` — PASS.
- `git diff --check` — PASS for the full working tree and scoped route diff.
- Expo SDK 57 documentation was checked as required by `mobile/AGENTS.md`; no native GPS/permission run was performed.

## Concerns and follow-up

- Task 9 must replace the remaining readiness/origin inference in `mobile/src/screenTypes.ts` and `mobile/src/screens/screenTypes.ts`; those adapters can still infer status from legacy ID/source/geometry fields and may disagree with the canonical `RouteRecord`. They were intentionally not edited in Task 3.
- Native OS permission, GPS watcher, and native map behavior remain device checks for the release gate.

## Fix round — Mendel route-only review

This follow-up stayed within the Task 3 route/domain files and the four allowed
route test files.

### Review findings addressed

- Canonical readiness now recomputes the full geometry cumulative index and
  checks every stored index with a documented 150 m / 2% tolerance. It also
  reconciles point cumulative distances, provider leg distances, stored
  geometry distance, recomputed geometry distance, and the provider routed
  total before returning authoritative readiness. The raw geometry index is
  preserved; the routed total is carried separately.
- Provider validation now requires `geometry.type === "LineString"`, applies
  the configured 700-point cap, and checks every snapped waypoint against the
  returned polyline in route order and at its corresponding cumulative leg
  distance. Configured router hosts receive a derived/configurable source
  label, and the cache fingerprint uses the same six-decimal precision as the
  request.
- Removing final metrics from an invalid road-matched plan now explicitly
  downgrades it to `waypoint_trace` / `unavailable` and clears road geometry,
  corridor, leg, routed, and final metric evidence. Rematching clears stale
  road evidence and analysis; the record-to-plan adapter only exposes analysis
  for the current authoritative road revision (with the existing recorded
  preview scalar-distance compatibility preserved).
- Route identity linkage is checked for known family/variant/revision values.
  Personal copies do not inherit catalog identity, catalog and personal IDs or
  identity triples cannot collide in the repository, and catalog-to-personal
  saves/reversals receive a distinct personal namespace. Reverse drafts clear
  inherited corridors and routed evidence and retain only recomputed
  provisional waypoint distance.

### Fix-round TDD evidence

- The first fix-round focused RED run covered 40 tests: 30 passed and 10
  failed on the newly added review regressions.
- Additional targeted RED cycles caught reuse of the catalog ID for a personal
  copy, reuse of the exact catalog identity triple, and missing identity-link
  validation before their minimal fixes.
- The final focused route suite is GREEN: 47/47 passing.

### Fix-round verification

- `npx.cmd tsx --test src/routeRouter.test.ts src/routeMatcher.test.ts src/routeLifecycle.test.ts src/routeEngine.test.ts` — PASS, 47/47.
- Full mobile test set via `Get-ChildItem src -Filter '*.test.ts'` — PASS, 191/191.
- `npm.cmd run typecheck` — PASS.
- `git diff --check` — PASS.

### Remaining concerns

- Task 9 still owns the readiness inference in `mobile/src/screenTypes.ts`
  and `mobile/src/screens/screenTypes.ts`; those adapters were intentionally
  not edited and can still disagree with canonical route truth.
- Task 9 should also move App route selection off its current ID-keyed merge
  when integrating catalog and personal copies; the repository boundary now
  rejects those collisions, but `mobile/App.tsx` is out of scope here.
- Native OS permission, GPS watcher, and native map behavior remain device
  checks for the release gate.
