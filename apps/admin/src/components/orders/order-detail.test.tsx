import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderDetail, OrderFulfilmentStatus } from '@canadian-plans/contracts';

import { OrderDetailView } from './order-detail';

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
    getWorkspaceOrder: vi.fn(),
    listOrderAssignees: vi.fn(),
    patchWorkspaceOrder: vi.fn(),
    patchOrderAssignee: vi.fn(),
    patchOrderArchive: vi.fn(),
    createOrderNote: vi.fn(),
    createOrderReminder: vi.fn(),
    deleteOrderReminder: vi.fn(),
    createOrderChangeRequest: vi.fn(),
    resolveOrderChangeRequest: vi.fn(),
    recordOrderPayment: vi.fn(),
  };
});

vi.mock('../../lib/api', () => ({
  BackendError: mocks.BackendError,
  getWorkspaceOrder: mocks.getWorkspaceOrder,
  listOrderAssignees: mocks.listOrderAssignees,
  patchWorkspaceOrder: mocks.patchWorkspaceOrder,
  patchOrderAssignee: mocks.patchOrderAssignee,
  patchOrderArchive: mocks.patchOrderArchive,
  createOrderNote: mocks.createOrderNote,
  createOrderReminder: mocks.createOrderReminder,
  deleteOrderReminder: mocks.deleteOrderReminder,
  createOrderChangeRequest: mocks.createOrderChangeRequest,
  resolveOrderChangeRequest: mocks.resolveOrderChangeRequest,
  recordOrderPayment: mocks.recordOrderPayment,
}));

vi.mock('../staff-session-provider', () => ({
  useStaffSession: () => ({
    accessToken: 'staff-token',
    workspaces: [{ id: '10000000-0000-4000-8000-000000000001', slug: 'site-1', name: 'Site 1' }],
  }),
}));

const ORDER = '80000000-0000-4000-8000-000000000001';

/** The same edges the backend enforces; the test double only mirrors them. */
const TRANSITIONS: Readonly<Record<OrderFulfilmentStatus, readonly OrderFulfilmentStatus[]>> = {
  submitted: ['in_progress', 'cancelled'],
  in_progress: ['awaiting_customer', 'ready_for_delivery', 'cancelled'],
  awaiting_customer: ['in_progress', 'cancelled'],
  ready_for_delivery: ['dispatched', 'cancelled'],
  dispatched: ['activated', 'cancelled'],
  activated: [],
  cancelled: [],
};

const DEFAULT_CAPABILITIES = {
  canManageOrders: true,
  canRecordPayment: true,
  canSearchContact: true,
};

function order(overrides: Partial<OrderDetail> = {}): OrderDetail {
  const status = overrides.fulfilmentStatus ?? 'submitted';
  return {
    id: ORDER,
    workspaceId: '10000000-0000-4000-8000-000000000001',
    reference: 'CP-000123',
    fulfilmentStatus: status,
    paymentState: 'pending',
    deliveryState: 'none',
    archiveState: 'active',
    total: { amountMinor: 4500, currency: 'CAD' },
    amountPayableToday: { amountMinor: 2500, currency: 'CAD' },
    recordVersion: 1,
    createdAt: '2026-09-16T00:00:00.000Z',
    updatedAt: '2026-09-16T00:00:00.000Z',
    assigneeId: null,
    partnerCode: null,
    customer: {
      fullName: 'Synthetic Customer',
      email: 'customer@example.test',
      phone: '+14165550123',
      countryCode: 'CA',
    },
    source: 'direct',
    submittedAt: '2026-09-16T00:00:00.000Z',
    snapshot: {
      quoteId: '90000000-0000-4000-8000-000000000001',
      productId: '91000000-0000-4000-8000-000000000001',
      offerVersionId: '92000000-0000-4000-8000-000000000001',
      offer: {
        productKey: 'rogers-basic',
        productTitle: 'Rogers Basic',
        productType: 'sim',
        offerName: 'Basic 10 GB',
        currency: 'CAD',
        recurringChargeAmountMinor: 4500,
        oneTimeFees: [],
        amountPayableTodayMinor: 2500,
        paymentRequired: true,
        documentChecklist: ['passport'],
        eligibility: 'New arrivals',
        availability: 'Canada',
        billingParty: 'Rogers',
        contractTerms: [{ _type: 'block', children: [] }],
        termsVersion: 'terms-2026-09',
        specs: { carrier: 'Rogers', dataAllowance: '10 GB' },
      },
      currency: 'CAD',
      charges: [
        { code: 'base', label: 'Monthly plan', amount: { amountMinor: 4500, currency: 'CAD' } },
      ],
      total: { amountMinor: 4500, currency: 'CAD' },
      amountPayableToday: { amountMinor: 2500, currency: 'CAD' },
      paymentRequired: true,
      documentChecklist: ['passport'],
      termsVersion: 'terms-2026-09',
    },
    payload: { schemaVersion: 1, payload: { destination: 'Toronto' } },
    consent: { termsVersion: 'terms-2026-09', marketingOptIn: false },
    history: [],
    audit: [],
    notes: [],
    reminders: [],
    changeRequests: [],
    amendments: [],
    payments: [],
    dispatch: null,
    ...overrides,
    // Recomputed last so a status change in the test double always carries the
    // transitions the backend would derive for that status.
    allowedTransitions: [...TRANSITIONS[status]],
    capabilities: overrides.capabilities ?? DEFAULT_CAPABILITIES,
  };
}

