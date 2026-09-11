# Task 4 report — live ride hardening

Status: complete.

Implemented the scoped live-ride lifecycle and recovery work:

- Added explicit ready, explanation, requesting, active, denied, unavailable, ending, completed-draft, save-failed, saved, discarded, and exported state contracts and transitions.
- Added browser/native location failure classification, retry/settings/no-location escape copy, recording-only labels, pause/resume controls, last-fix and stale/off-corridor recovery controls.
- Kept active rides pinned to cloned route snapshots and completion drafts pinned to immutable route/forecast snapshots.
- Added recoverable pending-draft parsing, save-failure retry helpers, defensive saved-ride opening, and browser Blob/object-URL JSON download fallback.
- Made the completion surface show explicit Save/Retry save/Discard/Export actions, temporary local draft retention, and lifecycle status.

TDD and verification:

- Focused RED run: new lifecycle/permission/recording/export/recovery assertions failed as expected before implementation.
- Focused GREEN: `npm.cmd exec -- tsx --test src/rideRecording.test.ts src/activityRepository.test.ts` — 15 passed, 0 failed.
- Full suite: `npm.cmd test` — 173 passed, 0 failed.
- Typecheck: `npm.cmd run typecheck` — passed.
- Scoped `git diff --check` — passed.

Known integration boundary: App and ProfileScreen were intentionally untouched per the task scope. Existing App callbacks provide native save/discard/export confirmation and pending hydration; `openSavedActivity` is exposed for the saved-ride UI integration owned by the history task. Browser export success is shown locally by the Ride screen because persisting the exported flag would require the out-of-scope App change. Native GPS behavior remains unverified without a device run.

## Fix round

Addressed the Turing findings within the Task 4 files only:

- Permission responses now require `status === "granted"` and `granted === true`; denied and unavailable outcomes stay distinct through initial, start, retry, refresh, and watcher-failure paths, including browser-provider absence.
- Added a 90-second stopped-stream watchdog so missing fixes surface stale recovery with last-fix, retry, pause/continue, and end-and-keep-recording actions. Active route snapshots remain pinned through denied, unavailable, and ending states.
- Recorded pause intervals are removed from moving time and location-gap detection, and completion continues to label the metric as Moving time.
- Browser Blob export now serializes and returns the same defensive exported clone through the shared export marker path; save-failed remains the higher-priority completion state.
- Unavailable copy is platform-neutral, while browser-specific wording is retained only for web; pending drafts, temporary retention, explicit save/retry/discard/export actions, openable saved rides, and immutable snapshots remain covered.

Fix-round TDD and verification:

- RED: the new provider-availability and exported-payload assertions failed before their implementation changes; the existing fix-round regression set also failed before the corresponding production changes.
- GREEN focused: `npm.cmd exec -- tsx --test .\\src\\rideRecording.test.ts .\\src\\activityRepository.test.ts` — 21 passed, 0 failed.
- Full suite: `npm.cmd test` — 191 passed, 0 failed.
- Typecheck: `npm.cmd run typecheck` — passed.
- Scoped `git diff --check` — passed.

The App, ProfileScreen, Settings, route builder, map renderers, route truth, and localization files were not changed. Native OS permission/GPS, stopped-stream, and browser download behavior remain device/browser verification items beyond the automated checks.

## Review fix round

Addressed the three in-scope P2 findings:

- Web live rides use a small browser geolocation adapter instead of Expo’s SDK 57 web watcher wrapper, which omits the browser error callback. Provider errors now reach the existing denied/unavailable recovery path; the adapter also remains removable. Native rides continue to use Expo’s watcher.
- The stopped-stream watchdog now requires an active route plan, converts a timed-out off-corridor match to truthful stale state, and never synthesizes route match state for recording-only rides.
- Completion distance now skips sample-to-sample segments that cross a paused interval, while moving-time and pause-aware gap calculations remain intact.

Review fix TDD and verification:

- RED: browser watcher propagation, off-corridor/recording-only watchdog, and pause-crossing distance assertions failed before implementation.
- GREEN focused: `npm.cmd exec -- tsx --test .\\src\\rideRecording.test.ts .\\src\\activityRepository.test.ts` — 22 passed, 0 failed.
- Full suite: `npm.cmd test` — 213 passed, 0 failed.
- Typecheck: `npm.cmd run typecheck` — passed.
- Scoped committed diff check: passed.

The adapter behavior is covered by unit tests; an actual browser permission/provider failure and native GPS behavior still require runtime/device verification.
