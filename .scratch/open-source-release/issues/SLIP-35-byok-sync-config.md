# SLIP-35: Sync reads a device-stored key, set from a Sync row in the Archive

**Status:** ready-for-agent
**Stage:** to-review
**Type:** feat

**What to build:** `config()` in `src/sync.ts` returns the pair stored under localStorage
`sync/v1` (`{"url","key"}`, both non-empty) before falling back to the `VITE_SUPABASE_*` env
pair, and `null` when neither is complete. Read per call, as today. A "Sync" row at the bottom
of the Archive section, in the style of its existing link row, expands in place into two
inputs (URL, anon key) and a Save button. Save stores the pair when the URL parses with the
`https:` scheme and the key is non-empty and not privileged (`service_role` in the decoded JWT
payload, or `sb_secret_` prefix); otherwise nothing is stored and one line says why. Save with
both fields empty removes `sync/v1`. The `hasArchive` gate on the Archive toggle, the pull and
Ctrl+H is removed so an empty Archive shows only the Sync row. Nothing in the Open list, the
Capture pill or the Cards changes.

Context: `.scratch/open-source-release/spec.md` (Implementation Decisions → configuration,
validation, field, precedence); ADR 0003; `src/sync.ts` `config()`; `src/components/Archive.tsx`
`LINK_ROW`; `src/App.tsx` lines gated by `hasArchive`; the privileged-key rule in
`scripts/setup-publish.sh`.

**Blocked by:** nothing.

- [x] `config()` precedence: stored pair → env pair → null; a stored pair with one empty
      field is ignored, not half-used
- [x] Sync row present at the bottom of the Archive; expands in place; no route, no modal,
      no element added to the main chrome
- [x] Valid pair saved to `sync/v1`; next `sync()` call uses it without reload
- [x] `http:` URL, unparseable URL, empty key, `service_role` JWT, `sb_secret_` key: refused,
      not stored, one-line reason shown
- [x] Both fields empty + Save removes `sync/v1`; `sync()` then returns local untouched
- [x] Archive reachable (toggle, pull, Ctrl+H) with zero Done Tasks, showing only the Sync row
- [x] Existing Archive tests, `sync.test.ts` and `useSession.test.tsx` still green

## Comments

Implemented test-first, four vertical slices:
1. `config()` precedence + `saveConfig()` validation in `src/sync.ts` (new exports:
   `SYNC_STORAGE_KEY`, `config`, `saveConfig`).
2. The Sync row in `src/components/Archive.tsx` (collapsed "sincronizar" link, expands
   in place into a URL input, a key input, a Save button, and a one-line error).
3. `src/App.tsx`: removed the `hasArchive` gate on the scroll-reveal effect, the Ctrl+H
   handler and the `minHeight` offset -- the Sync row means the Archive is never truly
   empty.
4. A regression-locking test that `sync()` itself (not just `config()`) picks up a
   `saveConfig()` pair on its very next call.

Existing tests updated for the intentional behaviour change (Archive reachable with
zero Done Tasks): `src/App.test.tsx` rows 5/6 and the "storage refusing reads" test,
`src/App.archive.test.tsx` rows 6/8/10. `sync.test.ts` and `useSession.test.tsx`
untouched, as required.

Gate green: `npm test` (338 passed), `npx tsc -b`, `npm run build`.

Note: `node_modules` was missing `@types/node` at the start of this session (present
in `package.json`, absent on disk) -- ran `npm install` to restore it before the gate
would run at all. Unrelated to this ticket's code.