let current: OrderDetail;

/** Elements expose `disabled` only on form controls; this keeps the check cast-free. */
function isDisabled(element: HTMLElement): boolean {
  return element instanceof HTMLButtonElement && element.disabled;
}

function refreshFromState() {
  mocks.getWorkspaceOrder.mockImplementation(async () => ({
    order: current,
    requestId: 'request',
  }));
}

beforeEach(() => {
  current = order();
  mocks.getWorkspaceOrder.mockReset();
  mocks.listOrderAssignees.mockReset();
  mocks.patchWorkspaceOrder.mockReset();
  mocks.patchOrderAssignee.mockReset();
  mocks.patchOrderArchive.mockReset();
  mocks.createOrderNote.mockReset();
  mocks.createOrderReminder.mockReset();
  mocks.deleteOrderReminder.mockReset();
  mocks.createOrderChangeRequest.mockReset();
  mocks.resolveOrderChangeRequest.mockReset();
  mocks.recordOrderPayment.mockReset();
  refreshFromState();
  mocks.listOrderAssignees.mockResolvedValue({
    members: [
      { membershipId: '30000000-0000-4000-8000-000000000001', roles: ['orders'], isSelf: true },
    ],
    requestId: 'request',
  });
  mocks.patchWorkspaceOrder.mockImplementation(
    async (
      _token: string,
      _workspaceId: string,
      _orderId: string,
      body: { action: string; toStatus?: OrderFulfilmentStatus; courier?: string },
    ) => {
      const toStatus =
        body.action === 'activate'
          ? 'activated'
          : body.action === 'dispatch'
            ? 'dispatched'
            : body.toStatus;
      if (!toStatus) throw new Error('unexpected action in test double');
      current = order({
        ...current,
        fulfilmentStatus: toStatus,
        deliveryState: toStatus === 'dispatched' ? 'dispatched' : current.deliveryState,
        recordVersion: current.recordVersion + 1,
      });
      return { order: current, requestId: 'request' };
    },
  );
});

async function renderDetail() {
  render(<OrderDetailView workspaceSlug="site-1" orderId={ORDER} />);
  expect(await screen.findByText('CP-000123')).toBeTruthy();
}

