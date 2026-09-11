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
