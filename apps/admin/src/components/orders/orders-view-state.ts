import type {
  AssignableMember,
  ListWorkspaceOrdersQuery,
  OrderArchiveFilter,
  OrderColumnKey,
  OrderSortField,
  OrderViewFilters,
  OrderViewState,
  SortDirection,
} from '@canadian-plans/contracts';

import { ORDER_STATUS_LABELS, PAYMENT_STATE_LABELS } from './format';

/**
 * The orders list's view model (admin CRM Phase 1). A view is a saved
 * `OrderViewState`; the screen edits a draft copy and compares it with the
 * saved one, the way Twenty's view bar does. These helpers hold no business
 * rules: the backend still validates every filter and decides every result.
 */

/** The built-in "All orders" view: active orders, newest first, every column shown. */
export const DEFAULT_ORDER_VIEW_STATE: OrderViewState = {
  filters: { archiveState: 'active' },
  sort: { field: 'submittedAt', direction: 'desc' },
  hiddenColumns: [],
};

export type OrderFilterKey = keyof OrderViewFilters;

export interface FilterChip {
  key: OrderFilterKey;
  label: string;
  value: string;
}

export const ORDER_SORT_LABELS: Readonly<Record<OrderSortField, string>> = {
  submittedAt: 'Submitted',
  updatedAt: 'Last updated',
  reference: 'Reference',
  status: 'Status',
};

export const ORDER_COLUMN_LABELS: Readonly<Record<OrderColumnKey, string>> = {
  customer: 'Customer',
  status: 'Status',
  payment: 'Payment',
  assignee: 'Assignee',
  source: 'Source',
  submittedAt: 'Submitted',
  total: 'Total',
};

export const ORDER_FILTER_LABELS: Readonly<Record<OrderFilterKey, string>> = {
  status: 'Status',
  paymentState: 'Payment',
  assigneeId: 'Assignee',
  partnerCode: 'Partner code',
  source: 'Source',
  submittedFrom: 'Submitted from',
  submittedTo: 'Submitted to',
  archiveState: 'Archive',
};

const ARCHIVE_LABELS: Readonly<Record<OrderArchiveFilter, string>> = {
  active: 'Active',
  archived: 'Archived',
  all: 'All',
};

/** The chip order, matching the filter menu. */
const FILTER_ORDER: readonly OrderFilterKey[] = [
  'status',
  'paymentState',
  'assigneeId',
  'partnerCode',
  'source',
  'submittedFrom',
  'submittedTo',
  'archiveState',
];

/** How an assignee reads in the UI; staff have no display names until Phase 2. */
export function memberName(member: AssignableMember): string {
  return member.isSelf ? 'You' : `Member ${member.membershipId.slice(0, 8)}`;
}

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

export function toListQuery(
  state: OrderViewState,
  search: string,
  page: number,
  pageSize: number,
): ListWorkspaceOrdersQuery {
  const { submittedFrom, submittedTo, ...filters } = state.filters;
  const term = search.trim();
  return {
    ...filters,
    ...(submittedFrom ? { submittedFrom: `${submittedFrom}T00:00:00.000Z` } : {}),
    // The backend's upper bound is exclusive, so the chosen last day is included.
    ...(submittedTo ? { submittedTo: nextDay(submittedTo) } : {}),
    ...(term ? { search: term } : {}),
    sortBy: state.sort.field,
    sortDirection: state.sort.direction,
    page,
    pageSize,
  };
}

function withoutEmpty(filters: OrderViewFilters): OrderViewFilters {
  const kept: OrderViewFilters = {};
  for (const key of FILTER_ORDER) {
    const value = filters[key];
    if (value !== undefined && value !== '') Object.assign(kept, { [key]: value });
  }
  // A missing archive filter means active orders, the backend default.
  if (kept.archiveState === 'active') delete kept.archiveState;
  return kept;
}

function sameFilters(left: OrderViewFilters, right: OrderViewFilters): boolean {
  const a = withoutEmpty(left);
  const b = withoutEmpty(right);
  return FILTER_ORDER.every((key) => a[key] === b[key]);
}

export function isViewDirty(saved: OrderViewState, draft: OrderViewState): boolean {
  const hiddenSaved = [...saved.hiddenColumns].sort().join(',');
  const hiddenDraft = [...draft.hiddenColumns].sort().join(',');
  return (
    !sameFilters(saved.filters, draft.filters) ||
    saved.sort.field !== draft.sort.field ||
    saved.sort.direction !== draft.sort.direction ||
    hiddenSaved !== hiddenDraft
  );
}

export function withFilter<Key extends OrderFilterKey>(
  state: OrderViewState,
  key: Key,
  value: OrderViewFilters[Key] | undefined,
): OrderViewState {
  const filters: OrderViewFilters = { ...state.filters };
  delete filters[key];
  if (value !== undefined && value !== '') Object.assign(filters, { [key]: value });
  return { ...state, filters };
}

export function withSort(
  state: OrderViewState,
  field: OrderSortField,
  direction: SortDirection,
): OrderViewState {
  return { ...state, sort: { field, direction } };
}

export function toggleColumn(state: OrderViewState, column: OrderColumnKey): OrderViewState {
  const hidden = state.hiddenColumns.includes(column)
    ? state.hiddenColumns.filter((item) => item !== column)
    : [...state.hiddenColumns, column];
  return { ...state, hiddenColumns: hidden };
}

function chipValue(
  key: OrderFilterKey,
  filters: OrderViewFilters,
  members: readonly AssignableMember[],
): string | undefined {
  switch (key) {
    case 'status':
      return filters.status && ORDER_STATUS_LABELS[filters.status];
    case 'paymentState':
      return filters.paymentState && PAYMENT_STATE_LABELS[filters.paymentState];
    case 'assigneeId': {
      if (!filters.assigneeId) return undefined;
      const member = members.find((item) => item.membershipId === filters.assigneeId);
      return member ? memberName(member) : 'Unknown member';
    }
    case 'archiveState':
      return filters.archiveState && filters.archiveState !== 'active'
        ? ARCHIVE_LABELS[filters.archiveState]
        : undefined;
    case 'partnerCode':
    case 'source':
    case 'submittedFrom':
    case 'submittedTo':
      return filters[key];
  }
}

export function filterChips(
  state: OrderViewState,
  lookups: { members: readonly AssignableMember[] },
): FilterChip[] {
  return FILTER_ORDER.flatMap((key) => {
    const value = chipValue(key, state.filters, lookups.members);
    return value ? [{ key, label: ORDER_FILTER_LABELS[key], value }] : [];
  });
}
