import { afterEach, describe, expect, it, vi } from 'vitest';

import { SupabaseStaffSessionVerifier } from '../src/auth/session.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Supabase staff session verification', () => {
  it('rejects an unsigned token with a forged aal2 payload', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://staff-auth.example.test');
    vi.stubEnv('SUPABASE_ANON_KEY', 'publishable-test-key');
    const request = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'invalid token' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', request);
    const forged =
      'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIyMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDEiLCJhYWwiOiJhYWwyIn0.';

    await expect(new SupabaseStaffSessionVerifier().verify(forged)).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledOnce();
  });
});
