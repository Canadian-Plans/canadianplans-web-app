import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SavedView } from '@canadian-plans/contracts';

import { DEFAULT_ORDER_VIEW_STATE } from './orders-view-state';
import { SavedViewSwitcher } from './saved-view-switcher';

const unpaid: SavedView = {
  id: '61000000-0000-4000-8000-000000000001',
  object: 'orders',
  name: 'Unpaid',
  state: { ...DEFAULT_ORDER_VIEW_STATE, filters: { paymentState: 'pending' } },
  version: 1,
  updatedAt: '2026-10-27T12:00:00.000Z',
};

function renderSwitcher(overrides: Partial<Parameters<typeof SavedViewSwitcher>[0]> = {}) {
  const props = {
    views: [unpaid],
    activeViewId: undefined,
    total: 1234,
    onSelect: vi.fn(),
    onRename: vi.fn(async () => undefined),
    onDelete: vi.fn(async () => undefined),
    ...overrides,
  };
  render(<SavedViewSwitcher {...props} />);
  return props;
}

describe('SavedViewSwitcher', () => {
  it('names the active view and the number of orders it shows', () => {
    renderSwitcher();
    expect(screen.getByRole('button', { name: /All orders · 1,234/ })).toBeTruthy();
  });

  it("lists the built-in view and the person's own views, and selects one", () => {
    const props = renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /All orders/ }));
    const menu = screen.getByRole('dialog');
    fireEvent.click(within(menu).getByRole('button', { name: 'Unpaid' }));
    expect(props.onSelect).toHaveBeenCalledWith(unpaid.id);
  });

  it('asks before deleting a view', () => {
    const props = renderSwitcher({ activeViewId: unpaid.id });
    fireEvent.click(screen.getByRole('button', { name: /Unpaid · 1,234/ }));
    const menu = screen.getByRole('dialog');
    fireEvent.click(within(menu).getByRole('button', { name: 'Delete view Unpaid' }));
    expect(props.onDelete).not.toHaveBeenCalled();
    fireEvent.click(within(menu).getByRole('button', { name: 'Confirm delete Unpaid' }));
    expect(props.onDelete).toHaveBeenCalledWith(unpaid);
  });

  it('renames a view in place and shows a refusal from the server', async () => {
    const onRename = vi.fn(async () => 'You already have a view with that name.');
    renderSwitcher({ onRename });
    fireEvent.click(screen.getByRole('button', { name: /All orders/ }));
    const menu = screen.getByRole('dialog');
    fireEvent.click(within(menu).getByRole('button', { name: 'Rename view Unpaid' }));
    fireEvent.change(within(menu).getByRole('textbox', { name: 'View name' }), {
      target: { value: 'Waiting' },
    });
    fireEvent.submit(within(menu).getByRole('textbox', { name: 'View name' }));
    expect(onRename).toHaveBeenCalledWith(unpaid, 'Waiting');
    expect(await within(menu).findByText('You already have a view with that name.')).toBeTruthy();
  });
});
