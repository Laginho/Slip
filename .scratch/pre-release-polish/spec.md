# Pre-release polish — docs and audits

Status: complete

Not a grilled feature spec. This directory collects what stood between the open-source
release landing and the repo being publishable, gathered on 2026-09-17 by reading closed
tickets rather than by designing anything new.

## Why it exists

Every ticket in the repo was `complete` and the tracker therefore showed zero open work.
Three real items existed anyway, as prose inside `SLIP-35-byok-sync-config.md` — a ticket
marked `complete`. Each review pass recorded its finding, correctly declined to fold it in
(`docs/agents/orchestration.md`: only stage 1 moves a comment into a body), and closed.
Nobody ran the stage-1 pass that turns those notes into tickets.

`orchestration.md` predicted exactly this: "An unfolded comment is a note, not a
requirement: prose in a body that no file and no criterion backs is invisible to stage 2,
which will ship green without it." The `storedConfig()` item was written down four separate
times before it became SLIP-40.

## Tickets

| Ticket | Type | Source |
| --- | --- | --- |
| SLIP-40 `storedConfig()` trusts whatever `sync/v1` holds | fix | SLIP-35 lines 91, 129, 203, 222 |
| SLIP-41 DESIGN.md and PRODUCT.md still say there are no settings | docs | SLIP-35 lines 195, 294 |
| SLIP-42 the Sync row's inputs draw a field box DESIGN.md forbids | docs | SLIP-35 line 288 |
| SLIP-43 no audit has seen the release surface | chore | **withdrawn** — `/audit` owns this, not a ticket |

SLIP-42 was filed `needs-info` — three review passes had left it as shipped because the
fix needed a design decision, and this pass did not get to guess either. Answered the same
day: amend `DESIGN.md`, leave `Archive.tsx` alone. The bare-input rule was written about
the Capture pill and does not generalise to a settings field, and both code answers cost
more than the rule is worth (a pill each puts composer shapes in a non-composer; a recessed
panel needs a surface tone "The Palette Is Law" forbids). It is a `docs` ticket now.

## Out of scope

Anything a later `/audit` run turns up. Those become their own tickets.

SLIP-43 was withdrawn the day it was filed: it described *how* to audit, which is the
`/audit` skill's job, and a ticket restating it would only compete with the real process.
Its file stays as a `wontfix` tombstone so the id stays burned — see the file for why.

## Worth carrying forward

A finding recorded under `## Comments` on a ticket that then closes leaves no trace in the
tracker's definition of open work. Either the closing pass opens the follow-up ticket, or
the finding is invisible the moment the ticket goes `complete`.
