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
      <SidebarInset>
        <TopBar workspace={workspace} />
        <main id="main-content" tabIndex={-1} className="flex-1 p-6 outline-none">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
