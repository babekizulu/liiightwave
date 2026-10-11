BEGIN;
CREATE TABLE IF NOT EXISTS lw_accounts (
 id uuid PRIMARY KEY, issuer text NOT NULL, subject text NOT NULL,
 display_name text NOT NULL DEFAULT '', security_version integer NOT NULL DEFAULT 0,
 revoked_after timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(issuer,subject)
);
CREATE TABLE IF NOT EXISTS lw_sessions (
 hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES lw_accounts ON DELETE CASCADE,
 client text NOT NULL CHECK(client IN ('liiightwave','cretans')), version integer NOT NULL,
 sid text, auth_time timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 last_active timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS lw_sessions_owner ON lw_sessions(account_id,client);
CREATE INDEX IF NOT EXISTS lw_sessions_expiry ON lw_sessions(expires_at);
CREATE TABLE IF NOT EXISTS lw_transactions (
 state_hash text PRIMARY KEY, browser_hash text NOT NULL, client text NOT NULL,
 verifier text NOT NULL, nonce text NOT NULL, max_age integer NOT NULL DEFAULT 3600, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, talisman_hash text, onboarding_hash text
);
CREATE TABLE IF NOT EXISTS lw_onboarding (
 hash text PRIMARY KEY, name text NOT NULL, path text NOT NULL CHECK(path IN ('scholar','explorer','mixed')),
 interests text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS lw_personas (
 account_id uuid PRIMARY KEY REFERENCES lw_accounts ON DELETE CASCADE,
 traveller_name text NOT NULL, path text NOT NULL, inspiration text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lw_progress (
 account_id uuid NOT NULL REFERENCES lw_accounts ON DELETE CASCADE,
 chapter text NOT NULL, curriculum_version integer NOT NULL, completed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,chapter,curriculum_version)
);
CREATE TABLE IF NOT EXISTS lw_notes (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES lw_accounts ON DELETE CASCADE,
 title text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lw_notes_owner ON lw_notes(account_id,created_at);
CREATE TABLE IF NOT EXISTS lw_talismans (
 account_id uuid PRIMARY KEY REFERENCES lw_accounts ON DELETE CASCADE,
 reference_hash text NOT NULL UNIQUE, sealed_payload text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lw_entitlements (
 account_id uuid NOT NULL REFERENCES lw_accounts ON DELETE CASCADE, product text NOT NULL,
 valid_until timestamptz NOT NULL, PRIMARY KEY(account_id,product)
);
CREATE TABLE IF NOT EXISTS lw_rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS lw_events (issuer text NOT NULL, jti text NOT NULL, expires_at timestamptz NOT NULL, PRIMARY KEY(issuer,jti));
CREATE TABLE IF NOT EXISTS lw_identity_revocations (
 issuer text NOT NULL, subject text NOT NULL, revoked_after timestamptz NOT NULL,
 PRIMARY KEY(issuer,subject)
);
CREATE TABLE IF NOT EXISTS lw_privacy_requests (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES lw_accounts ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind='delete'), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(account_id,kind)
);
ALTER TABLE lw_accounts ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
CREATE TABLE IF NOT EXISTS lw_security_alerts (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES lw_accounts ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind='password_changed'), created_at timestamptz NOT NULL DEFAULT now(),
 acknowledged_at timestamptz
);
ALTER TABLE lw_transactions ADD COLUMN IF NOT EXISTS migration_purpose text CHECK(migration_purpose IN ('source','target'));
ALTER TABLE lw_transactions ADD COLUMN IF NOT EXISTS migration_proof jsonb;
CREATE TABLE IF NOT EXISTS lw_identity_transfers (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES lw_accounts ON DELETE CASCADE,
 source_issuer text NOT NULL, source_subject text NOT NULL,
 target_issuer text NOT NULL, target_subject text NOT NULL,
 source_auth_time timestamptz NOT NULL, target_auth_time timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lw_email_outbox (
 id uuid PRIMARY KEY REFERENCES lw_security_alerts ON DELETE CASCADE,
 sealed_recipient text, created_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0, next_attempt timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz, accepted_at timestamptz, failed_at timestamptz
);
COMMIT;
