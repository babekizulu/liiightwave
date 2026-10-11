# Release and operating gates

**Current plan · 10 October revision:** The owner chose to retain Auth0 and revise member assurance. [AUTH0-SECURITY-PLAN.md](AUTH0-SECURITY-PLAN.md) now defines passkey-preferred sign-in, password fallback, provider email recovery and bounded session exposure. Earlier required-UV/two-proof gates are historical for ordinary members. This is a plan revision, not production acceptance; runtime identity remains disabled and staging compute remains stopped.

## Environment/domain matrix

| Environment | Frontend and BFF | Identity | Data/email |
|---|---|---|---|
| Local Cretans dev | 127.0.0.1:5174 → Vite /api → 127.0.0.1:3002 | disabled by default | public-only, no email |
| Local standalone | 127.0.0.1:3002, explicit matching APP_ORIGIN | disabled | no DB required for public reading |
| Automated browser | 127.0.0.1:3012 | disabled | no private fixtures in browser |
| Automated API/protocol | isolated PGlite and signed transport fixtures | test-only dependency injection | disposable data, no email |
| Development provider | real-provider diagnostic callbacks on 127.0.0.1:3001 and :3002 | Auth0 issuer/RP ID auth-staging.liiightwave.com; two clients; app identity disabled | owner-only development secrets and isolated diagnostic DB; real enrollment and same-account session reuse passed |
| HTTPS staging diagnostic | two isolated Railway HTTPS diagnostics; compute stopped 10 October | revised policy unimplemented; app identity disabled | new diagnostic PostgreSQL volume retained |
| Existing production core | liiightwave.com + accounts.liiightwave.com, Netlify /api → verified existing Railway host | existing password service remains | existing production data untouched |
| Intended production Cretans | cretans.liiightwave.com, not resolving during discovery | blocked | unprovisioned |
| Proposed central auth | auth.liiightwave.com, not created | issuer/RP ID requires provider proof first | provider-owned credentials |

## Executed locally

Initial final verification: TypeScript check, lint and production build passed. 21 API/protocol tests passed, including actual library signature/claim validation with ephemeral test signing keys. Ten core regression tests passed, including the legacy-session/SSO separation check. Both dependency sets reported zero known vulnerabilities on installation. Six functional browser tests plus a screenshot capture passed, including the actual Talisman renderer/worker round-trip and ambiguous/unsupported/oversized upload rejection. Final audit and repository checks are recorded in the delivered implementation report. These are local results only.

Auth0 configuration increment: TypeScript check and lint passed; all 27 local tests passed (the existing 21 plus six Action tests), with zero skipped. Full dependency audit reported zero vulnerabilities. Real provider verification is limited to DNS/TLS/discovery, dashboard configuration/deployment and a hosted-login page preview. No actual user authentication occurred. See `AUTH0-SETUP.md` for the evidence boundary.

Real-provider diagnostic increment: 30 local tests, typecheck, lint and build passed; audit reported zero vulnerabilities. Core's ten regression tests and build passed. Both real clients returned expected `login_required` before enrollment. Human passkey enrollment, both clients' real signed code/PKCE exchanges and same-account session reuse passed. Loopback silent SSO returned `consent_required`. Twenty focused HTTP boundary checks passed. Full application acceptance remains gated; see `AUTH0-LIVE-TEST.md`.

## Provider decision · 10 October 2026

Retain Auth0 under the revised member policy in [AUTH0-SECURITY-PLAN.md](AUTH0-SECURITY-PLAN.md), following the owner's instruction. The old required-UV, passkey-only access and independent two-proof recovery requirements are superseded for ordinary members. The historical assessment in AUTH0-ACCEPTANCE-DECISION.md is still valid against that older policy. Runtime implementation and real-provider acceptance of the new policy remain pending; identity is still disabled. Refresh grants remain disabled, so clarification of refresh claims is no longer on the member-release critical path.

## Release blockers

