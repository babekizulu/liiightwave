# Architecture decisions

## ADR 001 · Preserve the working core

Accepted locally, 9 October 2026. Keep repositories separate. Retain the existing React/Vite/Express stack and styles. Cretans uses TypeScript in the client and ES modules in the server, matching the core backend. Add a separate `/sso` preview and `/api/identity/*` namespace on the core; preserve legacy account routes, schema, cookie and functionality. No email-based automatic migration or linkage.

Central account management is provisionally `https://liiightwave.com/sso`. The existing plural `accounts.liiightwave.com` alias remains the legacy service. Do not introduce `account.liiightwave.com` or repoint the alias. `auth.liiightwave.com` is a proposal only, to be confirmed with the chosen provider before any passkey is registered.

## ADR 002 · Provider selection remains pending

No provider tenant, plan, credentials or issuer was found in the accessible project configurations. A checkbox and documentation alone do not satisfy the required working proof. Neither Auth0 nor Cognito is selected for production. Implement one standards-based OIDC boundary with `openid-client` and JOSE, disabled until a reviewed policy exists. Do not implement competing credential authority, token minting or local recovery.

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
