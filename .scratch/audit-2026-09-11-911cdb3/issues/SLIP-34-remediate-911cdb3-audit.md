# SLIP-34: Remediate the 2026-09-11 audit at `911cdb3`

**Status:** complete
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
- 2026-09-11 — Closed by `fix/audit-911cdb3-remediation` (PR #28). Red `d2dc025`
  (`src/useSession.test.tsx` only: a `describe.each` over complete and discard, the
  storage-event-after-action case failing for each, the event-before case kept as a
  passing control), green `b4aae58` (`src/useSession.ts` only: both actions route
  through `undoable()`, which reads the snapshot from the reconciled list `mutate()`
  hands the operation; `current()` is gone). The audit report, untracked at `911cdb3`,
  is added by `4728384` in the same PR.
- 2026-09-11 — Review (Opus 5, PR #28). Red reproduced independently at `d2dc025`:
  `npx vitest run src/useSession.test.tsx` → 2 failed / 23 passed, both
  `expected 'original' to be 'saved in A'`, both controls green. Gates re-run at
  `4728384` from a clean `npm ci` worktree: 13 files / 315 tests, `npx tsc -b`,
  `npm run lint`, `npm run build` (12 precache entries), all clean. Browser pass
  repeated with a second harness on `localhost:5191/slip/` serving this branch: a
  same-window `setItem` models the other window's save, since the writing window gets
  no `storage` event of its own — seed `review original`, write `edited elsewhere` with
  a newer stamp, click ✓ (then × in a fresh run), dispatch the late `StorageEvent`,
  click `desfazer`. Storage keeps `edited elsewhere` both times (open again after the
  completion undo, tombstone lifted after the discard undo), and the Card renders it.
  Control with `911cdb3`'s `useSession.ts` dropped into the same server: the same
  sequence writes `review original` back — the finding, reproduced and then gone. No
  console errors. Nothing corrected, no residual worth a ticket; the no-PR-CI Process
  note stays open by design.
