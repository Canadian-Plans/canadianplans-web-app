import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SourceReport } from './source-report';

const mocks = vi.hoisted(() => ({
  getSourceReport: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  getSourceReport: mocks.getSourceReport,
  BackendError: class extends Error {},
}));

vi.mock('./staff-session-provider', () => ({
  useStaffSession: () => ({
    accessToken: 'staff-token',
    workspaces: [
      {
        id: '10000000-0000-4000-8000-000000000001',
        slug: 'site-1',
        name: 'Site 1',
        roles: ['owner'],
        permissions: [],
      },
      {
        id: '10000000-0000-4000-8000-000000000002',
        slug: 'site-2',
        name: 'Site 2',
        roles: ['owner'],
        permissions: [],
      },
    ],
  }),
}));

describe('SourceReport', () => {
  it('ignores a stale report after the workspace has changed', async () => {
    const oldResponse = await mocks.getSourceReport();
    type Response = Awaited<ReturnType<typeof import('../lib/api').getSourceReport>>;
    let resolveStale: (value: Response) => void = () => undefined;
    const stale = new Promise<Response>((resolve) => {
      resolveStale = resolve;
    });
    mocks.getSourceReport.mockReset();
    mocks.getSourceReport.mockReturnValueOnce(stale).mockResolvedValueOnce({
      groups: [],
      totals: { leads: 0, orders: 0 },
      from: null,
      to: null,
      requestId: 'request',
    });
    const view = render(<SourceReport workspaceSlug="site-1" />);
    await waitFor(() => expect(mocks.getSourceReport).toHaveBeenCalledOnce());
    view.rerender(<SourceReport workspaceSlug="site-2" />);
    await waitFor(() =>
      expect(screen.getByTestId('source-report-totals').textContent).toContain('0 leads'),
    );
    await act(async () => {
      resolveStale(oldResponse);
    });
    expect(screen.queryByText('google')).toBeNull();
  });
  beforeEach(() => {
    mocks.getSourceReport.mockReset();
    mocks.getSourceReport.mockResolvedValue({
      from: null,
      to: null,
      groups: [
        { dimension: 'utm_source', value: 'google', leads: 3, orders: 1 },
        { dimension: 'partner', value: 'MAPLE', leads: 2, orders: 1 },
      ],
      totals: { leads: 5, orders: 2 },
      requestId: '80000000-0000-4000-8000-000000000001',
    });
  });

  it('renders the grouped counts and totals', async () => {
    render(<SourceReport workspaceSlug="site-1" />);

    expect(await screen.findByText('google')).toBeTruthy();
    expect(screen.getByText('Partner')).toBeTruthy();
    expect(screen.getByTestId('source-report-totals').textContent).toContain('5 leads');
    expect(screen.getByTestId('source-report-totals').textContent).toContain('2 orders');
  });

  it('requests the report for the selected UTC date range', async () => {
    render(<SourceReport workspaceSlug="site-1" />);
    await screen.findByText('google');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(mocks.getSourceReport).toHaveBeenLastCalledWith(
        'staff-token',
        '10000000-0000-4000-8000-000000000001',
        { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z' },
      ),
    );
  });
});
