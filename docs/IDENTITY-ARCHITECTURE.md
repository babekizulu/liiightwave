# Architecture decisions

**Current plan · 11 October revision:** The owner selected Amazon Cognito in Cape Town. [COGNITO-MIGRATION.md](COGNITO-MIGRATION.md) records the staged migration, current verification and remaining cutover work. Auth0 member staging previously passed password recovery and both-app revocation tests and is retained during migration. Older inventory and blocker entries below are historical; this revision does not enable production identity.

## ADR 001 · Preserve the working core

Accepted locally, 9 October 2026. Keep repositories separate. Retain the existing React/Vite/Express stack and styles. Cretans uses TypeScript in the client and ES modules in the server, matching the core backend. Add a separate `/sso` preview and `/api/identity/*` namespace on the core; preserve legacy account routes, schema, cookie and functionality. No email-based automatic migration or linkage.

Central account management is provisionally `https://liiightwave.com/sso`. The existing plural `accounts.liiightwave.com` alias remains the legacy service. Do not introduce `account.liiightwave.com` or repoint the alias. `auth.liiightwave.com` is a proposal only, to be confirmed with the chosen provider before any passkey is registered.

## ADR 002 · Original provider selection (superseded by ADR 008)

Initially no provider tenant, plan, credentials or issuer was found in the project configurations. The owner subsequently supplied Auth0 access; see ADR 006 and `AUTH0-SETUP.md`. A checkbox and documentation alone do not satisfy the working proof. Neither Auth0 nor Cognito is selected for production. Keep the standards-based OIDC boundary with `openid-client` and JOSE disabled until a reviewed policy exists. Do not implement competing credential authority, token minting or local recovery.

Shortlist based on official documentation checked 9 October 2026:

| Candidate | Verified documented capability | Must prove in the actual tenant |
|---|---|---|
| Auth0 | Hosted Universal Login passkeys; up to 20 credentials; existing passwords can remain valid after passkey enrollment; configurable RP ID; post-login events expose passkey use | Exact user-verification evidence, enforced claims in weaker/recovered SSO sessions, custom-domain plan/cost, fresh management, two-proof recovery, signed logout events, export/deletion and credential migration limitations |
| Cognito | Passkeys through managed login in Essentials/Plus; configuration for required user verification; custom-domain/RP-ID options | Actual tier/cost, claims that distinguish UV passkeys from password/OTP/federation, recovery assurance, enrollment restrictions, central logout/revocation, export and branding constraints |

