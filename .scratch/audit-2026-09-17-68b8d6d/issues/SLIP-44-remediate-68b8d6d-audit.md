# SLIP-44: Remediate the 2026-09-17 audit at `68b8d6d`

**Status:** complete
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

#### Resolution (2026-09-17)

Verdict: **Approve.** Nothing corrected — the reviewer committed no code.

**Files.** `src/useSession.ts` (+23, the guard and its comment) and
`src/useSession.test.tsx` (+190). `src/sync.ts` untouched, as the ticket required.
Nothing else in `src/`.

**Red reproduced independently.** The reviewer restored `src/useSession.ts` to its state
at the red commit `731a77d` and re-ran the file: **5 failed / 26 passed (31)**, exactly
the count `731a77d` claims, and the five are the ticket's matrix (a)–(d):

    a held mount round trip landing after a debounced discard  does not undo it on the remote
    a held mount round trip landing after a debounced complete does not undo it on the remote
    a held mount round trip landing after a debounced edit     does not undo it on the remote
    a mutation during a flight causes exactly one follow-up, carrying it
    three triggers during one flight still coalesce into a single follow-up

Red for the audited reason, not a typo: the three `it.each` cases assert on
`backend.remote()` — the stub's own table, written only when a held flight is released —
so each fails because the older mount POST lands last and restores the pre-mutation row.
Matrix (e) passes pre-fix by construction (no guard exists to get stuck) and stays as the
control; `731a77d`'s message discloses that rather than claiming six reds.

**Green.** All four gates re-run by the reviewer inside the worktree from a clean tree:
`npm test` 15 files / **354 passed**, `npx tsc -b` clean, `npm run lint` clean
(`--max-warnings=0`), `npm run build` built (12 precache entries, 222.13 KiB).

**The guard cannot wedge — checked, because it is the failure this shape invites.**
`void sync(snapshot).then(...)` has no `.catch`, so a rejection would leave
`inFlight.current` true and kill syncing for the session. It cannot happen: `sync()`
(`src/sync.ts:208`) wraps the GET leg and the POST leg in separate `try/catch`es and
returns `local` on every failure path, and `config()` is total — `storedConfig()` catches
its own storage and `JSON.parse` throws, `envConfig()` reads two env slots. `sync()`
resolves or hangs; it never rejects. Release also precedes `settle()`, so even a throw
inside settlement leaves the guard open, and a `queued` flag stranded by such a throw is
drained by the next ordinary trigger rather than deadlocking. Criterion met by the code
as written, not by luck — but it is load-bearing on `sync()` staying total.

**Spec axis.** Serialized in the session hook, one flight at a time (criterion 1);
mid-flight triggers mark a follow-up and exactly one runs, from `latest.current` as it
stands at settlement, so it carries whatever happened during the flight (criteria c, d);
`sync()` unchanged; the audit report, untracked at `68b8d6d`, is added by this same PR in
`b89e27d`. The PR description records the reproduction against the stub backend observing
the remote row, as "Done when" demands. The server-side atomic guard stays out of scope
and on record, for the human's call.

No browser pass: this is sync logic with no rendered surface, not a layout ticket.

**Noted, not fixed, and not a ticket.** A follow-up round trip can now fire after unmount
if a trigger was queued during the final flight. `settle()` already ran post-unmount
before this change, the extra request sends the current list — which is what was wanted —
and guarding it would need a new test, which by the loop's rule is a reopen, not a small
fix. Recorded here so the next reader does not rediscover it as a defect.

Branch `fix/audit-68b8d6d-remediation`, PR #43. Red `731a77d`, green `39866b3`.
Implemented by Sonnet 5, reviewed by Opus 5. Merge is the human's.
