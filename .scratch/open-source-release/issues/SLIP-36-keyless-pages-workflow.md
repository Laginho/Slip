# SLIP-36: The Pages build runs without Supabase secrets

**Status:** complete
**Stage:** to-merge
**Type:** chore

**What to build:** Remove the "Require Supabase secrets" step from
`.github/workflows/pages.yml`. Keep the two `env:` lines on the Build step so a fork with
secrets set still bakes them in. Audit, Tests, Typecheck, Lint and Build steps stay as they are. `src/publish.test.ts` keeps
asserting that the workflow references `secrets.VITE_SUPABASE_URL` and
`secrets.VITE_SUPABASE_ANON_KEY`; any assertion that a missing secret fails the job goes. After merge the user deletes
the two repository secrets by hand (not the agent's job; note it in the PR description).

Context: `.scratch/open-source-release/spec.md` (Keyless workflow); ADR 0003 (Consequences).

**Blocked by:** SLIP-35 (deploying keyless before BYOK exists would cut the author's own sync).

- [ ] Gate step gone; Build step still carries both `env:` lines
- [ ] `publish.test.ts` green with the new assertions; no other test file touched
- [ ] `npm run build` succeeds locally with both env vars unset
- [ ] PR description tells the user to delete the two repo secrets after merge

## Comments

Implementation (2026-09-15): removed only the required-secrets step from
`.github/workflows/pages.yml`. Build retains both optional secret references;
Audit, Tests, Typecheck, Lint and Build are unchanged. Updated only
`src/publish.test.ts` to reject the gate and check the references on Build itself.

Red commit `b80f20c`: 1 failed / 338 passed (14 files), failing because the
required-secrets step was still present. Green: 339 passed (14 files),
`npx tsc -b`, `npm run lint`, and `npm run build` all passed in the worktree.
Both VITE_SUPABASE environment variables were unset throughout the green gates;
the worktree has only `.env.example`, with no loaded credential file.
No UI change; the diff introduces no DESIGN.md conflict.

PR handoff: after merge, the user must manually delete repository secrets
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Existing secrets remain honoured
until removed. Review and merge remain pending; implemented in Codex with the
user's explicit model override.

---

#### Resolution (2026-09-15)

**Approved.** PR #30. Stage 3 changed no code — the branch merges exactly as stage 2 left
it.

**Gate, re-run independently in the worktree with both `VITE_SUPABASE_*` unset:**
`npm test` 339 passed (14 files), `npx tsc -b` clean, `npm run lint` clean,
`npm run build` ok. Only `.env.example` is present, so nothing supplied the vars implicitly.

**Red-green proof.** Restored `main`'s `pages.yml` over the worktree and ran
`npx vitest run src/publish.test.ts`: 1 failed / 12 passed, failing at
`publish.test.ts:103`, `not.toContain("Require Supabase secrets")` — red because the gate
step was still there, not from a typo. With the branch's `pages.yml` back: 13 passed.

**Commit separation holds.** `b80f20c` touches `src/publish.test.ts` and this ticket only;
`22bac3b` touches `.github/workflows/pages.yml` and this ticket only. No test file was
edited in a code commit.

**Criteria.** 1 ✅ — the gate step is gone and the Build step still carries both `env:`
lines (`pages.yml:40-44`). 2 ✅ — `publish.test.ts` green, and it is the only test file in
the diff. 3 ✅ — `npm run build` succeeds with both vars unset, measured above. 4 ✅ — PR
#30's description opens with the manual step and names both secrets.

**Worth noting as an improvement, not a finding.** The old assertion matched
`\n {8}env:` anywhere in the file, so it would have passed even if the two secret
references had lived only on the removed gate step. Scoping them to a `buildStep` slice
closes that hole. When the slice regex fails to match, `buildStep` falls back to `""` and
the `toMatch` calls fail loudly — no silent pass.

**Standards.** No documented standard breached; the repo documents none beyond
`orchestration.md`, whose step-2 rules are met. No smell from the baseline worth a fix: the
three negative assertions are near-duplicates, but each pins a distinct removed artifact and
costs nothing. `.env.example` untouched, as the spec requires. Nothing outside the ticket's
stated surface.

**Files:** `.github/workflows/pages.yml`, `src/publish.test.ts`.

**Still the human's:** merging PR #30, then deleting the `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` repository secrets by hand. Until they are deleted the public
bundle still carries the author's key.
