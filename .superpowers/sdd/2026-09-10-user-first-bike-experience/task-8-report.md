# Task 8 report — adversarial usability and accessibility release gate

Date: 2026-09-10

## Result

Task 8 is complete for the reviewed Expo web experience. No P0/P1 implementation blocker remains. The release recommendation and remaining native/production evidence boundary are recorded in [the final QA report](../../../docs/superpowers/plans/2026-09-10-user-first-bike-experience-qa.md).

## Exact checks

From `mobile`:

- `npm.cmd test` — **101/101 passed**.
- `npm.cmd run typecheck` — passed with no diagnostics.
- `git diff --check` from the repository root — passed.

## Persona outcomes

- First-time rider: onboarding can complete or skip without location; Home gives one clear route-planning action.
- Arabic/RTL rider: Home, Plan, You, Settings, route statuses, unit controls, alerts, and empty states render in Arabic with mirrored layout and localized number/time presentation.
- No-location rider: browse/review and preview actions remain available; permission is explained only after an explicit ride/connect action, with retry after denial.
- Rider away from NBH: the connect path reports the known-entry distance/eligibility state instead of claiming a live connection.
- Save-failure rider: completion state remains retryable and the pending draft is retained; destructive discard is confirmed.

## Map and copy gate

Dense supplied router geometry is the only solid road line. Missing or non-road geometry remains a dashed, explicitly labeled preview. OSM attribution and labeled map controls are present, while route/access, forecast, selection, and live-position layers remain separate. Rider-facing map point labels no longer expose raw source fragments.

The live AX/screenshot pass covered Arabic Home and You/Settings, then English You/Settings and Plan. The controller viewport was approximately 754×698, not an exact 390×844 device frame; native MapView and screen-reader runtime checks remain required on a real device/emulator.
