# Cognito staging migration — 11 October 2026

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

The read-only verification script confirmed all requested pool/client settings, active managed-login domain, required passkey user verification, exact discovery endpoints and RS256 public signing keys. The application OIDC adapter accepted the real discovery document for both clients. Both real managed-login pages loaded with their respective exact callback URLs; no user enrollment or successful authentication is claimed.

Each client secret and reviewed policy are stored in its corresponding dedicated Railway staging service as `COGNITO_STAGING_CLIENT_SECRET` and `COGNITO_STAGING_POLICY_JSON`. Values were verified after saving. They are inactive preparation variables: the existing `OIDC_CLIENT_SECRET`, `OIDC_POLICY_JSON`, identity data key and identity-enabled setting were verified unchanged. No deployment or active provider switch was triggered. An RSA-OAEP encrypted local recovery copy is protected by the operator's existing Windows-user-encrypted private key; no plaintext credential files were written.

The operator setup in `provider/cognito/` defaults to a non-mutating plan. It validates account, region and SDK models before resource creation, records public resource IDs for safe resumption, refuses conflicting resource names/configuration, and prints generated credentials only as encrypted ciphertext.

## Application migration boundary

`cognito-member-staging-v1` is restricted to the two dedicated Railway staging origins and Cape Town issuer. Discovery endpoints must match the reviewed hosted domain and pool JWKS endpoint. The OIDC library verifies signature, issuer, audience, nonce, state, expiry and PKCE. The BFF also requires `token_use=id`, boolean verified email, no federated identity claim, and recent signed `auth_time`.

Sessions have 30-minute inactivity and a 60-minute absolute deadline anchored to original authentication. All session lookups check the active issuer, preventing old-provider cookies from authorizing a new-provider deployment. Provider tokens are discarded; refresh tokens are never used. Cognito's `/logout` redirect uses the configured client and exact logout origin. Unsupported OIDC back-channel events are rejected.

The staging policy supports authenticated password-reset events plus the authentication deadline. The approved `lw-cognito-staging-password-reset` Lambda has been provisioned with a dedicated HMAC key, a role limited to its own logs, seven-day log retention and invocation permission restricted to this pool/account. Attachment follows application deployment and key configuration. `PostConfirmation_ConfirmForgotPassword` revokes shared app sessions and queues the existing encrypted security-email outbox; signup confirmations are ignored. This does not cover `ChangePassword` or `AdminSetUserPassword`. The apps never expose provider tokens or offer those API paths; operator password changes require explicit application revocation. Production origins remain prohibited by this policy.

Local verification: all 73 Cretans API/protocol tests and all 15 core regression/password tests passed. Both application builds use Vite's native configuration loader in this Windows sandbox. The mirrored identity files are byte-identical. Prior dependency audits reported zero vulnerabilities; no dependencies were added for transfer/recovery. These fixture checks do not establish real Cognito authentication or migration acceptance.

Accounts continue to use exact issuer/subject identity. Email, Talismans and story phrases never link accounts. The core-only transfer route requires a fresh signed Auth0 proof followed by a fresh Cognito proof, each within five minutes. It atomically preserves the existing account ID and dependent data, records a transfer audit, increments its security version and deletes old app sessions. Existing target accounts cannot be merged. Browser-bound one-use transactions, source security-version checks and per-identity recovery locks reject stale, replayed or revoked transfers, including resets before the target's first account exists. The original Auth0 recovery signature remains accepted while transfer is enabled. Human enrollment and real transfer acceptance are still pending.

## Before production

1. Verify actual pool/client settings, discovery and managed-login pages. Complete human enrollment, verified email, both-client SSO, fresh authentication, Talisman ownership and logout checks.
2. Prove original authentication-age behavior through real Cognito SSO; do not assume its cookie lifetime supplies the application bound.
3. Implement password-reset revocation and durable security alerts. A post-confirmation Lambda covers `ConfirmForgotPassword`, not every password-change API. Explicitly cover or prohibit other password-change paths.
4. Configure production email, operational monitoring, restricted runtime database roles and rollback. Preserve tested backups.
5. Establish the production domain/RP ID before production enrollment. Staging passkeys will not silently transfer to a new RP ID.
6. Implement and test explicit account ownership migration, then obtain the planned production cutover approval.

Official references: [pricing](https://aws.amazon.com/cognito/pricing/), [authentication flows](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html), [logout](https://docs.aws.amazon.com/cognito/latest/developerguide/logout-endpoint.html), [post-confirmation trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html).
