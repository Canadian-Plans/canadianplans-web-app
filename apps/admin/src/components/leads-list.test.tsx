import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { builtInLeadFields } from '@canadian-plans/contracts';
import { LeadsList } from './leads-list';

const mocks = vi.hoisted(() => ({
  model: vi.fn(),
  search: vi.fn(),
  views: vi.fn(),
  createView: vi.fn(),
  updateView: vi.fn(),
  deleteView: vi.fn(),
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
  const savedView = {
    id: '80000000-0000-4000-8000-000000000001',
    name: 'Arriving soon',
    version: 3,
    state: { columns: ['fullName'], filters: [] },
  };
  const selectedView = () => {
    const select = screen.getByRole('combobox', { name: 'Personal view' });
    return select instanceof HTMLSelectElement ? select.value : '';
  };
  it('saves changed filters into the open view and keeps it selected', async () => {
    mocks.views.mockResolvedValue({ views: [savedView] });
    mocks.updateView.mockImplementation(
      async (_workspace: string, id: string, body: { name: string; state: unknown }) => ({
        view: { id, name: body.name, state: body.state, version: 4 },
      }),
    );
    window.history.replaceState(null, '', `/?view=${savedView.id}`);
    render(<LeadsList workspaceSlug="site-1" />);
    await screen.findByText('Synthetic Customer');
    expect(selectedView()).toBe(savedView.id);
    expect(screen.getByRole('button', { name: 'Save view' }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByRole('combobox', { name: 'Lead status' }), {
      target: { value: 'submitted' },
    });
    expect(selectedView()).toBe(savedView.id);
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save view' }).hasAttribute('disabled')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Save view' }));
    await waitFor(() =>
      expect(mocks.updateView).toHaveBeenCalledWith(expect.any(String), savedView.id, {
        name: 'Arriving soon',
        state: expect.objectContaining({ status: 'submitted', columns: ['fullName'] }),
        expectedVersion: 3,
      }),
    );
    await screen.findByText('View saved.');
    expect(mocks.createView).not.toHaveBeenCalled();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    expect(window.location.search).toBe(`?view=${savedView.id}`);
  });
  it('saves changes as a new view and leaves the open view untouched', async () => {
    const created = '80000000-0000-4000-8000-000000000002';
    mocks.views.mockResolvedValue({ views: [savedView] });
    mocks.createView.mockImplementation(
      async (_workspace: string, body: { name: string; state: unknown }) => ({
        view: { id: created, name: body.name, state: body.state, version: 1 },
      }),
    );
    window.history.replaceState(null, '', `/?view=${savedView.id}`);
    render(<LeadsList workspaceSlug="site-1" />);
    await screen.findByText('Synthetic Customer');
    fireEvent.change(screen.getByRole('combobox', { name: 'Lead status' }), {
      target: { value: 'incomplete' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save as new view' }));
    fireEvent.change(screen.getByLabelText('View name'), { target: { value: 'Incomplete only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(mocks.createView).toHaveBeenCalledWith(expect.any(String), {
        name: 'Incomplete only',
        state: expect.objectContaining({ status: 'incomplete' }),
      }),
    );
    expect(mocks.updateView).not.toHaveBeenCalled();
    await waitFor(() => expect(window.location.search).toBe(`?view=${created}`));
    expect(selectedView()).toBe(created);
  });
  it('renames the open view without saving unsaved filter changes into it', async () => {
    mocks.views.mockResolvedValue({ views: [savedView] });
    mocks.updateView.mockImplementation(
      async (_workspace: string, id: string, body: { name: string; state: unknown }) => ({
        view: { id, name: body.name, state: body.state, version: 4 },
      }),
    );
    window.history.replaceState(null, '', `/?view=${savedView.id}`);
    render(<LeadsList workspaceSlug="site-1" />);
    await screen.findByText('Synthetic Customer');
    fireEvent.change(screen.getByRole('combobox', { name: 'Lead status' }), {
      target: { value: 'submitted' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rename view' }));
    fireEvent.change(screen.getByLabelText('View name'), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(mocks.updateView).toHaveBeenCalledWith(expect.any(String), savedView.id, {
        name: 'Renamed',
        state: savedView.state,
        expectedVersion: 3,
      }),
    );
  });
});
