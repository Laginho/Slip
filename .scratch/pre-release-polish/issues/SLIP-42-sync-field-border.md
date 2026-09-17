# SLIP-42: The Sync row's inputs draw a field box DESIGN.md forbids

**Status:** ready-for-agent
**Stage:** to-implement
**Type:** docs
**Blocked by:** none
**Review:** agent

- Primary files:
  - `DESIGN.md` (line 163, the "Inputs are bare" sentence in `## Shapes`, only)

#### What to build

`DESIGN.md:163` — "Inputs are bare (no visible field box) — focus lives in the
composition, not a border." `src/components/Archive.tsx:57` gives each Sync input
`border: "1px solid var(--hairline)"` and `borderRadius: 8`.

**Answered 2026-09-17: amend the document, leave the code alone.** The rule was written
about the Capture pill, the only input the app had at the time, and "focus lives in the
composition" is a statement about a composer — it does not generalise to a settings field.
The two alternatives both cost more than the rule is worth here: a pill each would put two
composer-shaped things in a section that is not a composer, and a recessed panel would
need a surface tone the frozen palette does not have, which "The Palette Is Law" forbids.

Scope the sentence to the composer, and say that an input outside it may carry a hairline,
naming ADR 0004's Sync row as the case in hand. `src/components/Archive.tsx` is not
touched: the border stays exactly as shipped.

#### Acceptance criteria

1. `DESIGN.md:163` no longer forbids what `Archive.tsx:57` does.
2. The bare-input rule still binds the Capture pill, in the same words, so no future pass
   reads this as licence to put a box around the composer.
3. The exception names ADR 0004's Sync row and does not read as general permission for
   bordered inputs anywhere.
4. No source file changes; `src/components/Archive.tsx` is untouched.
5. No other line of `DESIGN.md` changes.

#### Verification

    npm test && npx tsc -b && npm run lint

No browser pass: the answer changes no rendered pixel. What ships is what three review
passes already saw.

## Comments

- 2026-09-17 Recorded by SLIP-35's review (`SLIP-35-byok-sync-config.md` line 288): "Left
  as shipped for the third pass running: the faithful fix is the `CaptureBar.tsx:222-223`
  precedent … and choosing that ground for two inputs sitting directly on `--surface` is a
  design call, not a mechanical edit."

- 2026-09-17 Answered by the human: amend `DESIGN.md`, do not touch `Archive.tsx`. The
  ticket changes `Type:` from `fix` to `docs` and its Primary files accordingly — there is
  no longer any source in play. `needs-info` → `ready-for-agent`.
