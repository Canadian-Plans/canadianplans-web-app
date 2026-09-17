# Order submission integrity and retry handling

Owner/escalation: Takib.

## Safe retry

When a storefront times out after `POST /api/v1/orders`, retry the identical
validated body with the identical website credential, draft grant, and
`Idempotency-Key`. A committed request returns the stored order reference
before the backend examines its consumed or expired quote. Never substitute a
new key for an uncertain request; that intentionally becomes a separate claim
and will conflict with the one-order-per-draft constraint.

`409 idempotency_conflict` means the key was reused with a different canonical
request. Do not automate a body rewrite. `503 persistence_unavailable` is safe
to retry with the same key and body; it is never evidence that an order was
saved or that a success page may be shown.

The prior-key path is bounded by a fixed retry window, `ORDER_RETRY_WINDOW_MS`
(24 hours), measured from the completed key's `completedAt`. Inside the window
the stored order is returned before the backend re-checks the now consumed or
expired quote (PLATFORM_CONTEXT invariant 6). Outside it the retry is no longer
honoured by the prior-key path and returns `draft_expired`, rather than
replaying a lapsed draft grant forever. The window is a caching/technical bound,
not a business SLA, and the stored order itself is unaffected.

## Verification

For a synthetic submission, verify exactly one row for the lead in `orders`,
one consumed quote pointing at that order, one initial status-history row, and
two pending outbox jobs: `order_acknowledgement_email` and
`analytics_order_submitted`. The returned reference must equal the reference
stored in both the order and completed idempotency record.

## Transition gates

Status changes must use the transition service with `expectedVersion`; never
write `orders.status` directly. Production dispatch and activation remain
disabled until OPEN_INPUTS #15/#19 are resolved. Partnered activation remains
disabled until T19 can commit the activation and commission line together.

T14/T16 may exercise dispatch and activation synthetically outside production by
setting the TEST-only `ORDER_OPERATIONAL_TRANSITIONS` flag (`1` or `true`). The
backend loader ignores it whenever `NODE_ENV=production`, so it can never enable
these transitions on a production deployment. See `docs/ENV.md` and OPEN_INPUTS
#15 for the prerequisites that must be decided before production dispatch or
activation is enabled.

## Admin order processing (T14)

Purpose: process a submitted order to Activated (or Cancelled) from
`/w/<workspace>/orders` without ever writing business logic in the browser.

Required access: a staff session with `workspace.read` to view, and
`order.manage` (Orders/Owner) to change. Finance holds `financial.read`, which
grants payment recording but **not** activation; granting Finance the `orders`
role is the explicit way to let it activate. Every Finance/Owner privileged
action needs a session that completed MFA this login (`aal2`).

Exact steps:

1. Open `Orders`. Filter by status, assignee, partner code, source, or submitted
   date. The search box matches the reference, plus customer name/email/phone
   when your role holds the contact-search capability; the placeholder tells you
   which mode you are in. Archive defaults to Active; `Archived` and `All` are
   explicit choices.
2. Select rows and use **Bulk assign** to hand orders to a member. Each row sends
   its own `recordVersion`; the result line reports any row that changed or
   disappeared rather than claiming success.
3. Open an order. The snapshot panel is read-only: prices, terms and the
   document checklist come from the frozen submission snapshot and are never
   re-priced.
4. Use only the action buttons shown. They come from the backend's
   `allowedTransitions`; there is no way to pick an edge the backend rejects.
   - **Dispatch** requires a courier and records courier, tracking reference and
     dispatch date with the Dispatched status in one transaction.
   - **Cancel order** requires a reason; the confirm button stays disabled until
     one is entered.
   - **Activate** returns `feature_not_ready` for partnered orders until
     activation can commit its commission line, and for every order while the
     operational-transition gate is off. This is surfaced, not hidden.
5. Notes and reminders are separate records; adding one does not change the
   order's version, so it never blocks a colleague's transition.
6. A customer's emailed correction is recorded under **Change requests** and
   approved or rejected there. Approval writes exactly one audited amendment and
   applies contact changes to the originating lead; the submitted order envelope
   stays immutable (REQ 14). Re-approving a resolved request is refused.
7. Finance or Orders records payment in the **Payment** panel; the amount shown
   comes from the snapshot, and recording writes `payment_records` and
   `payment_state` together.
8. **Archive** hides an order from the default list. It is never a deletion.

Optimistic concurrency: every write sends the `recordVersion` shown on screen.
On `409 version_conflict` the admin shows "changed by someone else" and offers
**Reload order**; reload and re-apply the action. Never retry blind — the other
person's change is already committed.

Verification: after dispatch, confirm one `dispatch_records` row and
`delivery_state = 'dispatched'`. After approval, confirm exactly one new
`order_amendments` row and that the lead's contact fields changed while
`orders.snapshot` and `orders.payload` did not. After a payment, confirm one
`payment_records` row and the updated `payment_state` share the same version.

Safe stopping point: any time. Every accepted action commits before the UI
reports it; a failure leaves the previous state intact.

Escalation: owner (Takib) for a wrong transition, a suspected cross-workspace
leak, or an activation that must be reversed. Do not edit `orders.status`,
`orders.payment_state` or `orders.version` directly.
