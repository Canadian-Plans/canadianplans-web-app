# 0006 — In-app automations instead of n8n for internal workflows

Date: 27 October 2026
Status: **ACCEPTED** by the owner (27 October 2026). The decision is recorded now;
the engine is built in Phase 3 of the
[admin CRM roadmap](../superpowers/specs/2026-10-27-admin-crm-and-automations.md).
Supersedes the "Automation: n8n, Phase B only" baseline in `PLATFORM_CONTEXT.md` §3/§6
for automations that act inside Canadian Plans.

## Context

- The owner wants the admin to work like the open-source CRM Twenty, including its
  workflow builder: pick a trigger, add conditions, add actions. First uses: reminder
  alerts, owner alerts and customer follow-up emails.
- The baseline put automation in n8n, Phase B. n8n is a separate service with its own
  hosting, credentials and audit trail. It could only reach Canadian Plans through
  scoped APIs, and could not join the backend's transactions, outbox or transition
  service.
- The backend already has what a workflow engine needs: the transactional outbox and
  runner (retries, dedupe keys, alerts), the in-process scheduler (ADR 0004), the
  order transition service with `expectedVersion`, staff actions with audit, and the
  email adapter with suppression and consent checks.
- Order reminders are stored today but never fire; nothing in the system can act on
  a time-based rule.

## Decision

**D1 — Internal automations run inside the backend.** Automation definitions, versions
and runs are tenant tables in the shared database. Triggers come from domain writes
(recorded in the same transaction as the write), from the in-process scheduler, and
from a manual staff action. Actions call the existing services, so status changes go
through the transition service, emails through the outbox, and every write is audited
with actor label `automation`.

**D2 — The owner's limits (27 October 2026).** Automations may change an order to any
allowed status (the transition service still enforces allowed moves, document
prerequisites, the operational kill switch and commission-on-activation exactly once).
Customer emails are transactional order emails; they send automatically once a staff
member with the "Manage automations" permission has switched the automation on with an
aal2 session after a preview. Automations may not delete records, record payments or
change commissions and payouts.

**D3 — No outside connections in this build.** HTTP requests, incoming webhooks and
custom code are excluded. Each future outside connection goes on an approved list with a
privacy-policy update; n8n remains an option for those.

**D4 — No Twenty source code.** Twenty's application UI is AGPL-3.0. Patterns and
measurements are re-implemented; the canvas uses `@xyflow/react` (MIT) as a normal
dependency.

## Consequences

- New tenant tables (automations, versions, runs, run steps) with `workspace_id`,
  composite keys, RLS and audit, plus a staff permission `automation.manage`.
- Safety controls are required before any automation can send: a workspace master
  switch, a deployment kill switch, a loop guard (depth 3), a per-run step cap, a daily
  email cap per workspace, deterministic dedupe keys and a test run before switching on.
- Run history stores ids and references only, never names, emails or phones
  (invariant 12).
- `PLATFORM_CONTEXT.md` §3 and §6 point here instead of describing n8n as the
  automation tool.
