# SLIP-38: README covers both sync paths; MIT LICENSE

**Status:** complete
**Stage:** to-merge
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

Context: `.scratch/open-source-release/spec.md` (README and LICENSE); ADR 0004; `PRODUCT.md`;
`README.md` as it stands.

**Blocked by:** SLIP-35, SLIP-36, SLIP-37, SLIP-39 (the README describes the first three as shipped, and it points strangers at the public URL, which SLIP-39 makes render).

- [x] `LICENSE` present, MIT, correct name and year; `package.json` has the license field
- [x] README sections in the order above; every command in it runs as written
- [x] Deploy section no longer claims the secrets are required
- [x] No claim in the README contradicts ADR 0001, ADR 0004 or `CONTEXT.md`

## Primary files

- `LICENSE` (new)
- `package.json` (the `license` field only)
- `README.md`
- `src/repo-metadata.test.ts` (new; the only test file this ticket touches)

## Tests stage 2 writes (own commit, red)

`src/repo-metadata.test.ts`, four cases, all reading files from the repo root:

1. `package.json` has `"license": "MIT"`. Red: the field is absent.
2. `LICENSE` exists and contains the MIT permission notice, "Bruno Lage" and "2026". Red: no file.
3. `README.md` no longer claims the secrets must be configured before the build can deploy
   (assert the current sentence "Before the build can deploy, configure" is gone). Red: it is there.
4. Every `npm run <script>` and `npm test` the README mentions is a key of `package.json`
   `scripts`. Green today (the README's commands exist) and stays green as a guard; it is
   what "every command in it runs as written" means for the npm commands. Shell commands
   (`bash scripts/setup-publish.sh`, `psql`) are checked by hand in stage 3, not by this test.

Not tested: README section order (prose structure; any harmless reorganisation would break it
without protecting anything) and the "no claim contradicts ADR 0001/0004/CONTEXT.md" criterion
(stage 3 reads for it).

## Comments

- 2026-09-16 Attempt 1 stopped to ask: SLIP-38 is a docs ticket (LICENSE, `package.json` license field, README rewrite) and the ticket file doesn't name a "Primary files" or "Tests stage 2 writes" section, so the seams aren't pre-confirmed. Proposed seams for the red→green tests, checked against a new `repo-metadata.test.ts`: /  / 1. `package.json` has `"license": "MIT"` / 2. `LICENSE` exists and contains MIT license text, "Bruno Lage", and "2026" / 3. `README.md` no longer contains the old claim that secrets must be configured before the build can deploy /  / Want me to proceed with these three, or add/drop any (e.g. also asserting the README section order or that referenced commands exist as npm scripts)? /

- 2026-09-17 Answered: proceed with the three seams proposed, plus one more — every `npm`
  command the README references exists in `package.json` `scripts` (the cheap half of
  "runs as written"). README section order stays untested: it is prose structure and the
  test would only break on harmless edits. Primary files and "Tests stage 2 writes" are now
  written above so the seams are pre-confirmed. Stage back to `to-implement`; resume attempt 2.

#### Resolution (2026-09-17)

Verdict: Approve. PR [#34](https://github.com/Laginho/Slip/pull/34) waits for the human read
because stage 3 committed code — `docs/agents/orchestration.md` merges straight through only
when step 3 changed nothing. Implement sonnet, review opus.

**Files.** `LICENSE` (new), `package.json` (`license` field), `README.md`,
`src/repo-metadata.test.ts` (new). Exactly the Primary files; nothing outside them.

**Red → green.** Red commit `e68705e`, tests only per `git diff --stat`, plus `3230537`,
which tightened the npm-script guard (it had excluded `test`, a real script key) before any
code landed — the implementer's own test in its own test commit, not a neighbour's, so no
block. At that tree three of the four cases fail for the reasons the matrix names: no
`license` key, no `LICENSE` file, and `README.md` still carrying "Before the build can
deploy, configure". Case 4 is green by design, a standing guard. Green commit `a795faa`
touches no test file.

**Gates** (repo root, branch `slip-38`): `npm test` 15 files / 344 tests passed;
`npx tsc -b` 0; `npx tsc --noEmit` 0 (the command the README itself prints); `npm run lint`
0; `npm run build` 0, `dist/` written, PWA precache 12 entries.

**Checked by hand**, since the suite cannot: `scripts/setup-publish.sh`,
`supabase/schema.sql`, `.env.example` and `.github/workflows/dump.yml` all exist; the
README's `psql` restore matches what `dump.yml` produces (`--no-owner --data-only
--table=public.tasks`, `tasks-$(date -u +%F).sql`); `dump.yml` does exit 0 doing nothing
without `SUPABASE_DB_URL`; the Deploy section's CI list matches `pages.yml` and its Node 22
claim matches `node-version: "22"`; `https://laginho.github.io/Slip/` returns 200 against
`base: "/Slip/"`. Criterion 4 read against ADR 0001, ADR 0004 and `CONTEXT.md`: no conflict —
"no accounts", the Task shape and the Archive definition all match.

**Two corrections, both inside `README.md`, neither needing a new test:**

1. Option B claimed `setup-publish.sh` "walks through all of it" right after a list that
   ends in "enable GitHub Pages". The script has three stages — schema, capture URL and
   key, write `.env.local` plus the two GitHub secrets — and never touches Pages. Reworded
   to name what it covers and leave Pages as the manual step.
2. `PRODUCT.md` records "Interface language is Brazilian Portuguese throughout", and the
   README is English by ticket. A stranger following option A looked for "Archive" and
   "Sync"; the screen reads `ver concluídas` and `sincronizar`. Added the language note to
   Install and the real labels to option A.

**For the next ticket that writes user-facing docs:** the UI is Portuguese and the README is
English. Any instruction that names an on-screen control has to carry the Portuguese label,
because no test in this repo can catch a README pointing at a word the app never shows.
