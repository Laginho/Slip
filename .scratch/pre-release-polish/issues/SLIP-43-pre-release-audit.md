# SLIP-43: No audit has seen the release surface

**Status:** ready-for-agent
**Stage:** to-implement
**Type:** chore
**Blocked by:** SLIP-40, SLIP-41, SLIP-42 (auditing before the known findings are fixed
spends the audit rediscovering them; SLIP-42 may stay open if the human prefers, and then
the audit records the border as a known deviation instead)
**Review:** human

- Primary files:
  - `docs/audits/<date>-<sha>.md` (new; the existing audits are dated records and are
    never edited)

#### What to build

The newest audit is `docs/audits/2026-09-11-911cdb3.md`. Everything that makes this repo
publishable landed after it:

| Ticket | Landed | What it changed |
| --- | --- | --- |
| SLIP-35 | 2026-09-15 | BYOK: `sync/v1`, `saveConfig`, the Archive's Sync row |
| SLIP-36 | 2026-09-15 | Keyless Pages workflow; the required-secrets gate removed |
| SLIP-37 | 2026-09-15 | `.github/workflows/dump.yml`, the nightly `pg_dump` |
| SLIP-39 | 2026-09-16 | `base: "/Slip/"` — the deployed app had never rendered |
| SLIP-38 | 2026-09-17 | `LICENSE`, the README a stranger actually reads |

So no audit has ever read the code a stranger will read, and the one deploy-breaking bug
this repo has shipped (SLIP-39) was found by a human opening the URL, not by a gate.

Run the repo's audit over `main` at its then-current SHA and write the record in the shape
the existing files use. The surfaces that have never been audited and that a public release
puts in front of strangers, in rough order of what a mistake would cost:

1. The key path end to end — `saveConfig`, `storedConfig`, `headers`, and what reaches
   `localStorage` versus what reaches a request.
2. `supabase/schema.sql` and its policies, read as "a stranger runs this against their own
   project": what the anon key can do to a table it owns.
3. The two workflows as a fork sees them — `pages.yml` keyless, `dump.yml` with and
   without `SUPABASE_DB_URL`, and what either can leak into a public log.
4. `scripts/setup-publish.sh` against its own guards, since it now handles other people's
   credentials and its Portuguese warnings sit under an English README.
5. Documentation against shipped behaviour, now that `README.md`, `PRODUCT.md`,
   `DESIGN.md`, `CONTEXT.md` and four ADRs all describe the same app to different readers.

#### Acceptance criteria

1. A new `docs/audits/<date>-<sha>.md` naming the SHA it read.
2. Every surface above either reported on or explicitly recorded as checked and clean —
   the existing audits' "Checked and *not* reported" convention.
3. Each finding carries a severity and the file and line it lives at.
4. Findings become their own tickets; the audit file itself fixes nothing.

#### Verification

    npm test && npx tsc -b && npm run lint && npm run build

Gates prove the tree the audit read was green, not that the audit is right.

## Comments

- 2026-09-17 Raised while checking whether the repo was ready for pre-release polish.
  Nothing in the tracker recorded the audit gap — it is visible only by comparing
  `docs/audits/` filenames against the dates of the SLIP-35..39 commits.
