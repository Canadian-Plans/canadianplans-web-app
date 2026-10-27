import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { builtInLeadFields, leadFieldSchema } from '@canadian-plans/contracts';
import { LeadLayoutEditor } from './layout-editor';
const fields = builtInLeadFields
  .filter((f) => ['fullName', 'email'].includes(f.key))
  .map((f) =>
    leadFieldSchema.parse({
      ...f,
      id: crypto.randomUUID(),
      origin: 'builtin',
      version: 1,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );
it('persists keyboard ordering and moving between sections', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(
    <LeadLayoutEditor
      initial={{
        sections: [
          { id: 'contact', label: 'Contact', fields: ['fullName', 'email'] },
          { id: 'other', label: 'Other', fields: [] },
        ],
      }}
      fields={fields}
      onSave={save}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Move Email up' }));
  fireEvent.change(screen.getByLabelText('Section for Full name'), { target: { value: 'other' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      sections: [
        { id: 'contact', label: 'Contact', fields: ['email'] },
        { id: 'other', label: 'Other', fields: ['fullName'] },
      ],
    }),
  );
});
it('persists a pointer drag before another field', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(
    <LeadLayoutEditor
      initial={{ sections: [{ id: 'contact', label: 'Contact', fields: ['fullName', 'email'] }] }}
      fields={fields}
      onSave={save}
    />,
  );
  const target = screen.getByText('Full name').closest('li');
  if (!target) throw new Error('missing target');
  fireEvent.drop(target, { dataTransfer: { getData: () => 'email' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      sections: [{ id: 'contact', label: 'Contact', fields: ['email', 'fullName'] }],
    }),
  );
});
