# Auth0 development setup · 9 October 2026

**Current plan · 10 October revision:** The owner chose to retain Auth0 and revise member assurance. [AUTH0-SECURITY-PLAN.md](AUTH0-SECURITY-PLAN.md) now defines passkey-preferred sign-in, password fallback, provider email recovery and bounded session exposure. Earlier required-UV/two-proof gates are historical for ordinary members. This is a plan revision, not production acceptance; runtime identity remains disabled and staging compute remains stopped.

**Historical evidence:** Results and configuration below describe the earlier strict-policy diagnostic. They are preserved without converting vendor statements or old tests into acceptance of the revised plan.


**Provider configuration and the two-client diagnostic work; application identity remains disabled.** The owner completed real passkey enrollment. Both development clients verified signed responses for the same account, with shared provider-session reuse and local-callback confirmation. Silent `prompt=none` returned `consent_required`. This is not full application acceptance or a production provider decision. Development secrets are installed in an owner-only directory. No paid plan was selected or production application deployed. See `AUTH0-LIVE-TEST.md` for the latest integration evidence.

## Verified provider and DNS configuration

- Existing tenant: `liiightwave`, EU-2, Development. Initially only Default App and no users were visible. Production core users were not queried or migrated.
- Dashboard indicates Free plan and a trial with 22 days remaining at inspection. The owner completed card verification. Feature availability during a trial does not establish ongoing entitlement.
- Custom domain: `auth-staging.liiightwave.com`, Auth0-managed TLS, domain ID `cd_maq5gDhQ1A8qrhi6`. Dashboard status **Verified** and **Default**.
- Hostinger: added only CNAME `auth-staging` → `liiightwave-cd-maq5gdhq1a8qrhi6.edge.tenants.eu.auth0.com`, TTL 300. Existing web and mail records preserved. Public DNS resolved the exact target.
- Issuer and RP ID are respectively `https://auth-staging.liiightwave.com/` and `auth-staging.liiightwave.com`. The root domain is not the RP ID. Production `auth.liiightwave.com` remains unconfigured; staging credentials will not be portable to that RP ID.
- HTTPS discovery succeeded with system certificate validation. Endpoints: `/authorize`, `/oauth/token`, `/.well-known/jwks.json`, `/oidc/logout`. Discovery advertises public subjects, S256 and back-channel logout. Metadata is not proof of entitlement or event delivery.

| Setting | LiiiGHTWAVE — Development | Cretans — Development |
|---|---|---|
| Client ID (public identifier) | `tPLFuZDNhiNHzTXUfJIJj4D8XJfzqYJR` | `1JdEMCKQJuqmPBiJIw1PqTlkQ3l4RJbJ` |
| Type | Regular Web Application | Regular Web Application |
| Callback | `http://127.0.0.1:3001/api/identity/callback` | `http://127.0.0.1:3002/api/identity/callback` |
| Logout allowlist | `http://127.0.0.1:3001/` | `http://127.0.0.1:3002/` |
| Grant | Authorization Code only | Authorization Code only |
| ID-token lifetime | 300 seconds | 300 seconds |
| Connection | Database only | Database only |

Implicit, refresh, client credentials, password, OTP, native Passkey and token-exchange grants are disabled on these clients. Google is disabled for both. No wildcard or production callbacks and no browser token exchange/CORS configuration were added. BFF code requests S256; real code/PKCE exchanges succeeded for both clients. Provider rejection of a request without PKCE remains to test. Both Client Secret (Post) methods are verified; development secrets are securely installed only for the local diagnostic, outside the repositories.

Database `Username-Password-Authentication`, ID `con_yArftYWRRZ9e9xQ9`: New Universal Login, Identifier First, passkey button plus autofill, progressive enrollment off, local enrollment on. Password remains enabled as required by Auth0; the Action rejects its use for these clients. Turning off progressive enrollment avoids automatically upgrading a password login into new passkey enrollment. Local enrollment after a cross-device passkey still requires review against the unresolved UV/freshness policy.

Tenant friendly name is LiiiGHTWAVE. Both persistent and non-persistent central sessions use 60-minute idle and 720-minute maximum limits. The existing persistent default is retained. Hosted login uses the core navy/pale palette, with background `#03121d`, widget `#081b28`, pale buttons/text `#edf2f5` and focus `#c8e8f9`; the unconfigured logo is hidden. No custom JavaScript/login template, analytics, external font, or 3D bundle was added.

## Deployed Action

The Cretans repository's `provider/auth0/liiightwave-passkey-gate.cjs` is deployed as **LiiiGHTWAVE development passkey gate**, ID `9b07a896-f160-4236-b33b-9738d234b34c`, Node 22, attached to the Post Login trigger. The editor source was compared with the local source after deployment, and the flow reported all changes live.

