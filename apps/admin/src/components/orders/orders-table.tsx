'use client';

import Link from 'next/link';
import type { KeyboardEvent, ReactNode } from 'react';
import {
  ArrowUpRightIcon,
  CalendarIcon,
  CircleDotIcon,
  CreditCardIcon,
  DollarSignIcon,
  HashIcon,
  LinkIcon,
  UserCheckIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import type {
  AssignableMember,
  OrderColumnKey,
  OrderFulfilmentStatus,
  OrderListItem,
} from '@canadian-plans/contracts';
import { Checkbox, cn } from '@canadian-plans/ui';

import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATE_LABELS,
  customerLabel,
  formatDateTime,
  formatMoney,
  formatRelative,
} from './format';
import { ORDER_COLUMN_LABELS, memberName } from './orders-view-state';

/** Twenty-style tags: a tinted background with matching text, one colour per status. */
const STATUS_TAG_CLASS: Readonly<Record<OrderFulfilmentStatus, string>> = {
  submitted: 'bg-zinc-500/15 text-zinc-300',
  in_progress: 'bg-blue-500/15 text-blue-300',
  awaiting_customer: 'bg-amber-500/15 text-amber-300',
  ready_for_delivery: 'bg-violet-500/15 text-violet-300',
  dispatched: 'bg-sky-500/15 text-sky-300',
  activated: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-red-500/15 text-red-300',
};

