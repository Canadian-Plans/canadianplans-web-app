# 0003 — Catalogue sync leases, content-hash version identity, order idempotency and the outbox pattern

Date: 17 September 2026
Status: accepted

## Context

The catalogue-sync (T10), order-submission (T12) and outbox (T15) work is now
implemented. Each picked a concurrency and identity strategy that later tasks
must not quietly change: how two concurrent syncs avoid overwriting each other,
what makes an offer version "the same version", how a retried order submission
is recognized, and how an external side effect (email, analytics event) is
queued without running inside a transaction it could roll back.

PLATFORM_CONTEXT.md §4 invariants 5, 6 and 7 already fix the outcomes: orders
freeze a commercial snapshot, one order per scoped idempotency key with a
retry returning the stored order first, and external side effects go through
the transactional outbox while internal writes do not. This ADR records the
concrete mechanism chosen for each, with file-level evidence, so those
invariants are traceable to code.

## Decisions

**Concurrency is serialized per product by a database lease, never by process
state.** `app.catalogue_sync_leases` is keyed on `(workspace_id, product_key)`
with `owner_id` and `expires_at` (`packages/db/src/schema.ts`,
`catalogueSyncLeases`). `DatabaseCatalogueStore.acquireLease`
(`apps/backend/src/catalogue/store.ts`) is a single `INSERT … ON CONFLICT
(workspace_id, product_key) DO UPDATE … WHERE app.catalogue_sync_leases.expires_at
<= now OR owner_id = $owner RETURNING owner_id`: it succeeds only when the row
was free/expired or already ours, so a loser gets no row and the caller returns
`lease_busy`. `releaseLease` deletes only the row still owned by that
`owner_id`. The TTL (`DEFAULT_LEASE_TTL_MS = 30s`, `service.ts`) means a
crashed holder cannot wedge a product forever, and a database lease is used
precisely because Vercel functions keep no durable in-process state
(`schema.ts` comment on the table). The same lease guards the quote path
(`createQuote`), the webhook path (`processEvent`) and reconciliation.

**The authoritative provider read happens after the lease, not from the
webhook body.** `processEvent` (`apps/backend/src/catalogue/service.ts`) uses
the event payload only as a selector, resolves a `productKey`, acquires the
lease, and only then re-fetches the published document
(`provider.catalogue.fetchPublishedByDocumentId`). The comment on the second
fetch states the reason: a late-arriving older delivery must not overwrite a
newer published state. `createQuote` applies the same rule for pricing — its
comment records that the fetch is deliberately after lease acquisition and
outside any DB transaction. Neither path writes commercial data parsed from
the request body.

**The canonical commercial hash is the version identity.** `canonical.ts`
sorts object keys and rejects non-finite numbers and unsupported values, then
hashes the deterministic JSON as `sha256:<hex>` (`commercialContentHash`,
`canonicalCommercialJson`). `persistPublishedInTransaction` inserts the
`offer_versions` row with `onConflictDoNothing` on
`offer_versions_workspace_product_content_hash_unique` and then re-selects the
existing row, so unchanged commercial content re-synced any number of times
resolves to one immutable version. Provenance (`cms_document_id`,
`cms_revision_id`) is deliberately outside that uniqueness key: reconfirming a
version from a later CMS revision is not a new version. Only the separate,
mutable `product_availability.current_offer_version_id` moves.

**A withdrawn offer always blocks new quotes; existing-quote treatment is an
unresolved owner policy and gates priced checkout.** `policy.ts` accepts only
`immediate` or `honour_until_expiry`; anything else — including unset — becomes
`unresolved`, which is the safe default rather than a silent choice. With
`unresolved`, `CatalogueService.createQuote` returns `checkout_disabled`
before any provider read, `OrderService.submit` does the same
(`apps/backend/src/orders/service.ts`), and the website route maps it to
`503 priced_checkout_disabled` (`apps/backend/src/routes/website.ts`,
`priced_checkout_disabled` in `apps/backend/src/http/domain-errors.ts`). The
business question itself is OPEN_INPUTS #14 and is not answered here.
`withdrawProduct` marks availability revoked and, only under `immediate`,
revokes that product's open quotes; both policies remain exercisable in test
configuration.

**Idempotency is a key hash plus a request fingerprint, with the claim made by
database uniqueness.** `idempotencyKeyHash` hashes the caller's raw key
(`apps/backend/src/orders/fingerprint.ts`) so the plaintext key is never
stored; `requestFingerprint` canonicalizes the request payload the same way as
the commercial hash. The row carries both
(`idempotency_keys.key_hash`, `.request_fingerprint`;
`packages/db/src/schema.ts`) under
`idempotency_keys_workspace_scope_key_unique` on
`(workspace_id, scope, key_hash)`. `submitInTransaction`
(`apps/backend/src/orders/store.ts`) resolves a prior key **before** touching
the quote, takes `FOR UPDATE` on the quote row alone, then re-checks the key
after that lock because a concurrent request may have committed while it
waited. The claim is an `INSERT … onConflictDoNothing` on the unique target —
uniqueness, not an application-level existence check, is what guarantees one
order — and only a losing claim falls through to the stored outcome. A
fingerprint mismatch on a matching key is `idempotency_conflict`, not a second
order; a completed row re-loads its order. The quote is then consumed, the
lead flipped to `submitted` and the snapshot written in the same transaction,
with the `orders_workspace_reference_unique` / `orders_workspace_lead_unique`
violations translated to `reference_collision` /
`draft_already_submitted` rather than surfacing as a raw 500.

