# Auth0 acceptance decision · 10 October 2026

**Decision: Auth0 hosted Universal Login is not approved for the required LiiiGHTWAVE/Cretans assurance policy.** Support describes behavior incompatible with required user verification and protected recovery/enrollment. Reconsider only after a supported enforcement path and independent negative-path tests demonstrate the requirements. A paid plan, a successful ordinary passkey login, or a method-only Action is not a substitute for that proof.

## Evidence classification

Source: Auth0 Developer Support case **03056719**, email dated 9 October 2026, reviewed 10 October. The linked message was read directly in the owner's Gmail. These are **vendor statements, not independently reproduced results**:

- Hosted Universal Login hardcodes userVerification=preferred for registration and assertions, accepts UV=false, and behaves this way across subscription plans.
- Post-Login Actions expose the passkey method name but do not expose the assertion's raw UV/userVerified flag. The reply describes amr=phr as method/phishing-resistance evidence, not proof of required user verification.
- There is no native setting requiring an existing passkey for adding/replacing authenticators or preventing email/password recovery from enabling replacement-passkey enrollment.
- The reply is internally inconsistent about refresh: it says amr is omitted from newly issued ID tokens during refresh requests, then says amr=[phr] persists across refreshes. Neither interpretation is accepted as established behavior. ID tokens, access tokens and Action event data must be distinguished in the correction.
- Post-trial, all-device revocation controls and their complete event/delivery coverage were not resolved by this reply.

Independent evidence remains limited to the recorded local and HTTPS diagnostic results. Local real-provider enrollment, signed code/PKCE exchanges, shared subject/session reuse, forced fresh authentication and browser-session logout succeeded. Those successes do not prove required UV or safe recovery. The HTTPS operator report was reread before stopping compute: it still contained only the two previously recorded login_required results and no successful HTTPS exchange/account comparison. Refresh grants remain disabled and refresh was not tested.

## Why the current integration stays disabled

The deployed development Action tests the method name. A replacement passkey enrolled after a weaker recovery could later authenticate as a passkey; the method check alone cannot establish approved enrollment provenance. This is an architectural implication of the vendor statements, not a reproduced account-takeover test.

The application's independent assurance gate still requires a reviewed provider policy, matching issuer/acr/amr, trustworthy UV evidence and acceptable auth_time. Do not map passkey, phr, a device prompt, or a user-supplied property to UV=true. auth_time and prompt=login/max_age address freshness; they do not themselves enforce required UV or prevent weaker enrollment. Do not populate a production policy file with invented assurance values. No runtime assurance logic or production configuration was relaxed.

## Evidence needed to reconsider

| Requirement | Demonstration required | Current status |
|---|---|---|
| Required UV | Supported configuration that rejects UV=false at registration and assertion, with trustworthy evidence available to the relying app | Vendor reports hosted incompatibility; no independent negative-path test |
| Credential management | Fresh proof from a previously approved passkey before addition/replacement; every enabled hosted/API route covered | No supported enforcement path demonstrated |
| Recovery | Email/password recovery alone cannot enroll an accepted replacement passkey or regain private app access; approved independent two-proof flow for loss of all authenticators | No compliant flow demonstrated |
| Claims and freshness | Corrected ID/access-token/Action matrix across enrollment, interactive login, silent SSO and refresh; stale/absent/contradictory evidence rejected | Vendor contradiction unresolved; refresh disabled |
| Revocation | Central/session/credential/recovery events invalidate both apps, old SSO cannot restore access, delivery/retry behavior and measured bound documented on the intended post-trial plan | Local fixtures/browser logout only; provider-wide proof outstanding |

For each candidate path, record the precise tenant/configuration/version/plan, test authenticator capabilities, expected rejection, actual result, sanitized evidence and timing. A vendor demonstration is a prerequisite for spending further integration effort; independent reproduction remains required for release. If no supported path exists, revisit provider selection rather than lowering the policy. No replacement vendor has been approved or provisioned.

## Operations and follow-up

On 10 October, the same authorized support case received a follow-up asking for a reproducible enforcement path, explicit recovery limitations, a corrected claims matrix and the unanswered post-trial revocation details. Gmail displayed Message sent. No credentials, tokens, account identifiers, paid upgrade or configuration changes were requested/sent.

The three temporary Railway deployments in project liiightwave-identity-staging (47244d77-58c3-447b-b9bc-e26d70aa7c79), environment staging (4e06d54c-67c4-4554-9b3a-80510e619163), were stopped through deploymentStop. Each reports deploymentStopped=true and zero running instances. The PostgreSQL volume remains READY with isPendingDeletion=false. Evidence, service configuration, exact callback allowlists and the Auth0 development test credential were preserved. Retained storage may still incur charges; stopped compute is not a zero-bill claim.

The earlier request to complete another HTTPS passkey ceremony is superseded. Do not restart diagnostics or enroll a replacement credential merely to get another successful sign-in. Resume only against a concrete supported enforcement/negative-test plan. The existing production project, website, legacy login, DNS and production data were not changed.

## Verification of this update

Documentation and staging lifecycle changes only; authentication runtime code is unchanged. On 10 October: Cretans 33 tests, typecheck, lint and build passed; full dependency audit reported zero known vulnerabilities. Core 10 tests and build passed. These regression checks do not establish provider enforcement of required UV or recovery restrictions.
