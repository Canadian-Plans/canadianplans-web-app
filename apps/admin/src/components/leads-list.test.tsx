import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeadsList } from './leads-list';

const mocks = vi.hoisted(() => ({
  getStaffLeads: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  getStaffLeads: mocks.getStaffLeads,
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
    ],
  }),
}));

describe('LeadsList', () => {
  beforeEach(() => {
    mocks.getStaffLeads.mockReset();
    mocks.getStaffLeads.mockResolvedValue({
      leads: [
        {
          id: '90000000-0000-4000-8000-000000000001',
          workspaceId: '10000000-0000-4000-8000-000000000001',
          status: 'incomplete',
          contact: { fullName: 'Synthetic Customer' },
          source: 'utm:google/cpc',
          attribution: { utmSource: 'google', utmMedium: 'cpc' },
          selectedOfferVersionId: null,
          consentVersion: 'terms-test',
          createdAt: '2026-09-16T00:00:00.000Z',
          updatedAt: '2026-09-16T00:00:00.000Z',
        },
      ],
      page: { page: 1, pageSize: 25, total: 1 },
    });
  });

  it('renders lead attribution and requests the incomplete filter', async () => {
    render(<LeadsList workspaceSlug="site-1" />);

    expect(await screen.findByText('Synthetic Customer')).toBeTruthy();
    expect(screen.getByText('utm:google/cpc')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Incomplete' }));

    await waitFor(() =>
      expect(mocks.getStaffLeads).toHaveBeenLastCalledWith(
        'staff-token',
        '10000000-0000-4000-8000-000000000001',
        { status: 'incomplete' },
      ),
    );
  });
});
