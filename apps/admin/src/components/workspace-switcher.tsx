'use client';

import { useRouter } from 'next/navigation';
import { ChevronsUpDownIcon } from 'lucide-react';
import type { StaffWorkspace } from '@canadian-plans/contracts';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@canadian-plans/ui';

export function WorkspaceSwitcher({
  currentWorkspace,
  currentSection,
  workspaces,
}: {
  currentWorkspace: StaffWorkspace;
  currentSection: string;
  workspaces: readonly StaffWorkspace[];
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Switch workspace"
          className="h-7 w-full min-w-0 justify-between gap-1 px-1.5 text-[13px] font-medium"
        >
          <span className="truncate">{currentWorkspace.name}</span>
          <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.slug}
            onSelect={() => router.push(`/w/${workspace.slug}/${currentSection}`)}
          >
            {workspace.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
