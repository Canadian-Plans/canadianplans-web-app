import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OrderColumnKey, OrderListItem } from '@canadian-plans/contracts';

import { OrdersTable } from './orders-table';

const WORKSPACE = '10000000-0000-4000-8000-000000000001';

function order(index: number, overrides: Partial<OrderListItem> = {}): OrderListItem {
  return {
    id: `80000000-0000-4000-8000-00000000000${index}`,
    workspaceId: WORKSPACE,
    reference: `CP-00012${index}`,
    fulfilmentStatus: 'awaiting_customer',
    paymentState: 'pending',
    deliveryState: 'none',
    archiveState: 'active',
    total: { amountMinor: 4500, currency: 'CAD' },
    amountPayableToday: { amountMinor: 0, currency: 'CAD' },
    recordVersion: 1,
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    assigneeId: null,
    partnerCode: null,
    customer: { fullName: 'Jane Doe', email: 'jane@example.test', phone: null, countryCode: 'CA' },
    source: 'utm:google/cpc',
    submittedAt: '2026-10-20T00:00:00.000Z',
    ...overrides,
  };
}

function renderTable(
  props: Partial<Parameters<typeof OrdersTable>[0]> & { hiddenColumns?: OrderColumnKey[] } = {},
) {
  const all = {
    orders: [order(1), order(2)],
    hiddenColumns: [],
    members: [],
    selectable: true,
    selected: [],
    onSelectedChange: vi.fn(),
    activeOrderId: undefined,
    onOpen: vi.fn(),
    workspaceSlug: 'site-1',
    ...props,
  };
  render(<OrdersTable {...all} />);
  return all;
}

function desktopTable() {
  return screen.getByRole('table', { name: 'Orders' });
}

describe('OrdersTable', () => {
  it('leaves out the columns a view hides', () => {
    renderTable({ hiddenColumns: ['source'] });
    const headers = within(desktopTable())
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers).not.toContain('Source');
    expect(headers).toContain('Status');
  });

  it('selects every row from the header and shows a partial selection', () => {
    const props = renderTable();
    fireEvent.click(within(desktopTable()).getByRole('checkbox', { name: 'Select all orders' }));
    expect(props.onSelectedChange).toHaveBeenCalledWith([order(1).id, order(2).id]);
  });

  it('marks the header box as partly selected when only some rows are chosen', () => {
    renderTable({ selected: [order(1).id] });
    const all = within(desktopTable()).getByRole('checkbox', { name: 'Select all orders' });
    expect(all.getAttribute('aria-checked')).toBe('mixed');
  });

  it('opens an order from a row click or the Enter key', () => {
    const props = renderTable();
    const row = within(desktopTable()).getByRole('row', { name: /CP-000121/ });
    fireEvent.click(row);
    expect(props.onOpen).toHaveBeenCalledWith(order(1).id);
    fireEvent.keyDown(within(desktopTable()).getByRole('row', { name: /CP-000122/ }), {
      key: 'Enter',
    });
    expect(props.onOpen).toHaveBeenLastCalledWith(order(2).id);
  });

  it('does not open the order when only its checkbox is clicked', () => {
    const props = renderTable();
    fireEvent.click(
      within(desktopTable()).getByRole('checkbox', { name: 'Select order CP-000121' }),
    );
    expect(props.onSelectedChange).toHaveBeenCalledWith([order(1).id]);
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it('keeps a link to the full order page', () => {
    renderTable();
    const link = within(desktopTable()).getByRole('link', { name: 'Open CP-000121 full page' });
    expect(link.getAttribute('href')).toBe(`/w/site-1/orders/${order(1).id}`);
  });

  it('shows status words and never contact details the backend withheld', () => {
    renderTable({
      orders: [
        order(1, { customer: { fullName: null, email: null, phone: null, countryCode: null } }),
      ],
    });
    const table = desktopTable();
    expect(within(table).getByText('Awaiting customer')).toBeTruthy();
    expect(within(table).queryByText(/example\.test/)).toBeNull();
    expect(within(table).getByText('—')).toBeTruthy();
  });
});
