# Task 2 — Real endpoint picker and manual sketch road-check state

Status: `IN PROGRESS`

## Worktree and branch

- Worktree: `C:\Users\PC\Documents\ChatGPT\Bike\.worktrees\naseem-release-fixes`
- Branch: `codex/naseem-release-fixes`
- Starting HEAD: `3e359f6`

## Owned files

- `mobile/App.tsx`
- `mobile/src/screens/RoutesScreen.tsx`
- `mobile/src/routeBuilder.ts`
- `mobile/src/routeLifecycle.ts` only if the existing transition seam requires it
- `mobile/src/routeBuilder.test.ts`
- `mobile/src/appIntegration.test.ts`
- `.superpowers/sdd/2026-09-12-release-continuation/task-2-report.md`
- This checkpoint file

Task 1 map sizing files and all unrelated dirty/untracked files are explicitly
out of scope and must remain untouched.

## Intended tests

- Focused route-builder and app-integration tests for real-map endpoint
  selection, typed-vs-committed points, two-endpoint validation, explicit
  road-check success/failure, sketch retention, and whole-stroke undo.
- Full mobile test suite.
- Mobile typecheck.
- `git diff --check`.
- Phone and Arabic/RTL editor checks through browser/CUA without granting
  location; no native-runtime claim.

## Resume step

Inspect the existing route-builder/App seams, add the required failing tests,
run the focused RED command and record its exact result, then implement the
smallest production changes that make the tests pass.

## RED evidence

- Test additions: `mobile/src/routeBuilder.test.ts` and
  `mobile/src/appIntegration.test.ts`.
- Focused command: `npx.cmd tsx --test src/routeBuilder.test.ts src/appIntegration.test.ts`
- Result: **RED** — 28 tests executed, 21 passed, 7 failed.
- Expected missing behaviors: real editor map (`EmptyBuilderMap` still
  present), explicit manual road-check lifecycle and draft-only decision
  state, preserved planner intermediate points, explicit draft metadata on
  manual plans, freehand routing simplification, and whole-stroke undo/redo.
