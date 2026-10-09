# LiiiGHTWAVE repository notes

- Preserve company navigation, existing account/support functionality and unrelated work.
- `docs/IDENTITY-ARCHITECTURE.md` and `docs/IDENTITY-RELEASE.md` describe the disabled passkey increment and its release blockers.
- Do not treat legacy password sessions, email matches, Talismans or story phrases as approved passkey authentication.
- Keep `server/identity/` (except its local `db.js` adapter) and `shared/talisman-renderer.js` identical to the Cretans counterparts. Run the Cretans two-client/protocol suite after changes.
- Apply identity migrations only to the explicitly configured new identity database; never automatically migrate legacy accounts.
- Run `npm test` and `npm run build`. Keep provider configuration, private keys, tokens and data keys out of source and browser bundles.
- No production cutover, destructive migration, disruptive DNS change, paid commitment or unconfirmed-remote push without required authorization.
