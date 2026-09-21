# Dispatch and activation

Owner and escalation contact: Takib. Covers the order dispatch and activation
transitions and what to do when an order appears stuck. See
[orders.md](orders.md) for the broader order-integrity/retry runbook this one
narrows into just these two transitions, and `docs/API.md` ("Dispatch and
activation gates") for the exact contract.

## Required access

- Staff session with `workspace.read` to view `/w/<workspace>/orders`.
- Staff session with `order.manage` (Orders or Owner role) to dispatch,
  activate, or cancel. Finance holds `financial.read` (payment recording)
  but **not** activation — granting Finance the `orders` role is the
  explicit way to let it activate an order.
- Every Finance/Owner privileged action needs a session that completed MFA
  this login (`aal2`).

## Current production status: dispatch and activation are disabled

**As of this writing, production dispatch and activation are intentionally
disabled** until OPEN_INPUTS #15 (transition prerequisites) and, for
partnered orders, until activation can commit its commission line in the same
transaction (invariant 10; OPEN_INPUTS #19 for partnered specifics) are
resolved. This is enforced server-side by
`ORDER_OPERATIONAL_TRANSITIONS` (`docs/ENV.md`): the backend **ignores** this
flag entirely whenever `NODE_ENV=production`, so there is no way to enable
these transitions on a production deployment by setting an environment
variable — the gate is a deliberate code-level block, not a toggle.

If you observe `409 feature_not_ready` when attempting to dispatch or
activate an order in production, this is expected, current behaviour — it is
not a bug and not something this runbook can unblock. Escalate to the owner
only if OPEN_INPUTS #15/#19 have since been resolved and the flag was
supposed to have followed.

Staging/test environments (`NODE_ENV` not `production`) can exercise both
transitions synthetically by setting `ORDER_OPERATIONAL_TRANSITIONS=1` (or
`true`) — this never has any effect in production regardless of value.

## Normal dispatch flow (once enabled)

1. Open the order in `/w/<workspace>/orders/<orderId>`. The **Dispatch**
   button only appears if the backend's `allowedTransitions` includes it for
   the order's current status — the admin never offers an edge the backend
   would reject.
2. Dispatch requires a courier name; tracking reference and dispatch date are
   optional. Submitting without a courier returns
   `400 dispatch_details_required`.
3. The transition writes the `dispatch_records` row and the `Dispatched`
   status change in one transaction (`PATCH /orders/{orderId}` with
   `action: "dispatch"`), carrying the `expectedVersion` last rendered to the
   staff member.
4. `409 version_conflict` means someone else changed the order first — the
   admin shows "changed by someone else, reload" and offers a reload; re-open
   the order and retry with the fresh version rather than forcing the write.
5. A successful dispatch queues the `order_dispatch` transactional email
   (see [failed-email-recovery.md](failed-email-recovery.md) if it doesn't
   arrive).

## Normal activation flow (once enabled)

1. Use **Activate** on the order. For a **partnered** order (has a
   `partnerCode`), activation additionally requires the commission-on-
   activation hook to successfully create or find an existing `earned`
   commission line in the same transaction
   (`apps/backend/src/partners/activation.ts`) — see
   [commission-month-end.md](commission-month-end.md) for what that line
   means downstream.
2. `409 feature_not_ready` on a partnered order specifically (even once the
   general gate is open) means no usable commission rule is effective at
   activation time — check `commission_rule`s for that partner/period before
   retrying; do not activate the order and handle commission separately, the
   two must commit together (invariant 10).
3. A successful activation queues the `order_activation` transactional email.

## An order appears stuck

1. Check the order's **status history** and **allowed transitions** in its
   detail view first — "stuck" often means the order is correctly sitting in
   a status that has no further transition available yet (e.g. waiting on a
   document review, or waiting on the customer per `order_awaiting_customer`),
   not a bug.
2. If a transition button is missing that you expect, confirm this isn't the
   production dispatch/activation gate above (`feature_not_ready`) before
   assuming something is broken.
3. If a transition was attempted and returned `409 version_conflict`, reload
   the order (fetches the current `recordVersion`) and retry — this is not a
   stuck order, it is a stale read.
4. If a transition was attempted and returned `409 illegal_transition`, the
   requested edge is not valid from the order's current status — check
   `allowedTransitions` on the order detail for what actually is valid;
   do not attempt to force a status change outside the transition service
   (never write `orders.status` directly — [orders.md](orders.md)).
5. If the order's required documents are blocking progress, check
   `/orders/{orderId}/files` — a document still pending review blocks the
   checklist the transition may depend on; use the file review action
   (`order.manage`) rather than working around it.
6. If none of the above explains it, check `/w/<workspace>/settings/jobs`
   for a failed/uncertain outbox job tied to this order (a stuck
   acknowledgement or status email does not block the order transition
   itself, but is worth ruling out as a related symptom) — see
   [failed-email-recovery.md](failed-email-recovery.md).

## Verify

1. The order's status history shows the new status with the correct actor
   and timestamp.
2. For dispatch: `dispatch_records` shows the courier/tracking/date and
   `delivery_state` updated.
3. For activation: the order status is `activated`; for a partnered order, a
   commission line with `status: earned` exists for that order/partner
   (visible under the partner's detail in admin, gated behind
   `financial.read`).
4. The corresponding transactional email job appears delivered in
   `/w/<workspace>/settings/jobs`.

## Safe stopping point

Any point between transitions is safe — an order sits in its current status
indefinitely with no time-based side effects from waiting. Never force a
transition to "unstick" something; leaving it as-is and escalating is always
safer than a direct database write.

## Escalation

Escalate to the owner (Takib) for: any `feature_not_ready` you believe should
no longer apply (OPEN_INPUTS #15/#19 status), a partnered activation that
cannot find a usable commission rule, or any situation that seems to require
writing `orders.status` or `dispatch_records` directly instead of through the
transition service.
