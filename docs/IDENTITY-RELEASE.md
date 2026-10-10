# Release and operating gates

## Environment/domain matrix

| Environment | Frontend and BFF | Identity | Data/email |
|---|---|---|---|
| Local Cretans dev | 127.0.0.1:5174 → Vite /api → 127.0.0.1:3002 | disabled by default | public-only, no email |
| Local standalone | 127.0.0.1:3002, explicit matching APP_ORIGIN | disabled | no DB required for public reading |
| Automated browser | 127.0.0.1:3012 | disabled | no private fixtures in browser |
| Automated API/protocol | isolated PGlite and signed transport fixtures | test-only dependency injection | disposable data, no email |
| Development provider | real-provider diagnostic callbacks on 127.0.0.1:3001 and :3002 | Auth0 issuer/RP ID auth-staging.liiightwave.com; two clients; app identity disabled | owner-only development secrets and isolated diagnostic DB; real enrollment and same-account session reuse passed |
| HTTPS staging diagnostic | two isolated Railway HTTPS diagnostics; compute stopped 10 October | provider acceptance blocked; app identity disabled | new diagnostic PostgreSQL volume retained |
| Existing production core | liiightwave.com + accounts.liiightwave.com, Netlify /api → verified existing Railway host | existing password service remains | existing production data untouched |
| Intended production Cretans | cretans.liiightwave.com, not resolving during discovery | blocked | unprovisioned |
| Proposed central auth | auth.liiightwave.com, not created | issuer/RP ID requires provider proof first | provider-owned credentials |

## Executed locally

Initial final verification: TypeScript check, lint and production build passed. 21 API/protocol tests passed, including actual library signature/claim validation with ephemeral test signing keys. Ten core regression tests passed, including the legacy-session/SSO separation check. Both dependency sets reported zero known vulnerabilities on installation. Six functional browser tests plus a screenshot capture passed, including the actual Talisman renderer/worker round-trip and ambiguous/unsupported/oversized upload rejection. Final audit and repository checks are recorded in the delivered implementation report. These are local results only.

Auth0 configuration increment: TypeScript check and lint passed; all 27 local tests passed (the existing 21 plus six Action tests), with zero skipped. Full dependency audit reported zero vulnerabilities. Real provider verification is limited to DNS/TLS/discovery, dashboard configuration/deployment and a hosted-login page preview. No actual user authentication occurred. See `AUTH0-SETUP.md` for the evidence boundary.

Real-provider diagnostic increment: 30 local tests, typecheck, lint and build passed; audit reported zero vulnerabilities. Core's ten regression tests and build passed. Both real clients returned expected `login_required` before enrollment. Human passkey enrollment, both clients' real signed code/PKCE exchanges and same-account session reuse passed. Loopback silent SSO returned `consent_required`. Twenty focused HTTP boundary checks passed. Full application acceptance remains gated; see `AUTH0-LIVE-TEST.md`.

## Provider decision · 10 October 2026

Auth0 hosted Universal Login is not accepted under the stricter policy. Case 03056719 reports UV=false acceptance and no native protection against recovery-to-replacement enrollment; refresh-claim statements conflict. These are vendor statements, not independently reproduced tests. See AUTH0-ACCEPTANCE-DECISION.md for the required demonstrations and stopped staging status. Application identity stays disabled.

## Release blockers

1. Auth0 development tenant configured; see `AUTH0-SETUP.md`. Real enrollment, same-account provider-session reuse and forced fresh authentication passed in the diagnostic. Required UV enforcement and trusted evidence remain unproven: initial claims omit `acr`/`amr`; fresh sign-in returns `amr=["phr"]` without an established required-UV guarantee. Must prove second authenticator, weak-route rejection, fresh management and recovery restrictions with the two registered clients and a real device before granting application access.
2. Browser provider-session logout passed: subsequent requests from both clients returned `login_required`. All-device central revocation/security-management/recovery integration remains unverified. Auth0 back-channel logout is documented/labelled Enterprise; no paid plan selected. Verify actual support or a measured fallback. Complete notifications, authenticator/grant revocation, account deletion and replay/race checks through supported provider APIs. No universal support override.
3. Isolated Railway HTTPS diagnostics passed cookie, cache, origin/CSRF and forwarded-origin rejection checks on 9 October, then their compute was stopped on 10 October. No successful HTTPS code exchange or provider-wide deployed revocation measurement is recorded. Full-application/Netlify ingress remains unvalidated. Resume only against a supported enforcement and negative-test plan; keep production ingress unchanged.
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
