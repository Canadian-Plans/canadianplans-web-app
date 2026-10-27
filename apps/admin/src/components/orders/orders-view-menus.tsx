'use client';

import { useState, type FormEvent } from 'react';
import {
  ArrowDownWideNarrowIcon,
  ChevronLeftIcon,
  ListFilterIcon,
  SlidersHorizontalIcon,
} from 'lucide-react';
import {
  orderColumnKeySchema,
  orderFulfilmentStatusSchema,
  orderSortFieldSchema,
  paymentStateSchema,
  type AssignableMember,
  type OrderArchiveFilter,
  type OrderViewState,
  type SortDirection,
} from '@canadian-plans/contracts';
import { Button, Checkbox, Input, Popover, PopoverTrigger } from '@canadian-plans/ui';

import { BarButton, MenuItem, MenuLabel, MenuPanel, MenuSeparator } from '../crm/menu';
import { ORDER_STATUS_LABELS, PAYMENT_STATE_LABELS } from './format';
import {
  ORDER_COLUMN_LABELS,
  ORDER_FILTER_LABELS,
  ORDER_SORT_LABELS,
  memberName,
  toggleColumn,
  withFilter,
  withSort,
  type OrderFilterKey,
} from './orders-view-state';

const FILTER_FIELDS: readonly OrderFilterKey[] = [
  'status',
  'paymentState',
  'assigneeId',
  'partnerCode',
  'source',
  'submittedFrom',
  'submittedTo',
  'archiveState',
];

const ARCHIVE_OPTIONS: readonly { value: OrderArchiveFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

const TEXT_LIMITS = { partnerCode: 64, source: 160 } as const;

interface MenuProps {
  state: OrderViewState;
  onChange(state: OrderViewState): void;
}

/** Twenty's two-step filter flow: pick a field, then a value; the filter applies at once. */
export function OrdersFilterMenu({
  state,
  members,
  onChange,
}: MenuProps & { members: readonly AssignableMember[] }) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<OrderFilterKey>();

  function apply<Key extends OrderFilterKey>(key: Key, value: OrderViewState['filters'][Key]) {
    onChange(withFilter(state, key, value));
    setOpen(false);
    setField(undefined);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setField(undefined);
      }}
    >
      <PopoverTrigger asChild>
        <BarButton>
          <ListFilterIcon aria-hidden="true" />
          Filter
        </BarButton>
      </PopoverTrigger>
      <MenuPanel aria-label="Filter orders">
        {field === undefined ? (
          FILTER_FIELDS.map((key) => (
            <MenuItem key={key} onClick={() => setField(key)}>
              {ORDER_FILTER_LABELS[key]}
            </MenuItem>
          ))
        ) : (
          <>
            <MenuItem onClick={() => setField(undefined)}>
              <ChevronLeftIcon aria-hidden="true" />
              <span className="sr-only">Back to fields: </span>
              {ORDER_FILTER_LABELS[field]}
            </MenuItem>
            <MenuSeparator />
            <FilterValues
              field={field}
              state={state}
              members={members}
              onApply={(key, value) => apply(key, value)}
            />
          </>
        )}
      </MenuPanel>
    </Popover>
  );
}

