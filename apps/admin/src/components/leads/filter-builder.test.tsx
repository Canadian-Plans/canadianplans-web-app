import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { leadFieldSchema, leadFieldTypeSchema } from '@canadian-plans/contracts';
import { LeadFilterBuilder } from './filter-builder';
it.each(leadFieldTypeSchema.options)('builds a typed %s filter without a JSON editor', (type) => {
  const add = vi.fn();
  const field = leadFieldSchema.parse({
    id: crypto.randomUUID(),
    key: 'custom_answer',
    label: 'Answer',
    type,
    origin: 'custom',
    options: type === 'select' || type === 'multi_select' ? [{ value: 'soon', label: 'Soon' }] : [],
    version: 1,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  render(<LeadFilterBuilder fields={[field]} onAdd={add} />);
  let expected: string | number | boolean | string[] = 'Example';
  if (type === 'multi_select') {
    fireEvent.click(screen.getByLabelText('Soon'));
    expected = ['soon'];
  } else {
    const value =
      type === 'boolean'
        ? 'false'
        : type === 'select'
          ? 'soon'
          : type === 'number'
            ? '12.5'
            : type === 'date'
              ? '2026-12-01'
              : type === 'datetime'
                ? '2026-12-01T12:30'
                : 'Example';
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value } });
    expected =
      type === 'boolean'
        ? false
        : type === 'number'
          ? 12.5
          : type === 'datetime'
            ? `${value}:00Z`
            : value;
  }
  fireEvent.click(screen.getByRole('button', { name: 'Apply filter' }));
  expect(add).toHaveBeenCalledWith({
    key: field.key,
    operator: type === 'multi_select' ? 'has_any' : 'eq',
    value: expected,
    part: type === 'address' ? 'city' : undefined,
  });
});
