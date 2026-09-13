# CLAUDE.md

You are working on **Canadian Plans**. This file is read automatically at the start of every session. Follow it before doing anything else.

## Step 1 — Read before you act

Read **`PLATFORM_CONTEXT.md`** in full, now, before answering or writing code. It contains the business, the five-app architecture, the current stack baseline, the 14 non-negotiable invariants, Phase A vs Phase B, and the decisions already made.

Then read only the sections of `REQUIREMENTS.md` and `IMPLEMENTATION_PLAN.md` that the current task names. Don't read them end to end.

Planning files currently live at the workspace root. Generated implementation references (API, schema history, ENV, ADRs, runbooks and evidence) live under docs/ and are created by their tasks. Follow BUILD_TASKS.md's explicit dependency order; task IDs are not execution order. Preserve Phase A scope and adjust the launch date; exact recovery targets are deferred under the standard baseline.

## Step 2 — Before writing any code

State, briefly:
1. Which app you're working in (`apps/backend`, `apps/admin`, `apps/site-1`, or a `packages/*`).
2. Your assumptions.
3. Any open input you need — check `OPEN_INPUTS.md`; if it's missing, use a clearly named placeholder and add a line to that file. **Never invent a business rule.** TEST fixtures must not enable real publishing, dispatch, activation or payout without validated inputs.
4. Which `PLATFORM_CONTEXT.md` §4 invariants this task touches.

Then wait if anything is genuinely ambiguous. Otherwise proceed.

## Step 3 — While working

- **One task per session.** If the work drifts into something else, say so and stop rather than expanding scope.
- If the request would break a §4 invariant, stop and say which one. Do not work around it.
- If the request is Phase B (see `PLATFORM_CONTEXT.md` §6), build the interface or feature flag only — not the implementation. Say that you're doing so.
- **Strict types, no `any`, no unchecked `as`.** If you can't type it, that's a signal something is wrong — fix the design, don't cast it away.
- **Don't duplicate a type, Zod schema, or DB type** a shared package already owns. Import from `@canadian-plans/types`, `@canadian-plans/contracts`, `@canadian-plans/db`. If a new shared shape is needed, add it to the package, then use it — in the backend and the frontend both.
- Write negative tests, not just happy-path. Vitest for unit/component, Playwright for e2e on user flows. A feature without a failing-case test is not done.
- No new dependency without a one-line justification and a pinned version.
- Update `docs/` in the same change: ADR, `API.md`, `SCHEMA_HISTORY.md`, `ENV.md`, or a runbook as relevant.

## Step 4 — Finishing

End every session by showing:
- Which app/package you changed.
- Test output (including the negative tests).
- Which files under `docs/` you changed.
- Anything you had to assume or defer.

## Hard rules

- **Only `apps/backend` touches the database.** Admin and every storefront call the backend API — they never open a DB connection, import `@canadian-plans/db`, or hold a DB credential. The only exceptions are offline tooling (migrations, backup, restore), which are not business apps. If a frontend task seems to need data, it needs a backend endpoint, not a DB call.
- Never put a Supabase service-role key in application code. The backend uses the Postgres runtime role with RLS + per-request tenant context (`SET LOCAL app.workspace_id` inside a transaction).
- **Missing tenant context denies ordinary tenant operations.** Bootstrap only through PLATFORM_CONTEXT §4b: verified staff → own memberships; website credential → own workspace; verified machine → server-owned integration registry and explicit workspace/job scopes. No caller-supplied tenant or broad DB scan.
- Never trust a client-supplied `workspace_id`, Host, Origin, or price.
- **External deliveries go through the outbox, after commit — internal writes and bounded verification do not.** Order/history/snapshot commit together; activation/commission commit together at activation; email/analytics/external-event *sends* are outbox rows committed with that work and run afterward. A synchronous provider call a request truly needs (auth/session check, CMS price read, file-signature check, bot check) is fine — but never while a DB transaction or row lock is open. A manual courier/payment record is internal state, not an external call.
- **On order submission, return an existing order before re-validating a consumed quote.** Check the idempotency key + fingerprint first; only validate the fresh quote for a genuinely new submission. Enforce one-order-per-draft with a DB uniqueness constraint, not an app-level existence check.
- **Documents: verify the private candidate copy the uploader can't change, then attach that exact object.** Never mark bytes available that were only checked before the copy.
- **Owner/Finance privileged actions require a verified `aal2` session** (MFA completed this login), checked in the backend — not just an enrolled factor, not a frontend redirect.
- Never show a customer a success screen unless the order actually persisted.
- Never log or email personal data, document contents, or secrets. Sanitize attribution captured from URLs before storing; never forward raw URLs/query strings to analytics or logs.
- Never put production credentials in a preview or PR-CI environment. The sole exception is a dedicated, isolated production backup workflow (protected branch, pinned actions, protected secrets; archive-write access must not include archive-delete).
- **A DB row type is not an API response type.** Expose only the fields each audience (customer/staff/partner/viewer) is allowed, enforced server-side. Don't reuse a row type as a response to satisfy DRY.
- The backend runs as Vercel functions: assume serverless limits (no long-lived state between requests, use the pooled DB connection, background work goes through Vercel Cron + the outbox — whose minute-level cadence needs Vercel Pro).
- The owner is the only person who deploys to production. Don't run deploys.

## Who decides

Takib (the owner) decides all business rules. There is no co-founder, no product manager, and no one else to approve things. If a decision is business-shaped rather than technical, ask him instead of choosing.

## Project docs index

| File | What it's for |
|---|---|
| `PLATFORM_CONTEXT.md` | The whole picture. Read every session. |
| `REQUIREMENTS.md` | REQ 01–51, what the system must do. |
| `IMPLEMENTATION_PLAN.md` | Architecture, data model, milestones. |
| `BUILD_TASKS.md` | Sequenced tasks T0–T28 with prompts. |
| `OWNER_PLAYBOOK.md` | Owner's gate-based workflow; act on owner tasks only when requested. |
| `OPEN_INPUTS.md` | Unanswered business questions. Add to it, never guess past it. |
