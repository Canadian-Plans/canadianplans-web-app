# RUNBOOKS

Handover documents for operating Canadian Plans in production. Each names
required access, a safe stopping point, how to verify success, and an
escalation owner — always the owner (Takib); there is no one else to
escalate to (PLATFORM_CONTEXT.md "Who decides").

Runbooks are added as their tasks land. The A0 restore spike documents the
provider-supported procedure and open production checks; it is not a passed
production recovery rehearsal.

| Runbook | Added by |
|---|---|
| [Staff onboarding and removal](staff-onboarding-removal.md) | T5 |
| [CMS publishing and price-error handling](cms-publishing-and-price-error.md) (mechanism: [catalogue-sync.md](catalogue-sync.md)) | T9/T10 |
| [Order submission integrity and retry handling](orders.md) | T12 |
| [Outbox jobs](outbox-jobs.md) | T15 |
| [Customer-data deletion](data-deletion.md) | T21 |
| [Failed-email recovery](failed-email-recovery.md) | T18 |
| [Dispatch and activation](dispatch-and-activation.md) | T14/T19 |
| [Commission and invoice month-end](commission-month-end.md) | T19 |
| [Web security headers, CSRF and SameSite](web-security-headers.md) | REQ 37 / gate 12 |
| [Observability and alerts (logging, error tracker, synthetic check, owner alerts)](alerts.md) | REQ 40 |
| [Backup alert response](backup-alert-response.md) (mechanism: [alerts.md](alerts.md)) | T24/T25 |
| [Full restore (A0 spike; production gate open)](restore.md) | T4R, completed by T24 |
| Workspace provisioning | T4/T4P |
| Export/import | Phase B (see PLATFORM_CONTEXT.md §6) |
| [Credential rotation](secret-rotation.md) | T25/T26 |
| [Release rollback](release-rollback.md) | T1 CI/Vercel setup, expanded post-Railway-cutover |
| [Monthly cost review](monthly-cost-review.md) | T28 |

