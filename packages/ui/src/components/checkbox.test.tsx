import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('reports the new checked state when clicked', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Select all" checked={false} onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('shows a partly selected state for a partial selection', () => {
    render(<Checkbox aria-label="Select all" checked="indeterminate" />);
    const box = screen.getByRole('checkbox', { name: 'Select all' });
    expect(box.getAttribute('data-state')).toBe('indeterminate');
    expect(box.getAttribute('aria-checked')).toBe('mixed');
  });
});
