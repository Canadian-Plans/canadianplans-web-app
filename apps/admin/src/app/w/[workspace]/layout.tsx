import type { ReactNode } from 'react';
import { SidebarInset, SidebarProvider } from '@canadian-plans/ui';

import { AppSidebar } from '../../../components/app-sidebar';
import { TopBar } from '../../../components/top-bar';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;

  return (
    <SidebarProvider>
      <AppSidebar workspace={workspace} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar workspace={workspace} />
        <SidebarInset id="main-content" tabIndex={-1} className="flex-1 p-6 outline-none">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
