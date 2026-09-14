import { afterEach, describe, expect, it, vi } from 'vitest';

import { getStaffWorkspaces } from './api.js';

afterEach(() => vi.unstubAllGlobals());

describe('staff backend client', () => {
  it('attaches the Supabase access token and validates workspace responses', async () => {
    const request = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            workspaces: [
              {
                id: '10000000-0000-4000-8000-000000000001',
                slug: 'site-1',
                name: 'Northern Arrival Mobile',
                membershipId: '30000000-0000-4000-8000-000000000001',
                roles: ['owner'],
              },
            ],
            requestId: '70000000-0000-4000-8000-000000000001',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', request);

    const result = await getStaffWorkspaces('verified-access-token');

    expect(result.workspaces.map((workspace) => workspace.slug)).toEqual(['site-1']);
    expect(request).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/staff/workspaces',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({ authorization: 'Bearer verified-access-token' }),
      }),
    );
  });
});
