import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogueStatus } from './catalogue-status';

const mocks = vi.hoisted(() => ({ getCatalogueStatus: vi.fn() }));

vi.mock('../lib/api', () => ({
  getCatalogueStatus: mocks.getCatalogueStatus,
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
        roles: ['content'],
      },
    ],
  }),
}));

describe('CatalogueStatus', () => {
  beforeEach(() => {
    mocks.getCatalogueStatus.mockReset();
    mocks.getCatalogueStatus.mockResolvedValue({
      sync: {
        lastAttemptAt: '2026-09-16T00:00:00.000Z',
        lastSuccessAt: '2026-09-16T00:00:00.000Z',
        lastErrorCode: null,
      },
      offers: [
        {
          productId: '30000000-0000-4000-8000-000000000001',
          productKey: 'rogers-sim-5gb',
          available: true,
          offerVersionId: '60000000-0000-4000-8000-000000000001',
          contentHash: 'sha256:test',
          offerName: 'Rogers 5GB',
          currency: 'CAD',
          cmsRevisionId: 'rev-1',
          lastSyncedAt: '2026-09-16T00:00:00.000Z',
        },
      ],
      errors: [],
      requestId: '90000000-0000-4000-8000-000000000001',
    });
  });

  it('renders last sync state and current offer versions read-only', async () => {
    render(<CatalogueStatus workspaceSlug="site-1" />);
    expect(await screen.findByText('rogers-sim-5gb')).toBeTruthy();
    expect(screen.getByText('Rogers 5GB')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
    expect(mocks.getCatalogueStatus).toHaveBeenCalledWith(
      'staff-token',
      '10000000-0000-4000-8000-000000000001',
    );
  });
});
