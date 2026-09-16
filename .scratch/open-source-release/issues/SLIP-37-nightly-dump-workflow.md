# SLIP-37: Optional nightly pg_dump of the tasks table

**Status:** complete
**Stage:** done
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

- [x] Workflow present with schedule + manual trigger
- [x] Empty secret → job succeeds and prints the skip line (verify via `workflow_dispatch`
      on the PR branch, or by running the step's shell locally with the var unset)
      — executed 2026-09-16 via the local-shell half; see the Resolution block
- [x] With the secret set: artifact named `tasks-YYYY-MM-DD.sql`, 14-day retention
      — failed at review, fixed in `771b3c7`
- [x] Secret appears only in the dump step's `env:`, never at job level
- [x] `publish.test.ts` pins `dump.yml`'s two triggers, the skip branch, the `pg_dump`
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

#### Resolution (2026-09-15)

Verdict: Needs your call, answered by the human on 2026-09-16 — see "Execution" and
"Accepted debt" below. The review's objection stood: nothing had been executed, so the only
evidence for the two behavioural criteria was a reading of the YAML, which is exactly the
evidence SLIP-39 proved worthless. Criterion 2 has since been executed.

Merged into the session branch `sweatshop/2026-09-15-1701` (not `main`): see "Loop base"
below.

**Decision.** Two findings were small by the mechanical test — inside the Primary files,
no new test case — so stage 3 fixed them in `771b3c7` rather than reopening. Everything
else is recorded here, unfixed.

**Fixed at review**

1. *Criterion 3 was not met.* The upload named the artifact `tasks-dump` and dated only
   the file inside it, so every night landed as `tasks-dump.zip` and a reader scanning a
   run's artifacts could not tell one night from another. The dump step now exports the
   filename as `steps.dump.outputs.file` and the upload names the artifact after it. That
   same output replaced the invented `dumped=true` flag — one value now both names the
   artifact and gates the upload on the skip path, which also retires the one piece of
   unasked-for behaviour the Spec axis flagged.
2. *Criterion 5 was weaker than it read.* The case asserted against the whole file, so
   the "step-scoped secret" assertion would have passed with `SUPABASE_DB_URL` on the
   **upload** step, and `/exit 0/` matched anywhere. Both step blocks are now extracted in
   the neighbouring `pages.yml` case's style and the assertions scoped to them, plus
   `expect(uploadStep).not.toContain("SUPABASE_DB_URL")` and a pin on the artifact name —
   the one criterion the test could have caught and did not.

   Note for the human: this is stage 3 editing a test file. It only tightens — the
   red-green below shows the tightened case failing against the pre-fix workflow.

**Left for you (not fixed)**

3. `actions/upload-artifact@v4` is three majors behind the current `v7`. This repo's other
   workflow tracks current majors (`checkout@v7`, `setup-node@v7`, `upload-pages-artifact@v5`)
   and `publish.test.ts` pins each of them, so v4 is off-convention. Not bumped: v5 moves to
   Node 24 and v7 moves to ESM plus direct uploads, and none of that can be verified from
   here. Worth knowing for whoever does bump it — v7's `archive: false` makes the artifact
   take the uploaded file's own name, which is criterion 3 expressed natively, without the
   output indirection this ticket now uses.
4. No `permissions:` block, so the job inherits the repo default while holding a database
   secret; `pages.yml` declares least privilege. Not added — no criterion asks for it, and
   stage 3 does not widen a ticket. A `contents: read` line is the whole fix if you want it.
   — **Fixed on the human's call, 2026-09-16.** Top-level `permissions: contents: read`,
   mirroring `pages.yml`'s placement. No test pin: `publish.test.ts` does not pin
   `pages.yml`'s permissions either, so pinning here would invent a convention.
5. `sudo apt-get update && install` has no retry, so a transient mirror failure fails the
   nightly outright. Same reasoning: unasked-for.

#### Execution (2026-09-16)

Criterion 2 was run, by the second of the two routes the criterion itself offers:

    $ SUPABASE_DB_URL="" bash -c '<the dump step's shell, verbatim>'
    no SUPABASE_DB_URL secret; skipping
    exit=0

`gh secret list` is empty — SLIP-36 removed the two Pages secrets and the user deleted them
from the repository — so the skip path is the one this workflow actually takes today, not a
hypothetical. The upload step is skipped with it: `steps.dump.outputs.file` is only set on
the dump path, and `if: steps.dump.outputs.file != ''` gates the upload on it.

**The `workflow_dispatch` half of criterion 2 is unachievable as written.** Dispatching it
on the PR branch returns:

    HTTP 404: workflow dump.yml not found on the default branch

GitHub only registers `workflow_dispatch` for workflows already present on the default
branch; selecting a different ref comes after that. A CI ticket cannot ask for a dispatch
run as pre-merge evidence — the earliest it can be exercised is after the merge. Worth
knowing when writing the next one.

With the secret set, nothing is executed and nothing can be: there is no secret to set, and
supplying one would point a nightly `pg_dump` at a live database from a review. Criterion 3
rests on the tightened test and on reading.

#### Accepted debt (2026-09-16)

Findings 3 and 5 are accepted as debt on the human's call, with reasons, and get no ticket:

- **3, `upload-artifact@v4`.** It works. v7's gain over the current code is that
  `archive: false` expresses criterion 3 natively, replacing an indirection that is already
  written and pinned by a test. It rides along with the next actions bump of this repo,
  which touches `pages.yml` anyway.
- **5, no `apt-get` retry.** The `ubuntu-latest` image ships `pg_dump`, and the
  `command -v pg_dump` guard means the install branch does not normally run at all. A retry
  around a path that does not execute is scaffolding.

**Files**

- `.github/workflows/dump.yml` (new)
- `src/publish.test.ts` (one case)

**Red-green proof**

- Stage 2's red commit `65c11c8`, test-only: `1 failed | 13 passed` in `publish.test.ts`,
  the failure `ENOENT ... .github/workflows/dump.yml` at the `read()` helper — red for the
  reason the ticket's matrix named, the workflow not existing yet. Verified by moving
  `dump.yml` aside and re-running.
- The review's own fix: with `dump.yml` restored to its pre-fix state (`ae5c117`) and the
  tightened test in place, `publish.test.ts` gives `1 failed | 13 passed`, failing at
  `expect(uploadStep).toMatch(/name:\s*\$\{\{\s*steps\.dump\.outputs\.file\s*\}\}/)` —
  the artifact-name criterion. Green with the fix.
- `diff --stat` separation holds: `65c11c8` touches `src/publish.test.ts` and the ticket's
  `Stage:` line only; `ae5c117` touches `.github/workflows/dump.yml` and the `Stage:` line,
  no test file.

**Gate** (`npm test && npx tsc -b && npm run lint && npm run build`, on the session branch
after the merge): `Test Files 14 passed (14)`, `Tests 340 passed (340)`; `tsc -b`, `eslint
--max-warnings=0` and the Vite/PWA build all clean.

**Loop base.** `git branch --list 'sweatshop/*' --no-merged main` printed nothing, which by
the letter of the rule makes `main` the base and this a PR. It was overridden. That check
cannot fire for the first ticket of a run: a session branch that has collected nothing yet
sits exactly on the base, so "merged into main" and "live session with zero merges" are
indistinguishable to it. `sweatshop/2026-09-15-1701` was created at 17:01 and the run log's
last row is SLIP-37 reaching `to-review` at 17:03, so the run is live and a PR to `main`
would have stranded it. Not pushed: the driver pushes and opens the session PR when the run
stops.
