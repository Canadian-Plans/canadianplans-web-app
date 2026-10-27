'use client';

import { useState, type FormEvent } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  LayoutListIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import type { SavedView } from '@canadian-plans/contracts';
import { Input, Popover, PopoverTrigger } from '@canadian-plans/ui';

import { MenuItem, MenuLabel, MenuPanel, MenuSeparator } from '../crm/menu';

export const ALL_ORDERS_VIEW_NAME = 'All orders';

const countFormat = new Intl.NumberFormat('en-CA');

/**
 * The view switcher ("All orders · 1,234 ⌄"): the built-in view plus the
 * person's own saved views, with rename and a two-step delete. It only reports
 * choices; the page saves them through the backend.
 */
export function SavedViewSwitcher({
  views,
  activeViewId,
  total,
  onSelect,
  onRename,
  onDelete,
}: {
  views: readonly SavedView[];
  /** Undefined is the built-in "All orders" view. */
  activeViewId: string | undefined;
  total: number;
  onSelect(viewId: string | undefined): void;
  /** Resolves to an error message to show, or undefined on success. */
  onRename(view: SavedView, name: string): Promise<string | undefined>;
  onDelete(view: SavedView): Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState<string>();
  const [confirming, setConfirming] = useState<string>();
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState<string>();

  const active = views.find((view) => view.id === activeViewId);
  const activeName = active?.name ?? ALL_ORDERS_VIEW_NAME;

  function reset() {
    setRenaming(undefined);
    setConfirming(undefined);
    setError(undefined);
  }

  function choose(viewId: string | undefined) {
    onSelect(viewId);
    setOpen(false);
    reset();
  }

  async function submitRename(event: FormEvent, view: SavedView) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name || name === view.name) {
      reset();
      return;
    }
    const failure = await onRename(view, name);
    if (failure) setError(failure);
    else reset();
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LayoutListIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{activeName}</span>{' '}
          <span className="font-normal text-muted-foreground">· {countFormat.format(total)}</span>
          <ChevronDownIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <MenuPanel aria-label="Saved views" className="w-72">
        <MenuItem selected={activeViewId === undefined} onClick={() => choose(undefined)}>
          <LayoutListIcon aria-hidden="true" />
          {ALL_ORDERS_VIEW_NAME}
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>My views</MenuLabel>
        {views.length === 0 ? (
          <p className="px-2 py-1.5 text-muted-foreground">
            No saved views yet. Filter the list, then choose “Save as new view”.
          </p>
        ) : null}
        {views.map((view) =>
          renaming === view.id ? (
            <form
              key={view.id}
              className="flex items-center gap-1 p-1"
              onSubmit={(event) => void submitRename(event, view)}
            >
              <Input
                autoFocus
                aria-label="View name"
                value={draftName}
                maxLength={60}
                className="h-8 text-[13px]"
                onChange={(event) => setDraftName(event.target.value)}
              />
              <button
                type="submit"
                aria-label="Save name"
                className="grid size-8 place-items-center rounded-sm hover:bg-accent"
              >
                <CheckIcon aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Cancel rename"
                className="grid size-8 place-items-center rounded-sm hover:bg-accent"
                onClick={reset}
              >
                <XIcon aria-hidden="true" className="size-4" />
              </button>
            </form>
          ) : (
            <div key={view.id} className="group flex items-center gap-0.5">
              <MenuItem
                className="min-w-0 flex-1"
                selected={view.id === activeViewId}
                onClick={() => choose(view.id)}
              >
                <span className="truncate">{view.name}</span>
              </MenuItem>
              {confirming === view.id ? (
                <button
                  type="button"
                  aria-label={`Confirm delete ${view.name}`}
                  className="h-8 shrink-0 rounded-sm px-2 text-[12px] font-medium text-destructive hover:bg-accent"
                  onClick={() => {
                    reset();
                    void onDelete(view);
                  }}
                >
                  Delete?
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    aria-label={`Rename view ${view.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => {
                      reset();
                      setDraftName(view.name);
                      setRenaming(view.id);
                    }}
                  >
                    <PencilIcon aria-hidden="true" className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete view ${view.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-destructive"
                    onClick={() => {
                      reset();
                      setConfirming(view.id);
                    }}
                  >
                    <Trash2Icon aria-hidden="true" className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          ),
        )}
        {error ? (
          <p role="alert" className="px-2 py-1.5 text-[12px] text-destructive">
            {error}
          </p>
        ) : null}
      </MenuPanel>
    </Popover>
  );
}
