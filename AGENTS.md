# Agent handoff rules

Before working on this repository, read
`docs/superpowers/checkpoints/2026-09-12-continuation.md` and the relevant
checkpoint reports. They are the durable source of work state after a usage
limit, chat restart, or agent handoff.

For every delegated task:

- Use `gpt-5.6-luna` with maximum reasoning when the dispatch tool allows an
  explicit model override.
- Work only in the assigned file scope.
- Create or update a scoped checkpoint with `IN PROGRESS` before editing.
- Save meaningful code progress in a small commit or an inspectable diff.
- Before returning, record `COMPLETE` or `BLOCKED`, exact files/commit, tests,
  inspected screens, and the next exact resume action.
- A plan or started command is not completion evidence.

The coordinating agent must verify the returned status and saved artifacts,
wait for a terminal response, and never close a running agent. On resumption,
inspect Git status/log and the checkpoint files before continuing.
