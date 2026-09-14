# T6 website service credentials and public-request authentication

Date: 2026-09-14

## Implemented

- Per-workspace **service credentials**: an Owner (verified `aal2`,
  `integration.manage`) issues and revokes credentials from admin
  `/w/[workspace]/settings` through backend endpoints. The secret is shown once
  and only its SHA-256 hash is stored (`service_credentials.secret_hash`, now
  globally unique).
- **Website authentication middleware**: a request with a valid
  `Authorization: Bearer cplsk_<secret>` gets `{ workspaceId, callerType:
'website', scopes }`. The workspace/scopes come only from the credential;
  body `workspace_id`, Host, Origin and CORS are never authentication. Scopes
  are limited to `leads:write`, `quotes:create`, `orders:create`,
  `uploads:customer`, `tracking:otp`; anything else is denied.
- **Abuse controls before database work**: 64 KiB body cap and a pluggable
  edge/bot admission hook run first; a durable, bounded per-IP and
  per-credential Postgres rate limiter (`app.rate_limit_hit`, fixed window,
  short `lock_timeout`, opportunistic expiry cleanup, per-key rows — no global
  hot counter) gates database work.
- **Pre-tenant website bootstrap**: `app.resolve_website_credential` (SECURITY
  DEFINER, `search_path ''`) resolves a secret hash to its own
  workspace/scopes/revocation without a caller-supplied workspace and without a
  broad cross-tenant read.
- **Server-only machine registry** (PLATFORM_CONTEXT §4b): config-driven
  (`MACHINE_REGISTRY_JSON`, no DB, no customer data). Webhook selectors verify a
  mapped HMAC signature and provider account; scheduler selectors verify a
  shared secret and expose explicit workspace IDs and job scopes. Unknown,
  revoked, signature-invalid, account-mismatched and foreign-workspace
  identities all fail closed.
- **Contracts + docs**: website/machine auth error codes and service-credential
  schemas in `@canadian-plans/contracts`; one shared `authErrorCodeSchema`
  envelope; `docs/API.md` "Authentication" section and endpoint docs.

## Negative tests proven

- Backend component tests (`apps/backend/tests`):
  - `website-auth.test.ts`: missing/malformed credential → `missing_credential`;
    unknown → `invalid_credential`; revoked → `credential_revoked`; **forged
    `workspace_id` in the body is ignored and the credential's workspace is
    used**; missing scope → `scope_denied`; IP rate limit → `429 rate_limited`
    with `Retry-After`; **a website credential on a staff-only endpoint →
    `401 invalid_session`**.
  - `service-credentials.test.ts`: issue once for `aal2` Owner and persist only
    the hash; `aal1` Owner → `mfa_required`; non-privileged role →
    `permission_denied`; empty/unknown scopes → `400`; list/revoke; missing
    credential → `credential_not_found`.
  - `machine-registry.test.ts`: unknown/revoked selector → `machine_unknown`;
    invalid signature/secret → `machine_signature_invalid`; tampered body
    rejected; wrong provider account → `machine_account_mismatch`;
    cross-workspace confusion → `machine_workspace_mismatch`; deny-all empty
    registry; invalid registry JSON rejected.
  - `credential-secret.test.ts`: prefix/hash/parse round-trips and constant-time
    compare.
- DB integration (`packages/db/tests/website-auth.integration.test.ts`, gated on
  `TEST_MIGRATION_DATABASE_URL` + `DB_TEST_ALLOW_DESTRUCTIVE`, runs in CI):
  resolve active/revoked/unknown credential without tenant context; runtime role
  cannot read `service_credentials` (RLS) or `rate_limit_buckets` (no grant)
  directly; rate limiter allows up to the max then denies; per-key independence.

## Local verification

- `pnpm run lint`: passed.
- `pnpm -r run typecheck`: passed (all apps and packages).
- `pnpm run test`: 75 passed; 18 PostgreSQL integration tests skipped (no local
  disposable database configured).
- `pnpm run build`: passed for backend, admin, and site-1.
- `pnpm --filter @canadian-plans/db exec drizzle-kit check`: migration journal
  and snapshots consistent through `0004_simple_hellfire_club`.
- Service-role guard (CI grep) found no `SUPABASE_SERVICE_ROLE_KEY` or
  `service_role` in `apps/**`, `packages/**/src/**`, `jobs/**`, `scripts/**`.
- Prettier: new files are LF and formatted; the repo-wide `format` check reports
  pre-existing CRLF-only differences under local `core.autocrlf=true` (a
  Windows checkout artifact), which CI evaluates on an LF checkout.

## Connected Supabase verification

- Applied `0004` to the connected `canadianplans` project (migration
  `t6_website_credentials_and_rate_limit`) under owner approval. The first apply
  surfaced a real SQL defect never caught locally (the integration suite is
  CI-gated): `pg_catalog.extract(epoch FROM …)` cannot be schema-qualified with
  the `FROM` keyword form, and `GREATEST` is a special construct, not a
  `pg_catalog` function. Corrected to `pg_catalog.date_part('epoch', …)` and
  `GREATEST(…)`; the migration file and the live database now match, and the
  re-apply succeeded.
- `supabase_read_only_user` (a non-`app_runtime`, non-superuser role) is denied
  `EXECUTE` on `app.rate_limit_hit`, confirming `REVOKE ALL … FROM PUBLIC` is
  effective. Runtime execution as `app_runtime` is exercised by the gated
  integration suite in CI (the test harness refuses to run against a non-`_test`
  database, so it is not pointed at this project).
- No application production deployment was performed.

## Not done here

- Real lead/quote/order handlers remain A2; T6 provides the authenticated,
  scoped surface and proves the credential → context boundary.
