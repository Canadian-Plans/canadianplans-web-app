'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  InboxIcon,
  SearchIcon,
  UserCheckIcon,
} from 'lucide-react';
import type {
  AssignableMember,
  OrderCapabilities,
  OrderListItem,
  OrderViewState,
  PageInfo,
  SavedView,
} from '@canadian-plans/contracts';
import { Button, Input, Popover, PopoverTrigger } from '@canadian-plans/ui';

import {
  BackendError,
  bulkAssignOrders,
  createSavedView,
  deleteSavedView,
  listOrderAssignees,
  listSavedViews,
  listWorkspaceOrders,
  updateSavedView,
} from '../../lib/api';
import { BarButton, MenuItem, MenuPanel, MenuSeparator } from '../crm/menu';
import { PageHeader } from '../crm/page-header';
import { SidePanel } from '../crm/side-panel';
import { FilterChip, ViewBar } from '../crm/view-bar';
import { useStaffSession } from '../staff-session-provider';
import { OrderDetailView } from './order-detail';
import { OrdersTable } from './orders-table';
import { OrdersFilterMenu, OrdersOptionsMenu, OrdersSortMenu } from './orders-view-menus';
import {
  DEFAULT_ORDER_VIEW_STATE,
  filterChips,
  isViewDirty,
  memberName,
  toListQuery,
  withFilter,
} from './orders-view-state';
import { SavedViewSwitcher } from './saved-view-switcher';

const PAGE_SIZE = 50;

const NO_CAPABILITIES: OrderCapabilities = {
  canManageOrders: false,
  canRecordPayment: false,
  canSearchContact: false,
};

const SEARCH_NOT_SAVED =
  'Search is not saved in views; it still filters this list until you clear it.';

function reasonOf(error: unknown): string {
  return error instanceof BackendError ? error.code : 'internal_error';
}

function viewErrorMessage(error: unknown): string {
  switch (reasonOf(error)) {
    case 'saved_view_name_taken':
      return 'You already have a view with that name.';
    case 'saved_view_limit':
      return 'You have reached the limit of 50 saved views.';
    case 'version_conflict':
      return 'This view was changed in another tab. Reload the page to see the latest version.';
    default:
      return `Could not save the view. Reason: ${reasonOf(error)}.`;
  }
}

/**
 * The orders list in the Twenty CRM layout (admin CRM Phase 1): page header,
 * view bar with saved views, filters, sort and columns, the dense table, and
 * the side panel that opens an order without leaving the list. All rules and
 * results come from the backend; only `?view=` and `?order=` ids go in the URL.
 */