Sources: [Auth0 passkeys](https://auth0.com/docs/authenticate/database-connections/passkeys), [Auth0 passkey event detection](https://support.auth0.com/center/s/article/detecting-passkey-usage-in-auth0-post-login-actions), [Cognito authentication flows](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html), [Cognito plans](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-sign-in-feature-plans.html). No price, paid entitlement, custom-domain availability, recovery policy, or regulatory compliance is claimed for this account. No purchase was made.

The ignored policy JSON requires: issuer, clientId, signingAlgorithm (RS256/ES256), exact acr, required amr array, userVerificationClaim, userVerificationValue=true, reviewReference, backchannelVerified=true, subjectMode=public. These are **application policy fields**, not alleged provider settings. Their values must come from real tenant evidence. The review reference must point to recorded passkey/weak-route/recovery tests. A manual assertion in this file does not replace release review.

## ADR 003 · BFF and database boundaries

Each client has its own exact origin, callback, cookie name and session rows. Auth code, state and nonce are tied to a random browser cookie and client-specific transaction. `DELETE RETURNING` consumes transactions once before code exchange. State, nonce, issuer, audience, expiry, signature and algorithm validation run in maintained libraries. Tokens never enter browser storage and are discarded after the ID-token checks; refresh grants are not requested.

Production cookies use `__Host-lw-<client>`, HttpOnly, Secure, Path=/, SameSite=Lax, no Domain. The provider response mode is query/GET; mutation endpoints require JSON and the exact Origin. There is no wildcard CORS. Redirect destinations are fixed. There is no provider page proxy or iframe.

Accounts map verified `(issuer, subject)` only. This initial shared database boundary requires public subjects and checks session client ownership. Pairwise subjects are not falsely presented as linked central accounts; adding them requires a trusted provider account-mapping design. The residual correlation from public subjects is documented and the identifiers are not exposed in browser APIs.

The two BFFs share one new identity database for this increment. This is a modular application foundation, not a production least-privilege service topology. Before release, restrict runtime roles and central-only tables; test actual database role permissions and backups. Do not let a Cretans service compromise become central credential-management authority. No credentials exist in this database.

One-hour inactivity and twelve-hour absolute sessions are checked server-side. Polling does not extend inactivity; `/activity` accepts a same-origin explicit activity signal. Fresh sensitive operations require auth_time within five minutes. A core re-verification button requests max_age=0. Local logout deletes one session; participating-app logout increments a central security version checked on every private request. An old SSO auth_time cannot immediately recreate a session after revocation. Requests already authorized before revocation can finish; production in-flight behavior needs measurement.

Signed OIDC backchannel events verify issuer/audience/algorithm, age, event purpose and replay metadata. Central-session provider logout and provider-native grants/recovery invalidation remain **not implemented** until selected-provider integration. Do not claim that application logout ends the provider session.

## ADR 004 · Same-origin deployment fallback

Keep existing Netlify/Railway production unchanged. Cretans' Docker image can serve its built frontend and BFF from a single Railway origin, avoiding an unproved proxy. Its Netlify configuration currently permits **public reading only**: APIs return unavailable before the SPA fallback. It contains no invented Railway target.

If keeping authenticated frontend traffic on Netlify, first prove exact-origin redirects, Set-Cookie, two-account cache separation, TLS handling and authenticated origin ingress. No proxy trust is enabled in Cretans, external URLs use configuration, and rate limits use socket provenance. Behind a proxy the conservative socket budget may be shared; don't switch to arbitrary X-Forwarded-For. Do not deploy identity until that availability/ingress limitation is resolved.

## ADR 005 · Product scope while identity is blocked

Public learning remains useful without an account. One short sourced chapter and deterministic path suggestions avoid fabricated encyclopedia/AI output. Mentor copy is editorial; no AI API or speech service runs. Historical figure personas, character artwork, rich orb dragging/zoom, uploads, PWA/offline caches, capstones, certificates and advanced atlas remain future work. Ariadne is explicitly labelled a mythic guide in the provisional persona record, not represented as a historical person; replace/extend this with a sourced historical-figure catalogue later.

No existing mentor art was found, so the UI uses mentor names and editorial prompts rather than inventing replacement mascots. No stock art licensing claims are made. The chapter links to its credited museum source without copying their imagery.

## ADR 006 · Original Auth0 development spike (assurance policy superseded by ADR 008)

Accepted for development only, 9 October 2026. Reuse the owner's empty Auth0 Development tenant, two separate confidential web clients and an Auth0-managed custom domain `auth-staging.liiightwave.com`. The name deliberately separates development credentials from the proposed production RP ID. Hosted login uses the core navy/pale palette; credential UI and authority remain with Auth0.

A scoped Post Login Action rejects missing passkey-method evidence. This is defense in depth, not proof of required user verification or a real authenticated application. Auth0 requires passwords to remain enabled on this connection; UI configuration alone therefore cannot enforce app assurance. Progressive enrollment is off. Do not manufacture verified-UV, acr/amr or recovery assurance from the passkey method. The existing BFF remains disabled.

Required-UV enforcement/evidence and central revocation remain unresolved provider gates. Back-channel logout is documented as Enterprise; do not interpret public metadata or trial access as a lasting plan entitlement. No paid commitment was made. A supported measured revocation fallback may be assessed, but local security-version checks alone do not observe provider compromise recovery. If Auth0 cannot satisfy a must-have, revisit provider selection; never weaken the requirements to reach the demonstration milestone.

## ADR 007 · Prove transport before granting application access

Accepted for development, 9 October 2026. Extract the existing OIDC signature/transaction transport into a shared module and exercise it with the real Auth0 clients through an isolated local diagnostic. The actual application provider wrapper still requires its strict assurance policy. The diagnostic never mints an application session, maps an application account, or serves private data; it can therefore collect real supported evidence without inventing UV/assurance values to satisfy the application gate.

Distinct diagnostic cookies and durable local PGlite transactions allow browser binding, callback replay rejection and same-account comparison. Only allowlisted evidence is shown or recorded. Development secrets remain in an owner-only directory and are loaded by the owner-run server. No credential enrollment authority or competing identity token is introduced. See `AUTH0-LIVE-TEST.md` for executed versus pending checks.

## ADR 008 · Retain Auth0 with revised member assurance

Recorded 10 October 2026 following the owner's instruction to revise the security plan without changing authentication service. Retain Auth0 as sole credential authority. Implement the versioned member policy in [AUTH0-SECURITY-PLAN.md](AUTH0-SECURITY-PLAN.md): passkeys preferred, database passwords allowed, provider email recovery accepted, verified mailbox required for private access, and separate privileged-access policy. Do not claim enforced passkey UV, independent two-proof recovery or universally protected provider enrollment.

The original strict-provider assessment remains valid for its original requirements, but those three member guarantees are deliberately superseded. The replacement-provider investigation is closed for this scope. Keep protocol/ownership/CSRF isolation, explicit evidence mapping and failure on missing required member claims. Do not bypass the old gate with invented claims; implement an explicit new policy version and meaningful tests first.

New targets are 30-minute inactivity, a 60-minute deadline anchored to original authentication, five-minute sensitive-action freshness, both-app security-version revocation, and authenticated password-change notifications with an expiry fallback. These targets replace the previous session defaults and provider-wide immediate-revocation expectations only after implementation and measurement. Member recovery-mailbox compromise remains an accepted design limitation, not a risk eliminated by alerts or short sessions.

No runtime configuration, provider Action, credentials, DNS or paid service changed with this ADR. Application identity stays disabled until the revised release gates pass. Production cutover still requires the original explicit approval; no further provider selection or demonstration of required UV is a member-release prerequisite.
