'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { SidebarInset, SidebarProvider } from '@canadian-plans/ui';

import { AppSidebar } from './app-sidebar';
import { useStaffSession } from './staff-session-provider';
import { TopBar } from './top-bar';
import { WorkspaceSwitcher } from './workspace-switcher';

/** Twenty's 220px navigation width, set through the shared sidebar's CSS variable. */
const SIDEBAR_STYLE: CSSProperties & Record<'--sidebar-width', string> = {
  '--sidebar-width': '220px',
};

/** The section to keep when switching workspace, e.g. `orders` or `reports/sources`. */
function currentSection(pathname: string): string {
  const section = pathname.split('/')[3] ?? 'orders';
  return section === 'reports' ? 'reports/sources' : section;
}

export function ProtectedWorkspaceShell({
  children,
  workspaceSlug,
}: {
  children: ReactNode;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const staff = useStaffSession();
  const workspace = staff.workspaces.find((item) => item.slug === workspaceSlug);

  useEffect(() => {
    if (staff.status === 'signed_out') router.replace('/login');
    if (staff.status === 'error')
      router.replace(`/denied?reason=${staff.reason ?? 'internal_error'}`);
    if (staff.status === 'signed_in' && !workspace) {
      router.replace('/denied?reason=workspace_not_found');
    }
  }, [router, staff.reason, staff.status, workspace]);

  if (staff.status === 'configuration_missing') {
    return (
      <main id="main-content" tabIndex={-1} className="p-6 outline-none">
        <h1 className="text-2xl font-semibold">Staff authentication unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          This environment is missing the public Supabase Auth configuration.
        </p>
      </main>
    );
  }
  if (staff.status !== 'signed_in' || !workspace) {
    return (
      <main id="main-content" tabIndex={-1} className="p-6 outline-none" aria-busy="true">
        <h1 className="text-2xl font-semibold">Checking workspace access</h1>
      </main>
    );
  }

  return (
    <SidebarProvider style={SIDEBAR_STYLE}>
      <AppSidebar
        workspace={workspace.slug}
        switcher={
          <WorkspaceSwitcher
            currentWorkspace={workspace}
            currentSection={currentSection(pathname)}
            workspaces={staff.workspaces}
          />
        }
        onSignOut={() => void staff.signOut()}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar workspace={workspace} />
        <SidebarInset
          id="main-content"
          tabIndex={-1}
          className="min-h-0 flex-1 outline-none md:border-l md:border-sidebar-border"
        >
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
