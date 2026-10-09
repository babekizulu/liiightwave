# Release and operating gates

## Environment/domain matrix

| Environment | Frontend and BFF | Identity | Data/email |
|---|---|---|---|
| Local Cretans dev | 127.0.0.1:5174 → Vite /api → 127.0.0.1:3002 | disabled by default | public-only, no email |
| Local standalone | 127.0.0.1:3002, explicit matching APP_ORIGIN | disabled | no DB required for public reading |
| Automated browser | 127.0.0.1:3012 | disabled | no private fixtures in browser |
| Automated API/protocol | isolated PGlite and signed transport fixtures | test-only dependency injection | disposable data, no email |
| Staging | not provisioned; select one stable HTTPS origin per client | separate issuer/clients and RP ID from production | new DB, provider test mail only |
| Existing production core | liiightwave.com + accounts.liiightwave.com, Netlify /api → verified existing Railway host | existing password service remains | existing production data untouched |
| Intended production Cretans | cretans.liiightwave.com, not resolving during discovery | blocked | unprovisioned |
| Proposed central auth | auth.liiightwave.com, not created | issuer/RP ID requires provider proof first | provider-owned credentials |

## Executed locally

Initial final verification: TypeScript check, lint and production build passed. 21 API/protocol tests passed, including actual library signature/claim validation with ephemeral test signing keys. Ten core regression tests passed, including the legacy-session/SSO separation check. Both dependency sets reported zero known vulnerabilities on installation. Six functional browser tests plus a screenshot capture passed, including the actual Talisman renderer/worker round-trip and ambiguous/unsupported/oversized upload rejection. Final audit and repository checks are recorded in the delivered implementation report. These are local results only.

## Release blockers

1. No accessible selected identity tenant. Must prove real enrollment + second authenticator + user verification + weak-route rejection + fresh management + recovery restrictions with two registered clients and a real device. Test virtual WebAuthn separately; no such enrollment test has been executed.
2. No verified provider central-logout/security-management/recovery integration. Complete notifications, authenticator/grant revocation, account deletion and replay/race checks through supported provider APIs. No universal support override.
3. No real Netlify/Railway callback, cookie, cache, trust-proxy, origin-ingress or deployed revocation measurement. Keep existing ingress unchanged. Evaluate single-origin Cretans deployment before adding proxy complexity.
4. No verified LiiiGHTWAVE Resend sender. Inspect Hostinger DNS and use exact provider-generated DKIM/SPF values; do not alter root MX or invent records. Disable tracking at the actual sender/domain configuration. A durable encrypted outbox, authenticated webhook flow and test-recipient-only delivery remain to implement; no arbitrary send endpoint exists.
5. No billing integration. Paid APIs deny missing/expired entitlements. Webhooks, event ordering and purchases are not implemented; redirects never grant access.
6. Runtime DB roles, backups/restore, operational alerts and threat-model review remain required. Production user/data counts have not been inspected. Do not migrate or delete legacy users.
7. Owner/legal review for retention, children’s data, POPIA-related purposes/consents/rights and cross-border providers. No compliance/certification or independent audit claim.

## Recovery runbook (disabled pending provider)

Use a remaining approved passkey through the selected provider. If unavailable, proceed only through a proven provider-supported independent two-proof recovery flow. Pending recovery cannot access private application data. Talisman, story phrase, mentor output and email/name matching are never proof. If every established proof is lost, explain the limitation; do not give support an override. Keep administrators separate with provider-enforced hardware policy and an offline reviewed emergency process. No administrator identity or bootstrap is enabled here.

## Revocation / incident runbook

Application logout invalidates its session; logout everywhere increments the account security version and marks revocation time. Every subsequent private request queries DB state. The local regression measured invalidation within the test request sequence, not a production SLA. Signed backchannel events invalidate matching subjects/sessions and reject replays. Provider-side events and recovery integrations must be proved before any bound is advertised.

For a suspected compromise: disable new identity entry points through deployment configuration if needed; preserve restricted evidence without copying tokens or private input into logs; revoke affected application versions and provider grants/credentials through authorized operations; rotate the compromised service secrets; verify clean backup and deployment state; notify affected users through the verified provider/sender process. Test that revoked SSO sessions cannot recreate access. No automated security mail or alerting has been enabled.

## Migration, backup and rollback

Use separate migrator and runtime roles. Apply the additive identity schema to a new identity DB explicitly before starting an enabled BFF. Verify foreign keys, uniqueness and ownership tests using the runtime role. Never apply test fixtures to production. Configure PostgreSQL TLS/private networking without disabling certificate verification. The current adapter uses pg defaults/connection configuration; external DB TLS trust must be validated explicitly.

Before staging identity: create a restricted encrypted `pg_dump` backup plus separate recovery of the application data key; restore into an isolated database, run integrity/ownership checks, and record measured restore time. Backup retention and destruction require owner review. The encrypted Talisman payload cannot be regenerated if its data key is lost; revoke/regenerate artifacts through authenticated sessions instead of weakening authentication.

Rollback: set identity disabled, roll back application builds, retain additive identity tables for investigation/compatible rollback. Preserve the legacy account site. Do not drop tables, change RP ID, switch issuer, or invalidate existing user credentials as a routine rollback. Production promotion requires the user’s cutover approval after the completed gates.

## Retention and privacy review

The design stores minimal issuer/subject references, opaque session hashes, display names, separate narrative profiles, notes/progress and encrypted Talisman regeneration material. Browser PNGs and phrases are transient. Auth transactions expire in five minutes, pending onboarding in twenty minutes, sessions have one-hour idle/twelve-hour absolute limits; the Cretans cleanup task deletes expired operational rows. Core cleanup for shared identity operational rows must be scheduled before deployment if no Cretans worker runs.

Notes/progress persist until a reviewed deletion workflow completes. Export excludes session secrets and Talisman references. Deletion requests are merely recorded for review; they are not falsely marked completed. Netlify, Railway and a future provider/sender are data processors to assess. AI, cloud speech, tracking, files and offline private caching are absent, so no zero-retention/end-to-end-encryption claim is made.
