# SLIP-43: No audit has seen the release surface — withdrawn

**Status:** wontfix
**Stage:** done
**Type:** chore

Withdrawn on 2026-09-17, the day it was filed, without being worked.

The ticket described how to audit the repo. That was wrong: auditing is a whole separate
process owned by the `/audit` skill, and the ticket improvised a five-surface checklist of
its own instead of pointing at it. Left in place it would have invited a future session to
follow the improvisation rather than run the real thing.

The observation underneath it stands and needs no ticket: `docs/audits/` stops at
`2026-09-11-911cdb3.md`, while everything that makes this repo publishable — SLIP-35
through SLIP-42 — landed between 15 and 17 September. The next `/audit` run is the first
to read the release surface.

## Why this file still exists

Only to keep the number burned. `docs/agents/issue-tracker.md` derives the next ticket id
from the tracker itself:

    ls .scratch/*/issues/ | grep -o 'SLIP-[0-9]*' | sort -V | tail -1

Delete this file and that prints `SLIP-42`, so the next ticket becomes a second SLIP-43 —
while this one is already cited in `git log`, in PRs #37 and #41, and in this directory's
spec. The convention says an id is "never reused"; this is what enforces it. The repo
spent a cycle on exactly this failure with two ADRs numbered 0003.

Nothing here is open work: `wontfix` is closed by the tracker's own definition.
