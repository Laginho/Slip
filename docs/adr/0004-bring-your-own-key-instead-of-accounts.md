---
status: accepted
---

# Bring your own key instead of user accounts

Slip is being released as an open-source project. The obvious way to let other people use
it is a hosted, multi-tenant instance: Google OAuth, a `user_id` column, row-level security
per user, a login screen. That plan was designed in full (grilling session, 2026-09-15) and
rejected. Slip stays single-user, and the published build ships with **no** Supabase key:
a person who wants sync pastes the URL and anon key of a Supabase project *they* own into a
settings field, and the app stores them on that device. Anyone else opening the public URL
gets a fully working local-only app.

The reason is what the hosted version would have made the author: an operator holding
other people's data on a free tier with no backups, owing them a privacy notice, erasure on
request and an answer when a list vanishes. "Open-source release" requires none of that.
Every person holds their own data in their own database; ADR 0001's sync model, schema and
"no auth of any kind" all stand unchanged.

Alternatives considered: the hosted multi-tenant instance above (about 200 lines, plus the
obligations); self-host only, by forking and setting two repository secrets (zero code, but
then the author's own deploy keeps a key baked into a public bundle, so anyone opening the
URL reads and edits the author's list); a query-string handoff of the key (a credential in
a URL, in history and in server logs).

## Consequences

- **The Pages build is keyless.** The workflow no longer requires the two `VITE_SUPABASE_*`
  secrets and builds without them. The env vars remain honoured for self-hosters who set
  them at build time; a key stored on the device takes precedence.
- **Sync configuration is per device.** Each device of the same person receives the same
  URL and key once. There is no account to carry them across devices; that is the trade.
- **The stored key is the anon key of a project the person owns.** Storing it in
  localStorage exposes nothing that the baked-in bundle did not already expose to anyone
  with the URL. Privileged keys (`service_role`, `sb_secret_`) are refused at the field, as
  the setup wizard already refuses them.
- **Accounts stay off the table.** Once people hold their own databases, there is no path
  to migrate them into a hosted one; adding accounts later would be a second product, not
  a feature.

---

Filed as ADR 0003 on 2026-09-15, colliding with the already-accepted
`0003-derived-open-task-order.md`. Renumbered to 0004 on 2026-09-17; citations written
before that date may still say "ADR 0003" and mean this one.
