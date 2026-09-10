# Task 5 report — You and Settings

Status: implemented.

## Outcome

- Simplified You into three user-facing groups: My routes, Saved rides, and Connections & privacy.
- Kept empty states short and actionable; hidden empty import content until imports exist.
- Removed owner, policy, account, sign-out, and administrative language from the customer-facing screens.
- Kept the optional Strava history entry explicit: it is for past-ride import after the rider chooses to connect, and it does not provide live location to Naseem.
- Reworked Settings into Language, Appearance, Location & notifications, and Data, with plain language for units and local data.
- Kept deletion separate, destructive, and confirmation-gated; the confirmation explains that confirmed deletion cannot be undone.
- Added English/Arabic copy parity, Arabic country/unit wording, Arabic fonts, and RTL-safe row/control handling without changing shared i18n or App wiring.
- Preserved existing callbacks. Because App.tsx does not provide the optional direct distance-unit callback, the units row uses the existing `onEditProfile` path so the preference remains reachable without changing App.tsx.

## Verification

- `npm.cmd test` from `mobile`: 59 passed, 0 failed.
- `npm.cmd run typecheck` from `mobile`: passed.
- Local Expo web preview at `http://localhost:8083/`: inspected You and Settings in English and Arabic, including the Arabic RTL order, localized units, local-data copy, and destructive-data area.

## Scope

Only these Task 5 files are intended for the commit:

- `mobile/src/screens/ProfileScreen.tsx`
- `mobile/src/SettingsScreen.tsx`
- `mobile/src/appPreferences.test.ts`
- `.superpowers/sdd/2026-09-10-user-first-bike-experience/task-5-report.md`

## Concerns

- The available browser preview exposed the existing desktop viewport rather than a forced 390px device viewport; responsive safeguards were reviewed in code, but exact 390px emulation could not be set through the available UI control.
- Shared stale copy and App.tsx remain unchanged by design, per the Task 5 scope.
