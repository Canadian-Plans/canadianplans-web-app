# Customer-data deletion

Task: T21 (REQ 24 / REQ 34). Purpose: remove or restrict a customer's personal
data across every copy in the active system while keeping the minimal commercial
record, and publish a durable deletion event to the independent ledger.

**Escalation owner:** Takib. **Required access:** a staff session with the
`deletion` permission (Owner/Finance need a verified `aal2` MFA session; a deny
override always wins).

## What the action does

`POST /api/v1/staff/workspaces/{workspaceId}/orders/{orderId}/deletion` with
`{ "reason": "..." }` runs in one transaction and:

1. Clears the order `payload` and `consent`; **keeps** `reference` and the
   commercial `snapshot`.
2. Clears the lead's `full_name`, `email`, `phone`, `country_code` and `payload`.
3. Deletes the order's notes, amendments, change requests and reminders
   (scheduled follow-ups stop immediately).
4. Nulls the `before`/`after` values on the order's and lead's audit rows, keeping
   actor, action and time.
5. Scrubs outbox job payloads that referenced the order or lead; the job rows remain.
6. Writes an audit row `order.customer_data_deleted` (actor + staff reason, no
   deleted personal data) and a local **deletion intent** (identifiers + action
   only), then queues a `deletion_ledger_publish` outbox job.

The response is `202` with the `deletionId` and `ledgerStatus:
"pending_acknowledgement"`.

## Ledger protocol (IMPLEMENTATION_PLAN §13)

The deletion is not complete until the independent ledger acknowledges it:

1. **Commit intent + restrict** — the transaction above. Access/sending stops now.
2. **Publish after commit** — the outbox handler posts the encrypted event
   (logical id = `deletionId`) to the ledger; a retry republishes the same id.
3. **Acknowledge** — on a durable provider acknowledgement the local intent moves
   to `acknowledged` and records `ledger_ack_id`.
4. **Fail closed** — an unavailable or unconfigured ledger leaves the intent
   `failed`/`pending` and the job failed/retrying; it is never reported complete.
   Surface these in the admin jobs view.

Repeated jobs are idempotent: the ledger object key is the logical event id, so a
retry overwrites rather than duplicates.

## Verify

1. Order detail shows the reference and snapshot; the contact/form fields are gone.
2. Query `app.deletion_intents` for the order: `status = 'acknowledged'` and
   `ledger_ack_id` is set once the ledger is reachable.
3. The order's audit timeline still shows who did what when, with no personal
   values in `before`/`after`.

## Safe stopping point

After step 1 (the transaction) the personal data is already restricted; the
ledger publish is safe to leave pending and retry. Do not re-run the deletion to
"fix" a pending ledger — it is idempotent, so re-running only re-queues.

## Seams (not yet on this branch)

The T21 spec also lists **file revisions** (T17) and **email records,
suppressions and follow-up schedules** (T18). Those tables/modules are not
present on this branch, so they are not scrubbed here. When T17/T18 land, extend
`deleteCustomerData` to delete the file objects/revisions, remove the email
records, stop the follow-up schedules and write the contact suppression, and add
the suppression event to the same ledger intent.
