# NBH route-choice and live-guidance architecture

> Status: architecture handoff only. Do not implement from this document without a separate implementation task.
> Correct name: NBH Loop / Nasser bin Hamad Loop / حلقة ناصر بن حمد. Never use MBH.

## The product decision

Naseem is not a weather dashboard with a small route preview. It is a Bahrain cycling decision tool with two clear jobs:

1. Before a ride, help a rider choose a route version and departure time they understand.
2. During a ride, show their planned route, where they are on it, and the forecasted riding conditions ahead and on the remaining way back.

It does not claim a road is safe, pick a legally correct turn, receive a rider's live Strava position, or replace a bike computer/navigation product.

The existing NBH Loop should be the first familiar catalog route family. Bahrain Tourism describes it as a 50 km dedicated cycling track in Zallaq. That establishes the public route identity, not verification of every app geometry point, access condition, safety claim, or individual route alternative.

## What changes immediately

| Current experience | Required experience |
|---|---|
| Nasser bin Hamad Loop · pilot trace is the route name. | NBH Loop is the route name. Geometry/evidence status is a separate small status label. |
| NBH appears as 21.8 km in Plan and 50.3 km in Home/detail. | Every displayed distance belongs to one named NBH variant and one immutable revision. No list/detail mismatch. |
| Home shows a compact, overloaded map. | Home has a calm decision card and an Open map action. Route review opens a large, map-first surface. |
| Best window says wind eases on the return. | The copy says exactly which chosen route segment is expected to feel different and why. |
| Pilot, source, audit, and owner-policy language appears in customer flows. | Customer flows use plain route status. Internal policy decisions move out of the app. |
| Start live ride assumes selected route context. | Rider first chooses a route variant and resolves whether they are at its entry, connecting from current location, or simply recording. |
| Route colors could imply safety, road type, wind, and recommendation at once. | Road/access evidence, forecasted wind condition, selection state, and live-location confidence are independent layers. |

## Information architecture

Keep four bottom destinations. Route detail, maps, comparison, and settings are nested surfaces.

| Destination | Rider question | First action |
|---|---|---|
| Home | Is today generally suitable, and what is my selected plan? | Open map or choose route |
| Plan | Which route or NBH version should I ride? | Choose NBH Loop or start/destination |
| Ride | What is happening on my selected route right now? | Start ride only after a plan is selected |
| You | Where are my rides, routes, sources, privacy, and settings? | Manage routes or open Settings |

Remove the customer-facing Review decisions card completely. Arabic font approval, policy gates, route-evidence governance, and release decisions belong in an internal admin/release checklist, not in You.

Move the top-bar Bahrain · private pilot label, theme switch, and language switch out of the regular riding surface. The top bar contains only the brand, current screen title, and a contextual action. Settings live in You.

## Home contract

Home never makes a route-specific claim without naming its route and variant.

### No route selected

- Header: Home.
- General condition summary: Bahrain today plus a plain language condition, for example Warm with stronger evening wind.
- Explain uncertainty in one optional Why? disclosure, not as a persistent warning paragraph.
- Primary action: Choose a route.
- Secondary action: Plan from two places.
- No full map, pilot label, return estimate, or false recommendation.

### NBH variant selected

- Route identity: NBH Loop · Standard clockwise, with exact variant distance and status.
- Decision: Best departure today · 5:40 PM.
- Reason: Lighter forecast headwind across the final 18 km. The phrase final 18 km is a tappable explanation that opens the route map at those segments.
- Supporting line: Expected back by 7:42 PM, based on this route version and forecast.
- Primary action: Open route map.
- Secondary action: Change route.
- Forecast disclaimer lives inside Why this time and not beside every metric.

Never say Wind is on the return without a route name, a remaining-route definition, and a human-readable segment explanation.

## Plan and NBH route family

### Plan landing state

Plan starts map-first, not as a vertical stack of three equally weighted creators.

- Large map fills the available space.
- A bottom sheet begins collapsed with Plan a route and two actions: Choose a known route and Start / Destination.
- The first catalog card is NBH Loop because it is a familiar Bahrain cycling destination. It shows official identity, area Zallaq, a provisional/review status, and Open map.
- Create route, Import GPX, and straight-line mode sit behind a More ways to plan action.

### NBH family page

NBH Loop is a RouteFamily, not one mutable RoutePlan.

    RouteFamily: NBH Loop
      RouteVariant: Standard clockwise
      RouteVariant: Standard counter-clockwise
      RouteVariant: Short option
      RouteVariant: Full option
        RouteRevision: reviewed geometry, segments, evidence, analysis

Do not show a variant until its exact geometry, distance, entry/finish logic, and evidence status exist. If only one validated/reviewed preview exists, show only that one and say Other NBH options are not ready to compare.

The family page contains:

1. A large full-screen map of the selected variant.
2. A short route identity: NBH Loop · 50 km track · Zallaq.
3. Variant cards with direction, exact distance, estimated duration range, forecast condition summary, route-evidence status, and Compare.
4. A clear entry choice: Start at NBH entry, Connect from my location, or Preview without location.
5. About this route for source, geometry review, and non-safety limitations.

