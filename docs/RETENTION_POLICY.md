# Customer-data retention and deletion

**Owner-confirmed policy, 21 October 2026:** retain customer records and accepted
identity documents until the customer requests deletion. There is no automatic
six-month period or deadline triggered by order completion. This replaces the
previous proposed timed-retention rule (OPEN_INPUTS #10/#16).

Customer requests use the audited staff workflow in
[RUNBOOKS/data-deletion.md](RUNBOOKS/data-deletion.md), subject to applicable legal
retention obligations. The complete cross-copy deletion implementation is tracked
by C3; recording this policy does not claim that the existing action already
removes every document/email copy.

| Category                                                                                             | Retention rule                                                                              | Deletion handling                                                                              |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Customer contact, order form/consent, saved drafts, notes, amendments, change requests and reminders | Retain until customer requests deletion                                                     | Audited customer-data deletion across every linked active-system copy                          |
| Accepted identity documents and their revisions                                                      | Retain until customer requests deletion                                                     | Restrict access immediately; durable physical cleanup after deletion-ledger acknowledgement    |
| Wish-list contacts, email records and follow-up schedules                                            | Retain until customer requests deletion                                                     | Remove linked personal records and stop sending; unsubscribe also stops marketing immediately  |
| Personal audit before/after values and queued job payloads                                           | Retain until customer requests deletion                                                     | Scrub personal values while retaining minimal operational/audit evidence                       |
| Minimal commercial records and audit metadata                                                        | Keep only permitted non-personal or legally required remnants                               | Customer deletion must not preserve unnecessary personal copies                                |
| Minimal deletion/suppression ledger evidence                                                         | Retain to prevent restored backups from reopening deleted data or resuming suppressed sends | Independent recovery ledger; no deleted personal content                                       |
| Invalid, rejected or unfinished upload objects; access tokens; local preview caches                  | Existing technical expiry/cleanup, distinct from accepted customer records                  | Security and temporary-cache cleanup; never use these timers to delete accepted live documents |
| Backups and independent archive                                                                      | Existing baseline: 30 daily and 12 monthly recovery points                                  | Separate manifest-aware rotation; replay customer deletions before a restore reopens           |

## Operational boundaries

- No new timed deletion job is authorized for retained customer records. Order
  completion and contact about a wish list do not independently authorize deletion.
- A customer request restricts active access/sending immediately. Cleanup is
  durable, audited and acknowledged by the independent ledger before completion.
- Backup expiry and processor deletion are separate from immediate active-system
  deletion. Do not promise instant removal of every historical backup copy.
- Document storage remains private. The database/backend currently run in the
  United States; record actual provider regions accurately in the privacy policy.
- Staff must not copy the customer's personal data into a deletion reason or audit
  metadata. Record the request and reason without recreating the deleted content.
