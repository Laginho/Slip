# SLIP-31: Remediate the 2026-09-10 audit

**Status:** complete
**Type:** fix

**What to build:** every finding in `docs/audits/2026-09-10-459c704.md`, in the order
that report recommends.

- **Broken** — `CaptureBar.tsx`: a day field holding `0`/`00` made send and Enter
  silently inert. The send control now dims for an incomplete day.
- **Fragile** — `npm test` walked `.claude/worktrees/` and reported 852 tests from
  stale checkouts. Vitest is bound to `src/`; both worktrees disposed.
- **Fragile** — the "Palette Is Law" guard pinned 6 of the 20 frozen colours; it now
  pins every Card, ink, signal and light/dark chrome value.
- **Fragile** — DESIGN.md specified a bottom-anchored phone list the code retired at
  `c0ed69c`. Resolved by documenting the shipped top-to-bottom list.
- **Fragile** — `publish.test.ts` was coupled to one machine, to a tracker artifact and
  to a stray `dist/`. It now discovers Bash, spawns `scripts/setup-publish.sh` and
  builds into a fresh temp directory.
- **Slop/Process** — the remaining documentation, helper and process items listed in the
  audit's "All findings" and "Process" sections.

**Done when:** every named finding is closed, the four gates pass from a clean checkout,
and the remediation record states the real numbers.

## Comments

- 2026-09-10 — Closed by the remediation branch `fix/audit-2026-09-10-remediation`.
  Review of that work found five leftovers (a stale `bottom-anchored` comment, a third
  copy of `throwOnSetItem`, prose in the DESIGN.md padding token, an unenforced padding
  claim, and a `beforeAll` Vite build racing Vitest's 10s hook timeout); all five are
  fixed in the same branch. Gates re-run: 13 files, 305 tests, `tsc --noEmit`, lint,
  build.
- 2026-09-10 — Step-3 review (PR #25) re-ran all four gates and verified every finding
  closed and every coverage claim (App 110, Card 58, publish 18→12 by consolidation).
  Two documentation corrections committed by the reviewer: DESIGN.md's wall Task text is
  `6.67cqw`, not a flat 16px, and the remediation record said 1,000 lines where the rule
  applied was 800.
- 2026-09-10 — Count corrected while closing SLIP-32: `publish.test.ts` went 18 → 12
  blocks, which Vitest runs as 13 cases (one is an `it.each` of two rows). The ledger row
  said 11, undercounting by missing the `it.each`; this comment said 12 without saying of
  what. The audit at `942a105` flagged the two numbers disagreeing.