describe('OrderDetailView role-aware actions', () => {
  it('renders no processing actions for a viewer', async () => {
    current = order({
      capabilities: { canManageOrders: false, canRecordPayment: false, canSearchContact: false },
    });
    await renderDetail();

    expect(
      screen.getByText('Your access lets you view this order but not change it.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Move to/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dispatch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Activate' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
  });

  it('renders only the transitions the backend allows, so a finance actor sees no Activate', async () => {
    await renderDetail();

    expect(screen.getByRole('button', { name: 'Move to In progress' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Dispatch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Activate' })).toBeNull();
  });

  it('hides Dispatch and Activate until the backend adds them to the allowed set', async () => {
    current = order({ fulfilmentStatus: 'ready_for_delivery' });
    await renderDetail();
    expect(screen.getByRole('button', { name: 'Dispatch' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Activate' })).toBeNull();
  });
});

describe('OrderDetailView optimistic concurrency', () => {
  it('reports a stale edit as changed by someone else and offers a reload', async () => {
    mocks.patchWorkspaceOrder.mockRejectedValueOnce(
      new mocks.BackendError('version_conflict', 409, 'request'),
    );
    await renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Move to In progress' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/changed by someone else/i);
    const callsBeforeReload = mocks.getWorkspaceOrder.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Reload order' }));
    await waitFor(() =>
      expect(mocks.getWorkspaceOrder.mock.calls.length).toBeGreaterThan(callsBeforeReload),
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('surfaces a gated action rather than hiding it', async () => {
    current = order({ fulfilmentStatus: 'dispatched', partnerCode: 'MAPLE10' });
    mocks.patchWorkspaceOrder.mockRejectedValueOnce(
      new mocks.BackendError('feature_not_ready', 409, 'request'),
    );
    await renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Activate' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/not enabled yet/i);
  });
});

describe('OrderDetailView cancellation', () => {
  it('blocks cancellation until a reason is entered and then sends it', async () => {
    await renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
    const confirm = await screen.findByRole('button', { name: 'Confirm cancellation' });
    expect(isDisabled(confirm)).toBe(true);

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'customer withdrew the request' },
    });
    expect(isDisabled(confirm)).toBe(false);
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(mocks.patchWorkspaceOrder).toHaveBeenCalledWith(
        'staff-token',
        '10000000-0000-4000-8000-000000000001',
        ORDER,
        { action: 'cancel', reason: 'customer withdrew the request', expectedVersion: 1 },
      ),
    );
  });
});

describe('OrderDetailView end-to-end processing', () => {
  it('processes an order from submitted to activated through the UI', async () => {
    await renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Move to In progress' }));
    expect(await screen.findByRole('button', { name: 'Move to Ready for delivery' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Move to Ready for delivery' }));
    const dispatch = await screen.findByRole('button', { name: 'Dispatch' });

    fireEvent.click(dispatch);
    const record = await screen.findByRole('button', { name: 'Record dispatch' });
    expect(isDisabled(record)).toBe(true);
    fireEvent.change(screen.getByLabelText('Courier'), { target: { value: 'Canada Post' } });
    fireEvent.change(screen.getByLabelText('Tracking reference'), { target: { value: 'CP-1' } });
    fireEvent.click(record);

    const activate = await screen.findByRole('button', { name: 'Activate' });
    fireEvent.click(activate);

    await waitFor(() => expect(current.fulfilmentStatus).toBe('activated'));
    expect(screen.getAllByText('Activated').length).toBeGreaterThan(0);
    expect(mocks.patchWorkspaceOrder).toHaveBeenCalledWith(
      'staff-token',
      '10000000-0000-4000-8000-000000000001',
      ORDER,
      { action: 'dispatch', courier: 'Canada Post', trackingReference: 'CP-1', expectedVersion: 3 },
    );
    expect(mocks.patchWorkspaceOrder).toHaveBeenLastCalledWith(
      'staff-token',
      '10000000-0000-4000-8000-000000000001',
      ORDER,
      { action: 'activate', expectedVersion: 4 },
    );
  });
});

describe('OrderDetailView payment recording', () => {
  it('records a manual payment against the snapshot amount', async () => {
    mocks.recordOrderPayment.mockResolvedValue({ order: current, requestId: 'request' });
    await renderDetail();

    fireEvent.change(screen.getByLabelText('Amount (CAD)'), { target: { value: '25.00' } });
    fireEvent.change(screen.getByLabelText('Method'), { target: { value: 'interac' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));

    await waitFor(() =>
      expect(mocks.recordOrderPayment).toHaveBeenCalledWith(
        'staff-token',
        '10000000-0000-4000-8000-000000000001',
        ORDER,
        { paymentState: 'pending', method: 'interac', amountMinor: 2500, expectedVersion: 1 },
      ),
    );
  });
});
