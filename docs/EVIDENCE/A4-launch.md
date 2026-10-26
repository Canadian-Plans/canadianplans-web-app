# A4 production test order evidence (launch item 5.2)

Date: 2026-10-25 (tracking re-check 2026-10-26). Times are UTC.

## Result

A controlled, non-billable order went through the live production stack end to end:
storefront submit → acknowledgement email → admin → document approved → Ready for
delivery → cancelled. Nothing was sent to Rogers, no payment was taken, and dispatch
and activation were not touched (they stay behind the opt-in switch, OPEN_INPUTS #15).

The run found and fixed one launch blocker (document uploads, below) and surfaced
four follow-ups.

## The order

| Field | Value |
| --- | --- |
| Reference | `CP-9YUMTFF_BCFQNDIU` |
| Site | https://canadianplans.com/order (site-1 on Vercel, backend on Railway) |
| Plan | 5G+ Complete 100 GB, $55.00/month, eSIM, new number |
| Customer | "Test Order Do Not Fulfil", `info@canadianplans.com`, the business phone, the business address in Surrey |
| Document | `SAMPLE-not-a-real-ID.pdf`, a blank sample PDF, not a real ID |
| Placed by | Claude in the owner's Chrome; the owner ticked the Turnstile check |

## Steps and what was observed

| Step | Observed | Source |
| --- | --- | --- |
| Document upload | First two attempts failed: the browser's CORS preflight to R2 got 403. Fixed by adding the bucket CORS policy (below); the third attempt showed "Uploaded… Verified". | Browser network log; Cloudflare dashboard confirmation |
| Submit | Order saved as `CP-9YUMTFF_BCFQNDIU` (~11:46). | Storefront confirmation step |
| Acknowledgement email | "We received your order CP-9YUMTFF_BCFQNDIU" arrived in info@ at 11:46 from `orders@canadianplans.com`; reference, tracking link and contact details correct. (Domain authentication was checked separately on an earlier email, item 3.2.) | Owner's inbox screenshot |
| Admin order page | Snapshot correct: 100 GB plan, $55.00/month, $0.00 payable today, no payment required, government ID required, terms version v2. | apex.canadianplans.com, owner signed in with MFA |
| Approve document | Owner approved "government id, Verified, rev 3"; order moved Submitted → In progress at 14:11, version 2, owner as actor. | Admin order history |
| Ready for delivery | Owner moved it to Ready for delivery; the move is only allowed once the required document is approved, and that rule held. | Admin order history |
| Cancel | Owner cancelled with reason "test" at 14:12. | Admin order history |
| Background jobs | Two analytics jobs (lead saved, order submitted) failed with `provider_not_configured` and set off two "failed job queue is not draining" owner alerts (alerts proven, item 4.3). After Umami was configured (item 6.2) both were retried from admin and succeeded; the jobs page showed "No failed jobs". | Owner alert emails; admin Settings → Jobs |
| Customer tracking | Re-checked on 2026-10-26 after PR #34 (email-only tracking, merge `252f9a6`, migration 0027) went live: `/track` asks for the email only. The owner requested a code in their own browser and reported the flow working ("all good for now"). Claude did not see the order list itself, because Turnstile fails in the in-app browser pane (error 600010). | Live page; owner report |

## Fix made during the run

- **R2 CORS policy on `canadian-plans-data`.** The policy was missing, so every
  mobile-plan order, all of which need an ID upload, would have failed at the documents step.
  It now allows origins `https://canadianplans.com` and `https://apex.canadianplans.com`,
  methods `PUT` and `GET`, header `content-type`, exposes `ETag`, and has max age 3600.
  The successful upload also proved the rotated R2 key from item 4.0.

## Follow-ups found

1. **Credit-check consent version** is recorded as `TEST-credit-check-v1`. It needs final
   wording and a real version before launch, alongside item 2.10.
2. **R2 bucket region is APAC.** The privacy policy must state where uploaded documents
   are stored (item 2.10).
3. **Stuck upload revisions.** Revisions 1 and 2 from the failed attempts stay on the
   order as "Uploading". The hourly cleanup should expire them; a retrying customer
   leaves the same clutter.
4. **Turnstile reset error on `/track`.** When the check fails, the form calls reset on
   a widget that is gone ("Nothing to reset found for provided container"). Customers
   see nothing wrong.

## Not done

- **Archive order** on `CP-9YUMTFF_BCFQNDIU` in admin. The order is cancelled; archiving
  only hides it from the active list.
