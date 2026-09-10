# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Implementation lifecycle

Past triage, a ticket moves through three more states on the same `**Status:**` line.
`AGENTS.md` says who sets each and when.

| Status     | Meaning                                                                |
| ---------- | ---------------------------------------------------------------------- |
| `claimed`  | Step 2 has a branch open on it; no other session takes it               |
| `blocked`  | Step 2 stopped; the reason is the last entry under `## Comments`        |
| `complete` | Merged, with the closing note naming the PR                            |

Open work is every ticket whose status is neither `complete` nor `wontfix`. Skills that
speak of a `resolved` ticket mean `complete` here.