Do not put pilot trace in the route title. Use one of these separate labels:

- Road route ready
- Preview route — road verification pending
- Imported recorded track
- Route unavailable

## Map architecture

### Full-screen route map

The map is the primary surface for route review and Live Ride. It must support pan, pinch/plus-minus zoom, Fit route, and a user-initiated current-location button. The map should always fit the actual selected variant bounds after geometry changes.

Home may use a small preview, but it must contain only the route line, route name, and an Open map affordance. Hide the full legend, provider notice, gesture tip, long accessibility copy, evidence, and competing controls from a compact preview.

Route detail and Live Ride use the full-screen map with a bottom sheet:

- Collapsed: route name, current condition summary, and one action.
- Half: next segment, ahead horizon, remaining route, and route/forecast confidence.
- Expanded: route variants, departure comparison, evidence, and segment list.

Reserve fixed safe zones for map controls. In RTL, title/status plate, zoom controls, fit button, provider notice, and legend must never share a corner. Long Arabic names wrap in the sheet, not over controls.

### Four separate map layers

Do not use one colored line to mean everything.

| Layer | Meaning | Required text equivalent |
|---|---|---|
| Route/access layer | dedicated, mixed traffic, restricted, unknown | Road/access source and confidence |
| Forecast condition layer | more favorable, headwind-heavy, crosswind-notable, uncertain | Wind effect, gust context, forecast time |
| Selection layer | selected variant, alternative, unavailable | Selected, Alternative, or blocking reason |
| Live-position layer | matched, uncertain, off-corridor, stale | Position matched, Location uncertain, or not confidently matched |

Color semantics:

- Teal/green: more favorable forecasted wind contribution.
- Amber: headwind likely; allow more effort/time.
- Blue/violet: crosswind notable; conditions may vary.
- Gray: forecast or route evidence uncertain.
- Red: unavailable, restricted, or blocked. Never use it to mean dangerous.

Every colored segment must have a text card and accessible description. Route/access evidence must remain visually and semantically separate from forecasted riding condition.

### Ahead, branch, and return language

Ahead means the next 3 km or next 12 minutes of the selected route from the rider's matched route distance. Return means all remaining ordered segments that lead to the selected finish; it is not a compass direction or generic statement.

Left/right advice is allowed only when a reviewed route variant contains a known branch and the product can name two valid variants. Do not infer a left/right choice from a colored map edge.

Use this pattern instead:

- Standard clockwise: more favorable wind for the next 12 km; stronger headwind expected in the final 18 km.
- Standard counter-clockwise: stronger headwind first; more favorable wind on the final 18 km.
- Compare the two variants before choosing.

At live branches, show selected route continues ahead plus an optional Open alternatives sheet. Do not issue turn-by-turn instructions or automatic reroutes.

## Start-location and Live Ride contract

### Before asking for location

The rider can browse NBH and any route without location permission. They choose one of:

- I am starting at the NBH entry.
- Connect my current location to NBH.
- Preview this route without location.

Only the second or an explicit Start ride action requests foreground location.

### Rider is away from NBH

After location is available, compare position to the selected variant's valid entry/start corridor.

- Near entry: Ready to start NBH Loop.
- Away: You are X km from the NBH entry in Zallaq.
  - Show start point
  - Plan a connection from here
  - Choose another route
  - Record without following NBH

Never pretend the rider is already on NBH or advance NBH progress before confident corridor matching.

### Live states

    no plan
    → variant selected
    → analysis ready or analysis degraded
    → permission explanation
    → starting
    → active: approaching route, matched, uncertain match, off corridor, stale location
    → ending
    → completed draft
    → saved activity, discarded, export, or save retry

An active map shows only current position, selected route, next named segment, ahead horizon, remaining route, forecast condition, GPS/match confidence, and End ride. It does not repeat catalog source or policy content.

Position matching must be stateful: score nearby corridor projections using GPS accuracy, heading, pace plausibility, and prior route distance. At loops/shared start-finish geometry, preserve ambiguity rather than jumping to a random route position. Allow backward progress only after sustained evidence of a U-turn. Off-corridor copy is Check the map and surroundings; never Turn around.

## Recording, Strava, and saved rides

Naseem may record a ride only when the rider starts a Naseem ride and grants location. Ending creates a completion draft, not an automatic permanent record.

Completion sheet:

- Planned route: NBH Loop · selected variant and revision.
- Recording summary: elapsed time, recorded distance, match quality, and any gaps.
- Actions: Save ride, Discard, Export.
- Discard requires confirmation and is recoverable until confirmed.
- Failed save shows Retry and Export.

Saved activity retains the observed trace separately from the catalog route and immutable forecast/route-analysis snapshot. A later NBH map update must never rewrite a past ride.

Strava integration is separate:

