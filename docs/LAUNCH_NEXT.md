# LAUNCH_NEXT — from "orders work" to marketing the site

Written 2026-11-26 at the end of a session, as the plan for the next one. Start
here, then [STOREFRONT_ONLY.md](STOREFRONT_ONLY.md) for how the storefront and
the CRM fit together. Tick items here as they close; keep it short.

**Who:** **Owner** = an account action or a decision only the owner can take ·
**Claude** = a session can do it · **Both** = Claude prepares, the owner approves
or clicks.

## Where things stand (verified 2026-11-26)

| Area                                                          | State                                                                                                                                                                                  |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storefront (`main` at `f3d6dfa`, PR #40)                      | Live on canadianplans.com. Commercial pages and guides indexable; the sitemap lists 42 URLs. `/order`, `/track` and business pages stay `noindex`.                                     |
| CRM backend (`canadianplans-crm` `main` at `ca6d5cb`, PR #12) | Live on Railway, health `ok`. Keeps the storefront's landing pages in lead attribution.                                                                                                |
| Orders end to end                                             | One test order of each kind (SIM `MS-1`, internet, mobile) went from the live site into the CRM; each sent its Order received email; `/track` codes were sent.                         |
| Campaign tracking                                             | Recorded from any landing page (session cookie `cp_campaign`, `src/proxy.ts`) and carried through the order form. Checked on live orders: `/order`, `/home-internet`, `/mobile-plans`. |
| Email                                                         | Settings → Email saved with Site URL `https://canadianplans.com`. Automation **Order received** is on; the other five built-in flows are off.                                          |
| Legal                                                         | Privacy policy v3 (campaign cookie disclosure) live and recorded as `privacy-2026-11-v3`; terms v2.                                                                                    |
| Production clean-up                                           | 11 unused old-platform variables removed from the Railway `backend` service; the Supabase function `crm-migrate-once` is gone.                                                         |
| Backups                                                       | **None.** The owner chose on 2026-11-26 to leave this as it is (risk accepted).                                                                                                        |

## Next steps, in order

### 1. Finish the test-order round _(Owner, 5 min)_

- ☐ Confirm `/track` listed all three test orders for the test email.
- ☐ Archive the three test orders in the CRM admin (Leads → each order's menu,
  or the toolbar's bulk archive) so they stay out of reports.

### 2. Search engines _(Owner, 10 min; Claude can check afterwards)_

- ☐ Google Search Console: add the **Domain** property `canadianplans.com`,
  verify with the TXT record in Cloudflare DNS, submit `sitemap.xml`, and
  request indexing of `https://canadianplans.com/`.
- ☐ Bing Webmaster Tools: **Import from Google Search Console**.
- Done when both show the sitemap as read without errors.

### 3. Credit-check consent text _(Both, 15 min)_

Mobile orders still record the placeholder version `TEST-credit-check-v1`
(`apps/site-1/src/site.config.ts`, `legal.creditCheckConsentVersion`).

- ☐ Claude shows the owner the consent text the mobile form displays (the copy
  lives in `apps/site-1/content/order-forms.ts`).
- ☐ The owner approves it as written or gives new wording.
- ☐ Claude sets a real version (for example `credit-check-2026-11-v1`), updates
  the tests that name the version, runs unit and browser tests, opens a PR.

### 4. Resend delivery reports _(Both, 15 min)_

Resend posts delivery and bounce events to the backend, which refuses them
(`401` on `/api/v1/webhooks/resend/:selector`) because `MACHINE_REGISTRY_JSON`
on Railway has no Resend webhook entry. Emails still send; bounces and
deliveries are just not recorded on the lead.

- ☐ Owner: in the Canadian Plans Resend account, open the webhook that points at
  the backend and copy its signing secret into the password manager.
- ☐ Claude: add the webhook entry to `MACHINE_REGISTRY_JSON` (format in the CRM's
  `docs/ENV.md`); the owner pastes the secret on Railway, never in chat.
- Done when a new email's delivery shows on its lead and the log has no `401`.

### 5. Rename the Railway project _(Owner, 1 min)_

- ☐ Railway → project **plans-backend** → Settings → name `Canadian Plans`.
  No tool available to sessions can rename a project. Nothing refers to the
  name, only to its id.

### 6. Launch posts _(Both)_

- ☐ Owner reviews `docs/marketing/launch-posts.md` (links and prices were
  checked against the live site on 2026-11-26).
- ☐ Post them. Each channel's link already carries its `utm_*` tags; leads show
  the source in the CRM.
- Optional: Claude writes more posts or campaign variants, and a weekly check of
  leads by source.

### 7. Before real orders arrive _(Owner)_

- ☐ SIM stock, packaging and a courier account (LAUNCH_CHECKLIST 5.4).
- ☐ Walk the order runbooks once in the real admin (LAUNCH_CHECKLIST 5.3).
- ☐ Decide which other built-in automations to switch on (Information needed,
  Dispatched, Activated, Cancelled): CRM admin → Automations.

### 8. Can wait

- ☐ Lawyer's reply on terms v2 and privacy v3 (OPEN_INPUTS #24).
- ☐ Branded covers for the 10 guides still on a placeholder
  (`apps/site-1/content/guide-covers.ts`).
- ☐ Backups: revisit before the customer base grows (CRM
  `docs/RUNBOOKS/backup.md`). Until then a database loss cannot be undone.
- ☐ CRM: 7 Ask AI tests in `apps/backend/tests/ai-chat-stream.test.ts` fail
  locally on `main` (CI's `verify` passed); look at them when Ask AI is switched
  on.

## Useful facts for the next session

- Supabase project `canadianplans` (`ixbhodlvfyxjctpsjibj`); the site's
  workspace id is `60942550-3167-41dd-9256-c712cd8a7bc5`. Read-only SQL against
  `app.leads`, `app.email_messages`, `app.outbox_jobs` and `app.automations`
  answers most "did it work?" questions without opening the admin.
- Railway project `plans-backend` (`1735e61b-ca5f-4a21-88ad-480e5bfd2616`),
  service `backend` (`39140e07-670e-4529-945d-37764ccfd0c8`).
- The CRM's built-in automations are created the first time someone opens
  Automations in the admin, and every one starts off.
- The Resend account connected to cloud sessions is not the Canadian Plans one;
  check Canadian Plans email in the database (`app.email_messages`) instead.
