# Customer-data deletion

**Escalation owner:** Takib. Customers' personal records and accepted documents
remain until they request deletion; there is no automatic six-month deletion.
`record.delete` requires the Owner role or an individual `deletion` grant, and always a verified `aal2` session.
A deny override wins. Orders staff may approve missing-document exceptions with
a reason; that does not grant customer-data deletion permission.

## Select the verified request's records

Verify the requester's identity outside this API. Do not put personal information
in the recorded reason. In admin, use **Settings → Delete customer data on request**
(`/w/{workspace}/settings/customer-data`): it runs the search below, then deletes
one record at a time after you confirm the identity check and the reason. An
`mfa_required` answer links to the MFA challenge. The underlying routes, all
beginning with `/api/v1/staff/workspaces/{workspaceId}`, are:

1. `POST /customer-data/search` with `{ "email": "…", "page": 1 }` returns candidate
   orders, unconverted drafts and wish-list entries, their IDs and references.
   Results are private/no-store, with `page` and `hasMore`; advance pages while
   `hasMore` is true. Search does not delete anything.
2. Select each verified record explicitly. Sharing an email address does not
   authorize deletion of another order. Submit
   `POST /customer-data/{subjectType}/{subjectId}/deletion`, with
   `{ "reason": "verified customer request" }`. Types are `order`, `lead` and
   `region_waitlist`. A converted lead resolves to its order and linked draft.
3. The existing `POST /orders/{orderId}/deletion` route remains supported.
   `202` reports `deletionId`, `ledgerStatus` and `cleanupStatus`. Repeating the
   request reuses the same logical intent and reports its current progress.

## Restrict, acknowledge, erase

1. **Restriction transaction:** mark the selected order/draft/wish-list entry,
   revoke draft grants, consume tracking challenges, stop linked queued work and
   follow-ups, and deny new documents/download links/sends/operational edits.
   Staff order reads mask personal details immediately. Keep the underlying
   personal values until the ledger acknowledgement. Audit `customer_data.restricted`
   and enqueue `deletion_ledger_publish` atomically.
2. **Independent acknowledgement:** publish the stable intent ID, timestamp,
   subject type/ID and explicit related lead ID, without personal content.
   A successful publisher acknowledgement and `customer_data_cleanup` enqueue
   commit together. Missing/unavailable ledger leaves access restricted and
   work pending/failed; it never authorizes erasure or reports completion.
3. **Database cleanup:** remove contact/form/consent/attribution, document rows,
   revisions and reviews, notes/corrections/requests for details/reminders,
   dispatch details, order-bound tracking challenges, linked email/provider events, consent/follow-up records and grants.
   Scrub linked job payloads/outcomes and personal audit before/after values;
   null history reasons and payment references/methods. Keep commercial snapshots,
   reference, payment amount/currency, status/time/actor and minimal audit evidence.
   Persist every staging/candidate/original/revision key in `deletion_objects`
   before deleting its source row, and enqueue one cleanup job per object.
4. **Private object cleanup:** `deletion_object_cleanup` performs an authenticated,
   workspace-scoped R2 DELETE. It retries provider errors; an already absent key
   is success. Wait past outstanding upload URL expiry plus a bounded verification
   margin to prevent a late upload recreating erased bytes. Missing R2 config or
   a bucket mismatch leaves work pending. An in-memory fake never substitutes
   for physical cleanup in the provider registry.
5. **Completion:** set `completed_at` only after local cleanup and every durable
   object acknowledgement. Only then does `cleanupStatus` become `completed` and
   the retained order display “deleted”. Ledger acknowledgement alone is not
   completion. Draft/wish-list requests without objects can finish at local cleanup.

Existing provider requests admitted before restriction and already issued short-lived
signed download URLs cannot be recalled. No new access/sending is admitted after
restriction. Minimal message/provider identifiers prevent late webhooks/results
from recreating erased email rows. Keyed suppression/opt-out evidence remains to
prevent sending from resuming; unrelated records are not erased by contact hash.
Processor-held messages require the processor's separate deletion procedure.

## Automatic erasure of abandoned order forms

Owner decision 22 Oct 2026 (SEC-12). Once a day the backend scheduler finds
leads still `incomplete` 90 days after their last change and erases their
name, email, phone, country and form answers, revokes their resume links and
sets `customer_data_restricted_at`. The row stays as an anonymous count with its
source and offer. Submitted leads are never touched. Each restricted lead gets a
`lead.abandoned_draft_restricted` audit event; at most 1,000 leads per workspace
are handled per run. No request is needed and nothing is queued.

## Backup and retry safety

Migration `0024_backup_reference_barrier` makes database cleanup acquire the
protected backup gate before any row locks. An active backup defers the same
cleanup job until after its lease expires; otherwise the transaction holds the
gate until metadata erasure commits. Restriction remains immediate. The backup
inventory includes retained verified file and revision keys regardless of file
status, so restriction after the dump cannot hide objects from the archive.

The database also arbitrates backup acquisition and 45-second object cleanup
leases through that same protected gate. R2 requests have a ten-second deadline and run
outside database transactions. Active backups defer durable cleanup work; active
cleanup defers backup startup. Waiting for a backup, another cleanup lease or
upload expiry preserves the failure-attempt budget; actual cleanup errors still
consume attempts and can require staff retry. A crash after R2 deletion but before DB completion
retries the same key safely. Do not force completion, clear markers or remove
work rows to bypass a provider/ledger failure.

Migration `0023_customer_deletion_lifecycle` also restricts and queues cleanup for
older intents. Migration `0021_audit_redaction` remains in force: SQL NULL-only
redaction, with no replacement/restoration of personal audit values. The new
migration preserves immutable financial, order and idempotency evidence.

On an isolated restore, bind `createDatabaseLedgerReplay` to the restored database
as the authenticated ledger reconciler's callback. New order events carry the
related lead ID so an older draft-only backup is erased too. Ambiguous legacy
scope fails closed. An active backup lease makes replay fail with `deletion_cleanup_deferred`;
keep the isolated target closed and retry after the lease expires or its owning
backup finishes. Do not clear a live lease. Database cleanup runs before replay
returns successfully; object work
remains durable and access restricted. Never reopen traffic/jobs before the
restore runbook's independent checkpoint and provider checks pass.

## Verify and operational limits

- Inspect `deletion_intents`: acknowledgement, `local_cleaned_at`, `completed_at`.
- Inspect pending `deletion_objects` and failed/retrying cleanup jobs.
- Confirm old tracking/grants/download issuance are denied and staff detail still
  opens with only the retained commercial record. Email-only tracking codes are
  keyed to the email hash, not the order: restriction hides the order from the
  customer's tracking at once, a pending code for an email with no other active
  order no longer verifies or sends, and the hash-only row is pruned after 7
  days with other used or expired codes.
- Verify absence of linked personal rows and physical R2 keys before confirming
  active-system completion to the customer.

The HTTP ledger publisher is an integration seam. Its acknowledgement does not
by itself prove encrypted immutable B2 storage, writer restrictions or fresh
restore checkpoints. Those external controls and a real isolated provider
recovery rehearsal remain required launch evidence (N4); the restore CLI stays
closed without its real reader/target integration. Backups expire under their
separate rotation policy and replay deletions before reopening; do not promise
instant removal of every historical backup or processor copy.
