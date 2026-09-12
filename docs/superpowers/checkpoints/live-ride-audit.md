# Live Ride and recovery checkpoint

Status: COMPLETE (read-only audit)

Agent: `01a092e9-bfe9-76a0-900d-6c21624ec4b3` (Hilbert)

Verified checkout: `C:\Users\PC\Documents\ChatGPT\Bike\.worktrees\naseem-release-fixes`, release branch `codex/naseem-release-fixes`.

## Evidence

- Expo web app on port 8092 was running from the hardening worktree.
- Mobile tests: 238 passed, 0 failed.
- Mobile typecheck: passed.
- Location was not granted or simulated; native GPS/permission behavior remains unverified.
- A ready-loop smoke test exposed a finish defect: progress reached `0.803`,
  then became uncertain at the shared finish/start coordinate.

## Findings

- `Connect from my location` enters Ride without an entry-distance/away-from-
  entry preflight. A rider far from the route receives no choice to connect,
  start at the entry, choose another route, or record without following.
- `matchRoutePosition` receives previous progress but calls `routeProgress`
  with `0`, so a shared loop finish can remain stuck near 80% and uncertain.
- The UI can show an absolute arrival clock under “time left”; use a duration
  such as `42 min`, or rename the label to “Estimated arrival.”
- Active Ride bypasses the shell scroll container. The fixed map plus sheet can
  push retry, pause/resume, and end controls below a 390x844 viewport.
- Recording-only mode tracks distance/time/fix data but does not show useful
  telemetry or a current-position indicator.
- Before the first location fix, “Location uncertain” should be replaced with
  an explicit “Waiting for your first location fix” state.
- The initial permission-failure screen can render an `End ride` action before
  an active snapshot exists; that action is inert.
- Dynamic Live Ride recovery keys are missing from Arabic, causing English
  fallback for denial, stale updates, pause, and last-fix states.
- Browser export is handled locally in `LiveRideScreen` without propagating
  exported state to App persistence; export failures reuse save-failure copy.
- Active traces are memory-only until End, so refresh/crash loses the in-flight
  recording. Save has no visible busy label, and a zero-fix completion has no
  explicit “no track captured” warning.

## Preserve

Route-following remains gated on authoritative ready road geometry; previews
cannot enter Live Ride; browsing does not request location; browser watcher,
stale-state, pause accounting, completion snapshot, discard, and retry helpers
have useful coverage.

## Resume point

Fix the stateful matcher and add near/away/unavailable preflight tests first.
Then make the Live Ride sheet independently scrollable with a safe-area action
bar, add first-fix/recording telemetry, complete Arabic recovery strings, and
propagate browser export through App persistence. Verify at 390x844, large text,
and Arabic RTL before claiming readiness.
