# SLIP-41: DESIGN.md and PRODUCT.md still say the app has no settings

**Status:** claimed
**Stage:** to-review
**Type:** docs
**Blocked by:** none
**Review:** agent

- Primary files:
  - `DESIGN.md` (line 217, the "Don't add chrome" bullet, only)
  - `PRODUCT.md` (line 31, the Positioning paragraph, only)

#### What to build

Both documents predate SLIP-35 and now contradict shipped code:

- `DESIGN.md:217` — "**Don't** add chrome (nav bars, tabs, settings) — sections only."
- `PRODUCT.md:31` — "No accounts, no projects, no settings screen."

The Archive carries a Sync row that takes a Supabase URL and key. ADR 0004 authorises it,
and deliberately: it is the whole mechanism of the open-source release. The prohibition
each document states is still the right instinct — what changed is that one exception now
exists and has a reason.

Amend both to record the exception rather than delete the rule. `DESIGN.md` keeps "no nav
bars, no tabs, sections only" and names the Sync row inside the Archive as the single
settings surface, pointing at ADR 0004. `PRODUCT.md` keeps "no accounts, no projects" and
replaces "no settings screen" with what is actually true — no settings *screen*: the one
configurable thing lives as a row inside a section, and a person who never syncs never
sees it expanded.

Do not touch the Sync row itself, and do not widen either document into a licence for
future settings. The exception is one row, authorised by one ADR.

#### Acceptance criteria

1. Neither `DESIGN.md` nor `PRODUCT.md` contains a claim a reader can falsify by opening
   the Archive.
2. Both still forbid nav bars, tabs and a settings screen; neither reads as general
   permission to add chrome.
3. Both cite ADR 0004 as what authorises the exception.
4. No other line of either document changes.

#### Verification

    npm test && npx tsc -b

Prose only — no test asserts on either file. The check is reading both lines against the
running Archive.

## Tests stage 2 writes (own commit, red)

None. Both files are prose that no test reads, and a test pinning documentation sentences
would break on any harmless rewording while protecting nothing. Stage 3 reads for it —
the same call SLIP-38 made about README section order.

## Comments

- 2026-09-17 Flagged twice by SLIP-35's review (`SLIP-35-byok-sync-config.md` lines 195
  and 294), both times as "worth its own `docs` ticket". This is that ticket.
