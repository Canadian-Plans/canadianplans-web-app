import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListWorkspaceOrdersResponse } from '@canadian-plans/contracts';

import { OrdersList } from './orders-list';

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
  };
});

vi.mock('../../lib/api', () => ({
  BackendError: mocks.BackendError,
  listWorkspaceOrders: mocks.listWorkspaceOrders,
  listOrderAssignees: mocks.listOrderAssignees,
  bulkAssignOrders: mocks.bulkAssignOrders,
}));

vi.mock('../staff-session-provider', () => ({
  useStaffSession: () => ({
    accessToken: 'staff-token',
    workspaces: [{ id: '10000000-0000-4000-8000-000000000001', slug: 'site-1', name: 'Site 1' }],
  }),
}));

const WORKSPACE = '10000000-0000-4000-8000-000000000001';
const ORDER = '80000000-0000-4000-8000-000000000001';
const MEMBER = '30000000-0000-4000-8000-000000000001';

function listResponse(canManageOrders: boolean): ListWorkspaceOrdersResponse {
  return {
    orders: [
      {
        id: ORDER,
        workspaceId: WORKSPACE,
        reference: 'CP-000123',
        fulfilmentStatus: 'submitted',
        paymentState: 'pending',
        deliveryState: 'none',
        archiveState: 'active',
        total: { amountMinor: 4500, currency: 'CAD' },
        amountPayableToday: { amountMinor: 0, currency: 'CAD' },
        recordVersion: 1,
        createdAt: '2026-09-16T00:00:00.000Z',
        updatedAt: '2026-09-16T00:00:00.000Z',
        assigneeId: null,
        partnerCode: null,
        customer: {
          fullName: 'Synthetic Customer',
          email: 'customer@example.test',
          phone: null,
          countryCode: 'CA',
        },
        source: 'utm:google/cpc',
        submittedAt: '2026-09-16T00:00:00.000Z',
      },
    ],
    page: { page: 1, pageSize: 25, total: 1 },
    capabilities: {
      canManageOrders,
      canRecordPayment: canManageOrders,
      canSearchContact: canManageOrders,
    },
    requestId: 'request',
  };
}

beforeEach(() => {
  mocks.listWorkspaceOrders.mockReset();
  mocks.listOrderAssignees.mockReset();
  mocks.bulkAssignOrders.mockReset();
  mocks.listWorkspaceOrders.mockResolvedValue(listResponse(true));
  mocks.listOrderAssignees.mockResolvedValue({
    members: [{ membershipId: MEMBER, roles: ['orders'], isSelf: true }],
    requestId: 'request',
  });
  mocks.bulkAssignOrders.mockResolvedValue({
    results: [{ orderId: ORDER, status: 'assigned', version: 2 }],
    requestId: 'request',
  });
});

describe('OrdersList', () => {
  it('renders the order row with its source and customer', async () => {
    render(<OrdersList workspaceSlug="site-1" />);

    expect(await screen.findByText('CP-000123')).toBeTruthy();
    expect(screen.getByText('Synthetic Customer')).toBeTruthy();
    expect(screen.getByText('utm:google/cpc')).toBeTruthy();
    // The status badge and the "Submitted" date column header both render.
    expect(screen.getAllByText('Submitted').length).toBeGreaterThan(1);
  });

  it('sends the search term and the archive toggle to the backend', async () => {
    render(<OrdersList workspaceSlug="site-1" />);
    await screen.findByText('CP-000123');

    fireEvent.change(screen.getByLabelText(/Search/), { target: { value: 'jane' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() =>
      expect(mocks.listWorkspaceOrders).toHaveBeenLastCalledWith(
        'staff-token',
        WORKSPACE,
        expect.objectContaining({ search: 'jane', archiveState: 'active' }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
    await waitFor(() =>
      expect(mocks.listWorkspaceOrders).toHaveBeenLastCalledWith(
        'staff-token',
        WORKSPACE,
        expect.objectContaining({ archiveState: 'archived' }),
      ),
    );
  });

  it('shows bulk assignment only when the backend grants order management', async () => {
    render(<OrdersList workspaceSlug="site-1" />);
    await screen.findByText('CP-000123');
    expect(screen.getByRole('heading', { name: 'Bulk assign' })).toBeTruthy();
    expect(screen.getByLabelText('Select order CP-000123')).toBeTruthy();
  });

  it('hides bulk assignment and contact search from a viewer', async () => {
    mocks.listWorkspaceOrders.mockResolvedValue(listResponse(false));
    render(<OrdersList workspaceSlug="site-1" />);
    await screen.findByText('CP-000123');

    expect(screen.queryByRole('heading', { name: 'Bulk assign' })).toBeNull();
    expect(screen.queryByLabelText('Select order CP-000123')).toBeNull();
    expect(screen.getByLabelText('Search (reference)')).toBeTruthy();
  });

  it('sends the selected rows and their versions when bulk assigning', async () => {
    render(<OrdersList workspaceSlug="site-1" />);
    await screen.findByText('CP-000123');

    fireEvent.click(screen.getByLabelText('Select order CP-000123'));
    fireEvent.click(screen.getByRole('button', { name: 'Unassign selected' }));

    await waitFor(() =>
      expect(mocks.bulkAssignOrders).toHaveBeenCalledWith('staff-token', WORKSPACE, {
        assigneeId: null,
        orders: [{ orderId: ORDER, expectedVersion: 1 }],
      }),
    );
  });

  it('surfaces a partial bulk-assignment failure instead of reporting success', async () => {
    mocks.bulkAssignOrders.mockResolvedValue({
      results: [{ orderId: ORDER, status: 'version_conflict' }],
      requestId: 'request',
    });
    render(<OrdersList workspaceSlug="site-1" />);
    await screen.findByText('CP-000123');

    fireEvent.click(screen.getByLabelText('Select order CP-000123'));
    fireEvent.click(screen.getByRole('button', { name: 'Unassign selected' }));

    expect(await screen.findByText(/changed or disappeared and were not assigned/i)).toBeTruthy();
  });
});
