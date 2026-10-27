# Admin CRM Phase 1: Orders list in the Twenty style — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin Orders list as a Twenty-style CRM index: dark Twenty frame, dense table, view bar with filter/sort chips, private saved views stored on the server, backend sorting, and orders opening in a side panel.

**Architecture:** The backend gains a sort option on the existing orders list and a new `saved_views` tenant table with CRUD routes (audited, RLS limited to the owning actor). The admin keeps fetching through `@canadian-plans/contracts`; a pure view-state module turns a saved view plus draft edits into the list query, and presentational CRM components (page header, view bar, side panel) are reusable by later phases.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, shadcn primitives in `@canadian-plans/ui` (radix-ui umbrella), lucide-react, Express, Drizzle, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-admin-crm-and-automations.md` (owner decisions 1–6, 15, 16 and §2–§3 apply to this phase).

## Global Constraints

- No file, function or stylesheet copied from `H:\twenty`. Only measurements and patterns (spec §3).
- Admin is dark-only; the Twenty dark palette is applied in `apps/admin` only. `packages/ui/src/styles/tokens.css` is not changed, so storefronts are untouched.
- Twenty measurements: text 13px (labels 12px, section titles 11px semibold), table rows and header 32px, page header 48px, sidebar 220px, side panel 560px (desktop), radius 4px for chips/cells, 8px for menus/buttons.
- Twenty dark colours (sRGB approximations of Twenty's display-p3 values): background #171717, raised #1B1B1B, hover/tertiary #1D1D1D, quaternary #222222; borders strong #484848, medium #222222; text primary #EBEBEB, secondary #B3B3B3, tertiary #818181, light #666666; accent indigo #4A63D6, accent tint #1B2447, accent text #A1B0FF; hover fill white 6%.
- Saved views are private: only their creator lists, reads, updates or deletes them (backend check and RLS policy).
- Saved views never store the free-text search, and view state never goes into the URL beyond `?view=<uuid>` and `?order=<uuid>` (invariant 12).
- Every staff write is audited (`audit_events`), with no personal data in `before`/`after`.
- Strict TypeScript, no `any`, no unchecked `as`. Contracts own request/response types (§4a).
- Existing behaviour kept: partner page link `?partnerCode=`, bulk assign with `expectedVersion` and conflict reporting, contact search only with `canSearchContact`, existing full order page at `/w/[workspace]/orders/[id]`.
- Phone (below Tailwind `md`, 768px): table becomes a stacked list, side panel becomes a full-screen sheet.

## Review Focus

1. A saved view filters by an assignee whose membership was later revoked: the chip shows "Unknown member" and can still be removed; loading the view must not crash or 400.
2. A partner page link `/orders?partnerCode=MAPLE10` arrives: it applies as an unsaved draft filter on the default view (chip visible, Reset clears it).
3. The search box is filled when the user presses "Save as new view": the view saves without the search, and the UI says "Search is not saved in views".
4. The open order leaves the list after a filter change or bulk assign: the side panel stays on that order until closed, and closing returns focus to the table.
5. An order with restricted customer data shows "Restricted" in the table, list and side panel, never contact fields.

Each line has a test in the owning task (Tasks 5, 5, 6, 8, 7 respectively).

---

### Task 0: Record the decisions

**Files:**

- Create: `docs/ADR/0006-in-app-automations.md`
- Modify: `PLATFORM_CONTEXT.md` (§3 "Automation" row, §6 "n8n automations" row)
- Modify: `docs/OPEN_INPUTS.md` (new resolved entry for the 27 Oct 2026 decisions)
- Modify: `docs/README.md` (index the spec, plan and ADR)
- Already written: the spec and this plan

- [ ] **Step 1:** Write ADR 0006 (status Accepted, 27 Oct 2026): internal automations are built into the backend (outbox + in-process scheduler + transition service), n8n reserved for outside connections later; consequences per spec §2.
- [ ] **Step 2:** Change the §3 Automation row to "In-app automations (ADR 0006); n8n optional later for outside connections" and the §6 n8n row to point at the ADR. Add the OPEN_INPUTS entry listing spec decisions 7–14.
- [ ] **Step 3:** `pnpm run format` then `git commit -m "docs: record admin CRM and in-app automation decisions"`.

### Task 1: Backend sorting for the orders list

**Files:**

- Modify: `packages/contracts/src/workspace-orders.ts` (list query schema)
- Modify: `apps/backend/src/orders/query-store.ts` (`ListOrdersInput`, `listOrders` orderBy)
- Modify: `apps/backend/src/routes/staff.ts:680-725` (pass sort through)
- Test: `packages/contracts/tests/` (existing contracts test file for workspace orders), `apps/backend/tests/staff-orders-route.test.ts`, `apps/backend/tests/orders-query.integration.test.ts` (CI only; create if absent following `orders-transitions.integration.test.ts:11-22` skip pattern)

**Interfaces:**

- Produces: `orderSortFieldSchema = z.enum(['submittedAt', 'updatedAt', 'reference', 'status'])`, `sortDirectionSchema = z.enum(['asc', 'desc'])`, types `OrderSortField`, `SortDirection`; query fields `sortBy?: OrderSortField`, `sortDirection?: SortDirection` (defaults applied by the backend: `submittedAt`, `desc`).
- `ListOrdersInput` gains `sortBy?: OrderSortField; sortDirection?: SortDirection`.

- [ ] **Step 1: Failing tests.** Contracts: `listWorkspaceOrdersQuerySchema` accepts `{ sortBy: 'reference', sortDirection: 'asc' }` and rejects `{ sortBy: 'total' }`. Route test `passes sort options to the query store`: GET `...?sortBy=status&sortDirection=asc` → the in-memory store receives `sortBy: 'status', sortDirection: 'asc'`; GET `...?sortBy=bogus` → 400 `invalid_request`.
- [ ] **Step 2:** Run `pnpm --filter @canadian-plans/contracts test` and `pnpm --filter backend test -- staff-orders-route` → FAIL.
- [ ] **Step 3:** Implement. Order by the chosen column then `orders.id` in the same direction as a stable tie-breaker. Status sorts by the fixed lifecycle order (`submitted … activated, cancelled`) using a SQL `case` built from `orderStatuses`, not alphabetically.
- [ ] **Step 4:** Integration test (CI): three orders, `sortBy: 'reference', asc` returns them by reference; `status` follows lifecycle order.
- [ ] **Step 5:** Tests pass; `git commit -m "feat(backend): sort the staff orders list"`.

### Task 2: Private saved views (database, contracts, routes)

**Files:**

- Modify: `packages/db/src/schema.ts` (new `savedViews` table)
- Create: `packages/db/drizzle/0028_saved_views.sql` (generated, then hand-append `FORCE ROW LEVEL SECURITY` and `GRANT SELECT, INSERT, UPDATE, DELETE … TO "app_runtime"`, as in `0020_region_waitlist.sql`)
- Create: `packages/contracts/src/saved-views.ts`; export from `packages/contracts/src/index.ts`; add endpoints in `endpoints.ts`; client methods in `client.ts`
- Create: `apps/backend/src/views/store.ts`
- Modify: `apps/backend/src/routes/staff.ts` (four routes, `savedViewStore?: SavedViewStore` dependency, default wiring)
- Test: `apps/backend/tests/staff-saved-views-route.test.ts`, `apps/backend/tests/saved-views.integration.test.ts` (CI only), contracts schema test
- Docs: `docs/SCHEMA_HISTORY.md`, `docs/API.md`, regenerate `docs/api/openapi.json`

**Interfaces:**

- Table `app.saved_views`: `id uuid pk`, `workspace_id uuid not null → workspaces`, `actor_id uuid not null` (the staff user id, as in `app.actor_id`), `object text not null check in ('orders')`, `name text not null check 1–60 chars`, `state jsonb not null`, `version integer not null default 1`, `created_at`, `updated_at`. Unique `(workspace_id, id)`; unique `(workspace_id, actor_id, object, lower(name))`; index `(workspace_id, actor_id, object)`. Policy `saved_views_owner_policy` FOR ALL TO app_runtime: the tenant predicate AND `actor_id = nullif(current_setting('app.actor_id', true), '')::uuid` (USING and WITH CHECK).
- Contracts (`saved-views.ts`):
  - `savedViewObjectSchema = z.enum(['orders'])`
  - `orderViewFiltersSchema` = `listWorkspaceOrdersQuerySchema.pick({ status, paymentState, assigneeId, partnerCode, source, submittedFrom, submittedTo, archiveState })`, `.strict()` (so `search` is rejected)
  - `orderColumnKeySchema = z.enum(['customer', 'status', 'payment', 'assignee', 'source', 'submittedAt', 'total'])`
  - `orderViewStateSchema = z.object({ filters: orderViewFiltersSchema, sort: z.object({ field: orderSortFieldSchema, direction: sortDirectionSchema }), hiddenColumns: z.array(orderColumnKeySchema).max(7) }).strict()`
  - `savedViewSchema = { id, object, name, state: orderViewStateSchema, version, updatedAt }`
  - Exported types: `SavedViewObject`, `OrderViewFilters`, `OrderColumnKey`, `OrderViewState`, `SavedView`, `CreateSavedViewRequest`, `UpdateSavedViewRequest`, `ListSavedViewsResponse`, `SavedViewResponse`, `DeleteSavedViewResponse`
  - Requests: `createSavedViewRequestSchema { object, name, state }`, `updateSavedViewRequestSchema { expectedVersion, name?, state? }` (at least one of name/state)
  - Responses: `listSavedViewsResponseSchema { views, requestId }`, `savedViewResponseSchema { view, requestId }`, `deleteSavedViewResponseSchema { viewId, requestId }`
- Routes (all under `/api/v1/staff/workspaces/:workspaceId`, authorized with `workspace.read`):
  - `GET /views?object=orders` → own views, ordered by name
  - `POST /views` → 201; `409 saved_view_name_taken`; `409 saved_view_limit` above 50 per actor and object
  - `PATCH /views/:viewId` → 200; `404 saved_view_not_found` (including another actor's view); `409 version_conflict`
  - `DELETE /views/:viewId` → 200; `404 saved_view_not_found`
- `SavedViewStore` (`views/store.ts`): `list(ctx, object)`, `create(ctx, input)`, `update(ctx, viewId, input)`, `delete(ctx, viewId)` where `ctx = { workspaceId, actorId, requestId }`; outcomes are tagged unions (`{ status: 'created', view } | { status: 'name_taken' } | { status: 'limit_reached' }`, etc.). Each write inserts an `audit_events` row: `entity 'saved_view'`, actions `saved_view.created|updated|deleted`, `after: { object, version }` (no name, no filters).
- Client: `staff.listSavedViews(workspaceId, object)`, `createSavedView`, `updateSavedView(workspaceId, viewId, body)`, `deleteSavedView(workspaceId, viewId)`.

- [ ] **Step 1: Failing contract tests:** `orderViewStateSchema` rejects `filters.search`; accepts the default state `{ filters: { archiveState: 'active' }, sort: { field: 'submittedAt', direction: 'desc' }, hiddenColumns: [] }`; `createSavedViewRequestSchema` rejects a 61-character name.
- [ ] **Step 2: Failing route tests** (in-memory `SavedViewStore` double, the `TokenVerifier` pattern from `staff-orders-route.test.ts:293-370`): lists only the caller's views; creates (201) and the double records an audit call; duplicate name → 409 `saved_view_name_taken`; 51st view → 409 `saved_view_limit`; patch with stale `expectedVersion` → 409 `version_conflict`; patch/delete another actor's view → 404; body containing `state.filters.search` → 400; viewer role allowed; no session → 401.
- [ ] **Step 3:** Run them → FAIL. Implement schema, `pnpm --filter @canadian-plans/db db:generate`, rename the output to `0028_saved_views.sql`, hand-append FORCE RLS + GRANT, then the store, routes and client.
- [ ] **Step 4: Integration test (CI):** under actor A's tenant context a view is created; under actor B's context in the same workspace `list` returns nothing and `update`/`delete` return not-found; under another workspace nothing is visible.
- [ ] **Step 5:** `pnpm --filter backend test`, `pnpm --filter @canadian-plans/contracts test`, OpenAPI regeneration script (see CI `docs/api/openapi.json` diff step), docs updated. Commit `feat(backend): private saved views for staff lists`.

### Task 3: Missing UI primitives

**Files:**

- Create: `packages/ui/src/components/checkbox.tsx`, `packages/ui/src/components/popover.tsx` (shadcn new-york versions via the shadcn MCP, imports from `radix-ui`)
- Modify: `packages/ui/src/index.ts` (export `Checkbox`, `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`; also export `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuLabel` if not already exported)
- Test: `packages/ui/src/components/checkbox.test.tsx`

- [ ] **Step 1:** Failing test: a `Checkbox` with `aria-label="Select all"` toggles `onCheckedChange(true)` on click and renders `data-state="indeterminate"` when `checked="indeterminate"`.
- [ ] **Step 2:** Add the components; no new npm dependency (radix-ui umbrella already present).
- [ ] **Step 3:** `pnpm --filter @canadian-plans/ui test` passes; commit `feat(ui): add checkbox and popover primitives`.

### Task 4: Twenty dark theme and frame for the whole admin

**Files:**

- Create: `apps/admin/src/app/crm-theme.css` (imported last in `globals.css`)
- Modify: `apps/admin/src/components/app-sidebar.tsx`, `protected-workspace-shell.tsx`, `top-bar.tsx`
- Create: `apps/admin/src/components/crm/page-header.tsx`
- Test: `apps/admin/src/components/app-sidebar.test.tsx` (keep passing), `apps/admin/src/components/crm/page-header.test.tsx`

**Interfaces:**

- `crm-theme.css` redefines, inside `.dark`, the shadcn variables (`--background`, `--card`, `--popover`, `--primary` (indigo), `--muted`, `--muted-foreground`, `--accent`, `--border`, `--input`, `--ring`, `--sidebar*`) with the Global Constraints colours, and adds admin-only tokens `--crm-row-hover`, `--crm-selected`, `--crm-chip-bg`, `--crm-chip-border`, `--crm-chip-fg` mapped in `@theme inline` to Tailwind colours `crm-row-hover`, `crm-selected`, `crm-chip`, `crm-chip-border`, `crm-chip-foreground`.
- `PageHeader({ icon: LucideIcon, title: string, count?: number, children?: ReactNode /* right-side actions */ })`: 48px row, bottom border, 13px semibold title in an `<h1>`.
- Shell: sidebar uses `--sidebar-width: 220px`, 28px items, "Workspace" section title 11px semibold; the top bar folds into the sidebar header (workspace switcher at the sidebar top, Sign out in a sidebar footer menu); `SidebarInset` loses `p-6`. Pages that are not redesigned get a `<div className="p-6">` wrapper in their page files so they look as before inside the new frame.

- [ ] **Step 1:** Failing test: `PageHeader` renders an `h1` with the title and the count text `· 12`, and renders actions.
- [ ] **Step 2:** Implement; update the sidebar test for the moved workspace switcher and Sign out (still reachable by role and name: button "Switch workspace", button "Sign out").
- [ ] **Step 3:** `pnpm --filter admin test` passes; commit `feat(admin): Twenty-style dark theme and frame`.

### Task 5: Orders view state (pure module)

**Files:**

- Create: `apps/admin/src/components/orders/orders-view-state.ts`
- Test: `apps/admin/src/components/orders/orders-view-state.test.ts`

**Interfaces (produces):**

- `type OrderViewState` = contracts `OrderViewState`; `DEFAULT_ORDER_VIEW_STATE: OrderViewState` (`archiveState: 'active'`, sort `submittedAt desc`, no hidden columns)
- `toListQuery(state: OrderViewState, search: string, page: number, pageSize: number): ListWorkspaceOrdersQuery`: trims search, omits empty values, maps sort to `sortBy`/`sortDirection`
- `isViewDirty(saved: OrderViewState, draft: OrderViewState): boolean`: deep, order-insensitive for `hiddenColumns`
- `type FilterKey = keyof OrderViewFilters`; `filterChips(state, lookups: { members: readonly AssignableMember[] }): readonly { key: FilterKey; label: string; value: string }[]`
- `withFilter(state, key, value | undefined): OrderViewState`; `withSort(state, field, direction)`; `toggleColumn(state, column)`
- Date filters are stored as `YYYY-MM-DD` day strings in the view and converted to the backend's inclusive/exclusive ISO bounds only in `toListQuery` (moves `startOfDay`/`endOfDayExclusive` out of `orders-list.tsx`)

- [ ] **Step 1: Failing tests:** `toListQuery(DEFAULT, '  CP-1 ', 1, 50)` → `{ archiveState: 'active', search: 'CP-1', sortBy: 'submittedAt', sortDirection: 'desc', page: 1, pageSize: 50 }`; date `submittedTo: '2026-10-27'` → `'2026-10-28T00:00:00.000Z'`; `isViewDirty` false for reordered `hiddenColumns`, true after `withFilter(…, 'status', 'dispatched')`; `filterChips` for an assignee id not in `members` → value `'Unknown member'` (Review Focus 1); a `partnerCode` draft over the default view → dirty with chip `Partner code: MAPLE10` (Review Focus 2).
- [ ] **Step 2:** Implement; tests pass; commit `feat(admin): orders view state model`.

### Task 6: View bar, filter/sort/options menus and saved-view switcher

**Files:**

- Create: `apps/admin/src/components/crm/view-bar.tsx` (presentational: left slot, Filter/Sort/Options buttons, chips row with Reset / Update view / Save as new view)
- Create: `apps/admin/src/components/orders/orders-view-menus.tsx` (Filter menu: field list → value control per field: status and payment as radio items, assignee as radio items from members, archive as radio, partner code and source as text input, dates as date inputs; Sort menu: field + direction; Options: column visibility checkboxes)
- Create: `apps/admin/src/components/orders/saved-view-switcher.tsx` (dropdown "[icon] All orders · 1,234 ⌄"; built-in "All orders" view that cannot be renamed/deleted; own views; per-view Rename / Delete; "Save as new view" dialog with name field)
- Modify: `apps/admin/src/lib/api.ts` (wrappers `listSavedViews`, `createSavedView`, `updateSavedView`, `deleteSavedView`)
- Test: `orders-view-menus.test.tsx`, `saved-view-switcher.test.tsx`

- [ ] **Step 1: Failing tests:** choosing Filter → Status → Dispatched calls `onChange` with `filters.status = 'dispatched'`; a chip × removes it; Sort → Reference → Ascending sets sort; Options unticking "Source" hides that column; switcher lists only views returned by the mocked `listSavedViews`; "Save as new view" with search text `jane` sends a state without `search` and shows "Search is not saved in views" (Review Focus 3); a 409 `saved_view_name_taken` shows "You already have a view with that name"; deleting the active view falls back to "All orders".
- [ ] **Step 2:** Implement with `DropdownMenu` sub-menus and `Popover` (Task 3). Chips: 24px, 4px radius, `bg-crm-chip border-crm-chip-border text-crm-chip-foreground`, 12px text, × button with `aria-label="Remove <field> filter"`.
- [ ] **Step 3:** Tests pass; commit `feat(admin): orders view bar with filters, sort and saved views`.

### Task 7: Orders table in the Twenty style

**Files:**

- Create: `apps/admin/src/components/orders/orders-table.tsx` (desktop table + phone list)
- Test: `apps/admin/src/components/orders/orders-table.test.tsx`

**Interfaces:**

- `OrdersTable({ orders, hiddenColumns, members, selectable, selected, onSelectedChange, activeOrderId, onOpen(orderId), workspaceSlug })`
- Columns: checkbox (28px, select-all with indeterminate) · Reference (sticky, with an "Open full page" ↗ link revealed on hover/focus) · Customer · Status (coloured tag) · Payment · Assignee · Source · Submitted (relative date, exact date in `title`) · Total. Row 32px; clicking a row or pressing Enter on it calls `onOpen`; the active row has `bg-crm-selected`.
- Phone (`md:hidden`): one stacked item per order (reference, status tag, customer, submitted), same `onOpen`.

- [ ] **Step 1: Failing tests:** hidden column `source` is not rendered; select-all selects every row and shows indeterminate after one row is unticked; clicking a row calls `onOpen(id)`; Enter on a focused row calls `onOpen`; restricted customer data renders "Restricted" and no email (Review Focus 5); status tags have the text labels from `ORDER_STATUS_LABELS`.
- [ ] **Step 2:** Implement; tests pass; commit `feat(admin): Twenty-style orders table`.

### Task 8: Side panel and the new Orders page

**Files:**

- Create: `apps/admin/src/components/crm/side-panel.tsx`
- Create: `apps/admin/src/components/orders/orders-index.tsx` (replaces `OrdersList` as the page component; `orders-list.tsx` and its test are deleted once their cases move here)
- Modify: `apps/admin/src/components/orders/order-detail.tsx` (`variant?: 'page' | 'panel'`; panel = single column, no back link, an "Open full page" link)
- Modify: `apps/admin/src/app/w/[workspace]/orders/page.tsx` (render `OrdersIndex`, pass `partnerCode`, `view`, `order` search params, each validated: uuid or partner code ≤64)
- Test: `apps/admin/src/components/orders/orders-index.test.tsx`, `apps/admin/src/components/crm/side-panel.test.tsx`

**Interfaces:**

- `SidePanel({ open, title, onClose, children })`: desktop renders an `<aside aria-label={title}>` 560px wide beside the main panel (pushes content); Esc and the × button call `onClose`; focus moves into the panel on open. Phone renders the existing `Sheet` full-screen.
- `OrdersIndex({ workspaceSlug, initialPartnerCode?, initialViewId?, initialOrderId? })`: loads saved views and members, holds `{ savedViewId, savedState, draftState, search, page, selected, openOrderId }`; keeps `?view=` and `?order=` in the URL with `router.replace` (no other state); page size 50; header `PageHeader` "Orders · total" with, while rows are selected, "N selected" and an Assign menu reusing `bulkAssignOrders` and the existing conflict messages.

- [ ] **Step 1: Failing tests:** clicking a row opens the panel with `OrderDetailView variant="panel"` for that id and sets `?order=`; Esc closes it and focus returns to the table; after a filter change that removes the open order from the list, the panel stays open (Review Focus 4); bulk assign with a conflict shows "Assigned 1 order(s); 1 changed or disappeared and were not assigned."; `initialPartnerCode` shows a dirty chip; selecting a saved view resets page to 1 and clears selection.
- [ ] **Step 2:** Implement; port the remaining `orders-list.test.tsx` cases (search label by capability, load error message) into `orders-index.test.tsx`; delete `orders-list.tsx` and its test.
- [ ] **Step 3:** `pnpm --filter admin test` passes; commit `feat(admin): orders open in a side panel`.

### Task 9: End-to-end and whole-branch verification

**Files:**

- Modify: `apps/admin/e2e/orders.spec.ts` (CI harness with Postgres): open an order in the side panel; create a saved view with a status filter, reload, select it from the switcher, see the filtered rows; delete it.
- Modify: `apps/admin/e2e/shell.spec.ts` only if a public-route assertion changes.

- [ ] **Step 1:** Add the e2e cases (they run in CI; locally they skip without Postgres).
- [ ] **Step 2:** Run locally: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm --filter admin build`, `pnpm run format:check` (or the repo's prettier check), OpenAPI check. Expected: all pass; integration and orders e2e suites report skipped locally.
- [ ] **Step 3:** Visual check: run the admin locally against a throwaway fixture backend in the session scratchpad (never committed) through the existing `NEXT_PUBLIC_E2E_STAFF_BEARER` seam on 127.0.0.1; screenshot desktop (1440px) and phone (375px) for the PR.
- [ ] **Step 4:** Push the branch and open the PR (no merge, no deploy). The PR body lists the decisions, what was verified locally, and that integration/e2e run in CI.
