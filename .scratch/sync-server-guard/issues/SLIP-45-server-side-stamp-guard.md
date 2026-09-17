# SLIP-45: Enforce the newer-stamp rule at the server boundary

**Status:** needs-triage
**Type:** fix
**Blocked by:** none

**What to build:** make `public.tasks` refuse a write that would replace a row with a
strictly older one, so two clients cannot regress each other the way one session could
before SLIP-44.

## Why this is still open after SLIP-44

SLIP-44 serialized round trips *inside one session hook* (`roundTrip()`,
`src/useSession.ts`). That closes the reproduced defect — one session, one tab — and
nothing more. The write itself is still unconditional: `sync()` POSTs the whole list to
`/rest/v1/tasks` with `Prefer: resolution=merge-duplicates` (`src/sync.ts:224`), which
PostgREST turns into `INSERT … ON CONFLICT (id) DO UPDATE`, and the schema compares no
`updatedAt`. Whoever lands last wins, newer or not.

So the hole that remains is across *clients*: the phone and the desktop, or two browser
windows, each holding a per-session guard that knows nothing about the other's flights.
Ordinary sequence, both requests succeeding:

1. Desktop reads the list, starts its POST.
2. Phone deletes a Task and its POST lands, tombstone stored.
3. Desktop's POST lands, carrying the pre-delete row. **The Task is Open again**, with
   the older stamp, and the phone's tombstone is gone from the server.
4. Any device that syncs now takes the Open copy. One edit or completion there stamps it
   newer than the tombstone and the deletion is lost for good.

This is the same failure mode the 2026-09-17 audit reported, minus the single-session
trigger SLIP-44 removed. The audit named it explicitly: *"a per-session guard alone cannot
order requests from separate clients"* (`docs/audits/2026-09-17-68b8d6d.md`, finding 1,
proposed fix).

**This is not the cross-window `localStorage` limitation** already documented in ADR 0001
and in `reconciled()`. That one is two windows racing on one device's local storage,
resolved by a read-merge-write and accepted as unreachable in practice. This is the
*remote* row, and the two clients need never be on the same device.

## The shape of the fix

A `BEFORE UPDATE` trigger on `public.tasks` that drops the write when the incoming row is
strictly older — roughly:

    create or replace function public.tasks_reject_stale()
    returns trigger language plpgsql as $fn$
    begin
      if new."updatedAt" < old."updatedAt" then
        return null;  -- skip this row; the stored, newer copy stands
      end if;
      return new;
    end;
    $fn$;

    drop trigger if exists tasks_reject_stale on public.tasks;
    create trigger tasks_reject_stale
      before update on public.tasks
      for each row execute function public.tasks_reject_stale();

Why this rung and not a higher one:

- **The client does not change at all.** `src/sync.ts` keeps its one POST, the app keeps
  ignoring the response body, and `merge()`/`winner()` stay exactly as they are. An RPC
  that merges server-side would work too, and is a much larger change for the same
  outcome.
- **It is atomic for free.** `ON CONFLICT DO UPDATE` holds the row lock while the
  `BEFORE UPDATE` trigger runs, which is the whole point — nothing to order by hand.
- **`INSERT` needs no guard.** A brand-new id cannot regress anything.
- **Equal stamps still pass.** The app POSTs the entire list every round trip, most rows
  unchanged, and those must keep landing as harmless no-ops.

**This is not the "hardening" `supabase/schema.sql` forbids.** Its header warns against
auth or RLS policies the anon key cannot pass. A trigger blocks no role and refuses no
caller — the anon grants and all three policies stay exactly as they are; it only makes an
`UPDATE` monotonic. Say so in the schema, beside the existing warning, or the next reader
reverts it on sight.

## Open decisions — this is why the ticket is `needs-triage`

**1. Does the trigger replicate `winner()`'s tie-break, or only the ordering?**

`winner()` (`src/sync.ts:155`) resolves an exact `updatedAt` tie by preferring the
tombstone, then the lower `fingerprint()` — `JSON.stringify` of
`[id, text, kind, deadline, done, deleted]`. Reproducing that in SQL byte-for-byte is a
trap: JSON escaping, `deadline` null-vs-date rendering, and `<=` comparing UTF-16 code
units in JS against the database collation in Postgres — which disagree on emoji, and Task
text can hold emoji.

