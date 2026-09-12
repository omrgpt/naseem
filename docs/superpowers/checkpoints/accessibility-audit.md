# Accessibility checkpoint

Status: COMPLETE (read-only audit)

Agent: `01a092f7-eeaf-7dc1-b21e-449b76401312`

Verified release source: `C:\Users\PC\Documents\ChatGPT\Bike\.worktrees\naseem-release-fixes`, branch `codex/naseem-release-fixes`. Runtime was the Expo app on port 8092. No product files were edited.

## P1 findings

- `WebAppAlert` declares an alert dialog but does not move focus, trap focus,
  isolate the background, handle Escape, or restore focus. Reproduction moved
  Tab focus behind the alert.
- The destructive saved-data confirmation is an inline View rather than a
  modal dialog. Focus is not moved or contained and is not restored after
  cancellation.

Use the existing `AccessibleDialog` behavior for both paths and add browser AX
tests for initial focus, Tab containment, Escape, background isolation, and
focus restoration.

## P2/P3 findings

- Privacy Center has no complete modal focus context or described relationship.
- Primary navigation is exposed as checkbox-like nodes because selected button
  semantics combine with `aria-pressed`; use `aria-current` links or a proper
  tab model.
- Read-only map markers create duplicate focus stops; reserve application mode
  and selectable marker semantics for editing.
- Current screen titles are plain text instead of headings.
- No reduced-motion support exists for map fitting, onboarding scroll, labels,
  or dialogs.
- Onboarding errors are not associated with fields or focused on the first
  invalid control.
- Two light-theme text pairs miss the 4.5:1 contrast target (4.486:1 and
  4.445:1).
- Onboarding preference controls render at 42px instead of the 44px contract.
- Profile action accessible names omit status/context.
- Route Detail exposes duplicate Retry actions.
- Empty manual drawing exposes Redo/Clear controls that cannot do useful work.

## Positive coverage

Keyboard reached route fields, map controls, manual drawing, route actions,
settings controls, and recovery paths. Web map keyboard panning/zoom/point
placement works, map controls generally meet 44px targets, and the accessible
route summary is a useful non-map alternative. Permission, route failure,
tile failure, save failure, completion, discard, and retry paths have actions.

## Verification

- Mobile tests: 238/238 passed.
- Mobile typecheck: passed.
- Expo Doctor: 21/21 passed.
- `git diff --check`: passed; no lint script exists.
- Native VoiceOver/TalkBack, real permission prompts, native map behavior,
  font scaling, and reduced-motion device testing remain unverified.

## Resume point

Fix alert/delete/Privacy focus management first, then add browser AX regression
coverage. Follow with headings, reduced-motion handling, onboarding error
association, contrast, and no-op control states. Recheck phone and Arabic RTL.
