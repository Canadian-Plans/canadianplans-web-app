'use client';

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@canadian-plans/ui';

import { WorkspaceSwitcher } from './workspace-switcher';

export function TopBar({ workspace }: { workspace: string }) {
  const pathname = usePathname();
  const section = pathname.split('/')[3] ?? 'orders';

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger />
      <div className="h-6 w-px bg-border" aria-hidden="true" />
      <WorkspaceSwitcher currentWorkspace={workspace} currentSection={section} />
      <div className="ml-auto hidden items-center gap-3 text-sm text-muted-foreground sm:flex">
        Staff
      </div>
    </header>
  );
}
