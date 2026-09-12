# SLIP-33: Remediate the 2026-09-11 audit at `4f14c90`

**Status:** ready-for-agent
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
