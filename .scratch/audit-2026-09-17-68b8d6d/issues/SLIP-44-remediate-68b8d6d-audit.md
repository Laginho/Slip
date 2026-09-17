# SLIP-44: Remediate the 2026-09-17 audit at `68b8d6d`

**Status:** ready-for-agent
**Type:** fix
**Blocked by:** none

**What to build:** the single finding in `docs/audits/2026-09-17-68b8d6d.md`.

- **Broken** — `roundTrip()` (`src/useSession.ts:121`) starts a round trip with no
  in-flight guard, so the mutation debounce, `online` and `visibilitychange` can each
  open a second one while the first is still pending. Each flight's POST
  (`src/sync.ts:224`) upserts the merge result *it* computed, and the server keeps
  whichever request lands last, not whichever is newer — the schema compares no
  `updatedAt`. One session, every request succeeding: hold the mount POST, delete a
  Task, let the debounced tombstone POST land, then let the mount POST finish. The
  remote row is Open again with its older stamp. Local storage still holds the
  tombstone and nothing re-sends it until the next trigger. Worse than the delay: a
  second device that syncs in that window shows the deleted Task, and one edit or
  completion there stamps it newer than the tombstone — the deletion is then lost for
  good, under ordinary single-user use. This breaks ADR 0001's one conflict rule.
  Fix: serialize round trips in the session hook — one flight at a time; a trigger that
  arrives mid-flight marks a follow-up, and exactly one follow-up runs from the latest
  list when the flight settles. `sync()` itself stays as it is.

**Done when:** the finding is closed, the four gates pass from a clean checkout, and the
PR description records the reproduction fixed against a stubbed backend that observes
the *remote* row. The audit report, untracked at `68b8d6d`, is added by the same PR.

**Regression:** control the completion order of two POSTs and assert on what the stub
backend holds, not only on local state — the existing stale-result tests already cover
local settlement and stay as passing controls. Matrix: (a) older POST completes after a
newer tombstone POST — remote keeps the tombstone; (b) same with an edit and with a
completion in place of the delete; (c) a mutation during a flight causes exactly one
follow-up round trip, and it carries the mutation; (d) three triggers during one flight
still coalesce into one follow-up; (e) a failed flight (sync resolves with the snapshot)
releases the guard so the next trigger flies.

**Out of scope, on record:** the audit also proposes enforcing the newer-stamp rule
atomically at the server boundary, so requests from separate clients or tabs cannot
regress each other either. On a world-writable anon table that needs a trigger or an RPC;
the per-session guard above closes the reproduced single-session defect on its own. The
cross-tab case is already the documented simultaneous-localStorage limitation. Whether
the server-side guard is worth a ticket is the human's call after this one lands.

## Comments

- 2026-09-17 — Opened straight at step 2 by the human's call, on the SLIP-34 precedent:
  the audit names the seam, the line and the fix, so there is nothing left for a step 1
  spec to decide. Auditor: GPT-6. Verdict: Not approved.
