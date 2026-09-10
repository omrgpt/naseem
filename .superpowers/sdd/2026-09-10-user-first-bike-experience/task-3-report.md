# Task 3 handoff report

Status: `DONE_WITH_CONCERNS`

## Files changed

- `mobile/src/screens/RoutesScreen.tsx`
- `mobile/src/screens/RouteDetailScreen.tsx`

## User-facing changes

- Known NBH route cards no longer expose catalogue/variant-inventory copy.
- Preview-only route actions are now absent until the route record is ready; the rider sees a plain explanation instead of a primary-looking disabled Start button.
- Route detail uses a plain route-check-pending label and a recoverable “choose another route” action when a preview cannot start.
- Manual draw mode is described as a route sketch, has a disabled Done action until two points exist, and preserves the explicit no-navigation limitation.
- The empty builder point picker translates the actual tap location within the Bahrain planning viewport instead of always returning one hard-coded coordinate. Keyboard activation intentionally chooses the viewport center.
- Empty-builder copy now tells the rider to tap where the point belongs.

## Verification

Run from `mobile`:

```powershell
npm.cmd test
npm.cmd run typecheck
```

Observed: 53 tests passed, 0 failed; `tsc --noEmit` passed with no diagnostics.

## Concerns for later lanes

- The empty builder remains a point-picker placeholder rather than a full native/web tile map until a route exists; the real map renderer is used for route previews.
- App-level geometry resolution, default route selection, and route-following eligibility remain Task 7 responsibilities.
- The final i18n pass must add/replace the missing plain-language keys used with fallback copy here.
