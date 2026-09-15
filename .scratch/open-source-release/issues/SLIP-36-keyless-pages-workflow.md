# SLIP-36: The Pages build runs without Supabase secrets

**Status:** claimed
**Stage:** to-review
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
