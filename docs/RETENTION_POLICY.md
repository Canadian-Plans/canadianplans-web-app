# RETENTION_POLICY.md

Owner-approved retention periods by data category. **All values below are
labelled TEST placeholders** for OPEN_INPUTS #10 (document retention) and #16
(retention by category); none is a business decision until the owner records it
in [OPEN_INPUTS.md](OPEN_INPUTS.md). Deletion of live records is the audited
staff action in [RUNBOOKS/data-deletion.md](RUNBOOKS/data-deletion.md); backup
expiry and processor deletion are handled by the backup/retention tooling
(T24), separately from immediate active-system deletion.

| Category                                                                   | TEST placeholder                                                           | Applied by                                                     |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Live order + minimal commercial record (`reference`, `snapshot`)           | Keep while the order is active, then indefinitely as the commercial record | Never auto-deleted; REQ 24 keeps the minimal commercial record |
| Lead contact + form (`leads.full_name/email/phone/country_code/payload`)   | Delete on the audited customer-data deletion request                       | T21 `deleteCustomerData`                                       |
| Order payload / consent / notes / amendments / change requests / reminders | Delete on the audited customer-data deletion request                       | T21 `deleteCustomerData`                                       |
| Audit `before`/`after` personal values                                     | Scrubbed on deletion; the audit row (actor, action, time) is kept          | T21 `deleteCustomerData`                                       |
| Outbox job payloads referencing the order/lead                             | Scrubbed on deletion; the job row is kept                                  | T21 `deleteCustomerData`                                       |
| Abandoned drafts (never submitted)                                         | TBD — owner input #16                                                      | Not yet automated                                              |
| File revisions / rejected uploads (R2)                                     | TBD — owner input #16                                                      | T17 seam (not on this branch)                                  |
| Email records / follow-up schedules                                        | TBD — owner input #16                                                      | T18 seam (not on this branch)                                  |
| Deletion ledger events                                                     | Append-only; retained per owner input #16                                  | §13 ledger (T4R/T24)                                           |
| Backups and independent archive                                            | 30 daily + 12 monthly points                                               | T24 backup/retention tooling                                   |

## Notes

- **Cross-border processing.** The database and application functions are
  intended for a Canadian region; the actual regions of the selected email
  provider and R2 are recorded and reflected in the privacy policy, never
  promised as Canada-only (REQ 34).
- **No instant historical erasure.** Immediate active-system deletion does not
  promise erasure of every historical archive; a restore replays the deletion
  ledger before reopening (REQ 24, IMPLEMENTATION_PLAN §13).
- **Staff reasons.** A deletion reason is recorded for the audit and the local
  ledger intent; staff must not type the customer's personal data into it.

Replace each `TBD` and confirm the placeholders with the owner before launch.
