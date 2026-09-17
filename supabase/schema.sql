-- Idempotent schema for the single canonical table behind ADR 0001's whole-document
-- union sync. One user, one baked-in key, no accounts: this table is world-readable
-- and world-writable by design, and the app defends itself by *validating and
-- rebuilding* every row it reads (toTask in src/store.ts). That deliberate public
-- exposure is a conscious decision of ADR 0001, not an oversight -- never "harden" it
-- with auth or RLS policies that the anon key cannot pass, or sync breaks.
--
-- Deletion is a flag (deleted), never a row removal: union merge would resurrect
-- anything purged on one device but still present on the other. There is therefore
-- NO DELETE policy and column DELETE is revoked.
--
-- The tasks_reject_stale trigger below is NOT that forbidden hardening: it blocks no
-- role and refuses no caller (anon grants and the three policies are untouched). It
-- only makes UPDATE monotonic on "updatedAt", so two clients whose POSTs cross cannot
-- regress each other -- the cross-client remainder of the 2026-09-17 audit, finding 1.

create table if not exists public.tasks (
  id        text primary key check (length(btrim(id)) > 0),
  text      text not null check (length(btrim(text)) > 0),
  kind      text not null check (kind in ('work', 'college', 'chore')),
  deadline  date,
  done      boolean not null default false,
  deleted   boolean not null default false,
  "updatedAt" bigint not null check ("updatedAt" between 0 and 4102444800000)
);

alter table public.tasks enable row level security;

-- Minimal surface for the anon role; everything else is revoked up front.
revoke all on table public.tasks from anon, authenticated;
grant select, insert, update on table public.tasks to anon;

drop policy if exists tasks_anon_select on public.tasks;
create policy tasks_anon_select
  on public.tasks for select
  to anon
  using (true);

drop policy if exists tasks_anon_insert on public.tasks;
create policy tasks_anon_insert
  on public.tasks for insert
  to anon
  with check (true);

drop policy if exists tasks_anon_update on public.tasks;
create policy tasks_anon_update
  on public.tasks for update
  to anon
  using (true)
  with check (true);

-- No DELETE policy: tombstone-only removal (deleted = true), per ADR 0001.
-- No purge. If a full wipe is ever wanted it must be a destructive op by the
-- owner, never something the anon key can reach.

-- Newer-stamp rule at the server boundary. The app POSTs its whole list with
-- Prefer: resolution=merge-duplicates (INSERT ... ON CONFLICT (id) DO UPDATE); a
-- client holding a pre-delete row must not overwrite the tombstone another client
-- already landed. A strictly older NEW is dropped (RETURN NULL skips the row, the
-- stored copy stands); equal stamps still land, since most rows of every round trip
-- are unchanged no-ops. INSERT needs no guard: a new id regresses nothing.
--
-- ORDERING ONLY. This does not replicate winner()'s tie-break (src/sync.ts:
-- tombstone first, then lower fingerprint) -- reproducing that JSON/collation
-- comparison in SQL is a trap, and winner() is deterministic and commutative, so an
-- exact tie converges on the clients' next round trip anyway.
create or replace function public.tasks_reject_stale()
returns trigger language plpgsql as $fn$
begin
  if new."updatedAt" < old."updatedAt" then
    return null;
  end if;
  return new;
end;
$fn$;

drop trigger if exists tasks_reject_stale on public.tasks;
create trigger tasks_reject_stale
  before update on public.tasks
  for each row execute function public.tasks_reject_stale();
