'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AssignableMember,
  ListWorkspaceOrdersQuery,
  OrderArchiveFilter,
  OrderCapabilities,
  OrderFulfilmentStatus,
  OrderListItem,
  PageInfo,
} from '@canadian-plans/contracts';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@canadian-plans/ui';

import {
  BackendError,
  bulkAssignOrders,
  listOrderAssignees,
  listWorkspaceOrders,
} from '../../lib/api';
import { useStaffSession } from '../staff-session-provider';
import {
  ORDER_STATUS_LABELS,
  customerLabel,
  formatDateTime,
  formatMoney,
  isOrderStatus,
} from './format';

const STATUS_ORDER: readonly OrderFulfilmentStatus[] = [
  'submitted',
  'in_progress',
  'awaiting_customer',
  'ready_for_delivery',
  'dispatched',
  'activated',
  'cancelled',
];

const ARCHIVE_FILTERS: readonly { label: string; value: OrderArchiveFilter }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
  { label: 'All', value: 'all' },
];

const ALL = 'all';
const PAGE_SIZE = 25;

interface Filters {
  status: OrderFulfilmentStatus | typeof ALL;
  archiveState: OrderArchiveFilter;
  search: string;
  assigneeId: string;
  partnerCode: string;
  source: string;
  submittedFrom: string;
  submittedTo: string;
}

const INITIAL_FILTERS: Filters = {
  status: ALL,
  archiveState: 'active',
  search: '',
  assigneeId: ALL,
  partnerCode: '',
  source: '',
  submittedFrom: '',
  submittedTo: '',
};

function memberLabel(member: AssignableMember): string {
  const roles = member.roles.length > 0 ? member.roles.join(', ') : 'no role';
  return member.isSelf ? `You (${roles})` : `Member ${member.membershipId.slice(0, 8)} (${roles})`;
}

