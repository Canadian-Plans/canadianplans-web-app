'use client';

import type { StaffWorkspace } from '@canadian-plans/contracts';
import { SidebarTrigger } from '@canadian-plans/ui';

/**
 * Phone-only bar. On a computer the sidebar carries the workspace switcher,
 * Sign out and its own collapse button (Twenty layout); on a phone the sidebar
 * is a drawer, so this bar opens it.
 */
export function TopBar({ workspace }: { workspace: StaffWorkspace }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-crm-header px-3 md:hidden">
      <SidebarTrigger />
      <span className="truncate text-[13px] font-semibold">{workspace.name}</span>
    </header>
  );
}
