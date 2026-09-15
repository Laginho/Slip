# SLIP-37: Optional nightly pg_dump of the tasks table

**Status:** ready-for-agent
**Stage:** implementing
**Type:** chore

**What to build:** `.github/workflows/dump.yml` on `schedule: "0 3 * * *"` and
`workflow_dispatch`. One job on `ubuntu-latest`: if `secrets.SUPABASE_DB_URL` is empty, print
"no SUPABASE_DB_URL secret; skipping" and exit 0. Otherwise run `pg_dump` against the secret
with `--no-owner --data-only --table=public.tasks`, writing `tasks-<YYYY-MM-DD>.sql` (the
runner image ships `pg_dump`; install `postgresql-client` if it does not), and upload the file
with `actions/upload-artifact`, `retention-days: 14`. The secret reaches only that step's
`env:`. No restore automation.

Context: `.scratch/open-source-release/spec.md` (Nightly dump); ADR 0003.

**Blocked by:** nothing.

Ordering note (prose, not a dependency — ids here are deliberately not in the field
above, which the driver parses): the keyless-Pages ticket edits `pages.yml`, a different
file. The Pages base-path ticket also edits `src/publish.test.ts`, so the two never run at
the same time; that ticket lists this one as its blocker, which is enough.

- Primary files:
  - New: `.github/workflows/dump.yml`
  - `src/publish.test.ts` (one new case beside the existing `pages.yml` ones)

- [ ] Workflow present with schedule + manual trigger
- [ ] Empty secret → job succeeds and prints the skip line (verify via `workflow_dispatch`
      on the PR branch, or by running the step's shell locally with the var unset)
- [ ] With the secret set: artifact named `tasks-YYYY-MM-DD.sql`, 14-day retention
- [ ] Secret appears only in the dump step's `env:`, never at job level
- [ ] `publish.test.ts` pins `dump.yml`'s two triggers, the skip branch, the `pg_dump`
      flags, the retention and the step-scoped secret, in the style of the neighbouring
      `pages.yml` case; no other test file touched

## Tests stage 2 writes (own commit, red)

- `src/publish.test.ts`, one new case reading `.github/workflows/dump.yml` through the
  file's existing `read()` helper. Red before the change for the plainest reason there is:
  the workflow does not exist yet, so `read()` throws. It asserts the `schedule` cron and
  `workflow_dispatch` triggers, the empty-secret branch that echoes and exits 0,
  `--no-owner --data-only --table=public.tasks`, `retention-days: 14`, and that
  `SUPABASE_DB_URL` sits under a step-level `env:` and never at job level -- the
  neighbouring case pins that last one with `not.toMatch(/
 {4}env:/)`.

## Comments

- 2026-09-15 Attempt 1 stopped to ask: ...flows/dump.yml`) — no application code, no seam. The ticket confirms this: it has no "Tests stage 2 writes" section, and its acceptance criteria describe manual verification only (`workflow_dispatch` on the PR branch, or running the step's shell locally). The repo's gate (`npm test && npx tsc -b && npm run build`) doesn't touch workflow YAML either, and there's no existing pattern here for testing `.github/workflows/*` (only `pages.yml` exists, from an unmerged SLIP-36). /  / Per the loop's stage-2 override, a ticket needing a seam it doesn't name goes back to stage 1 — but this ticket may simply not need one; it's infrastructure config, not testable code. Two ways to proceed: /  / 1. **No automated test** — implement `dump.yml` directly per the "What to build" spec, verify the acceptance criteria manually (dispatch run + local shell check with the secret unset), commit as one change, `Stage: to-review`. / 2. **Send back to stage 1** to have it name a seam explicitly (e.g., a shell script wrapping the skip-logic that a test could exercise). /  / I'd go with option 1 — writing a test-shaped wrapper around a 15-line CI skip-check would be scaffolding for its own sake. Want me to proceed that way? /

- 2026-09-15 **Answered by stage 1, folded into the body above.** Option 1's premise is
  wrong: there *is* an existing pattern for testing `.github/workflows/*` in this repo.
  `src/publish.test.ts` has asserted on `pages.yml`'s contents all along -- that is the
  very case SLIP-36 rewrote, now merged as PR #30. So the seam this ticket was missing is
  named above, and it is the same class of content assertion as its neighbour.

  Be clear about what that test buys. It pins a declaration: it catches someone deleting
  the skip branch or the retention line, not whether `pg_dump` actually runs. SLIP-39 --
  filed today, the deployed app blank since the repo's first Pages commit precisely
  because a test pinned the same wrong literal as the config -- is the standing proof that
  a green content assertion is no evidence the thing works. Behaviour is covered by the
  `workflow_dispatch` criterion, and that stays manual.

  Stage 2 does not stop again on this question: write the red test case first, then
  `dump.yml`.
