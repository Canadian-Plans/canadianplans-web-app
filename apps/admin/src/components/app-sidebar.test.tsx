import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '@canadian-plans/ui';

import { AppSidebar } from './app-sidebar.js';

const usePathname = vi.fn();
vi.mock('next/navigation', () => ({ usePathname: () => usePathname() }));

function renderSidebar(workspace: string, onSignOut = vi.fn()) {
  return render(
    <SidebarProvider>
      <AppSidebar
        workspace={workspace}
        switcher={<button type="button">Switch workspace</button>}
        onSignOut={onSignOut}
      />
    </SidebarProvider>,
  );
}

describe('AppSidebar', () => {
  it('marks the current section as the active page', () => {
    usePathname.mockReturnValue('/w/site-1/orders');
    renderSidebar('site-1');

    expect(screen.getByRole('link', { name: /orders/i }).getAttribute('aria-current')).toBe('page');
  });

  it('does not mark a different section as active', () => {
    usePathname.mockReturnValue('/w/site-1/orders');
    renderSidebar('site-1');

    expect(screen.getByRole('link', { name: /leads/i }).getAttribute('aria-current')).toBeNull();
  });

  it('links every nav item to the current workspace slug', () => {
    usePathname.mockReturnValue('/w/site-2/leads');
    renderSidebar('site-2');

    expect(screen.getByRole('link', { name: /partners/i }).getAttribute('href')).toBe(
      '/w/site-2/partners',
    );
  });

  it('holds the workspace switcher and signs out from the sidebar footer', () => {
    usePathname.mockReturnValue('/w/site-1/orders');
    const onSignOut = vi.fn();
    renderSidebar('site-1', onSignOut);

    expect(screen.getByRole('button', { name: 'Switch workspace' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
