# SLIP-39: The deployed Pages app is blank — base path case does not match the repo

**Status:** complete
**Stage:** done
**Type:** fix
**Blocked by:** SLIP-37 (both edit `src/publish.test.ts`, and SLIP-37 runs first. Nothing
else couples them: flip the order if the blank public URL should be fixed sooner)
**Review:** human

- Primary files:
  - `vite.config.ts` (`base`, the manifest's `start_url` / `scope`, and workbox's
    `navigateFallback` — all four `/slip/` literals in the file, nothing else)
  - `src/publish.test.ts` (the two cases at lines 63-76 only)
  - `src/identity.test.ts` (Row 3, lines 26-34 only — the guard SLIP-31 left behind; its
    four regexes and the test name move from `/slip/` to `/Slip/`, nothing else in the file)

#### What to build

`https://laginho.github.io/Slip/` renders an empty page. The repo is `Slip`, so Pages
serves it under `/Slip/`, but `vite.config.ts:24` sets `base: "/slip/"`. The HTML is
fetched fine and then every reference inside it points at a path GitHub does not serve:

    GET https://laginho.github.io/Slip/                         -> 200
    GET https://laginho.github.io/slip/assets/index-CtrhJ4bo.js -> 404
    GET https://laginho.github.io/slip/registerSW.js            -> 404

There is no lowercase URL that works either: `https://laginho.github.io/slip/` returns
GitHub's "Site not found". After this ticket, opening the public URL mounts the app —
Capture pill, list, Archive — and the PWA installs and launches under the same path.

Broken since `c0ed69c`, the commit that first added Pages publishing, so the deployed
build has never rendered; local `npm run dev` is unaffected because there the served path
and `base` agree. Found while walking the user through SLIP-36's post-merge steps.

#### Why the suite stayed green

`publish.test.ts` does the right thing structurally — `beforeAll` runs a real Vite build
into a temp dir and the two cases assert on the emitted `index.html` and
`manifest.webmanifest`, not on the config source. They were simply pinned to the same
lowercase literal as the bug: `toContain("/slip/")`, `start_url`, `scope`. The seam is
sound; only the expected value is wrong.

Repointing those three literals at `/Slip/` is the whole test change. Deriving the
expected base from the repo name was considered and rejected: the checkout directory is
not the repo name (worktrees), and reading the git remote inside a unit test buys little
against a rename that happens approximately never.

#### Acceptance criteria

1. The built `index.html` references its assets under `/Slip/`; no reference to
   `/slip/` survives anywhere in `dist/`.
2. The built `manifest.webmanifest` has `start_url` and `scope` equal to `/Slip/`.
3. `publish.test.ts` pins `/Slip/` in both cases and is red against the current
   `vite.config.ts`. No other test file is touched.
4. After merge and deploy, `https://laginho.github.io/Slip/` mounts the app: the Capture
   pill and the list render, and the console reports no 404. Verified in a browser —
   no unit test can see GitHub Pages, and pinning the declaration is what hid this bug
   for the life of the repo.

#### Verification

    npm test
    npx tsc -b
    npm run build
    grep -ri '/slip/' dist/ ; # expect no hits
    # after deploy: open https://laginho.github.io/Slip/ and read the console

## Tests stage 2 writes (own commit, red)

- `src/publish.test.ts`, the two existing cases at lines 63-76, against the real build
  output already produced in `beforeAll`. Red because `vite.config.ts` still emits
  `/slip/`: `toContain("/Slip/")` fails on the HTML, and `start_url` / `scope` come back
  `/slip/`. Rename both cases so they read `/Slip/`.
- `src/identity.test.ts` Row 3, the same commit. Today it pins the four `vite.config.ts`
  literals *to* `/slip/`, so it is the exact inverse of criterion 1 — leave it and the
  ticket is unbuildable. Flip its four regexes and the test name to `/Slip/`; it stays a
  guard, now guarding the right casing.

A repo-wide sweep confirms these three files hold every `/slip/` pin: no workflow, no doc,
no `package.json`, no hardcoded `github.io` URL. Nothing else can surprise attempt 3.

## Comments

- 2026-09-15 Attempt 1 stopped to ask: Found a gap before writing any code: the ticket restricts `vite.config.ts` edits to `base` and the manifest's `start_url`/`scope` ("nothing else"), but I built the current config and confirmed `dist/sw.js` also bakes in a literal `/slip/` via `workbox.navigateFallback: "/slip/index.html"` — that's not derived from `base`, it's a separate hardcoded path. Criterion 1 ("no reference to `/slip/` survives anywhere in `dist/`") can't pass without touching that line too. /  / - `registerSW.js`'s `/slip/` (service worker path + scope) *is* auto-derived from `base` — no ticket conflict there. / - `sw.js`'s `createHandlerBoundToURL("/slip/index.html")` comes straight from the `navigateFallback` literal, which the ticket's Primary-files scope excludes. /  / This is a seam the ticket doesn't name, so per the loop's rules I'm stopping rather than quietly going out of scope. Options: / 1. Reopen at stage 1 to add `workbox.navigateFallback` to SLIP-39's Primary files (one-line fix to the ticket), or / 2. You confirm now that I should include that line since it's in the same file already in scope, and I'll proceed. /  / Which do you want? /

- 2026-09-15 Answered: option 2. Include `workbox.navigateFallback` — same file, same
  literal, and criterion 1 cannot pass without it since `dist/sw.js` bakes that path in
  directly rather than deriving it from `base`. Primary files now name it. Stage back to
  `to-implement`; resume attempt 2.

