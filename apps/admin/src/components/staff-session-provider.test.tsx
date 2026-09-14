import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { StaffWorkspacesResponse } from '@canadian-plans/contracts';
import { StaffSessionProvider, useStaffSession } from './staff-session-provider';

const mocks = vi.hoisted(() => {
  const state: {
    load: ReturnType<typeof vi.fn<() => Promise<StaffWorkspacesResponse>>>;
    changed?: (event: string, session: { access_token: string } | null) => void;
  } = {
    load: vi.fn<() => Promise<StaffWorkspacesResponse>>(),
  };
  return state;
});
vi.mock('../lib/api', () => ({
  getStaffWorkspaces: mocks.load,
  BackendError: class extends Error {},
}));
vi.mock('../lib/supabase-auth', () => ({
  isStaffAuthConfigured: () => true,
  getStaffAuth: () => ({
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (callback: typeof mocks.changed) => {
      mocks.changed = callback;
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  }),
}));
function Status() {
  const session = useStaffSession();
  return (
    <p>
      {session.status}:{session.accessToken ?? 'none'}
    </p>
  );
}
beforeEach(() => {
  mocks.load.mockReset();
});

it('ignores a workspace response arriving after logout', async () => {
  let finish: ((value: StaffWorkspacesResponse) => void) | undefined;
  mocks.load.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(
    <StaffSessionProvider>
      <Status />
    </StaffSessionProvider>,
  );
  await screen.findByText('signed_out:none');
  act(() => mocks.changed?.('SIGNED_IN', { access_token: 'old' }));
  act(() => mocks.changed?.('SIGNED_OUT', null));
  await act(async () =>
    finish?.({ workspaces: [], requestId: '70000000-0000-4000-8000-000000000001' }),
  );
  await waitFor(() => expect(screen.getByText('signed_out:none')).toBeTruthy());
});

it('ignores an older response after switching accounts', async () => {
  let finish: ((value: StaffWorkspacesResponse) => void) | undefined;
  mocks.load.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  mocks.load.mockResolvedValueOnce({
    workspaces: [],
    requestId: '70000000-0000-4000-8000-000000000002',
  });
  render(
    <StaffSessionProvider>
      <Status />
    </StaffSessionProvider>,
  );
  await screen.findByText('signed_out:none');
  act(() => mocks.changed?.('SIGNED_IN', { access_token: 'old' }));
  act(() => mocks.changed?.('SIGNED_IN', { access_token: 'new' }));
  await screen.findByText('signed_in:new');
  await act(async () =>
    finish?.({ workspaces: [], requestId: '70000000-0000-4000-8000-000000000001' }),
  );
  expect(screen.getByText('signed_in:new')).toBeTruthy();
});
