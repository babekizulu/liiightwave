# Auth0 member security plan v1 · 10 October 2026

## Decision and scope

Retain Auth0 as the only credential authority and OIDC provider for LiiiGHTWAVE and Cretans. The owner requested a revised security plan without changing authentication service. The implementation target is now conventional member authentication with passkeys preferred, Auth0 passwords permitted as a fallback, and Auth0 email-based password recovery permitted. This is a deliberate change to the original assurance requirements, not evidence that Auth0 satisfies them.

This plan supersedes the required-UV, passkey-only member-access and independent two-proof recovery gates in the original brief and earlier architecture/release documents. The original acceptance decision remains valid for that older policy. The new plan is recorded for implementation; production acceptance is still pending. No runtime code, tenant setting, production entry point, credential, DNS record or paid plan was changed by this revision. Staging compute remains stopped.

## Changed guarantees and accepted limitations

| Area | Previous requirement | Revised member policy |
|---|---|---|
| Device verification | Every accepted passkey must prove required user verification (UV) | Accept Auth0's hosted passkey behavior; UV can be unknown or absent. Do not claim biometric/PIN verification was enforced. |
| Ordinary sign-in | Passkey with trusted UV evidence only | Prefer passkeys; accept a valid Auth0 database password login or a qualifying existing Auth0 session. No new social, magic-link or OTP sign-in routes in v1. |
| Lost-device recovery | Independent two-proof workflow; email/password alone insufficient | Permit Auth0's email password-reset flow and subsequent password login/passkey enrollment. A previously enrolled passkey is not universally required. |
| New passkeys | Fresh existing approved passkey before every addition | Provider-managed enrollment with Auth0's supported checks. Application reauthentication does not protect every direct provider enrollment route. |
| Privileged access | Stronger separate administrator policy | Retain a separate administrator policy; an ordinary member session never grants admin, support-impersonation or credential-reset privileges. |
| Revocation | Provider-wide event-driven invalidation with a measured bound | Prove both-app local revocation; bound old member-session access by authentication age, with provider notifications as an additional mechanism. Do not claim all-device provider logout without proof. |

Residual risks are explicit: compromise of the recovery mailbox can lead to member-account takeover and a replacement passkey; password fallback increases phishing/credential-stuffing exposure; a passkey accepted without UV lacks the previous device-verification guarantee. Short sessions, alerts and MFA can reduce parts of this exposure but do not restore the removed guarantees. A replacement passkey created after email recovery is accepted under this policy, not labelled higher assurance. Member MFA is encouraged when supported; it is not assumed enabled or included in the current plan.

## Controls retained

Keep separate confidential OIDC clients and host-only application sessions. Continue Authorization Code with PKCE S256, exact issuer/audience/algorithm/signature/time validation, state/nonce/browser/client binding and one-use transactions. Keep provider tokens and credentials server-side; no refresh grants in v1. Do not mint competing identity tokens or add an application passkey/password/recovery database.

Use verified issuer plus subject for account mapping. Never merge legacy accounts by email. Require Auth0's signed `email_verified=true` before private member access; verification is mailbox control, not proof of a person's identity. Unverified users can reach only restricted verification/onboarding/logout routes. A verification link alone does not create a member session.

Retain exact-origin CSRF defenses, secure HttpOnly cookies, private/no-store responses, server-side ownership and entitlement checks, rate limits, secret redaction and runtime-mock rejection. Talismans, narrative phrases and AI remain outside authentication. Use supported password and attack-protection settings available on the actual post-trial plan; verify them instead of assuming availability. Avoid public account-enumeration responses.

## Authentication evidence and code changes required

Introduce an explicit, versioned `auth0-member-v1` policy; do not make the existing strict policy silently optional. Keep the strict policy separate if retained, and reject unknown policy versions. The revised policy must bind the exact issuer, client, signing algorithm, database connection and reviewed Action version.

Replace the development passkey-only Action with a scoped member-policy Action. It must run only for the approved clients and connection, enforce verified email, and issue a namespaced policy marker only when the member policy is satisfied. It may record documented authentication-method evidence as diagnostic information; missing `amr`/`acr` or unknown UV does not block this member policy. Do not fabricate UV, `acr`, `amr`, MFA, freshness, roles or entitlements. A policy marker attests an application rule, not biometric verification. Prove Action behavior for both interactive and existing-session login before enabling either BFF.

The BFF must require valid protocol checks, the exact signed policy marker, verified email and a valid `auth_time`. Missing policy/connection enforcement, invalid claims or absent freshness still fail closed. An ordinary member-policy marker must not satisfy an administrator or future MFA policy. Refresh remains disabled; the vendor's conflicting refresh claims no longer block this release, but must be resolved before adding refresh later.

Implement this in mirrored `server/identity/config.js`, `provider.js`, `router.js` and the Auth0 Action with meaningful regression tests. Update server/UI messages from “fresh passkey authentication” to “sign in again” where password is now accepted. Do not fill the old policy file with fictitious values or set `backchannelVerified=true` to bypass startup checks; represent the actual revocation strategy explicitly.

## Sessions, sensitive actions and revocation

Proposed member limits are **30 minutes idle, at most 60 minutes from the original `auth_time`, and five-minute freshness for sensitive application actions**. These replace the current one-hour idle/twelve-hour session defaults and are not implemented yet. Cap each session at `min(created_at + 60 minutes, auth_time + 60 minutes)`; activity, another client, silent SSO or rotating a cookie must not extend that authentication deadline. Clock-skew tolerance must not extend the security deadline. At expiry require interactive Auth0 reauthentication and verify a newer `auth_time`; stop if the provider cannot supply trustworthy freshness.

