# Cognito staging migration — updated 12 October 2026

The owner selected Amazon Cognito and Cape Town (`af-south-1`). This supersedes the earlier decision to retain Auth0. Production identity remains disabled in Cretans; the existing company website's legacy password service remains active. Auth0 staging is retained during verification.

## Created AWS configuration

- AWS account `130165494614`; pool `liiightwave-staging`, Essentials tier, deletion protection.
- Separate confidential OAuth clients for LiiiGHTWAVE and Cretans, authorization-code flow only, `openid email`, exact existing Railway staging callbacks and logout origins.
- Cognito password or passkey sign-in; verified email required by the BFF. Passkeys require user verification. Password sign-in does not claim MFA.
- Minimum 15 characters with no forced character classes. Essentials does not include Plus compromised-credential detection. The local legacy password blocklist does not apply to Cognito-hosted passwords.
- Cognito default email for staging tests. Production email needs a separately reviewed SES or custom-sender configuration; existing Resend secrets are not copied to AWS.
- Intended hosted origin: `https://lw-staging-130165494614.auth.af-south-1.amazoncognito.com`.
- Generated app secrets are transferred encrypted with the operator's existing RSA public key. Plaintext secrets must not be printed, committed or sent to a browser bundle.

Created after the owner's explicit staging approval on 11 October 2026:

| Resource | Identifier |
|---|---|
| User pool | `af-south-1_o339nGcD1` |
| LiiiGHTWAVE client | `75s4vip79o4came6tbu0vufi89` |
| Cretans client | `4unk554f7v070kgpoi79cv96e0` |
| Issuer | `https://cognito-idp.af-south-1.amazonaws.com/af-south-1_o339nGcD1` |

The read-only verification script confirmed all requested pool/client settings, active managed-login domain, required passkey user verification, exact discovery endpoints and RS256 public signing keys. The application OIDC adapter accepted the real discovery document for both clients. Both real managed-login pages loaded with their respective exact callback URLs. Subsequent human enrollment and authentication are recorded below.

Each client secret and reviewed policy was first stored in its corresponding dedicated Railway staging service as `COGNITO_STAGING_CLIENT_SECRET` and `COGNITO_STAGING_POLICY_JSON`. That preparation left active Auth0 settings unchanged. The staging activation below subsequently copied the reviewed values to the active settings. An RSA-OAEP encrypted local recovery copy is protected by the operator's existing Windows-user-encrypted private key; no plaintext credential files were written.

The operator setup in `provider/cognito/` defaults to a non-mutating plan. It validates account, region and SDK models before resource creation, records public resource IDs for safe resumption, refuses conflicting resource names/configuration, and prints generated credentials only as encrypted ciphertext.

## Application migration boundary

`cognito-member-staging-v1` is restricted to the two dedicated Railway staging origins and Cape Town issuer. Discovery endpoints must match the reviewed hosted domain and pool JWKS endpoint. The OIDC library verifies signature, issuer, audience, nonce, state, expiry and PKCE. The BFF also requires `token_use=id`, boolean verified email, no federated identity claim, and recent signed `auth_time`.

Sessions have 30-minute inactivity and a 60-minute absolute deadline anchored to their interactive authentication. Cognito must receive `prompt=login` and `max_age=0` for every new application session, with fresh authentication also checked during code exchange. Silent Cognito SSO cannot supply a trustworthy original authentication timestamp; see the live finding below. All session lookups check the active issuer, preventing old-provider cookies from authorizing a new-provider deployment. Provider tokens are discarded; refresh tokens are never used. Cognito's `/logout` redirect uses the configured client and exact logout origin. Unsupported OIDC back-channel events are rejected.

The staging policy supports authenticated password-reset events plus the authentication deadline. The approved `lw-cognito-staging-password-reset` Lambda is provisioned and attached, with a dedicated HMAC key, a role limited to its own logs, seven-day log retention and invocation permission restricted to this pool/account. Attachment followed application deployment and key configuration; pool/password/passkey settings were verified preserved. `PostConfirmation_ConfirmForgotPassword` revokes shared app sessions and queues the existing encrypted security-email outbox; signup confirmations are ignored. This does not cover `ChangePassword` or `AdminSetUserPassword`. The apps never expose provider tokens or offer those API paths; operator password changes require explicit application revocation. Production origins remain prohibited by this policy.

Local verification: all 74 Cretans API/protocol tests passed, including rejection of silent Cognito renewal and a correctly signed stale authentication timestamp. The prior 15 core regression/password tests and both builds passed. Both application builds use Vite's native configuration loader in this Windows sandbox. The mirrored identity files are byte-identical. Prior dependency audits reported zero vulnerabilities; no dependencies were added for transfer/recovery. Fixture checks remain separate from real-provider acceptance.

