# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<KEY>-<N>-<slug>.md`, never a single combined tickets file
- Ticket IDs follow the Jira convention: the project key plus a counter that is **unique across the whole repo**, never reset per feature, never reused, never renumbered. No zero padding (`<KEY>-31`, not `<KEY>-031`)
- The next free number is derived from the repo itself, not from a state file:

  ```bash
  ls .scratch/*/issues/ | grep -o '<KEY>-[0-9]*' | sort -V | tail -1
  ```

- The ID is an address, not a description: it never encodes the ticket type. A type baked into the ID goes stale the moment a bug turns out to be a docs fix, and fixing it would mean renaming a file already referenced from commits. Type lives in an editable `Type:` line instead
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings), with a `Type:` line beside it using the Conventional Commits vocabulary (`feat`/`fix`/`docs`/`chore`/`refactor`) — the same words the commit messages use
- Commits and PRs reference the ID in the subject (`feat(scope): ... (<KEY>-31)`) so `git log --grep=<KEY>-31` recovers the history of any ticket
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

A ticket file starts like this:

```markdown
# <KEY>-31: <Ticket title>

**Status:** ready-for-agent
**Type:** feat
```

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/<KEY>-<N>-<slug>.md`, drawing from the same repo-wide counter as every other ticket, with the question in the body. Its `Type:` line uses the wayfinding vocabulary (`research`/`prototype`/`grilling`/`task`) instead of the Conventional Commits one; a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: <KEY>-<N>, <KEY>-<N>` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