Fresh member authentication is required for profile/security changes, Talisman replacement, private export and deletion requests. It can be a passkey or password. Provider credential changes remain subject to Auth0's own controls, including direct hosted/API routes. Email changes, account linking, MFA reset and administrative identity changes stay unavailable in the application until their specific provider-managed workflows are tested; they are not prerequisites for ordinary learning access.

Preserve the database security-version check on every private request. “Sign out of this app” deletes that app session. “Sign out of both apps” invalidates all participating app sessions and rejects SSO evidence dated before revocation. A separate Auth0 logout ends the current browser's provider session once tested. Neither button promises deletion of credentials or every provider session on every device. Already-authorized requests may finish; measure that boundary.

Implement an authenticated, replay-safe post-password-change notification using immutable provider identity, never email matching, to revoke application sessions and enqueue a security alert. Auth0 documents this trigger as asynchronous: do not assume it can block recovery or guarantees delivery/retries. Authenticate the notification, persist accepted work before acknowledging, deduplicate events and monitor failures. Test dropped/delayed notifications: old app sessions must still expire within the 60-minute authentication window without silent renewal. This is an old-session exposure bound, not a claim that stolen passwords/passkeys become unusable. Auth0 back-channel logout can improve coverage when available, but Enterprise entitlement is not a prerequisite for this bounded member design.

For confirmed compromise, locally suspend the account before provider-side cleanup; increment its security version, then use authorized Auth0 operations to block access and remove compromised credentials/sessions as supported. A local suspension must prevent fresh logins too. Password reset alone does not prove malicious passkeys or other credentials were removed. Test recovery/blocking/unblocking as separate operations before offering that runbook.

## Recovery, notifications and administrators

Recovery uses Auth0-hosted reset links and flows, followed by a new OIDC login. Never collect reset codes, passwords or passkeys in either application. Test valid, expired and replayed reset links, generic responses, the resulting `email_verified` state, re-enrollment, and access from old sessions in both apps. Test a backup authenticator without deleting the only working credential. Recommend a second passkey or a securely synced credential; do not promise device-bound keys are synced.

Verify delivery of verification, recovery and security-change emails using a production-capable sender before launch. Auth0 handles identity emails; a verified Resend integration may handle application alerts. Do not assume the current trial email delivery is a production arrangement. Notifications to the compromised mailbox are not an independent recovery proof. The application offers no support override based on a name, email match or Talisman.

Administrator and operator identities stay separate. Require supported MFA for all privileged sessions, prefer hardware security keys, test recovery and restrict factor resets; do not skip MFA just because a passkey was used. Do not claim a particular hardware/UV assurance unless independently established. In-product admin features remain disabled until the exact factors, evidence and post-trial entitlement are verified. Existing infrastructure dashboards need their own tested MFA/recovery controls. No new paid feature is purchased by this plan.

## Implementation and release sequence

1. Implement the explicit member policy, verified-email restriction, local suspension and shorter authentication-bound sessions. Update the development Action in lockstep. Keep production identity disabled.
2. Prove real passkey and password sign-in, email verification, fresh reauthentication and same-account SSO across the existing two clients. Both methods should now succeed for ordinary members; legacy sessions, foreign connections, missing policy markers and wrong subjects must still fail.
3. Implement and test the recovery notification, alert delivery, both-app revocation and failure/expiry fallback. Test password recovery and subsequent passkey enrollment as permitted behavior. Record known limitations instead of marking the old strict tests passed.
4. Restart isolated HTTPS staging only with updated configuration and an explicit test window. Complete both real application callbacks, secure-cookie/CSRF/cache/ownership checks, recovery, logout and the 60-minute bound. Prior successful loopback or diagnostic boundary tests do not count as full-app HTTPS acceptance.
5. Finish production sender, least-privilege DB roles, backup/restore, ingress, monitoring, privacy/children's-data review and rollback checks. Confirm the Cretans remote and deployment targets. Lock the production issuer/RP ID before production enrollment; staging passkeys need separate production enrollment. Verify sustainable post-trial features and costs, then obtain production-cutover approval as required by the original brief.

This sequence enables a path to member SSO and saved learning progress; it does not declare billing, administrative tools or the remaining learning features complete. Disabled purchases/admin integrations must remain honestly labelled. Public pages can continue independently.

## Evidence and references

Current runtime still enforces the older strict policy and grants no new application access. Earlier real-provider results cover loopback enrollment, two-client code/PKCE exchanges, fresh passkey login and one-browser provider logout. Required-UV limitations are vendor statements in case 03056719, not independently reproduced failures. No successful HTTPS authenticated application exchange or new recovery/revocation result is asserted by this plan.

Official documentation checked 10 October 2026:

- [Auth0 passkeys](https://auth0.com/docs/authenticate/database-connections/passkeys): passwords can coexist with passkeys; passkey use need not skip configured MFA.
- [Password reset](https://auth0.com/docs/authenticate/database-connections/password-change) and [email verification](https://auth0.com/docs/manage-users/user-accounts/verify-emails): provider-managed flows and mailbox verification.
- [Post Change Password](https://auth0.com/docs/customize/actions/explore-triggers/post-change-password): notification support is asynchronous.
- [MFA](https://auth0.com/docs/secure/multi-factor-authentication) and [MFA resets](https://auth0.com/docs/secure/multi-factor-authentication/reset-user-mfa): factor and recovery capabilities need account/plan verification.
- [OIDC Back-Channel Logout](https://auth0.com/docs/authenticate/login/logout/back-channel-logout): optional provider event integration, subject to actual entitlement and delivery tests.

No Auth0 documentation is treated as proof that this tenant, deployment or new policy has passed its acceptance tests.
