# LiiiGHTWAVE

React + Vite frontend and Express + PostgreSQL account service. The core site follows the supplied dark geodesic UI reference. Accounts are centralized at `https://accounts.liiightwave.com`.

## Local development

Requires Node 22.12+ and PostgreSQL 16+.

1. `npm ci`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` for a new database.
3. `npm run dev:server` (applies the additive schema before listening on port 3001).
4. In another terminal, `npm run dev` and open `http://localhost:5173`.

`npm test` runs API integration tests against an isolated PGlite PostgreSQL instance. `npm run build` builds the frontend in `dist`. `node test/browser-server.js` starts a disposable local test API without a PostgreSQL installation; never use it in production.

## Production

- Netlify: repository root, `npm run build`, publish `dist`, Node 22. Both domains can use the same source. The accounts hostname opens the account dashboard or sign-in screen.
- Railway: Dockerfile at the repository root. Create a PostgreSQL service and set `DATABASE_URL` to `${{Postgres.DATABASE_URL}}`, `NODE_ENV=production`, and `ALLOWED_ORIGINS=https://liiightwave.com,https://www.liiightwave.com,https://accounts.liiightwave.com,https://notes.liiightwave.com`.
- Set the `/api/*` rewrite in `netlify.toml` to the actual Railway public service domain. The healthcheck is `/api/health` and tests the database connection.
- Route `accounts.liiightwave.com` to its Netlify project and keep the existing core site's custom domain for the production replacement.
- Railway runs one API replica. Rate limits are process-local; use a shared limiter before scaling horizontally. Database sessions already persist across deployments.
- Railway's private database network is the default. For a remote TLS database, set `PGSSLMODE=require` and, if needed, `PGSSLROOTCERT` to a trusted CA file. Certificate verification stays enabled.
- Keep `.env`, database credentials, and local caches out of Git. The API does not require a signing secret: sessions use random 256-bit tokens and store only SHA-256 token hashes.

## Account behavior and app integration

Sign-up, sign-in, sign-out, profile updates, password changes, and session revocation are implemented. Sessions expire after seven days. Passwords use salted scrypt (N=32768, r=8, p=3); changing a password invalidates every session. Authentication uses a host-only `Secure`, `HttpOnly`, `SameSite=Lax` cookie on accounts, with strict Origin checks for every mutation and an exact CORS allowlist.

For another trusted app on a `liiightwave.com` subdomain:

```js
const { user } = await fetch('https://accounts.liiightwave.com/api/auth/session', {
  credentials: 'include'
}).then(r => r.json());
if (!user) location.assign('https://accounts.liiightwave.com/sign-in');
```

Add each trusted app's exact HTTPS origin to `ALLOWED_ORIGINS`. Never use a wildcard. Do not share password hashes or let an app's backend trust a browser-supplied user ID. This release exposes a browser session API, not an OAuth/OIDC authorization server. Apps on other registrable domains require a proper authorization-code/PKCE integration. Existing app accounts/data are not automatically migrated or linked by matching email addresses, and no existing app repository is modified here.

Email verification and automated password reset are not enabled because no email delivery service is configured. Sign-up does not assert email ownership. Do not use an email address as proof of entitlement or automatically merge it into existing app accounts. Account-help requests can be submitted via the support form.

## Support operations

Support messages are persisted in PostgreSQL with a reference ID; no email notification is claimed or sent. Operators can inspect the queue in Railway's database interface:

```sql
SELECT id, name, email, topic, message, status, created_at
FROM support_requests WHERE status = 'new' ORDER BY created_at;
```

Use parameterized queries for any operational updates and handle privacy requests through a verified process. The public website includes a description of the actual information stored and hosting providers. Final retention periods and legal policies should be set by the business owner.

## Verification

The API suite covers PostgreSQL health, sign-up, password hashing, secure cookie attributes, login failure behavior, email normalization, profile persistence, logout, origin/CSRF protection, password changes, session revocation, forged cookies, and support validation. The frontend includes mobile layouts, reduced-motion support, a keyboard-accessible navigation structure, visible focus states, and useful loading/error states.

## Rollback

The prior Netlify production deployment is `69567ac3dc78b0cf4f759872` from `babekizulu/liiightwave_v2`, commit `85980e1`. To roll back the core site, publish that retained deployment through Netlify. The new PostgreSQL schema is additive and belongs to a separate account database; no previous website database is modified.
