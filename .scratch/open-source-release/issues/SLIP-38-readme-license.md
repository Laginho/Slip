# SLIP-38: README covers both sync paths; MIT LICENSE

**Status:** ready-for-agent
**Stage:** blocked
**Type:** docs

**What to build:** `LICENSE` with the MIT text, "Bruno Lage", 2026, and `"license": "MIT"` in
`package.json`. Extend the existing `README.md` (keep its Run, Test and Deploy sections) with,
in this order: what Slip is (two paragraphs drawn from `PRODUCT.md`); install as a PWA from the
public URL; sync option A — open the Archive, Sync row, paste your Supabase URL and anon key
(link to the Supabase docs for creating a project and running `supabase/schema.sql`); sync
option B — fork, run `schema.sql`, set the two repository secrets, enable Pages, or run
`bash scripts/setup-publish.sh`; the optional nightly dump, its `SUPABASE_DB_URL` secret and
the one-line `psql` restore; a note that tickets, specs and ADRs live in-repo (`.scratch/`,
`docs/adr/`, `CONTEXT.md`). The Deploy section stops saying the secrets must be configured
before the build can deploy: they are optional and only bake a key into a self-hosted build.
English.

Context: `.scratch/open-source-release/spec.md` (README and LICENSE); ADR 0003; `PRODUCT.md`;
`README.md` as it stands.

**Blocked by:** SLIP-35, SLIP-36, SLIP-37, SLIP-39 (the README describes the first three as shipped, and it points strangers at the public URL, which SLIP-39 makes render).

- [ ] `LICENSE` present, MIT, correct name and year; `package.json` has the license field
- [ ] README sections in the order above; every command in it runs as written
- [ ] Deploy section no longer claims the secrets are required
- [ ] No claim in the README contradicts ADR 0001, ADR 0003 or `CONTEXT.md`

## Comments

- 2026-09-16 Attempt 1 stopped to ask: SLIP-38 is a docs ticket (LICENSE, `package.json` license field, README rewrite) and the ticket file doesn't name a "Primary files" or "Tests stage 2 writes" section, so the seams aren't pre-confirmed. Proposed seams for the red→green tests, checked against a new `repo-metadata.test.ts`: /  / 1. `package.json` has `"license": "MIT"` / 2. `LICENSE` exists and contains MIT license text, "Bruno Lage", and "2026" / 3. `README.md` no longer contains the old claim that secrets must be configured before the build can deploy /  / Want me to proceed with these three, or add/drop any (e.g. also asserting the README section order or that referenced commands exist as npm scripts)? /
