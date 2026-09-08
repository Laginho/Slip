# Agent guidelines

Read `docs/agents/orchestration.md` for the repo bindings (gates, branches, repo
specifics) and `docs/agents/issue-tracker.md` for how work is tracked.

## Workflow

One ticket at a time. The human fires each step by hand and approves between 1 and 2.
The ticket is the contract; the commit is the handoff — no intermediate document.

| # | Model | Skill | Delivers | Stops and reports if |
|---|---|---|---|---|
| 1 | Fable | `grill-me` → `to-spec` → `to-tickets` | `.scratch/<feature-slug>/spec.md` plus one `issues/SLIP-<N>-<slug>.md` per ticket, `**Status:** ready-for-agent` | the human does not approve the seams or the slicing |
| 2 | Sonnet | `tdd` | worktree on `claude/<slug>`, `**Status:** claimed`; **a tests-only commit, red for the right reason**; then code commits that touch no test file; gates green; PR from `feat/<slug>` | the ticket holds more than one seam (back to step 1), or a committed test is wrong (`**Status:** blocked` plus the reason under `## Comments`) |
| 3 | Opus | `code-review` (Standards + Spec) | small corrections; `**Status:** complete`, the closing note naming the PR and the ledger row, **all in one commit** on the PR branch | a large finding → ticket reopened, back to step 2 |

Merge is the human's: straight through when step 3 changed no code, otherwise the PR waits.

Refactoring outside what the ticket touched is not part of the ticket — it becomes a new
one with `**Type:** refactor`.