Accounts continue to use exact issuer/subject identity. Email, Talismans and story phrases never link accounts. The core-only transfer route requires a fresh signed Auth0 proof followed by a fresh Cognito proof, each within five minutes. It atomically preserves the existing account ID and dependent data, records a transfer audit, increments its security version and deletes old app sessions. Existing target accounts cannot be merged. Browser-bound one-use transactions, source security-version checks and per-identity recovery locks reject stale, replayed or revoked transfers, including resets before the target's first account exists. The original Auth0 recovery signature remains accepted while transfer is enabled. Human enrollment and the real transfer succeeded as recorded below.

## Staging activation and live boundary checks — 12 October 2026

The owner approved the recovery hook and staging continuation. GitHub feature-branch deployments `973e2f5` (Cretans) and `9a1f82f` (core) applied the additive schema and transfer implementation. Both staging services now use Cognito with recovery events enabled; only core enables the Auth0-to-Cognito transfer route. Original Auth0 settings have a Windows-user-encrypted rollback copy. The shared data key, existing accounts and production deployments were preserved.

Initial startup failed because Node's short per-address connection attempts timed out between Railway US West and Cape Town. Both staging services now set `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=1000`, preserving any existing options. [Node's connection-attempt setting](https://nodejs.org/download/release/v22.23.3/docs/api/net.html#netgetdefaultautoselectfamilyattempttimeout) adjusts timing without disabling TLS or validation. Both health endpoints subsequently returned `ok`; core advertised transfer enabled and Cretans disabled. Both real login endpoints returned the expected Cognito host, rejected a foreign Origin with 403 and rejected unsigned recovery events with 400.

The deployed Lambda-to-core signed recovery transport passed using a random non-account subject and no email recipient. This created only expiring operational test records and sent no email. It is transport evidence, not a substitute for a real Cognito password-reset test.

The owner completed Cognito registration and email verification. The first registration exceeded the browser transaction window; a fresh two-provider transfer then succeeded. The core profile retained its existing security history and Talisman. The rendered Talisman PNG is byte-for-byte identical to the pre-migration 63,715-byte PNG. A read-only audit of the private staging database confirmed exactly one account, one Talisman and one transfer, the same account ID before/after transfer, and a Talisman created before migration. Different source and target emails did not prevent this ownership-proved transfer.

Cretans initially reused the Cognito browser session and displayed `notebook synced`. However, the database audit showed core `auth_time` at 22:12:32 UTC and silent Cretans `auth_time` at 22:14:39 UTC on 11 October, each with a new one-hour deadline. This fails the original-authentication bound: Cognito refreshed the timestamp without credentials. The implementation now forces `prompt=login` and `max_age=0` for every new Cognito app session, rejects `prompt=none`, and validates fresh authentication in the code exchange. Existing app sessions retain their fixed deadlines. Shared account/data access remains; seamless cross-app SSO is not accepted. Live deployment and human verification of this correction are pending.

The owner then completed a real Cognito forgot-password reset. Before any new sign-in, reloading the existing core profile showed signed-out access and reloading Cretans showed `Visitor notebook · this browser only`. Resend marked the corresponding `Your LiiiGHTWAVE password changed` security alert delivered (message `01a12d12-4007-7b97-bb85-7c6d7f9dade2`). This proves the configured reset event revoked both existing app sessions and delivered the alert. Post-reset login with the new password remains to be tested. The automated Talisman PNG re-upload still requires a successful browser upload check.

## Before production

1. Finish fresh-authentication, Talisman upload/ownership and logout checks on the corrected deployment. Pool/client settings, discovery, human enrollment, verified email and identity transfer have passed.
2. Prove every new Cognito app session requires credentials despite an existing provider cookie. Silent SSO failed the original-age requirement and is disabled by the correction above.
3. Finish post-reset login verification. Actual reset revocation and alert delivery passed. The post-confirmation Lambda covers `ConfirmForgotPassword`, not every password-change API; continue prohibiting unsupported app password-change paths and require explicit revocation for operator changes.
4. Configure production email, operational monitoring, restricted runtime database roles and rollback. Preserve tested backups.
5. Establish the production domain/RP ID before production enrollment. Staging passkeys will not silently transfer to a new RP ID.
6. Complete real account ownership migration acceptance, then obtain the planned production cutover approval.

Official references: [pricing](https://aws.amazon.com/cognito/pricing/), [authentication flows](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html), [logout](https://docs.aws.amazon.com/cognito/latest/developerguide/logout-endpoint.html), [post-confirmation trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html).
