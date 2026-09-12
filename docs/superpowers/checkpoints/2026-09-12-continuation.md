# Naseem continuation checkpoint — 2026-09-12

This file is the durable handoff for the user-first redesign and usability
work. Read it before resuming after a usage limit, agent restart, or chat
handoff. It records evidence; it must not be used to infer that unfinished
work is complete.

## Canonical working state

- Repository: `C:\Users\PC\Documents\ChatGPT\Bike`
- Active worktree: `C:\Users\PC\Documents\ChatGPT\Bike\.worktrees\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Checkpoint HEAD: `e21461d`
- Existing product commits through this checkpoint are durable in Git.
- Existing dirty files are scratch/reports from the earlier hardening pass;
  preserve them unless the user explicitly asks to clean them.

## Verified before this checkpoint

- `npm.cmd test -- --runInBand`: 238 passed, 0 failed.
- `npm.cmd run typecheck`: passed.
- `npx.cmd expo-doctor`: 21/21 passed after the Expo patch alignment.
- `git diff --check`: passed.
- Web server was running from this worktree on `http://localhost:8092` when
  available; browser automation later reported that no browser surface was
  available, so rendered QA must be retried rather than assumed.

## Rendered evidence observed after restart

At `390x844` in the local browser, the Plan screen is full-width, but the
initial route flow places a large NBH preview before the builder and the fixed
bottom navigation covers the lower map/action area. Entering the manual flow
shows only a “Choose on map” placeholder and the point-count controls; it does
not show a real map or a pencil/stroke interaction. At the default desktop
viewport, the visible route is a coarse dashed chord and the map dominates the
viewport before the user reaches the useful actions. These observations are
from the live DOM/screenshot, not inferred from tests.

## Current redesign scope

The goal is a people-first, phone-first experience: a full-bleed map for
planning/drawing, road-following geometry when it is actually available,
simple route decisions, production-facing copy, and equal English/Arabic RTL
behavior. The supplied NBH preview remains only a clearly labelled preview
until authoritative geometry and access evidence exist. Do not turn coarse
waypoints or a straight sketch into navigation truth.

The current concrete map gap is known: web drag gestures pan the map and map
clicks add one point; there is no finger-trace/sketch gesture path. The seed
preview still contains only coarse points. Any fix must preserve the honest
preview/road-match boundary.

## Agent durability protocol

Every implementation agent must:

1. Work in its assigned isolated scope and use `gpt-5.6-luna` with maximum
   reasoning when dispatched.
2. Before editing, append a short `IN PROGRESS` note to its own checkpoint
   file under `docs/superpowers/checkpoints/` containing the scope, files, and
   intended tests.
3. At each meaningful stopping point, save the actual work in the worktree;
   for code changes, commit a small scoped commit or leave a clearly
   inspectable diff. Never rely on hidden chat context as the only copy.
4. Before the final response, update its checkpoint to `COMPLETE` or
   `BLOCKED`, list exact changed files/commit, tests run and results, and the
   precise next step if blocked.
5. Never report “complete” because a plan was written or because a command was
   started. A terminal response plus saved files/commit and verification are
   required.

The main agent must wait for a terminal agent response. It may close an agent
only after that response is a completion or an explicit terminal error. On
resume, the main agent must inspect Git status/log and every relevant
checkpoint, then rerun verification; it must not infer completion from a
sidebar notification or a usage-limit banner.

## Agent status at checkpoint

The audit batch is being kept open until each response is validated against the
canonical worktree and its report is saved. Descartes completed and its
findings are saved in `map-drawing-audit.md`. Curie's corrected response is
saved in `route-builder-audit.md`. Kierkegaard's first response used `master`,
so it has been sent back to the canonical worktree and is not yet accepted.

| Scope | Agent id | Expected durable output |
| --- | --- | --- |
| Map drawing | `01a092e9-bc42-7ee1-8ccd-e0b601535d68` | **complete; see `map-drawing-audit.md`** |
| Map visual | `01a092e9-bd05-76b2-90f0-1eb23383211f` | map visual/responsive audit |
| Route builder | `01a092e9-bdf7-7e53-9cc7-ac09b78cff32` | **complete; see `route-builder-audit.md`** |
| Home/Plan | `01a092e9-beed-7650-b317-e2398fac83f8` | **complete; see `home-plan-audit.md`** |
| Live Ride | `01a092e9-bfe9-76a0-900d-6c21624ec4b3` | **complete; see `live-ride-audit.md`** |
| Arabic/RTL | `01a092e9-c104-7d43-903e-e8bd2977d813` | bilingual layout/copy audit |
| Accessibility | `01a092f7-eeaf-7dc1-b21e-449b76401312` | **complete; see `accessibility-audit.md`** |

The previous persona/reviewer batch did not yield feedback: the agents became
unavailable after usage-limit errors. Their absence is not evidence that the
persona study passed. After the current audit agents return, start the five
persona studies again in available slots and request full screen/step,
expected-vs-actual, severity, and feature-request feedback.

## Resume checklist

1. Read this file.
2. Verify the six IDs above with the agent wait/status tool. Do not close a
   running agent; close only a returned completion/error.
3. Inspect `git status --short`, `git log --oneline`, and all checkpoint files.
4. Save each returned audit as a durable report before acting on it.
5. Dispatch only disjoint implementation scopes, with the durability protocol
   included in every prompt.
6. Run the full mobile suite, typecheck, Expo Doctor, and diff checks after
   integration. Retry rendered phone/desktop and Arabic QA; record what was
   actually observed.