/** Inclusive end date: the backend treats `submittedTo` as an exclusive bound. */
function endOfDayExclusive(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

function startOfDay(value: string): string | undefined {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

export function toOrderQuery(filters: Filters, page: number): ListWorkspaceOrdersQuery {
  return {
    status: filters.status === ALL ? undefined : filters.status,
    archiveState: filters.archiveState,
    search: filters.search.trim() ? filters.search.trim() : undefined,
    assigneeId: filters.assigneeId === ALL ? undefined : filters.assigneeId,
    partnerCode: filters.partnerCode.trim() ? filters.partnerCode.trim() : undefined,
    source: filters.source.trim() ? filters.source.trim() : undefined,
    submittedFrom: startOfDay(filters.submittedFrom),
    submittedTo: endOfDayExclusive(filters.submittedTo),
    page,
    pageSize: PAGE_SIZE,
  };
}

export function OrdersList({ workspaceSlug }: { workspaceSlug: string }) {
  const staff = useStaffSession();
  const workspace = staff.workspaces.find((item) => item.slug === workspaceSlug);
  const workspaceId = workspace?.id;
  const accessToken = staff.accessToken;

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [draftSearch, setDraftSearch] = useState('');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<readonly OrderListItem[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ page: 1, pageSize: PAGE_SIZE, total: 0 });
  const [capabilities, setCapabilities] = useState<OrderCapabilities>({
    canManageOrders: false,
    canRecordPayment: false,
    canSearchContact: false,
  });
  const [members, setMembers] = useState<readonly AssignableMember[]>([]);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState(ALL);
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => toOrderQuery(filters, page), [filters, page]);

  const refresh = useCallback(async () => {
    if (!accessToken || !workspaceId) return;
    setLoading(true);
    setMessage(undefined);
    try {
      const result = await listWorkspaceOrders(accessToken, workspaceId, query);
      setOrders(result.orders);
      setPageInfo(result.page);
      setCapabilities(result.capabilities);
      // A selection only survives for rows still present in the new page.
      setSelected((current) =>
        current.filter((id) => result.orders.some((order) => order.id === id)),
      );
    } catch (error) {
      setMessage(
        `Could not load orders. Reason: ${error instanceof BackendError ? error.code : 'internal_error'}.`,
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId, query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Any member with `workspace.read` may filter by assignee; only the bulk
  // assign control is gated on `canManageOrders`.
  useEffect(() => {
    if (!accessToken || !workspaceId) return;
    let current = true;
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
  }, [accessToken, workspaceId]);

  const update = useCallback((changes: Partial<Filters>) => {
    setPage(1);
    setSelected([]);
    setFilters((current) => ({ ...current, ...changes }));
  }, []);

  const bulkAssign = useCallback(async () => {
    if (!accessToken || !workspaceId) return;
    const items = orders
      .filter((order) => selected.includes(order.id))
      .map((order) => ({ orderId: order.id, expectedVersion: order.recordVersion }));
    if (items.length === 0) return;
    setMessage(undefined);
    try {
      const result = await bulkAssignOrders(accessToken, workspaceId, {
        assigneeId: bulkAssignee === ALL ? null : bulkAssignee,
        orders: items,
      });
      const conflicts = result.results.filter((entry) => entry.status !== 'assigned').length;
      setSelected([]);
      await refresh();
      // Set after the refresh, which clears the transient load message.
      setMessage(
        conflicts === 0
          ? `Assigned ${items.length} order(s).`
          : `Assigned ${items.length - conflicts} order(s); ${conflicts} changed or disappeared and were not assigned.`,
      );
    } catch (error) {
      setMessage(
        `Bulk assignment failed. Reason: ${error instanceof BackendError ? error.code : 'internal_error'}.`,
      );
    }
  }, [accessToken, workspaceId, orders, selected, bulkAssignee, refresh]);

  const totalPages = Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize));

  return (
    <section className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h1>Orders</h1>
          </CardTitle>
          <CardDescription>
            Workspace-scoped order processing. Every change is applied by the backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              update({ search: draftSearch });
            }}
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="order-search">
                {capabilities.canSearchContact
                  ? 'Search (reference, name, email, phone)'
                  : 'Search (reference)'}
              </Label>
              <Input
                id="order-search"
                value={draftSearch}
                maxLength={120}
                placeholder={capabilities.canSearchContact ? 'CP-000123 or customer' : 'CP-000123'}
                onChange={(event) => setDraftSearch(event.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="order-status-filter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => {
                  if (value === ALL) {
                    update({ status: ALL });
                    return;
                  }
                  if (isOrderStatus(value)) update({ status: value });
                }}
              >
                <SelectTrigger id="order-status-filter" className="w-48">
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any status</SelectItem>
                  {STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      {ORDER_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="order-assignee-filter">Assignee</Label>
              <Select
                value={filters.assigneeId}
                onValueChange={(value) => update({ assigneeId: value })}
              >
                <SelectTrigger id="order-assignee-filter" className="w-56">
                  <SelectValue placeholder="Anyone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Anyone</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.membershipId} value={member.membershipId}>
                      {memberLabel(member)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="order-partner-filter">Partner code</Label>
              <Input
                id="order-partner-filter"
                value={filters.partnerCode}
                maxLength={64}
                className="w-40"
                onChange={(event) => update({ partnerCode: event.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="order-source-filter">Source</Label>
              <Input
                id="order-source-filter"
                value={filters.source}
                maxLength={160}
                placeholder="utm:google/cpc"
                className="w-44"
                onChange={(event) => update({ source: event.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="order-from-filter">Submitted from</Label>
              <Input
                id="order-from-filter"
                type="date"
                value={filters.submittedFrom}
                onChange={(event) => update({ submittedFrom: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="order-to-filter">Submitted to</Label>
              <Input
                id="order-to-filter"
                type="date"
                value={filters.submittedTo}
                onChange={(event) => update({ submittedTo: event.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Archive</span>
              <div className="flex gap-1" role="group" aria-label="Archive filter">
                {ARCHIVE_FILTERS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={filters.archiveState === option.value ? 'default' : 'outline'}
                    aria-pressed={filters.archiveState === option.value}
                    onClick={() => update({ archiveState: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraftSearch('');
                setFilters(INITIAL_FILTERS);
                setPage(1);
                setSelected([]);
              }}
            >
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {capabilities.canManageOrders ? (
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>Bulk assign</h2>
            </CardTitle>
            <CardDescription>
              Assign the selected orders; a changed order is reported, never overwritten.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="bulk-assignee">Assign to</Label>
              <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                <SelectTrigger id="bulk-assignee" className="w-56">
                  <SelectValue placeholder="Unassign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Unassign</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.membershipId} value={member.membershipId}>
                      {memberLabel(member)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => void bulkAssign()}
              disabled={selected.length === 0}
            >
              {bulkAssignee === ALL ? 'Unassign selected' : 'Assign selected'}
            </Button>
            <p className="text-sm text-muted-foreground">{selected.length} selected</p>
          </CardContent>
        </Card>
      ) : null}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {orders.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">No orders match these filters.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {capabilities.canManageOrders ? <TableHead>Select</TableHead> : null}
              <TableHead>Reference</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                {capabilities.canManageOrders ? (
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select order ${order.reference}`}
                      checked={selected.includes(order.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, order.id]
                            : current.filter((id) => id !== order.id),
                        )
                      }
                    />
                  </TableCell>
                ) : null}
                <TableCell>
                  <Link className="underline" href={`/w/${workspaceSlug}/orders/${order.id}`}>
                    {order.reference}
                  </Link>
                </TableCell>
                <TableCell>{customerLabel(order.customer)}</TableCell>
                <TableCell>
                  <Badge variant={order.fulfilmentStatus === 'cancelled' ? 'secondary' : 'default'}>
                    {ORDER_STATUS_LABELS[order.fulfilmentStatus]}
                  </Badge>
                </TableCell>
                <TableCell>{order.paymentState}</TableCell>
                <TableCell>
                  {order.assigneeId ? order.assigneeId.slice(0, 8) : 'Unassigned'}
                </TableCell>
                <TableCell>
                  <code className="text-xs">{order.source}</code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(order.submittedAt)}
                </TableCell>
                <TableCell>{formatMoney(order.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {pageInfo.page} of {totalPages} · {pageInfo.total} order(s)
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </Button>
      </div>

      {message ? (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </section>
  );
}
