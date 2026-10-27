import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { builtInLeadFields } from '@canadian-plans/contracts';
import { LeadsList } from './leads-list';

const mocks = vi.hoisted(() => ({
  model: vi.fn(),
  search: vi.fn(),
  views: vi.fn(),
  createView: vi.fn(),
}));
vi.mock('./leads/shared', async (original) => ({
  ...(await original<typeof import('./leads/shared')>()),
  useLeadWorkspace: () => ({ api: mocks, workspaceId: '10000000-0000-4000-8000-000000000001' }),
}));
const response = {
  leads: [
    {
      id: '90000000-0000-4000-8000-000000000001',
      leadType: 'sim',
      status: 'incomplete',
      fields: { fullName: 'Synthetic Customer' },
    },
  ],
  page: { page: 1, pageSize: 25, total: 26 },
};
describe('LeadsList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.history.replaceState(null, '', '/');
    mocks.model.mockResolvedValue({
      fields: builtInLeadFields,
      settings: { name: 'Leads' },
      capabilities: { canReadPersonal: true, canManageDataModel: true },
    });
    mocks.views.mockResolvedValue({ views: [] });
    mocks.search.mockResolvedValue(response);
  });
  it('paginates and resets the page when status changes', async () => {
    render(<LeadsList workspaceSlug="site-1" />);
    await screen.findByText('Synthetic Customer');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(mocks.search).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ page: 2 }),
      ),
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Lead status' }), {
      target: { value: 'incomplete' },
    });
    await waitFor(() =>
      expect(mocks.search).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'incomplete', page: 1 }),
      ),
    );
  });
  it('keeps newer filter results when the initial response arrives late', async () => {
    let resolveStale: (value: typeof response) => void = () => undefined;
    mocks.search
      .mockReturnValueOnce(
        new Promise<typeof response>((resolve) => {
          resolveStale = resolve;
        }),
      )
      .mockResolvedValueOnce({ leads: [], page: { page: 1, pageSize: 25, total: 0 } });
    render(<LeadsList workspaceSlug="site-1" />);
    await waitFor(() => expect(mocks.search).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByRole('combobox', { name: 'Lead status' }), {
      target: { value: 'submitted' },
    });
    await screen.findByText('No leads match this view.');
    await act(async () => resolveStale(response));
    expect(screen.queryByText('Synthetic Customer')).toBeNull();
  });
  it('sends personal filters in the request body and keeps them out of the URL', async () => {
    render(<LeadsList workspaceSlug="site-1" />);
    await screen.findByText('Synthetic Customer');
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Field' }), {
      target: { value: 'email' },
    });
    fireEvent.change(screen.getByLabelText('Filter value'), {
      target: { value: 'private@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filter' }));
    await waitFor(() =>
      expect(mocks.search).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          filters: [expect.objectContaining({ key: 'email', value: 'private@example.test' })],
        }),
      ),
    );
    expect(window.location.search).toBe('');
  });
  it('does not load personal views or show field controls without personal access', async () => {
    mocks.model.mockResolvedValue({
      fields: [],
      settings: { name: 'Leads' },
      capabilities: { canReadPersonal: false, canManageDataModel: false },
    });
    render(<LeadsList workspaceSlug="site-1" />);
    await screen.findByText('incomplete');
    expect(mocks.views).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Add filter' })).toBeNull();
    expect(screen.queryByText('Manage fields')).toBeNull();
    expect(mocks.search).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ columns: [], filters: [] }),
    );
  });
  it('announces the selected sort on the column header', async () => {
    render(<LeadsList workspaceSlug="site-1" />);
    await screen.findByText('Synthetic Customer');
    fireEvent.click(screen.getByRole('button', { name: 'Full name' }));
    await waitFor(() =>
      expect(
        screen.getByRole('columnheader', { name: /Full name/ }).getAttribute('aria-sort'),
      ).toBe('ascending'),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Full name/ }));
    await waitFor(() =>
      expect(
        screen.getByRole('columnheader', { name: /Full name/ }).getAttribute('aria-sort'),
      ).toBe('descending'),
    );
  });
});
