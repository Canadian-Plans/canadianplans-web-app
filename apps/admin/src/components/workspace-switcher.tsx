'use client';

import { useRouter } from 'next/navigation';
import { ChevronsUpDownIcon } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@canadian-plans/ui';

import { PLACEHOLDER_WORKSPACES } from '../lib/workspaces';

/**
 * Static list for now (see OPEN_INPUTS.md) — swaps to a backend memberships
 * call once staff auth exists. Switching keeps the current section (e.g.
 * stays on "orders" when moving from site-1 to site-2).
 */
export function WorkspaceSwitcher({
  currentWorkspace,
  currentSection,
}: {
  currentWorkspace: string;
  currentSection: string;
}) {
  const router = useRouter();
  const current = PLACEHOLDER_WORKSPACES.find((w) => w.slug === currentWorkspace);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label="Switch workspace" className="min-w-0 max-w-64">
          <span className="truncate">{current?.name ?? currentWorkspace}</span>
          <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PLACEHOLDER_WORKSPACES.map((workspace) => (
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
