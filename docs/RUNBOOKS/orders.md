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
