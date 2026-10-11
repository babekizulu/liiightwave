# Real Auth0 integration test · 9 October 2026

**Current plan · 10 October revision:** The owner chose to retain Auth0 and revise member assurance. [AUTH0-SECURITY-PLAN.md](AUTH0-SECURITY-PLAN.md) now defines passkey-preferred sign-in, password fallback, provider email recovery and bounded session exposure. Earlier required-UV/two-proof gates are historical for ordinary members. This is a plan revision, not production acceptance; runtime identity remains disabled and staging compute remains stopped.

**Historical evidence:** Results and configuration below describe the earlier strict-policy diagnostic. They are preserved without converting vendor statements or old tests into acceptance of the revised plan.


The two development clients now have a runnable local real-provider diagnostic. It uses the **same OIDC protocol transport as the applications**. It does not grant application accounts, application sessions, notes/progress access or entitlements. Required-UV and provider revocation remain release gates.

## Implemented

- `server/identity/oidc.js` performs discovery, Authorization Code/PKCE S256, nonce/state/max-age and signed ID-token validation with the existing maintained libraries. It returns validated claims, not raw tokens. The production-facing `createProvider` wrapper still enforces `assertAssurance`; router assurance checks and startup policy requirements are unchanged. Shared identity sources are mirrored in both repositories.
- Cretans `scripts/auth0-probe.js` runs two loopback-only listeners: LiiiGHTWAVE on `http://127.0.0.1:3001/`, Cretans on `http://127.0.0.1:3002/`. Existing exact Auth0 callback/logout allowlists are reused. No production host or client was modified.
- Each client has a separate opaque diagnostic cookie, bound to client-specific visitor and transaction rows. PKCE verifiers/nonces/state are short-lived in a dedicated local PGlite database. Callbacks atomically consume transactions. This is diagnostic state, not a deployed application database.
- The report allows only selected assurance evidence and booleans. Subject identifiers are HMACed with a per-run random key for same-account comparison. No name, email, raw subject, provider session ID, token or credential is included in the report. Unknown UV remains unproven even if a claim named `uv` is present.
- Exact Host/Origin checks, CSRF, no-store responses, HttpOnly/SameSite cookies, and a restrictive CSP protect the local diagnostic. It cannot start with `NODE_ENV=production` or without explicit opt-in. It has no credential-entry endpoint and no application-session endpoint.
- The development secrets were transferred as RSA-OAEP ciphertext and installed by a helper running as the verified Lwandle Windows account. The private folder and secret files permit only that account. No secret was printed, committed, placed in frontend variables, or copied to production.

## Real-provider evidence

Before enrollment, both clients navigated through the actual Auth0 `/authorize` endpoint with `prompt=none`, returned to the registered loopback callback, passed the local transaction binding and reported `login_required`.

The owner completed passkey enrollment through the Cretans development client. Its real Authorization Code + S256 PKCE exchange passed signature, issuer, audience, nonce, state and auth-time validation. The signed claims contained the deployed Action's `passkey` method and `development-method-gate-v1` policy, `auth_time=1791560988`, and a provider session identifier. `acr` and `amr` were absent. No account identifier or token is included here.

The LiiiGHTWAVE development client then reused that provider session through a normal redirect, asking for local-callback confirmation but **no second passkey ceremony**. Its signed response had the same authentication time and method policy. The diagnostic compared HMACs of the validated issuer/subject pairs and displayed **Same account across both clients: YES**. This proves shared provider identity and session reuse in the diagnostic; it does not grant full application access.

`prompt=none` returned `consent_required` even after the local callback confirmation. Completely silent SSO therefore did not pass on these loopback URLs. This is consistent with Auth0's documented [non-verifiable callback confirmation](https://support.auth0.com/center/s/article/understanding-and-testing-the-non-verifiable-callback-uri-consent-screen) and [consent behavior](https://auth0.com/docs/get-started/applications/third-party-applications/user-consent-and-third-party-applications). Retest on approved stable HTTPS staging origins; do not disable the provider's protection to conceal this result.

