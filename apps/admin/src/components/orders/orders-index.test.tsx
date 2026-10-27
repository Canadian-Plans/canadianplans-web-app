import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ListWorkspaceOrdersQuery,
  ListWorkspaceOrdersResponse,
  OrderListItem,
  SavedView,
} from '@canadian-plans/contracts';

import { OrdersIndex } from './orders-index';

const mocks = vi.hoisted(() => {
  class BackendError extends Error {
    constructor(
      readonly code: string,
      readonly status: number,
      readonly requestId: string,
    ) {
      super(code);
      this.name = 'BackendError';
    }
  }
  return {
    BackendError,
    listWorkspaceOrders: vi.fn(),
    listOrderAssignees: vi.fn(),
    bulkAssignOrders: vi.fn(),
    listSavedViews: vi.fn(),
    createSavedView: vi.fn(),
    updateSavedView: vi.fn(),
    deleteSavedView: vi.fn(),
    replace: vi.fn(),
  };
});

vi.mock('../../lib/api', () => ({
  BackendError: mocks.BackendError,
  listWorkspaceOrders: mocks.listWorkspaceOrders,
  listOrderAssignees: mocks.listOrderAssignees,
  bulkAssignOrders: mocks.bulkAssignOrders,
  listSavedViews: mocks.listSavedViews,
  createSavedView: mocks.createSavedView,
  updateSavedView: mocks.updateSavedView,
  deleteSavedView: mocks.deleteSavedView,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/w/site-1/orders',
}));

vi.mock('./order-detail', () => ({
  OrderDetailView: ({ orderId, variant }: { orderId: string; variant?: string }) => (
    <p>
      Order detail {orderId} ({variant})
    </p>
  ),
}));

vi.mock('../staff-session-provider', () => ({
  useStaffSession: () => ({
    accessToken: 'staff-token',
    workspaces: [{ id: '10000000-0000-4000-8000-000000000001', slug: 'site-1', name: 'Site 1' }],
  }),
}));

const WORKSPACE = '10000000-0000-4000-8000-000000000001';
const MEMBER = '30000000-0000-4000-8000-000000000001';

function order(index: number): OrderListItem {
  return {
    id: `80000000-0000-4000-8000-00000000000${index}`,
    workspaceId: WORKSPACE,
    reference: `CP-00012${index}`,
    fulfilmentStatus: 'submitted',
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
    customer: { fullName: 'Jane Doe', email: null, phone: null, countryCode: 'CA' },
    source: 'direct',
    submittedAt: '2026-10-20T00:00:00.000Z',
  };
}

function listResponse(
  orders: OrderListItem[] = [order(1), order(2)],
  canManageOrders = true,
): ListWorkspaceOrdersResponse {
  return {
    orders,
    page: { page: 1, pageSize: 50, total: orders.length },
    capabilities: { canManageOrders, canRecordPayment: false, canSearchContact: canManageOrders },
    requestId: '70000000-0000-4000-8000-000000000001',
  };
}

const unpaid: SavedView = {
  id: '61000000-0000-4000-8000-000000000001',
  object: 'orders',
  name: 'Unpaid',
  state: {
    filters: { paymentState: 'pending' },
    sort: { field: 'submittedAt', direction: 'desc' },
    hiddenColumns: [],
  },
  version: 1,
  updatedAt: '2026-10-27T12:00:00.000Z',
};

function lastQuery(): ListWorkspaceOrdersQuery | undefined {
  const calls = mocks.listWorkspaceOrders.mock.calls;
  return calls[calls.length - 1]?.[2];
}

function table() {
  return screen.getByRole('table', { name: 'Orders' });
}

beforeEach(() => {
  mocks.listWorkspaceOrders.mockResolvedValue(listResponse());
  mocks.listOrderAssignees.mockResolvedValue({
    members: [{ membershipId: MEMBER, roles: ['owner'], isSelf: true }],
    requestId: '70000000-0000-4000-8000-000000000002',
  });
  mocks.listSavedViews.mockResolvedValue({
    views: [unpaid],
    requestId: '70000000-0000-4000-8000-000000000003',
  });
});

async function renderIndex(props: Partial<Parameters<typeof OrdersIndex>[0]> = {}) {
  render(<OrdersIndex workspaceSlug="site-1" {...props} />);
  await screen.findByRole('row', { name: /CP-000121/ });
}