1. Implement the explicit auth0-member-v1 policy and matching scoped Action: passkey or database password, verified email, trusted signed policy marker and auth_time, exact issuer/client/connection, and protocol validation. Do not synthesize UV/acr/amr or retain the old strict gate with fake values. Prove accepted member routes, rejected foreign/missing-policy routes, fresh login and two-client SSO on real Auth0.
2. Implement 30-minute inactivity and a 60-minute maximum anchored to original auth_time; prove callbacks, silent SSO and activity cannot extend it. Retain per-request security-version checks; add local account suspension and authenticated replay-safe password-change notifications. Test recovery, password reset followed by new passkey enrollment, backup authenticator, notifications, both-app revocation and dropped-event expiry fallback. Provider-wide all-device logout is not claimed; native back-channel entitlement is not mandatory for this bounded design. Privileged app access remains disabled until separate MFA/recovery controls are proven.
3. Temporary HTTPS diagnostic compute is stopped. Restart only with the revised test configuration and a bounded test window; no successful HTTPS authenticated application exchange has yet been recorded. Prove both actual application callbacks, secure cookies, two-account cache/ownership isolation, CSRF/proxy defenses, recovery, logout and the authentication-age bound through the chosen full-application ingress. Existing production ingress stays unchanged.
4. Verify production-capable Auth0 verification/recovery mail and LiiiGHTWAVE security alerts. No verified LiiiGHTWAVE Resend sender currently exists. Inspect Hostinger DNS and use exact provider-issued DKIM/SPF values; preserve root MX. Implement authenticated events and a durable protected outbox with monitored delivery. Use test recipients for validation; no arbitrary send endpoint.
5. Billing remains unimplemented. Paid APIs must deny missing/expired entitlements; leave purchases disabled until verified webhooks, ordering and purchase flows exist. Billing is not part of the member SSO/saved-progress acceptance milestone.
6. Verify runtime DB roles, backup/restore, operational alerts, sustainable post-trial provider features/costs and the revised threat model. Inspect production data before any migration; do not automatically link legacy accounts. Confirm the Cretans remote and exact deployment targets. Fix production issuer/RP ID before separate production enrollment.
7. Complete owner/legal review for retention, children's data, POPIA-related purposes/consents/rights and cross-border providers. No compliance or independent-audit claim. Complete rollback evidence, then obtain the original required production-cutover approval.

## Revised recovery runbook (implementation and testing pending)

The revised plan permits Auth0-hosted email password recovery for ordinary members, followed by a new OIDC login. Password fallback and subsequent replacement-passkey enrollment are accepted member behavior. This intentionally makes recovery-mailbox control part of account security; it does not supply independent two-proof recovery or proven UV. No application reset-code/password collection, Talisman shortcut, email-based account merging or support override is introduced.

Require verified email before private access. Test expired/replayed recovery links, delivered security alerts, old sessions in both apps and the 60-minute authentication-age fallback. Recommend a backup authenticator and test without deleting the only working credential. Provider enrollment routes retain Auth0's checks; a fresh application session cannot enforce restrictions on every provider route. Keep administrator identities and factor-reset procedures separate; privileged features remain disabled until their MFA policy is tested. See AUTH0-SECURITY-PLAN.md for implementation tasks and limitations.

## Revocation / incident runbook

Current code invalidates one application session on local logout and uses an account security version/revocation time for both-app logout. Every private request checks DB state. Local fixtures prove this request sequence; they are not a deployed SLA. Signed back-channel handling exists, but provider-wide event coverage is unproved.

The revised design must add local suspension, authenticated replay-safe post-password-change notifications and a 60-minute session deadline anchored to auth_time. Notification delivery is asynchronous and must not be assumed reliable; the fallback requires real expiry/no-silent-renewal tests. “Sign out of both apps” and current-browser Auth0 logout must have distinct user-facing behavior. No all-device provider-session/credential deletion is promised. In-flight authorized requests may finish.

For confirmed compromise: locally suspend fresh and existing access, increment the security version, preserve restricted evidence, then use authorized Auth0 operations to remove compromised credentials and block/revoke provider access as supported. Password reset alone is insufficient evidence of cleanup. Rotate compromised service secrets, verify clean state, and notify affected users through the verified sender. Alerting, provider cleanup and the revised time bound remain implementation/real-provider gates.

## Migration, backup and rollback

Use separate migrator and runtime roles. Apply the additive identity schema to a new identity DB explicitly before starting an enabled BFF. Verify foreign keys, uniqueness and ownership tests using the runtime role. Never apply test fixtures to production. Configure PostgreSQL TLS/private networking without disabling certificate verification. The current adapter uses pg defaults/connection configuration; external DB TLS trust must be validated explicitly.

Before staging identity: create a restricted encrypted `pg_dump` backup plus separate recovery of the application data key; restore into an isolated database, run integrity/ownership checks, and record measured restore time. Backup retention and destruction require owner review. The encrypted Talisman payload cannot be regenerated if its data key is lost; revoke/regenerate artifacts through authenticated sessions instead of weakening authentication.

Rollback: set identity disabled, roll back application builds, retain additive identity tables for investigation/compatible rollback. Preserve the legacy account site. Do not drop tables, change RP ID, switch issuer, or invalidate existing user credentials as a routine rollback. Production promotion requires the user’s cutover approval after the completed gates.

## Retention and privacy review

The design stores minimal issuer/subject references, opaque session hashes, display names, separate narrative profiles, notes/progress and encrypted Talisman regeneration material. Browser PNGs and phrases are transient. Auth transactions expire in five minutes, pending onboarding in twenty minutes, current sessions have one-hour idle/twelve-hour absolute limits (to be replaced by the revised 30-minute idle/60-minute authentication deadline); the Cretans cleanup task deletes expired operational rows. Core cleanup for shared identity operational rows must be scheduled before deployment if no Cretans worker runs.

Notes/progress persist until a reviewed deletion workflow completes. Export excludes session secrets and Talisman references. Deletion requests are merely recorded for review; they are not falsely marked completed. Netlify, Railway, Auth0 and the selected sender are data processors to assess. AI, cloud speech, tracking, files and offline private caching are absent, so no zero-retention/end-to-end-encryption claim is made.
