# SLIP-32: Remediate the 2026-09-10 audit at `942a105`

**Status:** complete
**Type:** fix

**What to build:** every finding in `docs/audits/2026-09-10-942a105.md`, in the order
that report recommends.

- **Broken** — no `overflow-wrap` anywhere in the app: `white-space: pre-line` wraps at
  spaces only, so a Task holding an unbreakable token (a pasted URL, a boleto number, a
  Windows path) painted outside its Card on both profiles.
- **Fragile** — `index.html`'s viewport capped zoom at `maximum-scale=1.0`, blocking
  pinch-zoom on the Android Chrome profile `PRODUCT.md` names as primary and failing
  WCAG 1.4.4.
- **Fragile** — three DESIGN.md claims the shipped code contradicts (Archive position,
  toast alignment, archive row size), plus the input font-size claim found while
  verifying finding 2. `orchestration.md:92` makes every implementer diff against that
  document, so a wrong sentence there is an instruction.
- **Slop/Process** — `aria-label="Task"`, the send-button block condition, the two dead
  wizard functions, `setup-ticket-07.sh`, and the `tracker/` migration recorded as
  unactioned by three consecutive audits.

**Done when:** every named finding is closed or disclosed with a reason, the four gates
pass from a clean checkout, and the browser-measured claims are in the PR description.

## Comments

- 2026-09-10 — Closed by `fix/audit-942a105-remediation`, PR #26, merged as `87702c6`.
  Remediation commit `0c41087`; review correction `ea72769`. The audit report itself was
  untracked at `942a105` and is added by the same PR.
- 2026-09-10 — Left open deliberately, with the audit's own advice as the reason: the
  duplicated test helpers wait for a third consumer before moving to `src/testing.tsx`.
  The audit's Process note that CI runs no job on pull requests is unactioned and
  unticketed — `AGENTS.md` makes the merge the human's call by design.
- 2026-09-10 — Step-3 review (PR #26) re-ran all four gates (13 files / 307 tests,
  `tsc -b`, `eslint --max-warnings=0`, `vite build`) and reproduced the browser
  measurements: at 390px every text box ends inside its Card, at 1200px the Cards are
  `16→292` and `308→585` with `clipped: false`, `document.scrollWidth === innerWidth` on
  both, `overflow-wrap` computing to `anywhere` on the phone bubble, the wall square and
  the Archive row. Two corrections committed by the reviewer in `ea72769`: DESIGN.md
  named `32` as a day that blocks the send button, which is unreachable because
  `CaptureBar.tsx:238` refuses `Number(raw) > 31` at the keystroke; and the new viewport
  guard sliced from `name="viewport"` to the next `/>`, so reordering the attributes
  would have let `maximum-scale` back in unnoticed.
- 2026-09-10 — This close-out landed after the merge rather than inside the PR commit,
  against `orchestration.md` ("Closing is an item of the PR, not a follow-up"). The
  remediation PR carried no ticket at all; the audit it remediates had named
  `.scratch/audit-2026-09-10/` as the pattern to repeat.
