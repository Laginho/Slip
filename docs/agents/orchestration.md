# Agent bindings for this repo

What an agent needs to know before touching this repo: where work is tracked, which
gates must pass, and the repo specifics no test can guess.

## Issues and specs

Local markdown tracker — see `docs/agents/issue-tracker.md` for the full conventions.
In short: one feature per `.scratch/<feature-slug>/` directory, spec at `spec.md`,
tickets at `issues/SLIP-<N>-<slug>.md`, where `SLIP-<N>` is unique across the whole repo.

## Branches

- Base branch: `main`. The user merges PRs; agents never push to `main`.
- Work happens on a feature branch off `main` (or the worktree branch the session was
  launched on).

## Gates

Run from the repo root:

- Test suite: `npm test` (vitest, whole suite; single file: `npx vitest run <path>`)
- Typecheck: `npx tsc -b` (strict, `noUnusedLocals` — unused imports fail the gate)
- Lint: none configured. `tsc -b` is the only static gate; do not invent a lint step.
- Build (when a change touches build config or the PWA shell): `npm run build`

## Repo specifics

- Tests use `src/testing.tsx` (act-wrapped `render`/`unmount`, media stubs, `typeInto`) —
  no component-testing library; reuse those helpers, don't add one.
- `sync` is mocked per-file with `vi.mock("./sync")`; localStorage key is `tasks/v1`
  (`STORAGE_KEY` in `src/store.ts`).
- Domain language: `docs/agents/domain.md`. Triage strings: `docs/agents/triage-labels.md`.

## Parallel work on one feature

- Tickets run in parallel only when their file sets are disjoint. When two tickets will
  edit the same file, the later one lists the earlier one under `Blocked by:` —
  integration blocking is real blocking, even when the spec does not depend on it.
- After every merge into `main`, rebase every open branch onto it and re-run the gates.
  Browser validation of a visual ticket happens on the merged state, never on an
  isolated branch.