export function OrdersIndex({
  workspaceSlug,
  initialPartnerCode,
  initialViewId,
  initialOrderId,
}: {
  workspaceSlug: string;
  initialPartnerCode?: string;
  initialViewId?: string;
  initialOrderId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const staff = useStaffSession();
  const workspaceId = staff.workspaces.find((item) => item.slug === workspaceSlug)?.id;
  const accessToken = staff.accessToken;

  const [views, setViews] = useState<readonly SavedView[]>([]);
  const [viewsReady, setViewsReady] = useState(!initialViewId);
  const [activeViewId, setActiveViewId] = useState<string | undefined>(initialViewId);
  const [draft, setDraft] = useState<OrderViewState>(() =>
    initialPartnerCode
      ? withFilter(DEFAULT_ORDER_VIEW_STATE, 'partnerCode', initialPartnerCode)
      : DEFAULT_ORDER_VIEW_STATE,
  );
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<readonly OrderListItem[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ page: 1, pageSize: PAGE_SIZE, total: 0 });
  const [capabilities, setCapabilities] = useState<OrderCapabilities>(NO_CAPABILITIES);
  const [members, setMembers] = useState<readonly AssignableMember[]>([]);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [openOrderId, setOpenOrderId] = useState<string | undefined>(initialOrderId);
  const [openReference, setOpenReference] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const activeView = views.find((view) => view.id === activeViewId);
  const savedState = activeView?.state ?? DEFAULT_ORDER_VIEW_STATE;
  const dirty = isViewDirty(savedState, draft);
  const query = useMemo(() => toListQuery(draft, search, page, PAGE_SIZE), [draft, search, page]);

  const syncUrl = useCallback(
    (viewId: string | undefined, orderId: string | undefined) => {
      const params = new URLSearchParams();
      if (viewId) params.set('view', viewId);
      if (orderId) params.set('order', orderId);
      const suffix = params.toString();
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  // Saved views and assignable members load once per workspace.
  useEffect(() => {
    if (!accessToken || !workspaceId) return;
    let current = true;
    void listSavedViews(accessToken, workspaceId, 'orders')
      .then((result) => {
        if (!current) return;
        setViews(result.views);
        const initial = result.views.find((view) => view.id === initialViewId);
        if (initial) setDraft(initial.state);
        else setActiveViewId(undefined);
      })
      .catch(() => {
        if (current) setActiveViewId(undefined);
      })
      .finally(() => {
        if (current) setViewsReady(true);
      });
    void listOrderAssignees(accessToken, workspaceId)
      .then((result) => {
        if (current) setMembers(result.members);
      })
      .catch(() => {
        if (current) setMembers([]);
      });
    return () => {
      current = false;
    };
  }, [accessToken, workspaceId, initialViewId]);

  const refresh = useCallback(async () => {
    if (!accessToken || !workspaceId || !viewsReady) return;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const result = await listWorkspaceOrders(accessToken, workspaceId, query);
      if (requestVersion.current !== version) return;
      setOrders(result.orders);
      setPageInfo(result.page);
      setCapabilities(result.capabilities);
      setSelected((current) =>
        current.filter((id) => result.orders.some((order) => order.id === id)),
      );
    } catch (error) {
      if (requestVersion.current !== version) return;
      setMessage(`Could not load orders. Reason: ${reasonOf(error)}.`);
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  }, [accessToken, workspaceId, viewsReady, query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function changeDraft(next: OrderViewState) {
    setDraft(next);
    setPage(1);
    setSelected([]);
    setMessage(undefined);
  }

  function selectView(viewId: string | undefined) {
    const view = views.find((item) => item.id === viewId);
    setActiveViewId(view?.id);
    changeDraft(view?.state ?? DEFAULT_ORDER_VIEW_STATE);
    syncUrl(view?.id, openOrderId);
  }

  function openOrder(orderId: string) {
    setOpenOrderId(orderId);
    setOpenReference(orders.find((order) => order.id === orderId)?.reference);
    syncUrl(activeViewId, orderId);
  }

  function closeOrder() {
    const closing = openOrderId;
    setOpenOrderId(undefined);
    syncUrl(activeViewId, undefined);
    const row = closing ? listRef.current?.querySelector(`[data-order-id="${closing}"]`) : null;
    if (row instanceof HTMLElement) row.focus();
    else listRef.current?.focus();
  }

  async function saveAsNewView(name: string): Promise<string | undefined> {
    if (!accessToken || !workspaceId) return 'Your session has ended. Sign in again.';
    try {
      const { view } = await createSavedView(accessToken, workspaceId, {
        object: 'orders',
        name,
        state: draft,
      });
      setViews((current) => [...current, view].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveViewId(view.id);
      setDraft(view.state);
      syncUrl(view.id, openOrderId);
      setMessage(search.trim() ? SEARCH_NOT_SAVED : `Saved the view “${view.name}”.`);
      return undefined;
    } catch (error) {
      return viewErrorMessage(error);
    }
  }

  async function writeView(
    view: SavedView,
    change: { name?: string; state?: OrderViewState },
  ): Promise<string | undefined> {
    if (!accessToken || !workspaceId) return 'Your session has ended. Sign in again.';
    try {
      const result = await updateSavedView(accessToken, workspaceId, view.id, {
        expectedVersion: view.version,
        ...change,
      });
      setViews((current) => current.map((item) => (item.id === view.id ? result.view : item)));
      return undefined;
    } catch (error) {
      return viewErrorMessage(error);
    }
  }

  async function updateActiveView() {
    if (!activeView) return;
    const failure = await writeView(activeView, { state: draft });
    setMessage(failure ?? (search.trim() ? SEARCH_NOT_SAVED : `Updated “${activeView.name}”.`));
  }

  async function removeView(view: SavedView) {
    if (!accessToken || !workspaceId) return;
    try {
      await deleteSavedView(accessToken, workspaceId, view.id);
      setViews((current) => current.filter((item) => item.id !== view.id));
      if (view.id === activeViewId) {
        setActiveViewId(undefined);
        changeDraft(DEFAULT_ORDER_VIEW_STATE);
        syncUrl(undefined, openOrderId);
      }
      setMessage(`Deleted the view “${view.name}”.`);
    } catch (error) {
      setMessage(`Could not delete the view. Reason: ${reasonOf(error)}.`);
    }
  }

  async function assignSelected(assigneeId: string | null) {
    if (!accessToken || !workspaceId) return;
    const items = orders
      .filter((order) => selected.includes(order.id))
      .map((order) => ({ orderId: order.id, expectedVersion: order.recordVersion }));
    if (items.length === 0) return;
    try {
      const result = await bulkAssignOrders(accessToken, workspaceId, {
        assigneeId,
        orders: items,
      });
      const conflicts = result.results.filter((entry) => entry.status !== 'assigned').length;
      setSelected([]);
      await refresh();
      setMessage(
        conflicts === 0
          ? `Assigned ${items.length} order(s).`
          : `Assigned ${items.length - conflicts} order(s); ${conflicts} changed or disappeared and were not assigned.`,
      );
    } catch (error) {
      setMessage(`Bulk assignment failed. Reason: ${reasonOf(error)}.`);
    }
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
    setSelected([]);
  }

  const chips = filterChips(draft, { members });
  const totalPages = Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize));
  const searchLabel = capabilities.canSearchContact
    ? 'Search by reference, name, email or phone'
    : 'Search by order reference';

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0 md:h-svh">
      <section aria-label="Orders list" className="flex min-w-0 flex-1 flex-col">
        <PageHeader icon={ClipboardListIcon} title="Orders" count={pageInfo.total}>
          {capabilities.canManageOrders && selected.length > 0 ? (
            <>
              <span className="px-2 text-[13px] text-muted-foreground">
                {selected.length} selected
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <BarButton className="text-foreground">
                    <UserCheckIcon aria-hidden="true" />
                    Assign
                  </BarButton>
                </PopoverTrigger>
                <MenuPanel align="end" aria-label="Assign selected orders">
                  {members.map((member) => (
                    <MenuItem
                      key={member.membershipId}
                      onClick={() => void assignSelected(member.membershipId)}
                    >
                      {memberName(member)}
                    </MenuItem>
                  ))}
                  <MenuSeparator />
                  <MenuItem onClick={() => void assignSelected(null)}>Unassign</MenuItem>
                </MenuPanel>
              </Popover>
            </>
          ) : null}
        </PageHeader>

        <ViewBar
          switcher={
            <SavedViewSwitcher
              views={views}
              activeViewId={activeViewId}
              total={pageInfo.total}
              onSelect={selectView}
              onRename={(view, name) => writeView(view, { name })}
              onDelete={removeView}
            />
          }
          actions={
            <>
              <form role="search" className="relative mr-1" onSubmit={submitSearch}>
                <SearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  aria-label={searchLabel}
                  value={searchInput}
                  maxLength={120}
                  placeholder="Search"
                  className="h-7 w-24 rounded-md sm:w-44 border border-transparent bg-transparent pr-2 pl-7 text-[13px] outline-none placeholder:text-muted-foreground hover:bg-accent focus:border-input focus:bg-background"
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    if (event.target.value === '' && search) {
                      setSearch('');
                      setPage(1);
                    }
                  }}
                />
              </form>
              <OrdersFilterMenu state={draft} members={members} onChange={changeDraft} />
              <OrdersSortMenu state={draft} onChange={changeDraft} />
              <OrdersOptionsMenu state={draft} onChange={changeDraft} />
            </>
          }
          chips={
            chips.length > 0
              ? chips.map((chip) => (
                  <FilterChip
                    key={chip.key}
                    label={chip.label}
                    value={chip.value}
                    onRemove={() => changeDraft(withFilter(draft, chip.key, undefined))}
                  />
                ))
              : null
          }
          details={
            dirty ? (
              <>
                <BarButton onClick={() => changeDraft(savedState)}>Reset</BarButton>
                {activeView ? (
                  <Button
                    size="sm"
                    className="h-7 text-[13px]"
                    onClick={() => void updateActiveView()}
                  >
                    Update view
                  </Button>
                ) : null}
                <SaveViewPopover onSave={saveAsNewView} primary={!activeView} />
              </>
            ) : null
          }
        />

        {message ? (
          <p
            role="status"
            aria-live="polite"
            className="border-b border-crm-row-border px-3 py-2 text-[13px] text-muted-foreground"
          >
            {message}
          </p>
        ) : null}

        <div ref={listRef} tabIndex={-1} className="flex min-h-0 flex-1 flex-col outline-none">
          {orders.length === 0 && !loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <InboxIcon aria-hidden="true" className="size-8 text-muted-foreground" />
              <p className="text-[13px] font-medium">No orders match this view</p>
              <p className="text-[13px] text-muted-foreground">
                Try removing a filter or clearing the search.
              </p>
            </div>
          ) : (
            <OrdersTable
              orders={orders}
              hiddenColumns={draft.hiddenColumns}
              members={members}
              selectable={capabilities.canManageOrders}
              selected={selected}
              onSelectedChange={setSelected}
              activeOrderId={openOrderId}
              onOpen={openOrder}
              workspaceSlug={workspaceSlug}
            />
          )}
        </div>

        <footer className="flex h-9 shrink-0 items-center gap-2 border-t border-crm-row-border px-3 text-[13px] text-muted-foreground">
          <span aria-live="polite">
            {loading ? 'Loading…' : `Page ${pageInfo.page} of ${totalPages}`}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <BarButton
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeftIcon aria-hidden="true" />
            </BarButton>
            <BarButton
              aria-label="Next page"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              <ChevronRightIcon aria-hidden="true" />
            </BarButton>
          </div>
        </footer>
      </section>

      <SidePanel
        open={openOrderId !== undefined}
        title={openReference ?? 'Order'}
        onClose={closeOrder}
        actions={
          openOrderId ? (
            <Link
              href={`/w/${workspaceSlug}/orders/${openOrderId}`}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
              Open full page
            </Link>
          ) : null
        }
      >
        {openOrderId ? (
          <OrderDetailView
            key={openOrderId}
            workspaceSlug={workspaceSlug}
            orderId={openOrderId}
            variant="panel"
            onChanged={() => void refresh()}
          />
        ) : null}
      </SidePanel>
    </div>
  );
}

function SaveViewPopover({
  onSave,
  primary,
}: {
  onSave(name: string): Promise<string | undefined>;
  primary: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the view a name.');
      return;
    }
    setSaving(true);
    const failure = await onSave(trimmed);
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setOpen(false);
    setName('');
    setError(undefined);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant={primary ? 'default' : 'outline'} className="h-7 text-[13px]">
          Save as new view
        </Button>
      </PopoverTrigger>
      <MenuPanel align="end" aria-label="Save as new view" className="w-72 p-2">
        <form className="flex flex-col gap-2" onSubmit={(event) => void submit(event)}>
          <Input
            autoFocus
            aria-label="New view name"
            placeholder="e.g. Waiting for documents"
            value={name}
            maxLength={60}
            className="h-8 text-[13px]"
            onChange={(event) => setName(event.target.value)}
          />
          {error ? (
            <p role="alert" className="text-[12px] text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="sm" className="h-8" disabled={saving}>
            Save view
          </Button>
        </form>
      </MenuPanel>
    </Popover>
  );
}
