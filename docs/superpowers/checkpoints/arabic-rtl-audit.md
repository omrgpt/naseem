# Arabic and RTL checkpoint

Status: COMPLETE (read-only audit)

Agent: `01a092e9-c104-7d43-903e-e8bd2977d813`

Verified runtime/source:

- Worktree: `C:\Users\PC\Documents\ChatGPT\Bike\.worktrees\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Runtime: `http://localhost:8092`
- English and Arabic were checked at desktop and 375px widths; no product
  files were edited or committed.

## P1 findings

- You → Privacy uses the giant `WebAppAlert` text path. At 375px its Arabic
  card was about 3,528px tall and positioned far above the viewport, leaving
  `تم` off-screen; English also overflowed. Route this action through the
  bounded scrollable Privacy Center or make the alert a real bounded dialog.
- Live Ride miles mode formats `aheadLabel` in raw kilometres and wind as
  `km/h`; use the selected distance/speed formatter in every locale.
- Arabic Plan target-distance input displays Western digits and `Number()`
  rejects Arabic-Indic/Eastern Arabic digits and decimal separators. Normalize
  and reformat locale input before parsing.

## P2 findings

- Web RTL is double-mirrored: bottom nav stays Home → Plan → Ride → You from
  left to right, route-review Back/Change order is reversed, and the Arabic
  shell brand is left-aligned. Remove web-only `row-reverse` patches or make
  them native-only and use logical insets.
- Arabic shell labels fall back to English (`Skip to content`, `Primary
  navigation`) because catalog keys are missing.
- Live Ride keys `completedDraft`, `lastFix`, `noLocationFix`, and
  `retryLocation` are missing in Arabic; denial/unavailable/pause/resume can
  also fall back to English and matching does not receive the Arabic flag.
- Map-picked/current/generated endpoint names reuse English names, lose
  `nameAr`, and format generated waypoint indexes with Western digits.
- Route review endpoint text uses a bidi-unsafe mixed Arabic/Latin arrow
  string; saved-route rows use a fixed LTR chevron and are not shrink-safe for
  long Arabic content.
- StatusBadge has no RTL/font contract; long metric/legend/recovery rows lack
  consistent `minWidth: 0`, stacking, or Arabic font/alignment rules.
- Onboarding has copy/interaction issues around 40-character validation,
  Arabic-name autocorrect, submitting label, and double-mirrored rows.
- Arabic privacy copy has a typo, Western duration numerals, and ambiguous
  deletion wording; catalog terminology has several unnatural translations.
- Configured remote analysis and some map accessibility defaults can leak
  English if those paths are enabled without localized props.

## Verified passes

Arabic Home, Plan, review, You, Settings, Live permission content, map
controls, map accessibility summaries, Arabic numbers/times on exercised
screens, direct Settings privacy modal, and main Noto Sans Arabic typography
worked at 375px without observed body-level overflow. Legal/provider tokens
such as OpenStreetMap, Strava, URLs, and NBH were not treated as translation
leaks.

## Resume point

Fix the bounded You privacy dialog and locale-aware distance input/Live Ride
formatting first. Then centralize web/native RTL row behavior, fill dynamic
Arabic recovery keys, preserve `nameAr` through route creation, and test long
Arabic route/ride metadata at 320/375px. Native iOS/Android RTL and font
behavior remain unverified.