The Action affects only the two listed clients and requires the exact database connection plus Auth0's documented `event.authentication.methods[].name === 'passkey'`. All absent, malformed or weaker evidence denies access. It leaves Default App and unrelated clients alone. Its two namespaced claims report only the method and gate version. It never invents `acr`, `amr`, user-verification, freshness, roles, or entitlements. The BFF does not accept these method claims as sufficient authentication assurance.

Six local tests cover weaker methods on both clients, malformed evidence, another connection, user-controlled metadata/query flags, the precise allowed claims, and unrelated-client isolation. They are synthetic Action inputs, not real provider authentication tests.

## Concrete blockers and next steps

1. **Required user verification is not proven.** The inspected passkey settings do not expose a required-UV control. Auth0 documents a passkey method signal, but the reviewed event documentation does not establish a trustworthy verified-UV signal. Its embedded API examples use `userVerification: preferred`; that alone does not establish hosted-login enforcement. Do not infer UV from a biometric prompt, successful login, `passkey`, `mfa`, or user metadata. Obtain supported enforcement/evidence and test both UV success and UV=false rejection before writing a provider policy. If Auth0 cannot meet this must-have, reconsider the provider instead of weakening it or adding an application credential store.
2. **Central revocation is not proven.** Auth0 documents back-channel logout as Enterprise and the dashboard marks it accordingly. No upgrade was purchased. Discovery advertising support is insufficient. Verify actual entitlement/delivery or implement and measure a supported bounded fallback tied to provider session/recovery changes. Local shared security-version invalidation already exists but does not independently detect provider recovery/revocation.
3. **Full application acceptance remains incomplete.** Real enrollment, both-client signed exchanges/session reuse, forced fresh authentication and browser provider-session logout passed in the isolated diagnostic. Initial responses omitted `acr`/`amr`; fresh sign-in returned `amr=["phr"]` but no `acr` or established required-UV evidence. After the first two gates, provision the dedicated application identity DB and establish a provider-specific assurance adapter based on supported evidence. Complete stable-HTTPS silent SSO, stale/weak-session rejection, additional-authenticator management, recovery, all-device logout and private-data ownership tests. Do not count diagnostic cookies as application sessions.
4. **Deployment remains unprovisioned.** Register stable staging application origins only after selecting the topology. Verify HTTPS/cookies/cache/ingress, DB roles/backup restore, and a test email sender. Production promotion requires the already documented release gates and cutover approval. Do not repoint existing account routes.

The existing strict policy schema is an application contract, not an assertion that Auth0 emits its fields. No `OIDC_POLICY_FILE` with invented `acr`, `amr`, UV or `backchannelVerified` values was created. Both applications remain `IDENTITY_ENABLED=false` by default.

## Evidence boundaries

Verified against the real service: custom-domain DNS/TLS/discovery; dashboard client/passkey/session settings; Action deployment and flow attachment; hosted login at the custom domain; human passkey enrollment; both clients' signed code/PKCE exchanges; same issuer/subject and provider-session reuse with unchanged auth_time; forced fresh authentication with newer auth_time; browser provider-session logout followed by `login_required` on both clients. See `AUTH0-LIVE-TEST.md` for exact results and limitations.

Not verified: required UV, full application acceptance, completely silent SSO on stable HTTPS origins, weak/recovered-session rejection against Auth0, second authenticator, provider account deletion/export/recovery, all-device central revocation, post-trial entitlement, or any staged application deployment. Production was not changed.

## Official references checked 9 October 2026

- [Configure passkeys](https://auth0.com/docs/authenticate/database-connections/passkeys/configure-passkey-policy): prerequisites, password coexistence, enrollment options and RP-ID constraints.
- [Detect passkey use in Post Login Actions](https://support.auth0.com/center/s/article/detecting-passkey-usage-in-auth0-post-login-actions): documented method evidence.
- [Post Login event object](https://auth0.com/docs/actions/reference/post-login/post-login-event-object) and [API object](https://auth0.com/docs/actions/reference/post-login/post-login-api-object): supported Action inputs and deny/custom-claim operations.
- [Embedded passkey API](https://auth0.com/docs/authenticate/database-connections/passkeys/passkey-apis): its example UV preference is not a hosted-login assurance guarantee.
- [OIDC back-channel logout](https://auth0.com/docs/authenticate/login/logout/back-channel-logout): entitlement and integration requirements.
- [Session lifetime settings](https://auth0.com/docs/manage-users/sessions/configure-session-lifetime-settings).

## Rollback

Leave app identity disabled. In the development tenant, detach the Action from Post Login if withdrawing the spike; this does not enable BFF access. Restore branding/session values only if needed for this empty development tenant. Do not change the RP ID/default domain after enrollment without a migration decision. Remove the single staging CNAME only when retiring its custom domain. Never rotate unrelated secrets or modify production records as routine rollback.
