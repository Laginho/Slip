# Slip

Slip is a local-first personal task tracker. It works without Supabase; configuring
Supabase lets the same list converge between devices.

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

## Deploy

GitHub Actions deploys GitHub Pages after a push to `main` (or when run manually). Before
the build can deploy, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as GitHub
Actions secrets. The workflow runs the test suite, lint, typecheck, and production build before
publishing `dist`.
