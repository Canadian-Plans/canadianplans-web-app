# Release rollback

Owner and escalation contact: Takib. Expands the interim procedure sketched
in [README.md](README.md) ("Release rollback (interim, from T1)") into a full
runbook now that the backend runs on Railway and both frontends are public on
Vercel (see the deployment-state memory note; cutover from Vercel-hosted
backend to Railway is complete per ADR 0004). Nothing here deploys
automatically — the owner is the only one who promotes a production
deployment on either platform.

## Required access

- Railway project owner/member access. Verified live via the Railway MCP on
  2026-09-21: project **`canadian-plans-backend`**
  (`1735e61b-ca5f-4a21-88ad-480e5bfd2616`), environment **`production`**
  (`38c4bee6-76c1-4838-97b8-b19ae5427c4a`), service **`backend`**
  (`39140e07-670e-4529-945d-37764ccfd0c8`).
- Vercel team access. Verified live via the Vercel MCP on 2026-09-21: team
  **`canadian-plans`** (`team_HAs8VUVhpfxZjgBcHhUQAzY2`), projects
  **`canadianplans-web-app-admin`** (`prj_tev2WTyM3DE60IlrF0697awY0M2i`) and
  **`canadianplans-web-app-site-1`** (`prj_4VWkgQfrUrWXMmlnAvRkaAQpnPxQ`).
  (A third project, `umami`, also exists in the team — analytics, not part
  of the app rollback surface.)

## Roll back the backend (Railway)

1. In the Railway dashboard, open **`canadian-plans-backend` → `backend` →
   Deployments** (or use the Railway MCP `list-deployments` with the project
   id above). Identify the last known-good deployment — each entry carries
   its git commit hash and message, so match it to the commit you're rolling
   back from.
2. Use Railway's **Redeploy** on that earlier deployment (dashboard: the
   deployment's `⋯` menu → Redeploy; MCP: the `redeploy` tool with that
   deployment's id). This creates a new deployment from the old build/commit
   rather than mutating history — Railway keeps every prior deployment, it
   does not need to be rebuilt from source unless the build itself is being
   rolled back too.
3. **Environment variables are not versioned with a deployment.** If the
   rollback is undoing a release that also changed required environment
   variables (for example, a `MACHINE_REGISTRY_JSON` shape change —
   [secret-rotation.md](secret-rotation.md) notes exactly this kind of
   coupled change), the rolled-back code must still be compatible with the
   _current_ environment variables, or you must also revert the environment
   variable in the same action. Check the commit being rolled back past for
   any noted "this release changes X" warning (ENV.md flags these
   explicitly) before redeploying.
4. Confirm no destructive database migration shipped between the bad release
   and the target rollback point — `docs/IMPLEMENTATION_PLAN.md` §19 records
   there was "nothing to reverse at the database level" as of T1; for any
   later migration, check `docs/SCHEMA_HISTORY.md` and coordinate a
   forward-fix instead of a rollback if a migration is not safely reversible.
   Never run a destructive down-migration against production without an
   explicit backup checkpoint ([restore.md](restore.md)) and owner approval.

## Roll back a frontend (Vercel — admin or site-1)

1. In the Vercel dashboard, open the affected project
   (`canadianplans-web-app-admin` or `canadianplans-web-app-site-1`) →
   **Deployments**.
2. Find the last known-good production deployment (filter by
   `Production`; each entry shows its commit).
3. Use **Promote to Production** on that deployment. Vercel keeps every
   previous production deployment available for instant promotion — this is
   the fastest rollback path and requires no rebuild.
4. If the bad release also requires a Vercel environment variable revert
   (e.g. a `NEXT_PUBLIC_*` value), update it in Project Settings →
   Environment Variables before or immediately after promoting, since the
   promoted deployment's server-rendered output can still read the
   _current_ environment variables for anything not baked in at build time.

## Coordinating a rollback across backend and frontend together

Because the admin/site-1 frontends call the backend via
`@canadian-plans/contracts`'s generated client (`docs/API.md`), a schema
change breaks the build on both sides rather than failing silently — but a
**rollback** can still desync them if only one side is rolled back:

1. If the bad release changed the API contract (request/response shape),
   roll back **both** the backend and whichever frontend(s) depend on the
   changed contract together, not just one side.
2. If the bad release was frontend-only (no backend contract change), a
   frontend-only rollback is safe on its own.
3. If unsure whether a release touched the shared contract, check whether
   `packages/contracts` changed in the commit range being rolled back — if
   it did, treat it as a coordinated rollback.

## Verify

1. Railway: the new (rolled-back) deployment shows `SUCCESS` status
   (`list-deployments` or the dashboard) and the service's health check
   passes (`GET /api/v1/health` returns `{ ok: true }`).
2. Vercel: the promoted deployment shows as the current `Production`
   deployment for the project, and the live site reflects the rolled-back
   code (check a distinguishing piece of UI/text from before the bad
   release).
3. Run the synthetic order check manually if the rollback touched
   lead/quote/order logic ([alerts.md](alerts.md), "Verifying it manually")
   to confirm the core flow still works end-to-end post-rollback.
4. Confirm the in-process scheduler is still running after a backend
   rollback ([outbox-jobs.md](outbox-jobs.md), "Confirm the scheduler
   actually started") — a rollback that changes `MACHINE_REGISTRY_JSON`
   compatibility is exactly the failure mode that check exists to catch.

## Safe stopping point

After promoting/redeploying the last known-good version and confirming the
health check passes, it is safe to pause — a rolled-back deployment is a
stable, ordinary production state, not an in-progress operation. Root-causing
the bad release can happen afterward, out of band.

## Escalation

Escalate to the owner (Takib) before rolling back if: the rollback would also
require reversing a database migration, the bad release changed the shared
API contract and only one side can be safely rolled back quickly, or if the
rollback target itself is more than a few releases behind (increasing the
chance of an environment-variable or schema mismatch not covered by this
runbook).
