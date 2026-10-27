'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  BarChart3Icon,
  ClipboardListIcon,
  FileTextIcon,
  LogOutIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@canadian-plans/ui';

const NAV_ITEMS = [
  { section: 'orders', label: 'Orders', icon: ClipboardListIcon },
  { section: 'leads', label: 'Leads', icon: UsersIcon },
  { section: 'partners', label: 'Partners', icon: ShieldCheckIcon },
  { section: 'documents', label: 'Documents', icon: FileTextIcon },
  { section: 'reports/sources', label: 'Reports', icon: BarChart3Icon },
  { section: 'settings', label: 'Settings', icon: SettingsIcon },
] as const;

/** Twenty-style navigation item: 28px tall, 13px label, quiet until hovered or active. */
const ITEM_CLASS =
  'h-7 gap-2 rounded-md px-1.5 text-[13px] text-sidebar-foreground data-[active=true]:font-medium';

/**
 * The CRM sidebar (admin CRM Phase 1): the workspace switcher at the top, the
 * workspace sections, and Sign out in the footer, in the slim Twenty layout.
 */
export function AppSidebar({
  workspace,
  switcher,
  onSignOut,
}: {
  workspace: string;
  switcher?: ReactNode;
  onSignOut?(): void;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-12 flex-row items-center gap-1 px-2 py-0">
        <img
          src="/brand/canadian-plans-icon.png"
          alt=""
          width={20}
          height={20}
          className="size-5 shrink-0 object-contain group-data-[collapsible=icon]:hidden"
        />
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">{switcher}</div>
        <SidebarTrigger className="hidden size-7 shrink-0 text-muted-foreground md:inline-flex" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel className="h-7 px-1.5 text-[11px] font-semibold text-muted-foreground">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Workspace navigation">
              <SidebarMenu className="gap-0.5">
                {NAV_ITEMS.map(({ section, label, icon: Icon }) => {
                  const href = `/w/${workspace}/${section}`;
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <SidebarMenuItem key={section}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={label}
                        className={ITEM_CLASS}
                      >
                        <Link
                          href={href}
                          aria-label={label}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => {
                            if (isMobile) setOpenMobile(false);
                          }}
                        >
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {onSignOut ? (
        <SidebarFooter className="px-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Sign out" className={ITEM_CLASS} onClick={onSignOut}>
                <LogOutIcon />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}
