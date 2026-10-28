import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { leadFieldSchema } from '@canadian-plans/contracts';
import { BackendError } from '../../lib/api';
import { DataModelSettingsLink, LeadDataModel } from './data-model';
const api = vi.hoisted(() => ({
  fields: vi.fn(),
  settings: vi.fn(),
  layout: vi.fn(),
  deleteField: vi.fn(),
  model: vi.fn(),
}));
vi.mock('./shared', async (original) => ({
  ...(await original<typeof import('./shared')>()),
  useLeadWorkspace: () => ({
    api,
    workspaceId: '10000000-0000-4000-8000-000000000001',
    isOwner: false,
  }),
}));
const field = leadFieldSchema.parse({
  id: '90000000-0000-4000-8000-000000000001',
  key: 'custom_answer',
  label: 'Answer',
  type: 'text',
  origin: 'custom',
  version: 1,
  createdBy: null,
  updatedBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
beforeEach(() => {
  vi.resetAllMocks();
  api.fields.mockResolvedValue({ fields: [field] });
  api.settings.mockResolvedValue({
    settings: { name: 'Leads', defaultSort: { key: field.key, direction: 'asc' } },
  });
  api.layout.mockResolvedValue({ layout: { sections: [] } });
});
it('switches between all three tabs using the keyboard', async () => {
  render(<LeadDataModel workspaceSlug="site-1" />);
  const fields = await screen.findByRole('tab', { name: 'Fields' });
  fireEvent.keyDown(fields, { key: 'ArrowRight' });
  expect(screen.getByLabelText('Object name')).toBeTruthy();
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Settings' }), { key: 'ArrowRight' });
  expect(screen.getByRole('button', { name: 'Save layout' })).toBeTruthy();
  fireEvent.click(fields);
  expect(screen.getByRole('link', { name: 'Answer' })).toBeTruthy();
});
it('shows the refusal count and preserves the deactivation action', async () => {
  api.deleteField.mockRejectedValue(
    new BackendError('conflict', 409, 'test-request', { leadCount: 3 }),
  );
  render(<LeadDataModel workspaceSlug="site-1" fieldId={field.id} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete field' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  await screen.findByText(/3 leads hold a value/);
  expect(screen.getByRole('button', { name: 'Deactivate field' })).toBeTruthy();
});
it('hides the settings entry and denies direct navigation without permission', async () => {
  api.model.mockResolvedValue({ capabilities: { canManageDataModel: false } });
  api.fields.mockRejectedValue(new BackendError('permission_denied', 403, 'test-request'));
  render(
    <>
      <DataModelSettingsLink workspaceSlug="site-1" />
      <LeadDataModel workspaceSlug="site-1" />
    </>,
  );
  await screen.findByText('You do not have permission to do this.');
  expect(screen.queryByRole('tab')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Data model' })).toBeNull();
});
