# Home and Plan first-use checkpoint

Status: COMPLETE (read-only audit)

Agent: `01a092e9-beed-7650-b317-e2398fac83f8` (Turing)

Verified source/runtime:

- Worktree: `C:\Users\PC\Documents\ChatGPT\Bike\.worktrees\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Runtime: `http://localhost:8092`
- No product files were edited or committed.

## What is improved

Onboarding selects an NBH preview deterministically; Plan exposes three route
entry choices; Add stop has an ordered editor; builder Use this route opens
Route detail before Ride; route matching/retry/edit/save/permission states are
explicit; and sample routes are labeled as previews rather than recorded tracks.

## P1 findings

- Fresh Home still says `Your next ride` for the automatically selected NBH
  sample, despite `Preview route` and `road check not complete` state. Use
  `Explore a sample route`/`Suggested route` until the rider explicitly adopts
  a road-ready route.
- Plan's first viewport prioritizes the large NBH sample/map card; personal
  planning actions are below it. Put the route-entry choices first or make the
  sample an explicitly optional section.
- Start/Destination uses `EmptyBuilderMap`: a blank surface that converts taps
  to synthetic Bahrain coordinates without roads, place context, pan, zoom, or
  visible geographic feedback. Replace it with a real map/crosshair flow or
  relabel it honestly as coordinate selection.
- Route-state copy conflicts across Home, Plan, and review (`Your next ride`,
  `Preview route`, `Comparison paused`, `Road evidence unavailable`). Establish
  one rider-facing vocabulary: preview only, route ready, or could not check
  roads.
- Custom routes still receive NBH-specific Ride actions such as `Start at the
  NBH Loop entry`; route-neutralize these labels.
- You → My routes → View all returns to Plan instead of opening a saved-route
  collection. Implement a dedicated filtered collection or rename the action.

## P2 findings

- Onboarding completion screen is unmounted before its confirmation can appear;
  the direct-to-Home policy must be explicit.
- Goals and permissions are dense near 391x844 and sticky actions can obscure
  acknowledgement content.
- Home's compact map has no plain explanation of preview/road status.
- `Comparison paused` describes an internal analysis state rather than telling
  the rider when to leave or why no recommendation is available.
- Route-builder fields invite place typing but explicitly do not search; use
  map/saved/current-point language unless autocomplete exists.
- Choosing Start does not reliably focus Destination on web.
- Review can expose duplicate Retry actions; Save lacks visible confirmation
  and naming/rename path.
- Settings exposes an unreachable profile-edit action, duplicated section/row
  hierarchy, generic Manage labels, and notification/weather settings without
  corresponding scheduling/background behavior.
- Deletion success is routed toward Plan rather than shown where deletion was
  initiated; Privacy Center is trustworthy but too implementation-heavy for
  first use.
- Page titles are not exposed as headings and repeated web text-node,
  `shadow*`, `pointerEvents`, and `useNativeDriver` warnings remain.

## Verification

- Mobile tests: 238/238 passed.
- Mobile typecheck: passed.
- Runtime inspected with a fresh isolated browser origin at 391x844; no
  location permission was granted.

## Resume point

Fix the first viewport and real-map endpoint picker first, then normalize route
identity/status copy across Home → Plan → Review → Ride. Next fix custom-route
labels and saved-route collection navigation. Recheck 390x844 English/Arabic
and browser console errors before visual polish.
