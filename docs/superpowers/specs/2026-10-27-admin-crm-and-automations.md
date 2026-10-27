# Admin CRM refresh and automations — decisions and roadmap

Status: **approved by the owner on 27 October 2026**; Phase 1 in progress.
Owner: Takib · Written by an AI session after a one-question-at-a-time interview.

The owner asked for the staff admin (`apps/admin`, apex.canadianplans.com) to look
and work like the open-source CRM **Twenty**, and for a Twenty-style automation
builder on Canadian Plans' own backend. This file records every decision from the
interview, the limits that come from `PLATFORM_CONTEXT.md`, and the phased
roadmap. The detailed build plan for each phase lives beside it in
`docs/superpowers/plans/`.

Reference source studied: `H:\twenty` (Twenty commit f834323, twenty-ui 2.52.0),
UI layer only. Findings: the shared session-notes file
`twenty-crm-admin-findings.md`.

## 1. Owner decisions (27 October 2026)

| #   | Question                            | Decision                                                                                                                                                                                                               |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | What "like Twenty" means            | **All of:** the look, saved views, records opening in a side panel, and a board (kanban) view.                                                                                                                         |
| 2   | Which screen first                  | **Orders** (list, then the order page). Other screens follow the same pattern later.                                                                                                                                   |
| 3   | Light or dark                       | **Dark only**, as today, with Twenty's layout, spacing and dark greys.                                                                                                                                                 |
| 4   | Twenty's licence                    | **Rebuild, don't copy.** No Twenty source enters this repo (see §3).                                                                                                                                                   |
| 5   | Who sees a saved view               | **Private only**: each staff member sees only the views they made. Stored on the server.                                                                                                                               |
| 6   | Dragging a card on the board        | **Moves straight away.** Dispatch, Activate and Cancel still open their forms because they need details. Disallowed moves are refused.                                                                                 |
| 7   | Where automations live              | **Built into our own admin and backend now.** Replaces "n8n, Phase B only" for internal automations; n8n stays possible later for outside connections. Needs ADR 0006.                                                 |
| 8   | Which automations                   | A **general builder like Twenty's** (trigger, conditions, actions) so the owner can automate anything allowed. First uses: **reminder alerts**, **owner alerts**, **customer follow-ups**. Auto-assign not needed yet. |
| 9   | Approving customer emails           | **Approve once, then automatic.** Switching on an automation that emails customers shows a preview and needs the 2-step (aal2) login; after that it sends by itself.                                                   |
| 10  | May automations change order status | **Any allowed status**, including Dispatched, Activated and Cancelled (the owner accepted the risk). The same rules as a person apply (see §2).                                                                        |
| 11  | Outside apps (HTTP, webhooks, code) | **Later, not in this build.** Each future connection goes on an approved list with a privacy-policy update. Custom code stays off.                                                                                     |
| 12  | Who writes automation email text    | **Both**: starter emails supplied, and the owner can write or edit subject and body in the admin with fill-ins such as `{first name}` and `{order number}`. Plain text.                                                |
| 13  | Automation editor                   | **Full canvas like Twenty** (zoomable, boxes can be moved, "tidy up").                                                                                                                                                 |
| 14  | Who can build automations           | **Owner plus chosen staff** via a new "Manage automations" permission. Switching on always needs aal2. Everyone else can view automations and runs.                                                                    |
| 15  | What to build first                 | **Orders list redesign** (Phase 1).                                                                                                                                                                                    |
| 16  | Phone use                           | **Computer first, phone usable.** Table becomes a list, the side panel goes full-screen, the board scrolls sideways, and the canvas is view-only on a phone.                                                           |

## 2. Limits that come from the platform rules (not up for change here)

These follow from `PLATFORM_CONTEXT.md` §4 and shape every phase:

- **Admin stays an API client** (invariant 3). Views, filters, sorting and
  automations are stored and enforced by the backend; the browser holds no
  business rules (allowed moves come from the backend's `allowedTransitions`).
- **Status changes, by a person, a board drag or an automation, go only through
  the existing transition service** with `expectedVersion`. It applies the allowed-move
  map, document prerequisites, the `ORDER_OPERATIONAL_TRANSITIONS` switch and
  commission-on-activation exactly once (invariants 9, 10). An automation that
  dispatches, activates or cancels must carry the same details a person enters
  (courier and tracking, activation details, cancel reason) in its step settings.
- **Every write is audited** (invariant 11). Automation writes are recorded with
  actor label `automation`, the automation and run id, and the staff member who
  switched it on.
- **Emails and other external effects go through the outbox** in the same
  transaction (invariant 7), so an automation never sends from inside a database
  transaction and retries never double-send (dedupe keys).
- **Customer emails from automations are transactional order emails only.** Suppression
  and "customer data restricted" checks apply; marketing content needs the
  existing marketing-consent check. The built-in emails that already go out
  (order received, awaiting customer, dispatched, activated, cancelled) stay as
  they are, and an automation cannot send a second email for the same status
  change on the same order.
- **No personal data in URLs, logs or run history** (invariant 12). Saved views
  never store the free-text search box (it can hold names, emails or phones), and
  view state is not placed in the URL beyond a view id. Run history stores ids
  and references, not names or emails.
- **Workspaces stay isolated** (invariants 1, 2): every new table carries
  `workspace_id`, composite keys and an RLS policy; private views are also limited
  to their owner in the RLS policy.
- **Not included at all** (owner may revisit later): deleting records, recording
  payments, changing commissions or payouts, outside HTTP/webhooks, custom code,
  AI steps.

## 3. Licence position

- Twenty's app UI (`packages/twenty-front`: shell, sidebar, side panel, tables,
  board, views, filters, record page, workflow editor) is **AGPL-3.0**. The admin
  is a network service, so copying it would oblige publishing the admin's source.
