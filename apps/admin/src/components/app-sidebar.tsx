'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardListIcon,
  FileTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@canadian-plans/ui';

const NAV_ITEMS = [
  { section: 'orders', label: 'Orders', icon: ClipboardListIcon },
  { section: 'leads', label: 'Leads', icon: UsersIcon },
  { section: 'partners', label: 'Partners', icon: ShieldCheckIcon },
  { section: 'documents', label: 'Documents', icon: FileTextIcon },
  { section: 'settings', label: 'Settings', icon: SettingsIcon },
] as const;

export function AppSidebar({ workspace }: { workspace: string }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-8 items-center px-2 text-sm font-semibold">Canadian Plans</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ section, label, icon: Icon }) => {
                const href = `/w/${workspace}/${section}`;
                const isActive = pathname === href;

                return (
                  <SidebarMenuItem key={section}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link href={href} aria-current={isActive ? 'page' : undefined}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