- 2026-09-16 Attempt 1 stopped to ask: Stopped, per the loop's rules — found a second gap the ticket doesn't cover. /  / The test-only commit for `src/publish.test.ts` landed clean (red for the right reason). But fixing `vite.config.ts`'s four `/slip/` literals breaks a guard test at `src/identity.test.ts:27-33` — added by the earlier rename-to-Slip ticket (SLIP-31) to stop *that* ticket from touching path casing while it changed branding. It's not in SLIP-39's Primary files, so I reverted the `vite.config.ts` edit, left everything else untouched, and recorded the gap on the ticket (blocked, on branch `slip-39`). /  / Two ways to proceed: / 1. Reopen at stage 1 to add `src/identity.test.ts` (lines 27-33) to Primary files. / 2. Confirm now that I should update that guard's four regexes to `/Slip/` in place, and I'll continue. /  / Which do you want? /

- 2026-09-16 Answered: option 1. `src/identity.test.ts` Row 3 is now in Primary files —
  it is a stale guard from SLIP-31, pinning the very casing this ticket exists to change,
  so updating it *is* the fix, not scope creep. I also swept the repo: `vite.config.ts`,
  `src/publish.test.ts` and `src/identity.test.ts` are the only files holding a `/slip/`
  pin, and all three are now in scope. Stage back to `to-implement`; resume attempt 2.

#### Resolution (2026-09-16)

Verdict: Needs your call: criterion 4 is the live Pages URL, which no gate on this
branch can reach — open `https://laginho.github.io/Slip/` once the session PR merges and
the deploy runs, and confirm the app mounts with a clean console.

**Decision.** Approved on the three criteria a checkout can prove. Criterion 4 is held
open by construction, not by doubt: the fix is exactly the one the ticket diagnosed, and
the build output now agrees with the path GitHub serves this repo under. Nothing about it
is verifiable before it is deployed — which is the same blind spot that let this bug live
since `c0ed69c`, so it is named here rather than waved through.

**Files**

- `vite.config.ts` — all four `/slip/` literals (`base`, `start_url`, `scope`,
  `workbox.navigateFallback`), nothing else
- `src/publish.test.ts` — the two cases at lines 63-76
- `src/identity.test.ts` — Row 3's four regexes and test name, plus the row comment
  (the review's own fix)

**Criteria**

1. ✅ `grep -rc '/slip/' dist/` after a clean build: zero hits in any file. The four
   `/Slip/` references in `dist/index.html`, two in `manifest.webmanifest`, two in
   `registerSW.js` and one in `sw.js` are all correct-cased.
2. ✅ `dist/manifest.webmanifest` has `start_url` and `scope` both `/Slip/`, asserted
   by `publish.test.ts` against the real build in `beforeAll`.
3. ✅ `publish.test.ts` pins `/Slip/` in both cases and was red against the pre-fix
   config. The criterion's trailing clause "No other test file is touched" was overtaken
   by the ticket itself: the 2026-09-16 answer put `src/identity.test.ts` Row 3 in Primary
   files and in "Tests stage 2 writes", because that row pinned the exact casing this
   ticket exists to change. Primary files and the tests section are the binding lists; the
   stale clause in the criterion was not folded to match, and is the ticket's defect, not
   the implementation's.
4. ⏸️ Post-deploy only. See the verdict.

**Red-green proof**

- Reverting `vite.config.ts` to its pre-fix state (`3d4250b~1`) and re-running the two
  files gives `Tests 3 failed | 25 passed (28)`: `publish.test.ts` fails on
  `expect(html).toContain("/Slip/")` (the built HTML carries `/slip/assets/...`) and on
  `expect(manifest.start_url).toBe("/Slip/")` (`expected '/slip/' to be '/Slip/'`), and
  `identity.test.ts` Row 3 fails on the `base` regex. Red for the three reasons the
  ticket's matrix names.
- Green with the fix, on the session branch after the merge: `Test Files 14 passed (14)`,
  `Tests 340 passed (340)`.
- `diff --stat` separation holds. `3d4250b` touches `src/publish.test.ts`,
  `src/identity.test.ts` and the ticket's `Stage:` line — test files only. `8d3a147`
  touches `vite.config.ts` and the `Stage:` line — no test file.

**Review fix** (`e65e805`, comment only). Row 3's header comment still read
"GREEN guard: base/start_url/scope/navigateFallback unchanged" — SLIP-31's description of
a guard this ticket deliberately inverted. Left alone, the file told a future reader the
opposite of what its own assertions do. Small by the mechanical test: inside Primary files
(Row 3, lines 26-34) and needs no new test.

**Sweep.** `grep -rn '/slip/' -i` across the repo, excluding `node_modules`, `dist` and
`.scratch`, returns hits in those three files only. `.github/workflows/pages.yml` uploads
`dist` wholesale and pins no path, so nothing outside the ticket's scope can reintroduce
the lowercase form.

**Gate** (`npm test && npx tsc -b && npm run lint && npm run build`, on the session branch
after the merge): 340 tests passing across 14 files; `tsc -b`, `eslint --max-warnings=0`
and the Vite/PWA build all clean.

**Loop base.** `sweatshop/2026-09-16-1825` was open and unmerged into `main`, so it is the
base: `slip-39` was already on top of it (no rebase needed), merged `--no-ff`, no PR and no
push. `Review: human` holds nothing inside a session branch — it only puts this ticket at
the top of the session PR the driver opens when the run stops.
