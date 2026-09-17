# Slip

Slip is a local-first personal task tracker. Success is measured in seconds-to-captured:
type into a chat-style bar, press Enter, done. The list on your phone and the list on
your desktop are one list, converged by background sync.

There are no accounts, no projects, and no settings screen to get through first. A Task
has just text, an optional deadline, and a kind (work, college, or chore); urgency is
shown by colour, derived automatically, never chosen by hand. It works without Supabase;
configuring Supabase lets the same list converge between devices.

## Install

Open [`https://laginho.github.io/Slip/`](https://laginho.github.io/Slip/) in Chrome or
Edge and install it as a PWA (the browser's install prompt, or "Add to Home screen" on
Android). The public build ships keyless: it works fully offline with nobody's tasks in
it until you add sync below. The interface is in Brazilian Portuguese throughout.

## Run locally

Use Node.js 22, the version used by deployment CI.

```sh
npm ci
npm run dev
```

Open the local Vite URL shown in the terminal. To enable sync, copy `.env.example` to
`.env.local` and supply `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Keep
`.env.local` private; the app remains usable when both values are unset.

## Test and build

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

`npm run build` writes the production site to `dist/`. Preview that build with
`npm run preview`.

## Sync

Slip works fully offline; sync is optional and configured per device.

**Option A — paste a key.** Open the Archive (`ver concluídas`) and use the Sync row
(`sincronizar`): paste the URL and anon (or publishable) key of a Supabase project you
own. [Create a Supabase
project](https://supabase.com/docs/guides/getting-started) and run `supabase/schema.sql`
in its SQL editor first. The pair is stored on that device only; clearing both fields
turns sync back off.

**Option B — fork and self-host.** Fork the repo, run `supabase/schema.sql` against your
own Supabase project, set the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
repository secrets, and enable GitHub Pages. `bash scripts/setup-publish.sh` walks
through the schema, the two values and the repository secrets; enabling Pages is the one
step you do by hand.

**Nightly backup (optional).** `.github/workflows/dump.yml` runs nightly and dumps the
`tasks` table if you set a `SUPABASE_DB_URL` repository secret; without it the job exits
doing nothing. Restore a dump with:

```sh
psql "$SUPABASE_DB_URL" < tasks-2026-01-01.sql
```

## Deploy

GitHub Actions deploys GitHub Pages after a push to `main` (or when run manually). The
build is keyless: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are optional GitHub
Actions secrets that only bake a key into a self-hosted fork's build (sync option B
above). Run `bash scripts/setup-publish.sh` for a guided local and GitHub setup. The
workflow runs a dependency audit, the test suite, lint, typecheck, and production build
before publishing `dist`.

## Tickets, specs, and decisions

This repo tracks its own work in-repo: tickets and specs under `.scratch/`, architecture
decisions under `docs/adr/`, and vocabulary in `CONTEXT.md`.
