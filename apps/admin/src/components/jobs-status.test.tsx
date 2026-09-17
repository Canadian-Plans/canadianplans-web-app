import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobsStatus } from './jobs-status';

const mocks = vi.hoisted(() => ({
  listWorkspaceJobs: vi.fn(),
  retryWorkspaceJob: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  ...mocks,
  BackendError: class extends Error {},
}));

vi.mock('./staff-session-provider', () => ({
  useStaffSession: () => ({
    accessToken: 'staff-token',
    workspaces: [{ id: '10000000-0000-4000-8000-000000000001', slug: 'site-1' }],
  }),
}));

const failedJob = {
  id: '70000000-0000-4000-8000-000000000001',
  jobType: 'order_acknowledgement_email',
  status: 'failed',
  attempts: 8,
  availableAt: '2026-09-16T00:00:00.000Z',
  leaseExpiresAt: null,
  lastErrorCode: 'provider_error',
  createdAt: '2026-09-16T00:00:00.000Z',
  updatedAt: '2026-09-16T00:00:00.000Z',
};

describe('JobsStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listWorkspaceJobs.mockResolvedValue({
      jobs: [failedJob],
      canRetry: true,
      requestId: '90000000-0000-4000-8000-000000000001',
    });
    mocks.retryWorkspaceJob.mockResolvedValue({
      jobId: failedJob.id,
      status: 'pending',
      requestId: '90000000-0000-4000-8000-000000000003',
    });
  });

  it('shows failed jobs and lets integration managers retry them', async () => {
    render(<JobsStatus workspaceSlug="site-1" />);
    expect(await screen.findByText('order_acknowledgement_email')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.retryWorkspaceJob).toHaveBeenCalledWith(
      'staff-token',
      '10000000-0000-4000-8000-000000000001',
      failedJob.id,
    );
  });

  it('hides retry when integration management is absent', async () => {
    mocks.listWorkspaceJobs.mockResolvedValue({
      jobs: [failedJob],
      canRetry: false,
      requestId: '90000000-0000-4000-8000-000000000001',
    });
    render(<JobsStatus workspaceSlug="site-1" />);
    expect(await screen.findByText('order_acknowledgement_email')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
