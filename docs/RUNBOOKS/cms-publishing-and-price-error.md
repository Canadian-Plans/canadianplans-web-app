# CMS publishing and price-error handling

Owner and escalation contact: Takib. This runbook is the staff-facing
"something priced wrong on the storefront" companion to
[catalogue-sync.md](catalogue-sync.md), which owns the technical sync
mechanism (webhook, scheduler, manual invocation, actor attribution). Read
catalogue-sync.md first; this file does not repeat its commands.

## Required access

- Sanity project access (Editor role or above) to publish/unpublish content.
- A staff session with `workspace.read` to view
  `/w/<workspace>/settings/catalogue` in admin.
- Backend environment variables and `MACHINE_REGISTRY_JSON` access
  (owner/deploy-level) only if the sync mechanism itself needs inspecting —
  most price errors do not require this.

## Normal publishing flow

1. Edit the offer/product content in Sanity Studio and **Publish**.
2. Sanity's configured webhook fires; the backend verifies it via the
   server-only registry and commits a tenant-scoped inbox row (`200`
   response to Sanity regardless of processing outcome — see
   catalogue-sync.md).
3. The in-process scheduler drains the inbox and reconciles every 300 seconds
   (`ENABLE_SCHEDULER=1`). There is no manual "push" step for staff — publishing
   in Sanity is sufficient; do not run the manual CLI/route unless the sync is
   confirmed stuck (see below).
4. Confirm in admin: open `/w/<workspace>/settings/catalogue`. Last success
   should advance within a few minutes of publish and current error should be
   `None`.

## A bad price or content push reached the storefront

This is the incident path: an offer was published with wrong pricing, a
wrong plan description, or should not have gone live at all.

1. **In Sanity, immediately publish a correction** (or revert to the last
   known-good version using Sanity's document history) — this is the fastest
   way to stop new customers from seeing the wrong offer, since the sync
   mechanism will pick up the corrected version on its next pass (≤300s) or
   can be forced (step 3 below).
2. Do **not** try to fix this by editing rows in `offer_versions` directly —
   catalogue-sync.md is explicit that historical offer-version rows are
   append-only and must never be edited or have "availability restored" by
   hand. Every published Sanity revision creates a new immutable version; the
   correction is a new publish, not a database edit.
3. To force the corrected version to sync immediately instead of waiting for
   the next 300-second scheduler tick, run the manual reconcile pass:
   ```powershell
   pnpm --filter backend catalogue:job -- reconcile <workspace-uuid>
   ```
   or the authenticated internal route (see catalogue-sync.md for the exact
   headers/secret). Both are idempotent and safe to re-run.
4. **Orders already placed at the wrong price are not touched by this fix.**
   An order's commercial terms are frozen into an immutable snapshot at
   submission time (`docs/API.md`, `POST /api/v1/orders`) — correcting the
   catalogue never retroactively changes a placed order. Decide separately
   (owner call) whether to honour, cancel, or manually adjust each affected
   order; use the order note/amendment tools in admin, not a database edit.
5. If the wrong price is still live (correction not yet visible after a
   forced reconcile), check `/w/<workspace>/settings/catalogue` for a current
   error. A stuck sync (`current error` not `None`) means the drain/reconcile
   pass is failing — escalate to the owner with the exact error code; do not
   attempt a direct database fix.

## Sanity is unreachable during checkout

`catalogue-sync.md` already documents that priced quote creation fails
closed with `unpriced_lead_required` when Sanity cannot be read at quote
time — the customer's lead is kept as an incomplete/unpriced callback rather
than confirming an order against stale or invented pricing. No staff action
is needed for this case beyond following up on the resulting lead once
Sanity recovers; do not manually price the lead's order.

## Identify which orders were affected by a bad push

Use `GET /workspaces/{id}/orders` in admin filtered by submission date
around the bad publish's timestamp, cross-referenced with the product/offer
in question, then open each order's detail — the frozen `snapshot` field on
each order records exactly what price/terms it was placed under, which is
the authoritative record for whether that specific order was affected.

## Verify

1. `/w/<workspace>/settings/catalogue` shows `current error: None` and last
   success advanced past the correction's publish time.
2. The storefront (or a fresh quote against `GET /api/v1/website/offers`)
   reflects the corrected price/content.
3. Any affected already-placed orders have been triaged (owner decision
   recorded as an order note), not silently left as-is.

## Safe stopping point

After the Sanity correction is published and a reconcile pass has run
successfully (step 3/4 above), the storefront is safe — new quotes will use
the corrected content. Triage of already-placed affected orders can be
paused and resumed; it does not need to happen in the same session as the
content fix.

## Escalation

Escalate to the owner (Takib) for: any decision to honour, cancel, or adjust
an order placed under an incorrect price; a sync stuck in error for more than
one scheduler cycle after a forced reconcile; or anything that would require
editing `offer_versions` history directly.
