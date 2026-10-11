# Shared member access · 11 October 2026

Implementation and staging acceptance are in progress. Production identity remains disabled until the real two-app flows, sender and operational checks are complete.

The `auth0-member-v1` policy accepts Auth0 database passkey/password evidence for the two reviewed clients, requires signed verified email and the exact connection/policy/revision, and rejects missing or stale authentication time. Sessions expire after 30 minutes idle and at most 60 minutes after authentication; callback/SSO/activity cannot extend that deadline. Sensitive operations require authentication within five minutes. Local suspension blocks existing and new sessions.

The password-change Action signs bounded event bytes with a dedicated HMAC key. The receiver deduplicates events and commits shared security-version revocation plus an in-app alert atomically. This asynchronous event supplements the authentication-age fallback; it does not promise removal of provider credentials or every provider session. Production sender and recovery tests remain required.

`Dockerfile.identity` and `server/identity-index.js` run the central account service separately from the existing password account API. Its explicit `IDENTITY_DATABASE_URL` must refer to the dedicated shared Cretans/identity database. It never automatically migrates or merges legacy users. The existing website password API remains intact.

The `/talisman` entry accepts a bounded PNG, drag/drop or camera snapshot, decoded locally in a worker. The account reference is checked only after a valid provider login. A copied artifact cannot authenticate. Authenticated users can create, download, replace or revoke their Talisman. No image, narrative phrase or provider token is placed in browser persistent storage.

The current issuer/RP ID is `auth-staging.liiightwave.com`; changing it affects passkeys and requires an explicit enrollment migration decision. Do not silently move to `auth.liiightwave.com`.

Deployment status and acceptance evidence will be recorded here when the test window completes.
