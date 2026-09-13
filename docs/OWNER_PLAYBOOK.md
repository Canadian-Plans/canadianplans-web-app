# OWNER_PLAYBOOK.md — How Takib runs this build

Updated 14 September 2026. Launch one SIM storefront, backend and admin first. Preserve the full Phase A scope and move the date until the gates pass. The previous September 30 calendar and automatic scope cuts are superseded.

## 1. Your job and the AI's job

| Owner | AI |
|---|---|
| Supply business rules, account access and MFA | Build code, migrations, tests, configuration and documentation |
| Decide provider purchases and production releases | Prepare setup and verify authorized non-production integrations |
| Review explanations and evidence for sensitive changes | Explain data/access changes and show negative tests |
| Try customer/staff workflows and report problems | Diagnose and fix defects, repeat the relevant checks |
| Receive incident alerts and direct recovery | Use tested diagnostics and runbooks; do not assume unattended availability |

The owner is the sole production deployer. AI maintenance does not remove provider approvals, billing decisions or the need for accessible recovery credentials.

## 2. Start with T0 and T1

1. Create the private repository and preserve the eight planning files at its root. Implementation artifacts go under docs/. Read PLATFORM_CONTEXT.md, then the relevant task.
2. Use local development and eligible free services. Set up Vercel Pro before commercial hosting or deployed minute-level cron tests. Budget production Supabase Pro. Staging uses either an eligible separate Free organization or an additional paid project.
3. Start domain/DNS verification, the conditional SES production-access request, Auth SMTP configuration, R2 test storage and the separate B2 recovery account early. Record pending approvals; do not wait until launch day.
4. Store secrets in a password manager and isolated environment settings, not chats or source files. Recovery decryption material and restore access must remain available independently of production.
5. Fill OPEN_INPUTS.md as information becomes available. TEST placeholders let development continue; they cannot authorize real prices, dispatch, activation or payouts.

## 3. Build sequence

Use the explicit dependency order in BUILD_TASKS.md, not ascending task numbers.

| Stage | Tasks | Evidence you inspect |
|---|---|---|
| Foundation | T0–T4, T4R, T5–T8 | App boundaries, isolated workspaces, identity access and early recovery feasibility |
| First order | T9, T4P, T10A, T11, T10, T12, T15, T10B, T13–T16 | One synthetic order in admin; retry returns the same order; fake email failure loses no order |
| Complete operations | T17–T23 | Protected documents, verified email, atomic activation/commission, tracking, privacy and deletion |
| Launch readiness | T24–T27 | Full encrypted restore, alerts, burst tests, access checks and usable runbooks |
| Stabilize and launch | Retest after meaningful fixes, then T28 | All REQUIREMENTS §16 gates 1–14 and applicable real inputs complete |

The first slice can use synthetic offers without document requirements. It is not launch-ready until document enforcement, partnered activation and the rest of Phase A are complete. Record an updated forecast after each gate; rough task-day estimates are not promises.

## 4. Session routine

1. Select the next unblocked task and read its completion criteria.
2. Let AI state assumptions, scope and missing inputs; resolve business decisions you know and record the rest.
3. Inspect test evidence and try the changed customer/staff flow.
4. Close the task only when its stated checks pass; a synthetic test is not provider production approval.
5. Save code and docs together in version control once the repository exists. Update external trackers only when you explicitly request it.

## 5. What to review

For changes to schema, authentication or permissions, ask for a plain-language explanation and the matching failure tests.

- Tenant business tables have workspace ownership and composite parent references. Global identities and the workspace registry are documented exceptions.
- Ordinary requests require tenant context; verified staff, website and machine bootstrap paths are narrowly scoped.
- Frontends never connect to the DB. Storefront servers may hold only their own backend credential; browsers never receive it.
- Runtime permissions cannot bypass RLS. Dedicated offline migration/backup/restore tooling is separately authorized.
- Retrying a committed order returns the same result; uploaded bytes checked are exactly the bytes staff download.
- Activation and commission commit together; incomplete business configuration blocks the real transition.
- Staging/preview resources are isolated, and an additive backend change remains compatible with existing frontends.

A review or test that finds a defect is a reason to fix and retest, not waive the gate.

## 6. When work takes longer

Preserve full Phase A and move the launch forecast. Split oversized tasks or move polish later within Phase A. Moving a promised launch feature to Phase B requires a new owner decision; there are no automatic cuts.

Prepare the first working order slice early so design problems become visible before all screens are built. Reserve a stabilization interval after the final substantive change. Never skip isolation, safe submission, document authorization, MFA, encrypted backups or the full restore rehearsal.

## 7. Cost and open-input check

Use REQUIREMENTS §15 as the cost source. Record actual plan selections and quotas during provisioning; include staging, email, archives, monitoring and usage rather than only hosting/database fees. Raise upgrade needs before quotas disrupt operations. Prefer upgrades and tuning over technology migration.

Review business inputs before their dependent task. Real plan/pricing, document/payment conditions, transition rules and commission settings remain owner decisions.

## 8. Standard recovery and after launch

Baseline: managed daily DB backups, independent encrypted daily DB/Auth/document/content archives, separate deletion/suppression ledger, independent alerts and a tested restore. Exact acceptable loss, downtime and overnight response remain deferred in OPEN_INPUTS R1–R3. No zero-loss or fixed-hour recovery promise has been made.

- Inspect failed jobs, backup age and error alerts regularly.
- Follow the recovery runbook when integrity is uncertain; pause new orders rather than falsely confirm them.
- Rehearse a complete restore before launch, monthly thereafter, and after material recovery/schema changes.
- Review provider charges, quotas and runbooks as usage grows.
- Phase A records earned/carrier-paid commission. Partner payout marking remains disabled until approved-invoice support or an explicitly approved interim workflow exists.
- Add Phase B websites and features deliberately after launch; the initial release creates only one real storefront.
