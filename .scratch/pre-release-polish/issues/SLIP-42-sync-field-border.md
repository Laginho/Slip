# SLIP-42: The Sync row's inputs draw a field box DESIGN.md forbids

**Status:** needs-info
**Stage:** to-implement
**Type:** fix
**Blocked by:** none
**Review:** human

- Primary files:
  - `src/components/Archive.tsx` (`FIELD`, lines 55-60 only, plus whatever ground the
    answer below puts the two inputs on)
  - `src/Card.visual.test.tsx` or a sibling visual test, if the answer needs one pinned

#### The open question, for stage 1

`DESIGN.md:163` — "Inputs are bare (no visible field box) — focus lives in the
composition, not a border." `src/components/Archive.tsx:57` gives each Sync input
`border: "1px solid var(--hairline)"` and `borderRadius: 8`.

The faithful fix has a precedent in this repo: `CaptureBar.tsx:222-223` makes its input
`border: none; background: transparent` *inside* a parent that carries the ground — the
pill. The Sync row's two inputs sit directly on `--surface`, so removing their borders
without giving them a ground leaves two invisible click targets.

So the question is what ground they sit on, and that is a design call, not a mechanical
edit. Three answers, none of them obviously right:

1. **A pill each**, borrowing `CaptureBar`'s treatment wholesale. Consistent, but puts two
   composer-shaped things in a section that is not a composer.
2. **One recessed panel** behind both inputs plus the Save button, bare inputs on top.
   Closest to "focus lives in the composition"; introduces a surface tone the palette does
   not currently have.
3. **Amend `DESIGN.md:163` instead**, scoping "inputs are bare" to the Capture pill and
   allowing a hairline elsewhere. Zero code; admits the rule was written about one input.

Answer this and the ticket becomes a small mechanical change with a pinned visual test.

#### Acceptance criteria

To be written once the question above is answered. Nothing should be implemented before
then — three review passes have already left the border as shipped rather than guess.

#### Verification

    npm test && npx tsc -b && npm run lint

Plus a browser pass at 1280px light and 390px dark with the Archive open and the Sync row
expanded, per `docs/agents/orchestration.md` — jsdom verifies no border rendering.

## Comments

- 2026-09-17 Recorded by SLIP-35's review (`SLIP-35-byok-sync-config.md` line 288): "Left
  as shipped for the third pass running: the faithful fix is the `CaptureBar.tsx:222-223`
  precedent … and choosing that ground for two inputs sitting directly on `--surface` is a
  design call, not a mechanical edit." Status is `needs-info` for exactly that reason;
  it moves to `ready-for-agent` when the human picks an option above.