- Use Strava as optional read-only history import or post-ride export/sync after explicit authorization.
- Do not say Naseem can retrieve a rider's live Strava recording. Strava's documented webhooks are activity/athlete change events, not a live GPS-position feed.
- To get live NBH guidance, the rider records in Naseem and grants Naseem location. If they record only in Strava, Naseem can provide pre-ride route review but no live position-aware guidance.

## Data architecture

Retain existing RouteRecord/RouteRevision foundations, then add:

| Entity | Minimum fields |
|---|---|
| RouteFamily | id, stable slug, en/ar names, catalog status, entry points, default viewport, source policy |
| RouteVariant | id, familyId, label, direction, distance, entry/finish, availability, current revision |
| RouteCorridor | variant revision, dense geometry, route-distance index, shared-geometry metadata |
| AnalysisSegment | ordered start/end distance, phase, names, road/access evidence, forecast condition, confidence |
| AnalysisRun | family, variant, revision, departure instant, Bahrain timezone, forecast run, pace policy, algorithm version |
| PositionMatch | route distance, confidence, state, accuracy, candidate count, timestamp |
| ActivityDraft | planned variant/revision, observed samples, match history, completion state, save status |

New or evolved modules:

- domain.ts: RouteFamily, RouteVariant, RouteCorridor, AnalysisSegment, AnalysisRun, PositionMatch, ActivityDraft.
- routeRepository.ts: family/variant/revision selection and immutable snapshots.
- routeMatcher.ts: stateful live matcher; move pure geometry helpers to routeProjection.ts.
- routeAnalysis.ts: segment forecast and variant/departure comparison.
- routeConditions.ts: one map/card/accessibility semantic mapping.
- rideRecording.ts and activityRepository.ts: completion draft, save/retry/discard/export.
- useLiveRideSession.ts: watcher orchestration only.
- MapPreview files: renderer only; add full-screen mode and independent layers.
- New RouteChooserScreen, FullScreenRouteMap, VariantComparisonSheet, LiveRideMap, and RideCompletionSheet.

## Arabic and content contract

- Route name: حلقة ناصر بن حمد. Keep Nasser bin Hamad Loop or NBH only as an intentional proper-name/source reference.
- Never append تتبع تجريبي to the customer route name. Use مسار قيد التحقق as separate status when necessary.
- Preferred labels: الرئيسية, التخطيط, الرحلة, حسابك; أفضل وقت للانطلاق; المسار المختار; مراجعة المسار; نقطة الانطلاق; الوجهة; المسار يتبع الطرق; العودة بحلول.
- Do not use ambiguous marker abbreviation ب/ن without a full accessible name. Visual markers may be short; accessibility must announce البداية, النهاية, and نقطة الطريق.
- Confirm Arabic family, licensed weights, and fallback policy before shipping. Current technical fallback is not approval.
- Set Arabic document language/direction on web; use logical spacing; localize route-point and live-segment accessibility labels; format all time/number/unit strings centrally for Asia/Bahrain.

## Delivery sequence for the Luna Max implementation task

### Phase 1 — make NBH truthful and selectable

- Create NBH as a family with one or more explicitly named variants only after their geometry/distance evidence exists.
- Remove pilot trace from route names and eliminate list/detail distance mismatches.
- Add full-screen route review map and preserve compact previews only on Home.

Acceptance: a rider can identify exactly which NBH version they selected, its distance, start/finish, status, and source without seeing implementation jargon.

### Phase 2 — route-condition comparison

- Build ordered analysis segments and independent road/access and forecast-condition layers.
- Compare variant/direction/departure choices with plain text, forecast freshness, and uncertainty.
- Remove unqualified return wording.

Acceptance: a rider can explain why one named option is more favorable for a selected time and can see the exact affected segments.

### Phase 3 — bounded live route awareness

- Add entry-distance preflight, approaching/matched/uncertain/off-corridor states, stateful corridor matching, and large Live map.
- Do not add turn-by-turn or automatic rerouting.

Acceptance: a rider who starts away from NBH receives an honest plan choice and is never shown false NBH progress.

### Phase 4 — recording and save lifecycle

- Add completed-ride draft, Save/Discard/Export, local persistence, retry, and route/forecast snapshots.
- Keep Strava post-ride/history behavior distinct from live Naseem tracking.

Acceptance: ending a ride produces a clear save decision; saved history never mutates when catalog geometry changes.

### Phase 5 — customer-language and RTL finish

- Move internal owner decisions out of You.
- Apply approved Arabic type, bilingual route naming, map safe zones, Arabic accessibility labels, and text-size/overflow regression tests.

Acceptance: English and Arabic flows use the same route identity, no map overlays overlap at phone width, and Settings are reachable from You without exposing release-policy jargon.

## Public references

- NBH Loop identity: https://www.bahrain.com/en/the-nasser-bin-hamad-loop
- Strava recording and off-route behavior: https://support.strava.com/en-us/articles/15402137-recording-an-activity
- Strava route-following flow: https://support.strava.com/en-us/articles/15401749-following-a-route
- Strava webhooks: https://developers.strava.com/docs/webhooks/