**External side effects use claim → commit → call → record.** The order
transaction (`orders/store.ts`) inserts the `order_acknowledgement_email` and
`analytics_order_submitted` `outbox_jobs` rows _inside_ the same transaction
as the order, its status history and its audit event, so a committed order can
never lack its queued effects and a rolled-back one can never leak them.
`OutboxRunner` (`jobs/src/index.ts`) then, after commit, atomically claims a
batch (`DatabaseOutboxStore.claim`, `apps/backend/src/jobs/store.ts`, a single
`UPDATE … FROM (SELECT … FOR UPDATE SKIP LOCKED)` that sets `processing` and
increments `attempts`), calls the handler **outside** any transaction and
outside any row lock, and records the outcome via `recordOutcome`. Recording
is fenced on `lease_owner_id` + `status = 'processing'`, so a worker whose
lease expired cannot overwrite the result of the worker that took over
(`lease_lost`). Outcomes are `completed`, `retry` (capped exponential backoff
with full jitter, `retryDelayMs`), `failed`, or `uncertain`; `failed`/`uncertain`
raise an `outbox_job_alerts` row for staff, and staff retry is an audited
`outbox_job.retry` transition. `uncertain` exists so a provider call that may
have succeeded is never silently retried as if it had failed.

## Consequences

- The catalogue, quote and order paths are safe under concurrent webhook
  deliveries and concurrent form retries without any in-process locking, which
  is what the serverless runtime requires. The cost is one extra
  database round-trip per sync/quote (lease acquire + release) plus the
  authoritative re-fetch, and a leaked lease that expires rather than one that
  is freed immediately.
- Sync, quote and order retries are idempotent by construction: the same
  commercial content yields one `offer_versions` row, the same key+fingerprint
  yields one order, and a duplicate webhook delivery is absorbed by
  `catalogue_sync_events_delivery_unique`.
- The outbox is at-least-once, not exactly-once: a worker that dies after the
  provider accepted a send but before `recordOutcome` leaves the row
  `processing` until its lease expires, and the next claim retries it (the
  `message_id` carried on the job is the provider-side dedupe hint). Mail
  delivery must be safe to repeat.
- Scheduled execution of the runner still needs minute-level Cron, which is
  Vercel Pro (PLATFORM_CONTEXT.md §3); the runner is batch-claimed per
  authorized workspace and never runs inside a request transaction.
- **Production publishing, dispatch and activation remain disabled behind
  unresolved inputs.** The withdrawal policy gate above keeps real priced
  checkout off (OPEN_INPUTS #14); real plan/pricing inputs gate live
  publishing (#3–#6); dispatch/activation prerequisites and evidence gate
  those transitions (#15, #19), and partnered activation additionally needs
  the commission rule (#7, #17). The registered outbox handlers today are the
  acknowledgement email and the submitted-analytics event only — commission
  is intentionally not a handler — so this ADR authorizes no live sending,
  dispatch, activation or payout.

## Known gaps and discrepancies (not resolved by this ADR)

- _Read:_ the outbox insert in `orders/store.ts` has no
  `onConflictDoNothing` against `outbox_jobs_workspace_type_dedupe_unique`.
  Duplicate effects are in practice prevented earlier by the idempotency-key
  resolution returning the stored order before that insert is reached, but a
  re-entry that got past it would surface a unique violation as an error
  rather than a no-op. The stated intent — dedupe by `(workspace, job_type,
dedupe_key)` — is therefore enforced by key uniqueness rather than by a
  second layer inside the transaction.
- _Read:_ "withdrawal always blocks new quotes" depends on
  `product_availability.revoked_at` being consulted when a quote is prepared.
  `withdrawProduct` sets `current_offer_version_id = null` and `revoked_at`,
  and `catalogueStatus` reports `available: offerVersionId !== null &&
revokedAt === null`, but `createQuote`'s availability check is the
  provider's `fetchPublishedByProductKey` returning nothing — the
  `product_availability` row is not itself read on that path.
- _Inferred:_ no activation or dispatch outbox handler exists yet
  (`outboxJobTypes` in `jobs/src/index.ts` lists only the two above), which is
  consistent with the OPEN_INPUTS gates rather than evidence they were
  resolved.

## References

[PLATFORM_CONTEXT.md](../../PLATFORM_CONTEXT.md) §4 invariants 5–7, §5 ·
[Implementation Plan](../IMPLEMENTATION_PLAN.md) §6 ·
[Requirements](../REQUIREMENTS.md) REQ 13 ·
[Open inputs](../OPEN_INPUTS.md) #3–#7, #14, #15, #17, #19 ·
[API](../API.md) · [Env](../ENV.md) ·
[ADR 0000](0000-reviewed-planning-baseline.md) ·
[ADR 0001](0001-split-architecture.md)
