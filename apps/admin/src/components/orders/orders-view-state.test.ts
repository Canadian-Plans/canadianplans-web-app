import { describe, expect, it } from 'vitest';
import type { AssignableMember, OrderViewState } from '@canadian-plans/contracts';

import {
  DEFAULT_ORDER_VIEW_STATE,
  filterChips,
  isViewDirty,
  toListQuery,
  toggleColumn,
  withFilter,
  withSort,
} from './orders-view-state';

const SELF = '30000000-0000-4000-8000-000000000001';
const COLLEAGUE = '30000000-0000-4000-8000-000000000002';
const GONE = '30000000-0000-4000-8000-0000000000ff';

const members: AssignableMember[] = [
  { membershipId: SELF, roles: ['owner'], isSelf: true },
  { membershipId: COLLEAGUE, roles: ['orders'], isSelf: false },
];

describe('toListQuery', () => {
  it('turns the default view and a padded search into the backend query', () => {
    expect(toListQuery(DEFAULT_ORDER_VIEW_STATE, '  CP-1 ', 1, 50)).toEqual({
      archiveState: 'active',
      search: 'CP-1',
      sortBy: 'submittedAt',
      sortDirection: 'desc',
      page: 1,
      pageSize: 50,
    });
  });

  it('sends no search when the box is blank', () => {
    expect(toListQuery(DEFAULT_ORDER_VIEW_STATE, '   ', 2, 50).search).toBeUndefined();
  });

  it('turns calendar days into an inclusive start and an exclusive end', () => {
    const state = withFilter(
      withFilter(DEFAULT_ORDER_VIEW_STATE, 'submittedFrom', '2026-10-01'),
      'submittedTo',
      '2026-10-27',
    );
    const query = toListQuery(state, '', 1, 50);
    expect(query.submittedFrom).toBe('2026-10-01T00:00:00.000Z');
    expect(query.submittedTo).toBe('2026-10-28T00:00:00.000Z');
  });
});

describe('isViewDirty', () => {
  it('ignores the order of hidden columns', () => {
    const saved: OrderViewState = {
      ...DEFAULT_ORDER_VIEW_STATE,
      hiddenColumns: ['source', 'total'],
    };
    const draft: OrderViewState = {
      ...DEFAULT_ORDER_VIEW_STATE,
      hiddenColumns: ['total', 'source'],
    };
    expect(isViewDirty(saved, draft)).toBe(false);
  });

  it('treats a missing archive filter as the default active orders', () => {
    const draft = withFilter(DEFAULT_ORDER_VIEW_STATE, 'archiveState', undefined);
    expect(isViewDirty(DEFAULT_ORDER_VIEW_STATE, draft)).toBe(false);
  });

  it('notices a new filter, sort or column change', () => {
    expect(
      isViewDirty(
        DEFAULT_ORDER_VIEW_STATE,
        withFilter(DEFAULT_ORDER_VIEW_STATE, 'status', 'dispatched'),
      ),
    ).toBe(true);
    expect(
      isViewDirty(DEFAULT_ORDER_VIEW_STATE, withSort(DEFAULT_ORDER_VIEW_STATE, 'reference', 'asc')),
    ).toBe(true);
    expect(
      isViewDirty(DEFAULT_ORDER_VIEW_STATE, toggleColumn(DEFAULT_ORDER_VIEW_STATE, 'source')),
    ).toBe(true);
  });

  it('marks a partner link arriving on the default view as an unsaved change', () => {
    const draft = withFilter(DEFAULT_ORDER_VIEW_STATE, 'partnerCode', 'MAPLE10');
    expect(isViewDirty(DEFAULT_ORDER_VIEW_STATE, draft)).toBe(true);
    expect(filterChips(draft, { members })).toEqual([
      { key: 'partnerCode', label: 'Partner code', value: 'MAPLE10' },
    ]);
  });
});

describe('toggleColumn', () => {
  it('hides a shown column and shows it again', () => {
    const hidden = toggleColumn(DEFAULT_ORDER_VIEW_STATE, 'source');
    expect(hidden.hiddenColumns).toEqual(['source']);
    expect(toggleColumn(hidden, 'source').hiddenColumns).toEqual([]);
  });
});

describe('filterChips', () => {
  it('describes each active filter in words', () => {
    const state: OrderViewState = {
      ...DEFAULT_ORDER_VIEW_STATE,
      filters: {
        status: 'awaiting_customer',
        paymentState: 'pending',
        assigneeId: SELF,
        archiveState: 'archived',
        submittedFrom: '2026-10-01',
      },
    };
    expect(filterChips(state, { members })).toEqual([
      { key: 'status', label: 'Status', value: 'Awaiting customer' },
      { key: 'paymentState', label: 'Payment', value: 'Pending' },
      { key: 'assigneeId', label: 'Assignee', value: 'You' },
      { key: 'submittedFrom', label: 'Submitted from', value: '2026-10-01' },
      { key: 'archiveState', label: 'Archive', value: 'Archived' },
    ]);
  });

  it('shows no chip for the default active-orders archive filter', () => {
    expect(filterChips(DEFAULT_ORDER_VIEW_STATE, { members })).toEqual([]);
  });

  it('keeps a saved assignee who has since left as a removable "Unknown member" chip', () => {
    const state = withFilter(DEFAULT_ORDER_VIEW_STATE, 'assigneeId', GONE);
    expect(filterChips(state, { members })).toEqual([
      { key: 'assigneeId', label: 'Assignee', value: 'Unknown member' },
    ]);
    expect(filterChips(withFilter(state, 'assigneeId', undefined), { members })).toEqual([]);
  });
});
