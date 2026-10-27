import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { leadFieldTypeSchema, leadFieldTypes } from '@canadian-plans/contracts';
import { LeadFieldEditor } from './field-editor';

describe('Lead field creation', () => {
  it.each(leadFieldTypeSchema.options)(
    'creates a %s definition through its labelled controls',
    async (type) => {
      const save = vi.fn().mockResolvedValue(undefined);
      render(<LeadFieldEditor onSave={save} />);
      fireEvent.click(screen.getByRole('button', { name: leadFieldTypes[type].label }));
      fireEvent.change(screen.getByLabelText('Name', { exact: true }), {
        target: { value: 'Travel answer' },
      });
      fireEvent.click(screen.getByLabelText('Accepted from the website'));
      if (type === 'select' || type === 'multi_select') {
        fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
        fireEvent.change(screen.getByLabelText('Option 1 label'), { target: { value: 'Soon' } });
      }
      fireEvent.click(screen.getByRole('button', { name: 'Create field' }));
      await waitFor(() =>
        expect(save).toHaveBeenCalledWith(
          expect.objectContaining({ type, label: 'Travel answer', websiteAccepted: true }),
        ),
      );
    },
  );
});
