# SLIP-36: The Pages build runs without Supabase secrets

**Status:** ready-for-agent
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
