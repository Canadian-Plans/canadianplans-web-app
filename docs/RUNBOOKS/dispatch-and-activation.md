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

## Current production status: opt-in, and gated on documents

OPEN_INPUTS #15 is resolved (21 Sep 2026), so the blanket production block is
gone. Two things now govern dispatch and activation:

1. **`ORDER_OPERATIONAL_TRANSITIONS` must be set** to exactly `1` or `true`
   on the deployment (`docs/ENV.md`). It is deliberately opt-in: while unset,
   dispatch and activation return `409 feature_not_ready` in every
   environment. Unsetting it is also the kill switch — it stops dispatch and
   activation without a deploy.
2. **The document prerequisite** below, which the switch never bypasses.

For **partnered** orders, activation additionally requires the
commission-on-activation path (invariant 10; OPEN_INPUTS #19 for partnered
specifics) — see the activation section.

If you see `409 feature_not_ready` on dispatch or activation, check the
switch first; if it is set and the order is partnered, it is the commission
path, not this gate.

## The document prerequisite (OPEN_INPUTS #15)

Before an order may reach `ready_for_delivery`, `dispatched` or `activated`,
every document on **that order's** checklist must be approved.

- "Required" is per plan/product: the offer's `documentChecklist`, frozen
  into the order snapshot at submission. Editing a plan's checklist in Sanity
  later never changes what an already-placed order requires.
- A document counts only when it is attached **and** its latest staff review
  is `approved`. An uploaded-but-unreviewed document does not count, and
  neither does one whose most recent review was a rejection. If a customer
  re-uploads after a rejection, approving the new file satisfies it.
- **Payment is not a prerequisite.** Payment state is tracked but never
  blocks fulfilment, because payment arrives both before and after delivery
  depending on the customer.
- A blocked attempt returns `409 documents_incomplete` and names the
  outstanding document types in `details.missingDocuments`.

### Overriding it

As confirmed by the owner on 21 Oct 2026, any staff member with `order.manage`
(Orders or Owner) may proceed anyway by
sending a `documentOverrideReason` with the transition. The control is not
access — it is the reason, which is mandatory and recorded in the audit event
together with exactly which documents were outstanding. An empty or
whitespace-only reason is refused (`400
document_override_reason_required`).

Use it for a genuine out-of-band verification (ID confirmed by phone, a
document accepted through another channel) and say so in the reason. The
override is scoped to documents only: it cannot force an illegal status
change, and it cannot activate a partnered order that has no usable
commission rule.

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

### No shipping at launch (owner decision, 22 Oct 2026; OPEN_INPUTS #9)

Canadian Plans ships no SIM cards: mobile plans use eSIM or a SIM the provider sends, and
internet is installed by the provider. The status flow still passes through Dispatched,
so use it to record the handoff to the provider:

- **Courier:** `Provider handoff (no shipment)`.
- **Tracking reference:** the provider's order or confirmation number.
- **Dispatch date:** the day the order was submitted to the provider.

The `order_dispatch` email still goes to the customer, and today it says "Your order … has
shipped … via <courier>. Tracking: …" (`packages/adapters/src/messaging.ts`). Reword it
for a provider handoff before the first real order.

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
4. **Activation evidence** (OPEN_INPUTS #19): before pressing Activate, add a note to the
   order with the provider's confirmation number, plus the new phone number (mobile) or
   the install date (internet).

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
