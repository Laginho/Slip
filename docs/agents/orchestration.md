# Agent bindings for this repo

What an agent needs before touching this repo: where work is tracked, which branch and
worktree to use, which gates must pass, and the repo and environment facts no test can
guess.

## Issues and specs

Local markdown tracker — see `docs/agents/issue-tracker.md` for the full conventions.
In short: one feature per `.scratch/<feature-slug>/` directory, spec at `spec.md`,
tickets at `issues/SLIP-<N>-<slug>.md`, where `SLIP-<N>` is unique across the whole repo.
Tickets created before that convention keep their old per-feature `NN-` numbering.

## Branches and worktrees

- Base branch: `main`. The user merges PRs; agents never push to `main`.
- A cycle works in `.claude/worktrees/<slug>/` on `claude/<slug>`, created from
  `origin/main` after a fetch, and is pushed as `feat/<slug>` for the PR.
- Disposal after the merge: `git worktree remove <path>` and delete the branch. The
  commits live on in `main`; keeping the husk only accumulates clutter.

## Gates

Run from the repo root of the checkout under test:

- Test suite: `npm test` (vitest, whole suite; single file: `npx vitest run <path>`).
  From the main checkout, `npm test` also walks every worktree under `.claude/worktrees/`
  and reports their files as part of the suite (27 files instead of 9 with two worktrees
  present). Run gates inside the cycle's worktree, or `npx vitest run --dir src` from the
  main checkout.
- Typecheck: `npx tsc -b` (strict, `noUnusedLocals` — unused imports fail the gate)
- Lint: none configured. `tsc -b` is the only static gate; do not invent a lint step.
- Build (when a cycle touches build config or the PWA shell): `npm run build`

## Repo specifics

- Tests use `src/testing.tsx` (act-wrapped `render`/`unmount`, media stubs, `typeInto`) —
  no component-testing library; reuse those helpers, don't add one.
- `sync` is mocked per-file with `vi.mock("./sync")`; localStorage key is `tasks/v1`
  (`STORAGE_KEY` in `src/store.ts`).
- Domain language: `docs/agents/domain.md`. Triage strings: `docs/agents/triage-labels.md`.

### Environment facts (added to at ticket close)

- jsdom does not reflect IDL properties such as `enterKeyHint`: assert with
  `getAttribute("enterkeyhint")`. It computes no layout, so assert declared inline styles
  (`el.style.minWidth === "44px"`), never sizes; it normalises hex colours to `rgb()`, so
  compare palette values through a hex→rgb helper (`toRgb` in `src/App.test.tsx`, `rgb` in
  `src/Card.test.tsx`). Known since Leva 1a and still cost slip-1b cycle 05: test matrices
  must spell the `rgb(...)` form, not the palette constant.
- Media stubs in `src/testing.tsx`: `stubNoMatchMedia`, `stubDesktopMedia`, `stubDarkMedia`,
  `stubMediaWithChangeListener`. Only the last records `change` listeners; `useMediaQuery`
  subscribes unconditionally, so a bare `{ matches, media }` stub throws (Leva 1b cycle 01).
- The Browser pane delivers no keydown, under desktop or touch emulation. Keyboard rows are
  validated by unit tests; in the browser, drive them with JS-dispatched `KeyboardEvent`s and
  say so in the PR.
- When a capture element changes tag or label, grep every legacy selector in
  `src/App.test.tsx` before the red commit. Cycle 02 of slip-1b lost a cycle to one
  `input[placeholder=…]` at a single line.
- `src/testing.tsx` already has `activate` (models the click a real Enter/Space produces on a
  button, which jsdom never synthesises), `click`, `dispatch`, `keyEvent`, `typeInto`,
  `queryLabel`, `seedStorage`, `throwOnSetItem`. Look there before writing a helper.
- `repeat(auto-fill, minmax(a, b))` counts its tracks by the definite maximum `b`: four
  300px tracks need 1248px, so the formula gave three columns at 1200px (ticket 04). When a
  ticket pins a CSS literal next to an outcome, prototype the literal in the browser before
  pinning it; what shipped is explicit `repeat(3|4, …)` from a 1168px media query in App.
- jsdom cannot verify a line clamp, a column count or a margin: PR #23's three defects all
  passed the suite. Layout tickets are gated by browser **measurements** against the
  ticket's outcome sentences (visible lines, columns, gaps in px), by implementer and
  reviewer alike, not by declaration tests and not by eyeballing.
- `index.html`'s reset does not touch `ul` margins, and React inline styles must not switch
  between a `margin` shorthand and `marginLeft`-style longhands across renders (React warns,
  the transition conflicts). `LIST`/`WALL` in `TaskList.tsx` use longhands on both branches.

## Solo TDD with cross-model review (from ticket 04 on)

One implementing session does red and green as separate commits with the `Role:` trailers,
validates in the browser and opens the PR; a reviewer of another vendor reads the red commit
against the matrix, every later test edit, the green against the spec, and runs the app for
layout tickets. Rules learnt on PR #23:

- The reviewer **reports, never commits**. Findings go back to the implementing session;
  the reviewer's corrections got no independent review before merge.
- A known spec violation blocks the PR. Disclosing it in the description is not stopping.
- Ticket and spec edits are tracker commits on `main` by the user or the spec author,
  before the correction, never inside the PR by the implementer.
- Master duties before the PR: re-run every gate in the worktree, diff against the Design,
  browser pass for visual tickets at 1280px light and 390px dark.
- After the merge the master closes the ticket in `.scratch/`: `Status: complete` plus the
  closing note naming the PR.

## Records

- Ledger: `.scratch/<feature-slug>/ledger.md` — committed, one row per cycle, **written
  only by the master on the feature's docs branch after validation**. Cycle branches never
  create or edit it: in Leva 1a four parallel cycles each created their own copy, producing
  add/add conflicts on every pair and duplicate cycle numbers.
- The PR description is the record of what was validated in the browser; the ledger row
  points at it and names the models that did the work.
- Created lazily on the first cycle of a feature.

## Parallel work on one feature

- Tickets run in parallel only when their file sets are disjoint. When two tickets will
  edit the same file, the later one lists the earlier one under `Blocked by:` —
  integration blocking is real blocking, even when the spec does not depend on it
  (Leva 1a: ticket 03 edits every file 01 and 04 touch, so it is blocked by both).
- After every merge into `main`, rebase every open branch onto it and re-run the gates
  before starting the next cycle on it. The browser validation of a visual ticket happens
  on the merged state, never on an isolated branch.
- One master session per feature. A second master repeats the numbering and ledger
  collisions above.
