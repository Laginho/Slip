# SLIP-33: Remediate the 2026-09-11 audit at `4f14c90`

**Status:** complete
**Type:** fix

**What to build:** every finding in `docs/audits/2026-09-11-4f14c90.md`, in the order
that report recommends.

- **Broken** — `useSession.ts` loads the list once per mounted session and every mutation
  rewrites the whole `tasks/v1` document from that session's in-memory copy. A second
  same-origin window (installed PWA beside a browser tab) therefore overwrites what the
  first one saved: capture `A` in window A, capture `B` in window B, reload A — `A` is
  gone. No server is involved; it contradicts the local-first persistence promise.
  Fix at the persistence boundary: before every write, fold the persisted document into
  the session's list with the existing `merge` rule, and adopt other windows' writes
  through the `storage` event. Regression: two hook instances over one storage preserve
  both captures and honour an edit/tombstone from the other instance.
- **Slop** — `task` implemented three times (`testing.tsx`, `store.test.ts`,
  `sync.test.ts`) and `submitCapture` twice (`App.test.tsx`, `App.capture.test.tsx`).
  One copy each, in `src/testing.tsx`.

**Done when:** both findings are closed, the four gates pass from a clean checkout, and
the two-window scenario is reproduced fixed in a real browser with the measurement in
the PR description. The Process note (no PR CI) stays unactioned by design — `AGENTS.md`
makes the merge the human's call.

## Comments

- 2026-09-11 — Closed by `fix/audit-4f14c90-remediation`. Red `e2bb6d6` (four two-window
  tests, three failing for the audit's reason; `task`/`submitCapture` down to one copy
  each in `src/testing.tsx`), green `036ff27` (`reconciled()` in `useSession.ts`: every
  write starts from the held list merged with `load()`; a `storage` listener adopts the
  other window live). The audit report, untracked at `4f14c90`, is added by the same PR.
- 2026-09-11 — Gates at `036ff27`: 13 files / 311 tests, `npx tsc -b`, `npm run lint`,
  `vite build` clean. Browser, two tabs on one origin with Supabase unset: capture in
  each, reload the first, both listed and both stored; delete in one, the other drops it
  and storage holds the tombstone; no console errors. Left unactioned by design: the
  Process note that CI runs no job on pull requests.
- 2026-09-11 — Review (Opus 5, PR #27). Red reproduced independently: `src/useSession.ts`
  reverted to `main`, `npx vitest run src/useSession.test.tsx` → 3 failed / 18 passed, the
  two-window captures keeping only the second and the `storage` event adopting nothing.
  Green at `036ff27`: 13 files / 311 tests, `npx tsc -b` and `npm run lint` clean. Browser,
  two real tabs on `localhost:5177`: tab 1 captures `REV A` → tab 2 shows it live without a
  reload; tab 2 captures `REV B` → storage holds both; reload tab 1 → both listed, which is
  the audit's symptom gone; delete `REV A` in tab 1 → tab 2 drops it and storage keeps it as
  a tombstone beside an open `REV B`; no console errors in either tab. One correction
  committed: four stray blank lines left behind where the duplicated helpers were removed.
  Two residuals, neither worth a ticket: `onStorage` ignores `event.key === null`, the shape
  a `localStorage.clear()` in another window fires, and `merge` appends the other window's
  new ids, so two windows can order dateless Tasks differently — a divergence `sync` already
  had. Closing was written by the implementing session; per `orchestration.md` step 3 that
  commit belongs to the reviewer, and the ledger row below is corrected to name both.
