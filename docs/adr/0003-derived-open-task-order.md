---
status: accepted
---

# Derived Open Task order

Open Task order remains derived rather than stored: dated Tasks come first by ascending
Deadline; Tasks sharing a Deadline are grouped Work, College, then Chore; dateless Tasks
follow. Within a Kind-and-Deadline group and within the dateless group, the current stored
list's sequence is retained. This supersedes ADR 0002: no manual Position, drag
reordering, or Position migration was implemented.

This keeps the model and sync payload small and preserves the due-first reading. It also
means the retained order has no cross-device guarantee: synchronization merges Task records
but does not establish an order, so a device can present equal-ranked or dateless Tasks in a
different sequence after it receives them.