- `twenty-ui` and `twenty-shared` are **MIT**, but they are built with
  Linaria/SCSS, not Tailwind/shadcn, so only measurements and patterns are reused.
- 56 files in twenty-front carry a commercial "@license Enterprise" header
  (roles, security, SSO, row-level permissions); none are in the areas studied.
- **Rule for every phase:** no file, function or stylesheet is copied from
  `H:\twenty`. Reviewers reject a diff that contains Twenty code. Measurements
  (13px base text, 32px rows, 48px headers, 220px sidebar, greys) and interaction
  patterns are re-implemented with shadcn, Tailwind and lucide icons.
- The canvas editor (Phase 4) uses `@xyflow/react` (MIT), the same diagram
  library Twenty uses, added as a normal dependency, not copied from Twenty.

## 4. Roadmap

Each phase is one branch and one pull request with passing tests. Nothing is
deployed without the owner's OK.

### Phase 1: Orders list in the Twenty style (this pass)

- Admin-only dark theme matching Twenty's dark greys and indigo accent, plus a
  Twenty-style frame: slim sidebar, 48px page header, flush main panel. All admin
  screens pick up the new frame and colours. Only the Orders list gets the new
  layout inside.
- Orders table: 32px rows, icon column headers, sticky reference column,
  checkbox column, selection actions in the header (bulk assign).
- View bar: view switcher with counts; Filter, Sort and Options menus; filter and
  sort chips; Reset, Update view, Save as new view.
- Sorting by submitted date, last updated, reference or status (backend).
- Private saved views stored on the server (new table, API, audit).
- Clicking an order opens it in a right-hand side panel; "Open full page" keeps
  the existing page.
- Phone: list instead of table, full-screen side panel.

### Phase 2: Board view and the order page

- Board view as a saved-view type: columns by status with counts, cards, drag
  moves immediately through the transition service, and dispatch/activate/cancel
  forms on drop.
- Order page in the Twenty record layout: header with breadcrumb, a left field
  panel, and tabs (Timeline, Notes and reminders, Documents, Payment, Requests).
- Staff display names, so assignees show a name instead of an id fragment.

### Phase 3: Automation engine (backend)

- ADR 0006 implemented. New tables: automations, automation versions (draft,
  active, deactivated), automation runs and run steps, with workspace isolation.
- Triggers: order created; order status changed (from/to); order assigned,
  archived or payment state changed; document uploaded or reviewed; change
  request created; info request answered; lead created; reminder due; schedule
  (every day at a time, or every N hours); manual (button on an order or a selection).
- Conditions: filter and if/else on order fields and "time in current status".
- Actions: email staff (owner, assignee or chosen staff); email customer;
  change status; assign or unassign; add note; set reminder; archive or restore;
  wait (delay); find orders (for scheduled checks).
- Runs on the existing outbox and in-process scheduler. Safety: workspace
  master switch, deployment kill switch, loop guard (automations triggered by
  automations stop at depth 3), step cap per run, daily email cap per workspace,
  dedupe keys, and every action audited.
- First built-in use: **reminder alerts** (an order reminder coming due emails the
  staff member who set it).

### Phase 4: Automation editor (admin)

- Automations list (name, status, last run, last updated).
- Full canvas editor with `@xyflow/react`: a trigger box, step boxes, "+" to add
  steps, if/else branches, "tidy up". Step settings open in the side panel, with
  an `{x}` fill-in picker for values from earlier steps.
- Draft, Active and Deactivated versions. Switching on needs aal2, a test run
  ("what would happen for order CP-…"), and an email preview.
- Runs list and run detail with per-step status.
- New permission "Manage automations" (owner by default; grantable).

### Phase 5: Emails and starter automations

- Owner-editable subject and body with fill-ins, plus starter emails.
- Starter automations ready to switch on: new order alert; order waiting for the
  customer 3+ days (owner alert); "we still need your documents" follow-up after
  2 days; a customer note on In progress and on Ready for delivery.

### Phase 6: The other screens

- Leads, partners, documents, reports and settings moved onto the same table, view
  bar and side panel. Optional Ctrl/Cmd+K command menu.

### Later (not in this build)

- Outside connections (HTTP requests, incoming webhooks) on an approved list with
  a privacy-policy update; n8n remains an option for these.

## 5. Records to update when phases land

- `docs/ADR/0006-in-app-automations.md` (Phase 1 records the decision; Phase 3
  implements it) and the automation rows in `PLATFORM_CONTEXT.md` §3 and §6.
- `docs/OPEN_INPUTS.md`: decisions 7–14 above as resolved owner decisions.
- `docs/SCHEMA_HISTORY.md`, `docs/API.md` / `docs/api/openapi.json` per phase.
