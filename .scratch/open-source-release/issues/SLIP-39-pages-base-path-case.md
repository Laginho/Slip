# SLIP-39: The deployed Pages app is blank — base path case does not match the repo

**Status:** ready-for-agent
**Stage:** to-implement
**Type:** fix
**Blocked by:** SLIP-37 (both edit `src/publish.test.ts`, and SLIP-37 runs first. Nothing
else couples them: flip the order if the blank public URL should be fixed sooner)
**Review:** human

- Primary files:
  - `vite.config.ts` (`base`, and the manifest's `start_url` / `scope` — nothing else)
  - `src/publish.test.ts` (the two cases at lines 63-76 only)

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

## Comments
