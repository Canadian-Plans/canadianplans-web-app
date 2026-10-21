import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomerDataDeletion } from './customer-data-deletion';

const { mocks, FakeBackendError } = vi.hoisted(() => ({
  mocks: { findDeletionSubjects: vi.fn(), requestSubjectDeletion: vi.fn() },
  FakeBackendError: class extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  },
}));

vi.mock('../lib/api', () => ({ ...mocks, BackendError: FakeBackendError }));

vi.mock('./staff-session-provider', () => ({
  useStaffSession: () => ({
    accessToken: 'staff-token',
    workspaces: [{ id: '10000000-0000-4000-8000-000000000001', slug: 'site-1' }],
  }),
}));

const WORKSPACE = '10000000-0000-4000-8000-000000000001';
const order = {
  subjectType: 'order',
  subjectId: '20000000-0000-4000-8000-000000000001',
  reference: 'CP-1001',
  createdAt: '2026-10-01T00:00:00.000Z',
};
const draft = {
  subjectType: 'lead',
  subjectId: '30000000-0000-4000-8000-000000000001',
  reference: null,
  createdAt: '2026-10-02T00:00:00.000Z',
};

async function searchFor(address: string) {
  render(<CustomerDataDeletion workspaceSlug="site-1" />);
  fireEvent.change(screen.getByLabelText("Requester's email address"), {
    target: { value: address },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find records' }));
  await screen.findByText('Records for this address');
}

describe('CustomerDataDeletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findDeletionSubjects.mockResolvedValue({
      page: 1,
      hasMore: false,
      subjects: [order, draft],
      requestId: '90000000-0000-4000-8000-000000000001',
    });
    mocks.requestSubjectDeletion.mockResolvedValue({
      subjectType: 'lead',
      subjectId: draft.subjectId,
      deletionId: '40000000-0000-4000-8000-000000000001',
      ledgerStatus: 'pending_acknowledgement',
      cleanupStatus: 'pending',
      requestId: '90000000-0000-4000-8000-000000000002',
    });
  });

  it('lists the records found without deleting anything', async () => {
    await searchFor('pat@example.test');
    expect(mocks.findDeletionSubjects).toHaveBeenCalledWith('staff-token', WORKSPACE, {
      email: 'pat@example.test',
      page: 1,
    });
    expect(screen.getByText('Order')).toBeTruthy();
    expect(screen.getByText('Unsubmitted draft')).toBeTruthy();
    expect(mocks.requestSubjectDeletion).not.toHaveBeenCalled();
  });

  it('deletes only the selected record after explicit verification', async () => {
    await searchFor('pat@example.test');
    fireEvent.click(
      screen.getByRole('button', { name: `Delete Unsubmitted draft ${draft.subjectId}` }),
    );
    const confirm = screen.getByRole('button', { name: 'Delete customer data' });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(confirm);
    expect(await screen.findByText('Restricted, awaiting ledger')).toBeTruthy();
    expect(mocks.requestSubjectDeletion).toHaveBeenCalledTimes(1);
    expect(mocks.requestSubjectDeletion).toHaveBeenCalledWith(
      'staff-token',
      WORKSPACE,
      'lead',
      draft.subjectId,
      { reason: 'Verified customer deletion request' },
    );
    expect(screen.getByRole('button', { name: 'Delete Order CP-1001' })).toBeTruthy();
  });

  it('sends staff to verify MFA when the backend requires it', async () => {
    mocks.requestSubjectDeletion.mockRejectedValue(new FakeBackendError('mfa_required'));
    await searchFor('pat@example.test');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Order CP-1001' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete customer data' }));
    expect(await screen.findByRole('link', { name: 'Verify now' })).toBeTruthy();
  });
});
