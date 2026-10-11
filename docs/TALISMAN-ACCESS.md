# Shared member access · 11 October 2026

Implementation and staging acceptance are in progress. Production identity remains disabled until the real two-app flows, sender and operational checks are complete.

The `auth0-member-v1` policy accepts Auth0 database passkey/password evidence for the two reviewed clients, requires signed verified email and the exact connection/policy/revision, and rejects missing or stale authentication time. Sessions expire after 30 minutes idle and at most 60 minutes after authentication; callback/SSO/activity cannot extend that deadline. Sensitive operations require authentication within five minutes. Local suspension blocks existing and new sessions.

The password-change Action signs bounded event bytes with a dedicated HMAC key. The receiver deduplicates events and commits shared security-version revocation plus an in-app alert atomically. This asynchronous event supplements the authentication-age fallback; it does not promise removal of provider credentials or every provider session. Production sender and recovery tests remain required.

`Dockerfile.identity` and `server/identity-index.js` run the central account service separately from the existing password account API. Its explicit `IDENTITY_DATABASE_URL` must refer to the dedicated shared Cretans/identity database. It never automatically migrates or merges legacy users. The existing website password API remains intact.

The `/talisman` entry accepts a bounded PNG, drag/drop or camera snapshot, decoded locally in a worker. The account reference is checked only after a valid provider login. A copied artifact cannot authenticate. Authenticated users can create, download, replace or revoke their Talisman. No image, narrative phrase or provider token is placed in browser persistent storage.

The current issuer/RP ID is `auth-staging.liiightwave.com`; changing it affects passkeys and requires an explicit enrollment migration decision. Do not silently move to `auth.liiightwave.com`.

## Staging evidence · 11 October

The public Cretans product link is deployed. Both actual HTTPS staging applications now accept the same verified Auth0 account. The owner completed email verification and fresh sign-in, and generated a Talisman on the profile page. Resend reports the verification message delivered from the verified liiightwave.com sender. These results do not constitute production authentication acceptance.

The password-change receiver now durably queues an encrypted verified recipient with the revocation transaction. A dedicated sending-only Resend key, restricted to liiightwave.com, is held by the separate identity service. Its worker uses a stable idempotency key, bounded retries and a 23-hour cutoff; accepted or exhausted messages discard their encrypted recipient. Acceptance by Resend is not proof of delivery. Real recovery and security-alert delivery remain pending.

The profile page clears private data on session revocation and ignores delayed Talisman results. Local validation: ten core account tests, four core browser tests, 63 mirrored Cretans API/protocol tests, both builds, Cretans lint/typecheck and dependency audit passed. The production Talisman image upload through the Chrome tool remains unverified because the tool reports file access disabled despite the owner's enabled setting; local renderer/decoder tests passed.

Production identity remains disabled. Remaining operational acceptance includes real recovery, both-app logout/revocation, database privilege and backup/restore checks, monitoring and final production configuration. Keep the current Auth0 issuer stable. No legacy accounts are migrated or linked by email.