describe('OrdersIndex', () => {
  it('loads the default view: active orders, newest first, 50 per page', async () => {
    await renderIndex();
    expect(lastQuery()).toEqual({
      archiveState: 'active',
      sortBy: 'submittedAt',
      sortDirection: 'desc',
      page: 1,
      pageSize: 50,
    });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Orders');
  });

  it('opens a clicked order in the side panel and records only its id in the URL', async () => {
    await renderIndex();
    fireEvent.click(within(table()).getByRole('row', { name: /CP-000121/ }));
    const panel = screen.getByRole('complementary', { name: 'CP-000121' });
    expect(within(panel).getByText(`Order detail ${order(1).id} (panel)`)).toBeTruthy();
    expect(mocks.replace).toHaveBeenLastCalledWith(`/w/site-1/orders?order=${order(1).id}`, {
      scroll: false,
    });
  });

  it('closes the panel with Escape and puts focus back on the order row', async () => {
    await renderIndex();
    fireEvent.click(within(table()).getByRole('row', { name: /CP-000121/ }));
    fireEvent.keyDown(screen.getByRole('complementary'), { key: 'Escape' });
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(document.activeElement?.textContent).toContain('CP-000121');
  });

  it('keeps the open order in the panel after a filter hides it from the list', async () => {
    await renderIndex();
    fireEvent.click(within(table()).getByRole('row', { name: /CP-000121/ }));
    mocks.listWorkspaceOrders.mockResolvedValue(listResponse([order(2)]));
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Status' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Activated' }));
    await waitFor(() => expect(lastQuery()?.status).toBe('activated'));
    await waitFor(() =>
      expect(within(table()).queryByRole('row', { name: /CP-000121/ })).toBeNull(),
    );
    expect(screen.getByRole('complementary', { name: 'CP-000121' })).toBeTruthy();
  });

  it('applies a partner link as an unsaved filter that Reset clears', async () => {
    await renderIndex({ initialPartnerCode: 'MAPLE10' });
    expect(lastQuery()?.partnerCode).toBe('MAPLE10');
    expect(screen.getByText('MAPLE10')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(lastQuery()?.partnerCode).toBeUndefined());
  });

  it('switches to a saved view and loads its filters from page one', async () => {
    await renderIndex();
    fireEvent.click(screen.getByRole('button', { name: /All orders/ }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Unpaid' }));
    await waitFor(() => expect(lastQuery()?.paymentState).toBe('pending'));
    expect(lastQuery()?.page).toBe(1);
    expect(mocks.replace).toHaveBeenLastCalledWith(`/w/site-1/orders?view=${unpaid.id}`, {
      scroll: false,
    });
  });

  it('saves a new view without the search text and says so', async () => {
    mocks.createSavedView.mockResolvedValue({
      view: { ...unpaid, id: '61000000-0000-4000-8000-000000000002', name: 'Waiting' },
      requestId: '70000000-0000-4000-8000-000000000004',
    });
    await renderIndex();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'jane' } });
    fireEvent.submit(screen.getByRole('searchbox'));
    await waitFor(() => expect(lastQuery()?.search).toBe('jane'));

    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Status' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Awaiting customer' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Save as new view' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'New view name' }), {
      target: { value: 'Waiting' },
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save view' }));
    });

    expect(mocks.createSavedView).toHaveBeenCalledWith('staff-token', WORKSPACE, {
      object: 'orders',
      name: 'Waiting',
      state: {
        filters: { archiveState: 'active', status: 'awaiting_customer' },
        sort: { field: 'submittedAt', direction: 'desc' },
        hiddenColumns: [],
      },
    });
    expect(await screen.findByText(/Search is not saved in views/)).toBeTruthy();
  });

  it('explains a duplicate view name from the server', async () => {
    mocks.createSavedView.mockRejectedValue(
      new mocks.BackendError('saved_view_name_taken', 409, '70000000-0000-4000-8000-000000000005'),
    );
    await renderIndex({ initialPartnerCode: 'MAPLE10' });
    fireEvent.click(screen.getByRole('button', { name: 'Save as new view' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'New view name' }), {
      target: { value: 'Unpaid' },
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save view' }));
    });
    expect(await within(dialog).findByText('You already have a view with that name.')).toBeTruthy();
  });

  it('assigns the selected orders and reports the ones that changed meanwhile', async () => {
    mocks.bulkAssignOrders.mockResolvedValue({
      results: [
        { orderId: order(1).id, status: 'assigned', version: 2 },
        { orderId: order(2).id, status: 'version_conflict' },
      ],
      requestId: '70000000-0000-4000-8000-000000000006',
    });
    await renderIndex();
    fireEvent.click(within(table()).getByRole('checkbox', { name: 'Select all orders' }));
    expect(screen.getByText('2 selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await act(async () => {
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'You' }));
    });
    expect(mocks.bulkAssignOrders).toHaveBeenCalledWith('staff-token', WORKSPACE, {
      assigneeId: MEMBER,
      orders: [
        { orderId: order(1).id, expectedVersion: 1 },
        { orderId: order(2).id, expectedVersion: 1 },
      ],
    });
    expect(
      await screen.findByText(
        'Assigned 1 order(s); 1 changed or disappeared and were not assigned.',
      ),
    ).toBeTruthy();
  });

  it('hides selection and assignment from staff who cannot manage orders', async () => {
    mocks.listWorkspaceOrders.mockResolvedValue(listResponse(undefined, false));
    await renderIndex();
    expect(within(table()).queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('searchbox', { name: 'Search by order reference' })).toBeTruthy();
  });

  it('says why the list could not load', async () => {
    mocks.listWorkspaceOrders.mockRejectedValue(
      new mocks.BackendError('permission_denied', 403, '70000000-0000-4000-8000-000000000007'),
    );
    render(<OrdersIndex workspaceSlug="site-1" />);
    expect(
      await screen.findByText('Could not load orders. Reason: permission_denied.'),
    ).toBeTruthy();
  });
});