export function StatusTag({ status }: { status: OrderFulfilmentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-[4px] px-1.5 text-[12px] font-medium whitespace-nowrap',
        STATUS_TAG_CLASS[status],
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

interface Column {
  key: OrderColumnKey;
  icon: LucideIcon;
  render(order: OrderListItem, members: readonly AssignableMember[]): ReactNode;
}

function assigneeLabel(order: OrderListItem, members: readonly AssignableMember[]): string {
  if (!order.assigneeId) return 'Unassigned';
  const member = members.find((item) => item.membershipId === order.assigneeId);
  return member ? memberName(member) : `Member ${order.assigneeId.slice(0, 8)}`;
}

const COLUMNS: readonly Column[] = [
  { key: 'customer', icon: UserIcon, render: (order) => customerLabel(order.customer) },
  {
    key: 'status',
    icon: CircleDotIcon,
    render: (order) => <StatusTag status={order.fulfilmentStatus} />,
  },
  {
    key: 'payment',
    icon: CreditCardIcon,
    render: (order) => PAYMENT_STATE_LABELS[order.paymentState],
  },
  { key: 'assignee', icon: UserCheckIcon, render: assigneeLabel },
  {
    key: 'source',
    icon: LinkIcon,
    render: (order) => <span className="font-mono text-[12px]">{order.source}</span>,
  },
  {
    key: 'submittedAt',
    icon: CalendarIcon,
    render: (order) => (
      <time dateTime={order.submittedAt} title={formatDateTime(order.submittedAt)}>
        {formatRelative(order.submittedAt)}
      </time>
    ),
  },
  { key: 'total', icon: DollarSignIcon, render: (order) => formatMoney(order.total) },
];

const HEAD_CELL =
  'h-8 border-r border-b border-crm-row-border px-2 text-left text-[13px] font-medium whitespace-nowrap text-muted-foreground';
const BODY_CELL =
  'h-8 max-w-64 truncate border-r border-b border-crm-row-border px-2 text-[13px] text-foreground';

/**
 * The orders table in Twenty's density: 32px rows, icon headers, a sticky
 * reference column and a checkbox column. A row opens the order in the side
 * panel; the arrow link keeps the full order page one click away. On a phone
 * the same rows render as a stacked list.
 */
export function OrdersTable({
  orders,
  hiddenColumns,
  members,
  selectable,
  selected,
  onSelectedChange,
  activeOrderId,
  onOpen,
  workspaceSlug,
}: {
  orders: readonly OrderListItem[];
  hiddenColumns: readonly OrderColumnKey[];
  members: readonly AssignableMember[];
  selectable: boolean;
  selected: readonly string[];
  onSelectedChange(selected: string[]): void;
  activeOrderId: string | undefined;
  onOpen(orderId: string): void;
  workspaceSlug: string;
}) {
  const columns = COLUMNS.filter((column) => !hiddenColumns.includes(column.key));
  const allSelected = orders.length > 0 && orders.every((order) => selected.includes(order.id));
  const someSelected = orders.some((order) => selected.includes(order.id));

  function toggle(orderId: string, checked: boolean) {
    onSelectedChange(
      checked
        ? [...selected.filter((id) => id !== orderId), orderId]
        : selected.filter((id) => id !== orderId),
    );
  }

  function onRowKey(event: KeyboardEvent, orderId: string) {
    if (event.key === 'Enter' && event.target === event.currentTarget) onOpen(orderId);
  }

  return (
    <>
      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <table aria-label="Orders" className="w-max min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-20 bg-background">
            <tr>
              {selectable ? (
                <th
                  scope="col"
                  className={cn(HEAD_CELL, 'sticky left-0 z-10 w-8 bg-background px-2')}
                >
                  <Checkbox
                    aria-label="Select all orders"
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={() =>
                      onSelectedChange(allSelected ? [] : orders.map((order) => order.id))
                    }
                  />
                </th>
              ) : null}
              <th
                scope="col"
                className={cn(
                  HEAD_CELL,
                  'sticky z-10 min-w-36 bg-background',
                  selectable ? 'left-8' : 'left-0',
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <HashIcon aria-hidden="true" className="size-4" />
                  Reference
                </span>
              </th>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn(HEAD_CELL, 'min-w-28')}>
                  <span className="inline-flex items-center gap-1.5">
                    <column.icon aria-hidden="true" className="size-4" />
                    {ORDER_COLUMN_LABELS[column.key]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isSelected = selected.includes(order.id);
              const isActive = order.id === activeOrderId;
              const rowTone = isActive || isSelected ? 'bg-crm-selected' : 'bg-background';
              return (
                <tr
                  key={order.id}
                  data-order-id={order.id}
                  tabIndex={0}
                  data-active={isActive || undefined}
                  className="group cursor-pointer outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  onClick={() => onOpen(order.id)}
                  onKeyDown={(event) => onRowKey(event, order.id)}
                >
                  {selectable ? (
                    <td
                      className={cn(BODY_CELL, 'sticky left-0 z-10 w-8 px-2', rowTone)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        aria-label={`Select order ${order.reference}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => toggle(order.id, checked === true)}
                      />
                    </td>
                  ) : null}
                  <td
                    className={cn(
                      BODY_CELL,
                      'sticky z-10 font-medium group-hover:bg-crm-row-hover',
                      selectable ? 'left-8' : 'left-0',
                      rowTone,
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{order.reference}</span>
                      <Link
                        href={`/w/${workspaceSlug}/orders/${order.id}`}
                        aria-label={`Open ${order.reference} full page`}
                        className="grid size-5 place-items-center rounded-[4px] text-muted-foreground opacity-0 outline-none group-hover:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
                      </Link>
                    </span>
                  </td>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(BODY_CELL, rowTone, 'group-hover:bg-crm-row-hover')}
                    >
                      {column.render(order, members)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul aria-label="Orders" className="divide-y divide-crm-row-border md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <button
              type="button"
              className={cn(
                'flex w-full flex-col gap-1 px-3 py-2.5 text-left text-[13px] outline-none focus-visible:bg-accent',
                order.id === activeOrderId ? 'bg-crm-selected' : '',
              )}
              onClick={() => onOpen(order.id)}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">{order.reference}</span>
                <StatusTag status={order.fulfilmentStatus} />
              </span>
              <span className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="truncate">{customerLabel(order.customer)}</span>
                <time dateTime={order.submittedAt}>{formatRelative(order.submittedAt)}</time>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
