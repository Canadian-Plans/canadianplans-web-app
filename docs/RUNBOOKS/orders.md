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
