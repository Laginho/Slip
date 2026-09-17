# Open-source release — bring your own key

Status: complete

Grilled and confirmed with the user on 2026-09-15 (`/grill-with-docs`). The decision and its
rejected alternatives are ADR 0004; read it first. Vocabulary: `/CONTEXT.md` (unchanged —
Slip remains single-user). ADR 0001 and `supabase/schema.sql` are untouched by this feature.

## Problem Statement

Slip is about to be published as an open-source repository. Two things stand in the way:

1. The GitHub Pages deploy bakes the author's Supabase anon key into the bundle. That was
   an accepted consequence of ADR 0001 when nobody knew the URL; a public README that
   explains how the app works turns it into "anyone who opens the URL reads and edits the
   author's list."
2. A stranger who likes the app has no way to get sync without forking the repo and
   wiring GitHub secrets. The README only documents that path, and there is no LICENSE.

A hosted multi-tenant version (OAuth, per-user RLS) was designed and rejected: it would make
the author an operator of other people's data. See ADR 0004.

## Solution

1. **Bring your own key (BYOK).** The published build ships keyless. A settings field,
   reached from the Archive, takes a Supabase URL and anon key and stores them on the
   device. `sync.ts` reads that first and the build-time env vars second. Empty fields
   mean "no sync", exactly as an unconfigured build behaves today.
2. **Keyless Pages workflow.** The "Require Supabase secrets" gate is removed; the build
   runs without the two secrets, which the user then deletes from the repository.
3. **Optional nightly dump.** A scheduled workflow runs `pg_dump` against a
   `SUPABASE_DB_URL` secret and stores the result as a short-lived artifact. Without the
   secret the job exits successfully doing nothing. It is the only backup a free-tier
   project will ever have, for the author and for every self-hoster.
4. **README and LICENSE.** MIT. The existing README grows to document both ways to get
   sync (paste a key; or fork and set secrets), keeps pointing at `scripts/setup-publish.sh`,
   and says the tracker lives in-repo under `.scratch/`.

## User Stories

1. As a visitor opening the public URL, I want a working local-only app with nobody's
   tasks in it, so that trying Slip costs nothing and leaks nothing.
2. As the author, I want to paste my project's URL and anon key once per device and have
   sync work as before, so that going keyless costs me two pastes, not my list.
3. As a technical user with my own Supabase project, I want the same field to give me
   sync from the hosted build, so that I never have to fork anything.
4. As a user who pasted a privileged key by mistake, I want the field to refuse it and
   say why, so that a `service_role` key never sits in a browser.
5. As a user with no Done Tasks yet, I want the settings to be reachable anyway, so that
   a fresh install can be connected on day one.
6. As a user, I want clearing both fields to stop sync and forget the key, so that a
   shared or sold device holds nothing of mine.
7. As a user, I want Capture, the Card gestures and the list to be exactly as they were,
   so that BYOK adds nothing to the screen I look at every day.
8. As a self-hoster, I want the fork-and-secrets path to keep working unchanged, so that
   the README's second option is not a lie.
9. As the author, I want a nightly dump of my database I can restore from, so that a
   merge bug in a deploy is not the end of the list.
10. As a stranger reading the repo, I want a README that explains what Slip is, how to
    run it, how to get sync, and a LICENSE that says what I may do with it.

## Implementation Decisions

**Where the configuration lives.** localStorage key `sync/v1`, value `{"url","key"}`.
`config()` in `src/sync.ts` returns the stored pair when both are non-empty, else the
`VITE_SUPABASE_*` env pair when both are set, else `null`. Nothing else in `sync.ts`
changes: same headers, same round trip, same merge. Read per call, as today, so a change
takes effect on the next sync without a reload.

**Validation at the field.** URL: must parse as a URL with the `https:` scheme; nothing
more (self-hosted Supabase exists). Key: non-empty, and refused when it matches the
privileged shapes the setup wizard already refuses (`service_role` in a decoded JWT
payload, or a `sb_secret_` prefix). A refused pair is not stored and the field says why in
one line. Saving with both fields empty removes `sync/v1`.

**Where the field is.** A "Sync" row at the bottom of the Archive section, in the style of
its existing link row. It opens the two inputs and a Save button in place; no route, no
modal, no gear icon in the main chrome. The Archive is currently unreachable when there are
no Done Tasks (`hasArchive` gates the toggle, the pull and Ctrl+H); that gate goes, so an
empty Archive shows only the Sync row. The Capture pill, Cards and Open list do not change.

**Precedence.** Device configuration wins over build-time env. This keeps the self-host path
(env set, nothing stored) working and lets a self-hoster point one device elsewhere.

**Keyless workflow.** Delete the "Require Supabase secrets" step. Keep the two `env:` lines
on the Build step so a fork that sets secrets still bakes them in, and the audit, test, lint
and typecheck steps as they are. `src/publish.test.ts` asserts the secrets are referenced; it
keeps asserting that, and any assertion on the gate step goes. `.env.example` stays.

**Nightly dump.** `.github/workflows/dump.yml`, `schedule: cron "0 3 * * *"` plus
`workflow_dispatch`. One job: if `secrets.SUPABASE_DB_URL` is empty, echo and exit 0;
otherwise `pg_dump --no-owner --data-only --table=public.tasks` to a file and upload it as an
artifact with `retention-days: 14`. No database restore automation; the README says how.

**README and LICENSE.** `LICENSE` is the MIT text with the author's name and 2026. The
existing `README.md` (run, test, deploy) gains: what Slip is (two paragraphs from
`PRODUCT.md`), install as a PWA from the public URL, sync option A (paste URL and anon key
into Archive → Sync), sync option B (fork, run `supabase/schema.sql`, set the two secrets,
enable Pages, `scripts/setup-publish.sh` already covers it), the nightly dump secret and
restore line, and a note that issues and ADRs live in-repo (`.scratch/`, `docs/adr/`). The
Deploy section stops saying the secrets are required before the build can deploy. English.

## Out of scope

Accounts, OAuth, per-user RLS, a composite primary key, an erasure endpoint, a privacy
policy, a second sync backend, import/export of the list, any change to `schema.sql`, ADR
0001, CONTEXT.md or the merge rule.

## Tickets

| Ticket | Type | Blocked by |
| --- | --- | --- |
| SLIP-35 sync reads a device-stored key; Sync row in the Archive | feat | — |
| SLIP-36 keyless Pages workflow | chore | SLIP-35 |
| SLIP-37 nightly pg_dump workflow | chore | — |
| SLIP-38 README and LICENSE | docs | SLIP-35, SLIP-36, SLIP-37 |
