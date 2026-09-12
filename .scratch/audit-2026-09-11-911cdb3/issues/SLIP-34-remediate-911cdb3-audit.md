# SLIP-34: Remediate the 2026-09-11 audit at `911cdb3`

**Status:** ready-for-agent
**Type:** fix

**What to build:** the single finding in `docs/audits/2026-09-11-911cdb3.md`.

- **Broken** — `complete` and `discard` take the undo snapshot through `current()`
  (`src/useSession.ts:212`), which reads only `latest.current`, while the write that
  follows goes through `mutate`, which folds in the persisted document first
  (`src/useSession.ts:141`). When another window's edit has been saved but its `storage`
  event has not been handled here yet, the action correctly preserves that edit and the
  pending undo still holds the pre-edit text. Undo then restores the stale snapshot with
  a stamp that beats it, silently reverting text another window had saved — the exact
  failure the comment above `current()` says the snapshot exists to prevent.
  Fix: take the pre-action snapshot from the same reconciled list `mutate` hands to the
  operation, never from `latest.current`. Publishing the toast only after persistence
  lands already holds; keep it.

**Done when:** the finding is closed, the four gates pass from a clean checkout, and the
two-window undo scenario is reproduced fixed in a real browser with the measurement in
the PR description. The audit report, untracked at `911cdb3`, is added by the same PR.
The Process note (no PR CI) stays unactioned by design — `AGENTS.md` makes the merge the
human's call.

**Regression, both actions:** another session edits a Task's text, the `storage` event is
delivered **after** `complete` / `discard` runs, then undo — the other session's text
survives. Keep the event-**before** ordering as a passing control, and keep the
refused-write behaviour intact (no toast, nothing adopted).

## Comments

- 2026-09-11 — Opened straight at step 2 by the human's call: the audit names the seam,
  the line and the fix, so there is nothing left for a step 1 spec to decide. Step 2 runs
  on Sonnet at high effort; step 3 stays Opus per `AGENTS.md`.
