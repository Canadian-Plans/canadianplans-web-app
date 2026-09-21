# Monthly cost review

Owner and escalation contact: Takib. Covers the monthly review of hosting and
service spend across Vercel, Railway, Supabase, and Resend. Cross-references
[alerts.md](alerts.md)'s spending-control language ("Spending controls must
surface a deliberate maintenance state if intake cannot safely continue;
never report an unsaved order as successful") and
`docs/IMPLEMENTATION_PLAN.md` §17 ("Costs, capacity, and upgrade triggers").

## Required access

- Railway project owner/member access (billing tab), or at minimum
  read access via the Railway MCP for a non-financial usage check.
- Vercel team owner/member access (`canadian-plans` team) for the Billing
  page, or read access via the Vercel MCP.
- Supabase organization owner access (`Canadian Plan` org) for the Billing
  page, or read access via the Supabase MCP for plan/status.
- Resend dashboard access (owner-controlled account) for send volume.

## What to check each month

IMPLEMENTATION_PLAN §17 names the authoritative cost table (REQUIREMENTS
§15) and directs: use eligible free services in development; **Vercel Pro
before commercial hosting/minute-level cron**; **Supabase Pro for the
standard production backup baseline**. Prefer plan/configuration upgrades to
provider migrations. Monitor: email attempts (including tracking and staff
mail), retained document bytes, database/backup egress, function
CPU/invocations, queue age, archive/ledger and runner usage, CMS requests,
analytics and error volume. Alert *before* limits threaten service.

1. **Supabase**: organization plan, database size/egress, and whether usage
   is trending toward the free-tier project-pause threshold (a paused free
   project is a launch-blocking incident, not a cost line item — catch it
   before it happens).
2. **Vercel**: team plan, build minutes, function invocations/CPU, and
   bandwidth for both `canadianplans-web-app-admin` and
   `canadianplans-web-app-site-1`.
3. **Railway**: usage-based backend compute/egress for the
   `canadian-plans-backend` project's `backend` service.
4. **Resend**: monthly email send volume against the plan's included
   allowance (transactional + the one marketing template + owner alerts —
   all three share the same account).
5. **Backblaze B2**: stored bytes across the archive bucket, deletion
   ledger bucket, and their egress on the (rare) recovery-reader access —
   see [restore.md](restore.md) for the bucket split.

## Thresholds to watch (from IMPLEMENTATION_PLAN §17 and REQUIREMENTS §15)

- Any provider's free-tier ceiling being approached (not just crossed) —
  the plan is explicit that alerting must happen *before* a limit threatens
  service, not after.
- **Supabase must be on a paid (Pro) plan before production carries the
  standard backup baseline** — a free-tier Supabase project does not meet
  this bar regardless of whether backups are technically running.
- **Vercel must be on Pro before commercial hosting or minute-level cron is
  used** — note the backend's own scheduler is in-process on Railway
  specifically *because* Railway cron has a five-minute floor and a
  sub-daily Vercel cron expression previously failed the whole backend
  deployment on the Hobby plan ([outbox-jobs.md](outbox-jobs.md)) — this is
  a real, previously-hit failure mode, not a hypothetical.
- Queue age and failed/uncertain outbox jobs persisting are already
  alerted automatically ([alerts.md](alerts.md)) — this monthly review is
  for trend/capacity review, not incident response; a live incident should
  already have paged the owner separately.

## Read-only spend-check steps (safe to run any time)

1. Supabase: `list_organizations` → `get_organization(id)` to confirm the
   current plan. `list_projects` to confirm project status is
   `ACTIVE_HEALTHY` (not paused) and note the region.
2. Vercel: `list_teams` to confirm the team, `list_projects` (scoped to the
   team) to confirm both frontend projects exist and their most recent
   deployment status.
3. Railway: `list-projects` and `list-deployments` (per project) to confirm
   the backend service is deploying successfully and not stuck retrying
   (repeated failed deployments can itself indicate a runaway build-minute
   cost).
4. None of the above requires reading or setting any variable value —
   they are metadata/status reads only, safe to run without owner
   coordination.

## Verify

1. Each provider's plan tier matches what IMPLEMENTATION_PLAN §17 requires
   for the platform's current commercial status (see thresholds above).
2. No provider is within a wide margin of a hard free-tier ceiling that
   would pause or degrade service.
3. Actual spend this month is recorded wherever the owner tracks it
   (outside this repository) for trend comparison against prior months.

## Safe stopping point

This review is entirely read-only against live dashboards/MCP tools; it is
safe to pause and resume at any point, and safe to run partially (e.g. only
Supabase this session) without leaving anything in an inconsistent state.

## Escalation

Escalate to the owner (Takib) for: any plan-tier upgrade decision (this
runbook identifies the need, the owner authorizes the spend), any provider
approaching a hard ceiling within days rather than weeks, and any finding
that a required-by-plan tier (Supabase Pro before production backup
baseline; Vercel Pro before commercial hosting) is not actually in place.

## Verification log

**2026-09-21 — executed the read-only spend-check steps above as part of
runbook creation:**

- Supabase: organization `Canadian Plan` (`toiotlsyzgtfjjhnucpq`) is on the
  **`free`** plan. The one project (`canadianplans`,
  `ixbhodlvfyxjctpsjibj`) is `ACTIVE_HEALTHY`, region `us-west-2` — matching
  `docs/ENV.md`'s existing note that this is *not* `ca-central-1` and must
  not be used as evidence of Canadian staging compliance. **This is a real,
  current gap against IMPLEMENTATION_PLAN §17**: the plan requires Supabase
  Pro before production carries the standard backup baseline, and this
  organization is still on the free plan — flag to the owner as an open
  item, not something this runbook can resolve.
- Railway: project `canadian-plans-backend`
  (`1735e61b-ca5f-4a21-88ad-480e5bfd2616`), service `backend`, environment
  `production`. Latest deployment (`4a18ce9c-...`) status `SUCCESS`,
  deployed 2026-09-21 from `main` — no repeated failed deployments observed
  in the last 5 entries (one `SKIPPED`, three `REMOVED` from superseding
  redeploys, which is normal Railway history, not a cost concern).
- Vercel: team `canadian-plans` (`team_HAs8VUVhpfxZjgBcHhUQAzY2`) has three
  projects — `canadianplans-web-app-admin`, `canadianplans-web-app-site-1`,
  and `umami` (analytics, not covered elsewhere in these runbooks).
- No credential values were read or materialized during this check — an
  attempted read of Railway service variables was correctly blocked by the
  environment's own credential-materialization guard, confirming that path
  requires explicit owner-level access rather than this runbook's read-only
  scope.