Fresh authentication passed. `prompt=login` plus `max_age=0` opened the passkey login page despite the existing session. The owner completed a second ceremony; the verified Cretans response had the same account, a newer `auth_time=1791561480`, `amr=["phr"]`, no `acr`, and the same Action method/policy claims. This proves that this request caused fresh authentication. It does not prove every sensitive provider-management operation requires it, or that `phr` attests required user verification.

Browser-session logout passed. The diagnostic called Auth0's discovered OIDC logout endpoint with client ID and the allowlisted return URI, then accepted Auth0's logout confirmation. Subsequent `prompt=none` requests from **both** clients returned `login_required`. This establishes logout of this browser's provider session. It does not establish all-device revocation, back-channel delivery, recovery invalidation or application-session logout. The diagnostic keeps its previous report as historical evidence; a returned logout state is not treated as a verified revocation event.

These observations are real-provider results, distinct from local fixture tests. Required user verification remains unproven: a human device prompt and the passkey method claim do not establish provider-wide required-UV enforcement. No application account or session was granted at any point.

## Executed local verification

- Cretans: 30/30 API/protocol/Action/probe unit tests passed; zero skipped. Typecheck, lint and production build passed; dependency audit reported zero vulnerabilities.
- Core: 10/10 regression tests and production build passed.
- Twenty focused checks against both running diagnostic listeners passed: no-store headers; host-only HttpOnly cookies; absent/sibling Origin and forged CSRF rejection; no credential/application-session endpoint; unknown callback rejection; Host validation. The Host test uses Node HTTP because fetch normalizes its Host header.
- Existing signed fixture tests continue exercising wrong state/nonce/issuer/audience/expiry/signature and back-channel event validation after the transport extraction.
- Browser evidence uses Chrome against the real tenant. Raw CDP inspection stalled and is not usable here. Do not repeat it. Normal documented browser UI calls work.

## Run / resume

Run from the Cretans repository with Node 22 and the owner's existing private directory. Do not print or copy the `.secret` file values:

```powershell
$env:NODE_ENV='development'
$env:AUTH0_REAL_PROBE='1'
$env:AUTH0_PROBE_PRIVATE_DIR='C:\Users\Lwandle\Documents\Codex\2026-10-09\c-users-lwandle-desktop-babekizulu-2026\work\auth0-live\credentials'
node --use-system-ca scripts/auth0-probe.js
```

The server must run as Lwandle because sandbox identities cannot read this directory. Secret files are `liiightwave.secret` and `cretans.secret`; never place them in Git or broaden the ACL to make a sandbox read them. The private `evidence.json` contains only allowlisted diagnostic results. The helper's development credentials must not be reused as production credentials.

Starting the diagnostic clears only its own diagnostic database rows. Do not restart while an enrollment transaction is pending. Check for the previous local public preview on port 3002 before starting; stop only a positively identified task-owned listener. Production services are unrelated.

Open Cretans test and choose Create a development passkey account. The human chooses their development email and completes the provider's passkey and device verification steps. A callback transaction expires after five minutes. If enrollment finishes after expiry, return to the test root and choose Sign in with a passkey; do not repeatedly create accounts or alter the RP ID.

After a successful Cretans response, open the LiiiGHTWAVE test and choose Test existing SSO session. If Auth0 returns `consent_required` on loopback, choose Sign in with a passkey for the normal redirect and expected callback confirmation. Compare the account result in the same browser, inspect auth_time and documented method evidence, and record the actual result. Account comparison is available only when both latest exchanges succeeded. Run Require a fresh passkey sign-in with human participation. Test central logout and subsequent no-session requests from both clients. These paths have now been exercised as recorded above; none alone establishes required UV or all-device recovery revocation.

## Remaining acceptance and deployment gates

Prove required UV with documented provider enforcement and trustworthy evidence, including UV=false rejection. Verify all weaker/recovery routes and enrollment management. Complete provider revocation/back-channel entitlement or a measured supported fallback. Then configure the reviewed provider policy, provision the dedicated application identity database/services, verify actual private-data authorization and deployment behavior, and request production cutover approval. Until then both actual applications remain identity-disabled.
