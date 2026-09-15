# SLIP-37: Optional nightly pg_dump of the tasks table

**Status:** ready-for-agent
**Stage:** blocked
**Type:** chore

**What to build:** `.github/workflows/dump.yml` on `schedule: "0 3 * * *"` and
`workflow_dispatch`. One job on `ubuntu-latest`: if `secrets.SUPABASE_DB_URL` is empty, print
"no SUPABASE_DB_URL secret; skipping" and exit 0. Otherwise run `pg_dump` against the secret
with `--no-owner --data-only --table=public.tasks`, writing `tasks-<YYYY-MM-DD>.sql` (the
runner image ships `pg_dump`; install `postgresql-client` if it does not), and upload the file
with `actions/upload-artifact`, `retention-days: 14`. The secret reaches only that step's
`env:`. No restore automation.

Context: `.scratch/open-source-release/spec.md` (Nightly dump); ADR 0003.

**Blocked by:** nothing (SLIP-36 edits `pages.yml`, a different file).

- [ ] Workflow present with schedule + manual trigger
- [ ] Empty secret → job succeeds and prints the skip line (verify via `workflow_dispatch`
      on the PR branch, or by running the step's shell locally with the var unset)
- [ ] With the secret set: artifact named `tasks-YYYY-MM-DD.sql`, 14-day retention
- [ ] Secret appears only in the dump step's `env:`, never at job level

## Comments

- 2026-09-15 Attempt 1 stopped to ask: ...flows/dump.yml`) — no application code, no seam. The ticket confirms this: it has no "Tests stage 2 writes" section, and its acceptance criteria describe manual verification only (`workflow_dispatch` on the PR branch, or running the step's shell locally). The repo's gate (`npm test && npx tsc -b && npm run build`) doesn't touch workflow YAML either, and there's no existing pattern here for testing `.github/workflows/*` (only `pages.yml` exists, from an unmerged SLIP-36). /  / Per the loop's stage-2 override, a ticket needing a seam it doesn't name goes back to stage 1 — but this ticket may simply not need one; it's infrastructure config, not testable code. Two ways to proceed: /  / 1. **No automated test** — implement `dump.yml` directly per the "What to build" spec, verify the acceptance criteria manually (dispatch run + local shell check with the secret unset), commit as one change, `Stage: to-review`. / 2. **Send back to stage 1** to have it name a seam explicitly (e.g., a shell script wrapping the skip-logic that a test could exercise). /  / I'd go with option 1 — writing a test-shaped wrapper around a 15-line CI skip-check would be scaffolding for its own sake. Want me to proceed that way? /
