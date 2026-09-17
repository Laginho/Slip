# SLIP-40: `storedConfig()` trusts whatever `sync/v1` holds

**Status:** ready-for-agent
**Stage:** to-implement
**Type:** fix
**Blocked by:** none
**Review:** agent

- Primary files:
  - `src/sync.ts` (`storedConfig` and the validation it shares with `saveConfig`; nothing
    below `headers()`)
  - `src/sync.test.ts` (the `config — device pair before env pair` describe block only)

#### What to build

`saveConfig` (`src/sync.ts:83`) refuses a pair that is not `https:`, not a parseable URL,
or whose key is privileged (`service_role` / `sb_secret_`, or a legacy JWT claiming that
role). `storedConfig` (`src/sync.ts:29`) checks only that neither field is empty, so
validation lives at the input field and nowhere else. Anything that writes `sync/v1`
without going through the Sync row — devtools, a stale pair written before the validator
existed, a future caller, an extension — is believed, and the key is then put into an
`apikey` and an `Authorization: Bearer` header on every sync.

After this ticket a stored pair is read only if it would have been accepted on the way in.
A pair that fails goes the same way as a pair with a blank field: treated as unconfigured
and falling through to the env pair, which is the contract `storedConfig`'s own comment
already states and the suite already pins for the blank case (`src/sync.test.ts:143`).

This is the lazy fix as well as the correct one: one validator called from both sides is a
smaller diff than a second copy of the rules, and a copy is what would drift.

#### Acceptance criteria

1. `config()` returns the env pair, not the stored pair, when `sync/v1` holds an `http:`
   URL, a string that does not parse as a URL, or a privileged key in any of the three
   shapes `isPrivileged` catches.
2. `config()` still returns a valid stored pair ahead of the env pair, and still falls
   through on a blank field or corrupt JSON — the four cases already in the suite.
3. `saveConfig`'s refusal reasons and its return contract do not change; the Sync row
   still shows the same one-line strings.
4. The URL and privileged-key rules exist once in the file, not twice.

#### Verification

    npx vitest run src/sync.test.ts
    npm test && npx tsc -b && npm run lint

## Tests stage 2 writes (own commit, red)

`src/sync.test.ts`, in the existing `config` describe block, four cases, each seeding
`sync/v1` directly with `localStorage.setItem` (the point is precisely the path that does
not go through `saveConfig`) and asserting `config()` returns the env pair:

1. stored URL is `http://mine.supabase.co`. Red: `config()` returns the stored pair.
2. stored URL is `not a url`. Red: same.
3. stored key is `service_role-secret`. Red: same.
4. stored key is `sb_secret_abc123`. Red: same.

The legacy-JWT shape is already covered against `isPrivileged` through `saveConfig` and
needs no second copy here once the validator is shared.

## Comments

- 2026-09-17 Raised four times by SLIP-35's review passes
  (`SLIP-35-byok-sync-config.md` lines 91, 129, 203, 222), each recording it as stage 1's
  call and correctly declining to fold it in. This ticket is that fold-in.