function FilterValues({
  field,
  state,
  members,
  onApply,
}: {
  field: OrderFilterKey;
  state: OrderViewState;
  members: readonly AssignableMember[];
  onApply<Key extends OrderFilterKey>(key: Key, value: OrderViewState['filters'][Key]): void;
}) {
  const filters = state.filters;
  switch (field) {
    case 'status':
      return orderFulfilmentStatusSchema.options.map((status) => (
        <MenuItem
          key={status}
          selected={filters.status === status}
          onClick={() => onApply('status', status)}
        >
          {ORDER_STATUS_LABELS[status]}
        </MenuItem>
      ));
    case 'paymentState':
      return paymentStateSchema.options.map((payment) => (
        <MenuItem
          key={payment}
          selected={filters.paymentState === payment}
          onClick={() => onApply('paymentState', payment)}
        >
          {PAYMENT_STATE_LABELS[payment]}
        </MenuItem>
      ));
    case 'assigneeId':
      return members.length === 0 ? (
        <p className="px-2 py-1.5 text-muted-foreground">No staff to choose from.</p>
      ) : (
        members.map((member) => (
          <MenuItem
            key={member.membershipId}
            selected={filters.assigneeId === member.membershipId}
            onClick={() => onApply('assigneeId', member.membershipId)}
          >
            {memberName(member)}
          </MenuItem>
        ))
      );
    case 'archiveState':
      return ARCHIVE_OPTIONS.map((option) => (
        <MenuItem
          key={option.value}
          selected={(filters.archiveState ?? 'active') === option.value}
          onClick={() => onApply('archiveState', option.value)}
        >
          {option.label}
        </MenuItem>
      ));
    case 'partnerCode':
    case 'source':
      return (
        <TextFilter
          label={ORDER_FILTER_LABELS[field]}
          initial={filters[field] ?? ''}
          maxLength={TEXT_LIMITS[field]}
          onApply={(value) => onApply(field, value || undefined)}
        />
      );
    case 'submittedFrom':
    case 'submittedTo':
      return (
        <TextFilter
          type="date"
          label={ORDER_FILTER_LABELS[field]}
          initial={filters[field] ?? ''}
          onApply={(value) => onApply(field, value || undefined)}
        />
      );
  }
}

function TextFilter({
  label,
  initial,
  maxLength,
  type = 'text',
  onApply,
}: {
  label: string;
  initial: string;
  maxLength?: number;
  type?: 'text' | 'date';
  onApply(value: string): void;
}) {
  const [value, setValue] = useState(initial);
  function submit(event: FormEvent) {
    event.preventDefault();
    onApply(value.trim());
  }
  return (
    <form className="flex items-center gap-1 p-1" onSubmit={submit}>
      <Input
        autoFocus
        aria-label={label}
        type={type}
        value={value}
        maxLength={maxLength}
        className="h-8 text-[13px]"
        onChange={(event) => setValue(event.target.value)}
      />
      <Button type="submit" size="sm" className="h-8">
        Apply
      </Button>
    </form>
  );
}

export function OrdersSortMenu({ state, onChange }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<SortDirection>(state.sort.direction);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDirection(state.sort.direction);
      }}
    >
      <PopoverTrigger asChild>
        <BarButton>
          <ArrowDownWideNarrowIcon aria-hidden="true" />
          Sort
        </BarButton>
      </PopoverTrigger>
      <MenuPanel aria-label="Sort orders">
        <MenuLabel>Direction</MenuLabel>
        <div className="grid grid-cols-2 gap-1 px-1 pb-1">
          {(['asc', 'desc'] as const).map((option) => (
            <MenuItem
              key={option}
              selected={direction === option}
              className="justify-center"
              onClick={() => setDirection(option)}
            >
              {option === 'asc' ? 'Ascending' : 'Descending'}
            </MenuItem>
          ))}
        </div>
        <MenuSeparator />
        {orderSortFieldSchema.options.map((field) => (
          <MenuItem
            key={field}
            selected={state.sort.field === field}
            onClick={() => {
              onChange(withSort(state, field, direction));
              setOpen(false);
            }}
          >
            {ORDER_SORT_LABELS[field]}
          </MenuItem>
        ))}
      </MenuPanel>
    </Popover>
  );
}

export function OrdersOptionsMenu({ state, onChange }: MenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <BarButton>
          <SlidersHorizontalIcon aria-hidden="true" />
          Options
        </BarButton>
      </PopoverTrigger>
      <MenuPanel align="end" aria-label="List options">
        <MenuLabel>Columns</MenuLabel>
        {orderColumnKeySchema.options.map((column) => (
          <label
            key={column}
            className="flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 hover:bg-accent"
          >
            <Checkbox
              aria-label={ORDER_COLUMN_LABELS[column]}
              checked={!state.hiddenColumns.includes(column)}
              onCheckedChange={() => onChange(toggleColumn(state, column))}
            />
            <span aria-hidden="true">{ORDER_COLUMN_LABELS[column]}</span>
          </label>
        ))}
      </MenuPanel>
    </Popover>
  );
}
