import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidePanel } from './side-panel';

describe('SidePanel', () => {
  it('shows nothing while closed', () => {
    render(
      <SidePanel open={false} title="Order CP-1" onClose={vi.fn()}>
        <p>Details</p>
      </SidePanel>,
    );
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('opens beside the list with its content and takes focus', () => {
    render(
      <SidePanel open title="Order CP-1" onClose={vi.fn()}>
        <p>Details</p>
      </SidePanel>,
    );
    const panel = screen.getByRole('complementary', { name: 'Order CP-1' });
    expect(panel.textContent).toContain('Details');
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it('closes from its button and from the Escape key', () => {
    const onClose = vi.fn();
    render(
      <SidePanel open title="Order CP-1" onClose={onClose}>
        <p>Details</p>
      </SidePanel>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    fireEvent.keyDown(screen.getByRole('complementary'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('leaves an Escape that an inner dialog already handled alone', () => {
    const onClose = vi.fn();
    render(
      <SidePanel open title="Order CP-1" onClose={onClose}>
        <button type="button" onKeyDown={(event) => event.preventDefault()}>
          Inner
        </button>
      </SidePanel>,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Inner' }), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
