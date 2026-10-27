import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AssignableMember, OrderViewState } from '@canadian-plans/contracts';

import { OrdersFilterMenu, OrdersOptionsMenu, OrdersSortMenu } from './orders-view-menus';
import { DEFAULT_ORDER_VIEW_STATE } from './orders-view-state';

const members: AssignableMember[] = [
  { membershipId: '30000000-0000-4000-8000-000000000001', roles: ['owner'], isSelf: true },
];

function openMenu(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
  return screen.getByRole('dialog');
}

describe('OrdersFilterMenu', () => {
  it('adds a status filter in two clicks: field, then value', () => {
    const onChange = vi.fn<(state: OrderViewState) => void>();
    render(
      <OrdersFilterMenu state={DEFAULT_ORDER_VIEW_STATE} members={members} onChange={onChange} />,
    );
    const menu = openMenu('Filter');
    fireEvent.click(within(menu).getByRole('button', { name: 'Status' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Dispatched' }));
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_ORDER_VIEW_STATE,
      filters: { archiveState: 'active', status: 'dispatched' },
    });
  });

  it('filters by an assignee picked from the member list', () => {
    const onChange = vi.fn<(state: OrderViewState) => void>();
    render(
      <OrdersFilterMenu state={DEFAULT_ORDER_VIEW_STATE} members={members} onChange={onChange} />,
    );
    fireEvent.click(within(openMenu('Filter')).getByRole('button', { name: 'Assignee' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'You' }));
    expect(onChange.mock.calls[0]?.[0].filters.assigneeId).toBe(members[0]?.membershipId);
  });

  it('applies a typed partner code when submitted', () => {
    const onChange = vi.fn<(state: OrderViewState) => void>();
    render(
      <OrdersFilterMenu state={DEFAULT_ORDER_VIEW_STATE} members={members} onChange={onChange} />,
    );
    fireEvent.click(within(openMenu('Filter')).getByRole('button', { name: 'Partner code' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Partner code' }), {
      target: { value: ' MAPLE10 ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(onChange.mock.calls[0]?.[0].filters.partnerCode).toBe('MAPLE10');
  });
});

describe('OrdersSortMenu', () => {
  it('sorts by a field in the chosen direction', () => {
    const onChange = vi.fn<(state: OrderViewState) => void>();
    render(<OrdersSortMenu state={DEFAULT_ORDER_VIEW_STATE} onChange={onChange} />);
    const menu = openMenu('Sort');
    fireEvent.click(within(menu).getByRole('button', { name: 'Ascending' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reference' }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_ORDER_VIEW_STATE,
      sort: { field: 'reference', direction: 'asc' },
    });
  });
});

describe('OrdersOptionsMenu', () => {
  it('hides a column when it is unticked', () => {
    const onChange = vi.fn<(state: OrderViewState) => void>();
    render(<OrdersOptionsMenu state={DEFAULT_ORDER_VIEW_STATE} onChange={onChange} />);
    fireEvent.click(within(openMenu('Options')).getByRole('checkbox', { name: 'Source' }));
    expect(onChange.mock.calls[0]?.[0].hiddenColumns).toEqual(['source']);
  });
});
