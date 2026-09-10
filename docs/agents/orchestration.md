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
- Lint: `npm run lint` (eslint, `react-hooks` rules as errors, `--max-warnings=0`)
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

## The per-ticket flow, bound to this repo

`AGENTS.md` holds the three-step table. What each step means in this checkout:

**Step 1 — spec and tickets.** Tracker files are committed straight to `main` by the user
or the spec author. They are never written inside an implementation PR by the implementer:
when a ticket or a spec turns out to be wrong, the fix lands on `main` first, and only then
does step 2 restart from it.

**Step 2 — implement.** Work in `.claude/worktrees/<slug>/` on `claude/<slug>`, branched
from `origin/main` after a fetch, pushed as `feat/<slug>`. Two kinds of commit, in order:

- the red commit: test files only. Run the suite and record the failure count in the PR
  description — red for the reason the ticket's matrix names, never from a typo.
- green commits: no edit to a test file. If a committed test turns out to be wrong, stop —
  `**Status:** blocked`, the reason under `## Comments`, back to the human. Nobody fixes a
  neighbour's test in silence.

`git diff --stat` across those two commits is the whole guard; no second agent is watching.
Before opening the PR: every gate re-run inside the worktree, a diff against `DESIGN.md`,
and for a visual ticket a browser pass at 1280px light and 390px dark producing
**measurements** against the ticket's outcome sentences. jsdom verifies no line clamp, no
column count and no margin — PR #23's three defects all passed the suite.

A known spec violation blocks the PR. Disclosing it in the description is not stopping.

**Step 3 — review.** A session that did not implement, running `code-review` over Standards
and Spec: the red commit against the matrix, every later test edit, the green against the
spec, and the running app for a layout ticket. The reviewer may commit small corrections;
anything larger reopens the ticket and returns it to step 2. Closing is an item of the PR,
not a follow-up — `**Status:** complete`, the closing note naming the PR, and the ledger
row, in one commit on the PR branch. Five tickets once closed in git and not in the tracker
because closing was left for afterwards.

Merge is the human's, always: straight through when step 3 committed nothing, otherwise the
PR waits for a read.

## Records

- Ledger: `.scratch/<feature-slug>/ledger.md`, created lazily on the feature's first close.
  New features use `| Date | Ticket | Commit |`; the ledgers written under the retired PTMR
  loop keep their own columns. The reviewer appends the row in the closing commit of step 3.
- The PR description is the record of what was validated in the browser; the ledger row
  points at it and names the models that did the work.

## One ticket at a time

The unit is one ticket, spec to merge. Batching is what let a wrong plan cross three
sessions before anyone stopped it.

`Blocked by: SLIP-<N>, SLIP-<N>` stays, and stays honest: a later ticket that will edit a
file an earlier one touches lists it, even when the spec has no dependency between them.
It records the order to work in — not a licence to run two tickets at once.
