# T5 staff authentication evidence

Date: 2026-09-14

## Implemented

- Backend verification of each protected request with Supabase Auth, followed by
  request-time membership, role, and individual permission loading.
- Central authorization decisions with explicit reason codes and verified `aal2`
  enforcement for privileged Owner and Finance actions.
- Pending-email invitation acceptance, immediate revocation enforcement, and a
  restricted actor-only workspace bootstrap function.
- Admin sign-in, invitation acceptance, TOTP enrollment/challenge, recovery,
  denial, active-workspace switching, and backend-only data access.
- Idempotent development seed for isolated `site-1` and `demo-2` workspaces.

## Local verification

- `pnpm run lint`: passed.
- `pnpm run typecheck`: passed.
- `pnpm run test`: 42 passed; 11 PostgreSQL integration tests skipped because no
  local disposable database URL is configured.
- `pnpm run test:tooling`: 46 passed.
- `pnpm run build`: passed for backend, admin, and site-1.
- `pnpm run test:e2e`: Admin 18 passed; site-1 security/browser checks passed.
- `pnpm --filter @canadian-plans/db exec drizzle-kit check`: migration journal and
  snapshots passed consistency validation.
- Application-source scan found no `SUPABASE_SERVICE_ROLE_KEY` or
  `service_role`; Admin source has no `@canadian-plans/db` import.

## CI-only database verification

CI provisions PostgreSQL 15, applies migrations as the migration role, then runs
the integration suite as restricted `app_runtime`. This exercises the generated
migration, tenant isolation, actor-only bootstrap, invitation acceptance, and
seed isolation without production credentials.

## Connected Supabase verification

- Applied the T4 foundation, T5 staff-auth, and RLS optimization migrations to
  the newly created `canadaesim` Supabase project.
- Loaded the two-workspace development seed and confirmed the Owner sees both
  workspaces while each workspace-specific actor sees only its own workspace.
- Confirmed the restricted runtime role sees no memberships or bootstrap rows
  without actor context.
- Connected Backend through Supavisor transaction mode as restricted
  `app_runtime`; the role is non-superuser and cannot bypass RLS.
- Connected Admin and Backend Auth to the project with the publishable key in
  gitignored local environment files. No privileged key was created or stored.
- Live Backend checks returned `401 missing_session` with no bearer token and
  `401 invalid_session` for a forged token.
- Supabase's security advisor reports no findings. The RLS initialization-plan
  warnings were corrected; only expected unused-index informational findings
  remain on this newly seeded database.

No application production deployment was performed.
