# SLIP-37: Optional nightly pg_dump of the tasks table

**Status:** ready-for-agent
**Stage:** to-implement
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
