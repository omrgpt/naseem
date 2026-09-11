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