Recommendation: **ordering only**, as sketched above. A tie means two devices acted on the
same Task inside the same millisecond, far rarer than the ordering bug this closes, and it
still converges: `winner()` is deterministic and commutative, so both clients compute the
same winner, re-merge it on their next read and write it back at an equal stamp the
trigger accepts. One extra round trip, no divergence. Stating the narrower rule in the
schema comment is part of the work — a future reader must not assume the server mirrors
`winner()` whole.

**2. How is this verified, given the suite has no database?**

This is the real cost of the ticket, and it must be decided before stage 2 starts.
`src/publish.test.ts:125` asserts on the *text* of `schema.sql`, and a text assertion that
the trigger exists proves nothing about whether it fires — precisely the declaration-test
failure this repo already paid for (`docs/agents/orchestration.md`: PR #23's three defects
all passed the suite). Options:

- **(a)** Text assertion in `publish.test.ts` **plus** a recorded manual run against a
  disposable Postgres, transcript in the PR description. This is what the audit itself
  recommends ("verify the sync fix against a disposable local backend before release").
  No new dependency, no CI change; the proof is a human artefact, not a gate.
- **(b)** A real Postgres in the test path (`pglite`, testcontainers, or a CI service
  container) and a genuine red test. Honest gate, but it is the first database dependency
  in a repo whose whole test story is jsdom and stubs, and it lands in CI for one trigger.

Recommendation: **(a)**, with the SQL transcript pasted into the PR. Revisit if the schema
ever grows a second piece of logic — one trigger does not buy a database in CI.

## Acceptance criteria

1. `supabase/schema.sql` refuses an `UPDATE` whose `NEW."updatedAt"` is strictly less than
   the stored `OLD."updatedAt"`, for the `anon` role, through the app's existing
   `Prefer: resolution=merge-duplicates` POST.
2. A write at an equal stamp still lands, and an `INSERT` of a new id is untouched.
3. The anon grants and the three existing policies are unchanged, no `for delete` policy
   appears, and the file stays idempotent end to end — safe to paste twice into the SQL
   editor, like the `create table if not exists` above it.
4. The schema says, beside the existing header warning, that the trigger is not the
   prohibited hardening, and that it enforces ordering only, not `winner()`'s tie-break.
5. `src/sync.ts`, `src/useSession.ts` and `src/store.ts` are not touched. If the fix seems
   to need a client change, that is the RPC design instead and this ticket is wrong: stop
   and say so.
6. ADR 0001's consequences record that the newer-stamp rule is now enforced at the server
   for ordering, narrowing "concurrent edits to the same task lose one side silently" —
   the trade-off is still accepted, but it no longer means a *newer* write can be lost.
7. README and `scripts/setup-publish.sh` still describe applying the schema correctly, and
   an existing deployment is told it must re-run `schema.sql` to pick the trigger up.

## Verification

    npm test && npx tsc -b && npm run lint && npm run build

Plus, per open decision 2(a): the SQL transcript against a disposable Postgres, showing an
older write refused, an equal write accepted and an insert unaffected, in the PR
description.

## Tests stage 2 writes (own commit, red)

Depends on open decision 2, which is why it is not written here yet.

Under (a): one case in `src/publish.test.ts`, beside the existing `"defines the canonical
Task table and permits no physical delete"`, asserting the trigger and its comparison are
present and that the grants and policies did not change. Red before the schema edit.
**This is a declaration test and proves only that the file says so** — the behavioural
proof is the transcript, and the ticket must not pretend otherwise.

Under (b): a real red test against a live Postgres, which is the honest gate and the
larger bill.

## Out of scope

Row-level auth, accounts, RLS the anon key cannot pass, purging, and any second sync
backend — all refused by ADR 0001 and `schema.sql`'s header. Also out: a server-side
implementation of the whole `merge()`, which is the RPC design this ticket deliberately
does not take.

## Comments

- 2026-09-17 — Opened on the human's instruction, straight after SLIP-44 merged (PR #43,
  `2d05699`), which recorded this as the deliberate out-of-scope remainder of the audit's
  finding 1. Filed by Opus 5 rather than the step-1 model, on the human's direct request.
  Left at `needs-triage` rather than `ready-for-agent` because the two open decisions
  above are genuinely undecided, and an AFK agent would have to guess at both.
