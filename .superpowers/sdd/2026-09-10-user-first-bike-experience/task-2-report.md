# Task 2 handoff report

Status: `DONE_WITH_CONCERNS`

## Files changed

- `mobile/src/Onboarding.tsx`
- `mobile/src/screens/TodayScreen.tsx`

## User-facing changes

- Replaced the internal-sounding onboarding banner and signal label with plain first-plan language.
- Reworded the welcome explanation so it describes route shape, wind, and road context without exposing implementation terminology.
- Localized the onboarding starting-area country label to `البحرين` in Arabic.
- Localized the visible onboarding unit choices to `كم` / `ميل` in Arabic while retaining `KM` / `MI` in English.
- Made the no-route Home copy point riders to Plan and describe the map as a route context surface rather than asking for two arbitrary places.
- Kept onboarding location-free: the location copy continues to explain that permission is only considered for an explicitly started live ride.

## Verification

Run from `mobile`:

```powershell
npm.cmd test
npm.cmd run typecheck
```

Observed: 53 tests passed, 0 failed; `tsc --noEmit` passed with no diagnostics.

## Concerns for later lanes

- `App.tsx` still defaults Home to the NBH record when no route has been deliberately selected; Task 7 must fix that shell-level state.
- The full translation catalog still contains technical/internal keys and must be cleaned in Task 6.
- Phone-width visual QA of every onboarding step remains part of the final QA pass; the scroll container is retained so long Arabic content can be reached safely.
