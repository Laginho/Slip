# Ledger — audit-2026-09-11-911cdb3

| Date | Ticket | Commit |
| --- | --- | --- |
| 2026-09-11 | SLIP-34 | `4728384` (PR #28 from `fix/audit-911cdb3-remediation`, red `d2dc025` + green `b4aae58` + the audit report `4728384`) — the single finding closed: the undo snapshot now comes from the reconciled list the action mutated, so an undo after another window's save no longer reverts its text. Gates: 13 files / 315 tests, `npx tsc -b`, `npm run lint`, `npm run build`. Cross-window undo reproduced fixed in the browser by implementer and reviewer, with the old hook as a control; details in the PR description and the ticket. PR CI left to the human by design. Fable 5.1 specified and implemented; Opus 5 reviewed — red and green reproduced, browser pass repeated on a second harness, nothing corrected. |
