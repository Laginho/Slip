# Remediation of the 2026-09-09 audit

The original audit remains unchanged. This records the corrective work, not a new
independent audit verdict.

- First completion now reruns the Archive scroll effect when `hasArchive` changes.
  A regression test starts with an empty Archive.
- An entered day outside 1–31 now refuses capture and preserves the fields. The
  regression test checks that no Task is persisted for day 32.
- ADR 0002 is superseded by ADR 0003. CONTEXT describes derived ordering and explicitly
  disclaims equal-ranked and dateless ordering guarantees across devices.
- DESIGN includes the complete dark chrome palette.
- Removed unused `setDeadline`, the three test `@ts-nocheck` directives, duplicate
  media stub implementations, and repeated Card button handling.
- Added official Node test typings, a React hooks lint gate enforced in CI, and a
  README. Hook dependencies now pass lint without suppressions.
- AGENTS, CLAUDE, and orchestration describe solo TDD and opt-in PTMR consistently.
  Existing transient tracker reports and handoffs are ignored. The separate historical
  tracker migration described in `tracker/check-report.md` remains outside this product
  audit remediation; `.scratch/` remains the documented live tracker.

## Verification

- `npm test`: 28 files, 851 tests passed (two regressions added; two obsolete
  `setDeadline` tests removed).
- `npm run lint`, `npx tsc --noEmit`, and `npm run build`: passed.
- Dependency installation audit: zero vulnerabilities after updating `fast-uri`.
- Local browser: day 32 retained text and day without creating a Card; correcting
  the input allowed capture. First completion set `scrollTop` to 60; the remaining
  Card stayed near the top (16px before, 12px after), without the audited 56px shift.
- Terra subagents implemented the fixes; a final Terra review found no remaining
  named audit defect.
