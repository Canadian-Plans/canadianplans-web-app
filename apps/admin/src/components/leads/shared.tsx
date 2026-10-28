'use client';

import {
  TypeIcon,
  HashIcon,
  CalendarIcon,
  CheckIcon,
  ListIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  LinkIcon,
  UserIcon,
  ShieldIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { Input, NativeSelect, Textarea } from '@canadian-plans/ui';
import { leadFieldTypes, type LeadField } from '@canadian-plans/contracts';
import { BackendError, leadDataClient } from '../../lib/api';
import { useStaffSession } from '../staff-session-provider';

export function useLeadWorkspace(slug: string) {
  const staff = useStaffSession();
  const workspace = staff.workspaces.find((w) => w.slug === slug);
  const api = useMemo(
    () => (staff.accessToken ? leadDataClient(staff.accessToken) : undefined),
    [staff.accessToken],
  );
  return { api, workspaceId: workspace?.id, isOwner: workspace?.roles.includes('owner') ?? false };
}
export function leadError(error: unknown): string {
  if (error instanceof BackendError) {
    if (error.code === 'mfa_required') return 'Verify your session with MFA, then try again.';
    if (error.status === 403) return 'You do not have permission to do this.';
    if (error.code === 'version_conflict') return 'This item changed. Reload it before saving.';
    const count = error.details?.['leadCount'];
    if (error.code === 'conflict')
      return typeof count === 'number'
        ? `${count} lead${count === 1 ? '' : 's'} hold a value. Deactivate this field or hide the option to keep their data.`
        : 'This change is not allowed. Keep the field inactive to preserve its data.';
  }
  return 'Could not complete this request. Check the values and try again.';
}
function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
export function formatLeadValue(
  field: Pick<LeadField, 'type' | 'options'>,
  value: unknown,
): string {
  if (value === null || value === undefined) return '—';
  if (field.type === 'boolean') return value === true ? 'Yes' : value === false ? 'No' : '—';
  if (field.type === 'select')
    return field.options.find((o) => o.value === value)?.label ?? text(value);
  if (field.type === 'multi_select' && Array.isArray(value))
    return value
      .map((v: unknown) => field.options.find((o) => o.value === v)?.label ?? text(v))
      .join(', ');
  if (field.type === 'email') return text(object(value)['address']);
  if (field.type === 'phone')
    return [object(value)['countryCode'], object(value)['number']]
      .filter((v) => typeof v === 'string')
      .join(' ');
  if (field.type === 'address')
    return ['street', 'unit', 'city', 'province', 'postalCode', 'country']
      .map((key) => text(object(value)[key]))
      .filter(Boolean)
      .join(', ');
  if (field.type === 'links' && Array.isArray(value))
    return value.map((v: unknown) => text(object(v)['label']) || text(object(v)['url'])).join(', ');
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : JSON.stringify(value);
}
/** The same typed controls serve inline editing. Composite inputs never require raw JSON. */
export function LeadValueControl({
  field,
  value,
  onChange,
  disabled = false,
}: {
  field: LeadField;
  value: unknown;
  onChange(value: unknown): void;
  disabled?: boolean;
}) {
  const label = field.label;
  const props = { 'aria-label': label, disabled };
  const current = object(value);
  const updatePart = (key: string, next: string) => {
    const updated = { ...current };
    if (next === '') delete updated[key];
    else updated[key] = next;
    onChange(updated);
  };
  if (field.type === 'boolean')
    return (
      <NativeSelect
        {...props}
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'true')}
      >
        <option value="">Not set</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </NativeSelect>
    );
  if (field.type === 'select')
    return (
      <NativeSelect
        {...props}
        value={text(value)}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Not set</option>
        {field.options
          .filter((o) => !o.hidden || o.value === value)
          .map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
              {o.hidden ? ' (hidden)' : ''}
            </option>
          ))}
      </NativeSelect>
    );
  if (field.type === 'multi_select')
    return (
      <fieldset disabled={disabled} className="flex flex-wrap gap-3">
        <legend className="text-sm">{label}</legend>
        {field.options
          .filter((o) => !o.hidden || (Array.isArray(value) && value.includes(o.value)))
          .map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Array.isArray(value) && value.includes(o.value)}
                onChange={(e) => {
                  const selected: unknown[] = Array.isArray(value) ? value : [];
                  const next = e.target.checked
                    ? [...selected, o.value]
                    : selected.filter((v) => v !== o.value);
                  onChange(next.length ? next : null);
                }}
              />
              {o.label}
            </label>
          ))}
      </fieldset>
    );
  if (field.type === 'email')
    return (
      <Input
        {...props}
        type="email"
        maxLength={254}
        value={text(current['address'])}
        onChange={(e) => onChange(e.target.value ? { address: e.target.value } : null)}
      />
    );
  if (field.type === 'phone')
    return (
      <div className="grid grid-cols-3 gap-2">
        <Input
          aria-label={`${label} country code`}
          disabled={disabled}
          placeholder="CA"
          maxLength={2}
          value={text(current['countryCode'])}
          onChange={(e) => updatePart('countryCode', e.target.value.toUpperCase())}
        />
        <Input
          className="col-span-2"
          aria-label={`${label} number`}
          disabled={disabled}
          type="tel"
          maxLength={32}
          value={text(current['number'])}
          onChange={(e) => updatePart('number', e.target.value)}
        />
      </div>
    );
  if (field.type === 'address')
    return (
      <fieldset disabled={disabled} className="grid gap-2 sm:grid-cols-2">
        <legend className="text-sm">{label}</legend>
        {['street', 'unit', 'city', 'province', 'postalCode', 'country'].map((key) => (
          <label key={key} className="text-xs capitalize">
            {key === 'postalCode' ? 'Postal code' : key}
            <Input
              aria-label={`${label} ${key}`}
              maxLength={
                key === 'country'
                  ? 2
                  : key === 'street'
                    ? 200
                    : key === 'unit'
                      ? 40
                      : key === 'postalCode'
                        ? 20
                        : 80
              }
              value={text(current[key])}
              onChange={(e) =>
                updatePart(key, key === 'country' ? e.target.value.toUpperCase() : e.target.value)
              }
            />
          </label>
        ))}
      </fieldset>
    );
  if (field.type === 'links') {
    const items: unknown[] = Array.isArray(value) ? value : [];
    const update = (index: number, key: string, next: string) =>
      onChange(items.map((item, i) => (i === index ? { ...object(item), [key]: next } : item)));
    return (
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-sm">{label}</legend>
        {items.map((item, index) => (
          <div className="flex gap-2" key={index}>
            <Input
              aria-label={`${label} URL ${index + 1}`}
              type="url"
              maxLength={2048}
              value={text(object(item)['url'])}
              onChange={(e) => update(index, 'url', e.target.value)}
            />
            <Input
              aria-label={`${label} label ${index + 1}`}
              maxLength={80}
              value={text(object(item)['label'])}
              onChange={(e) => {
                const next = items.map((v, i) => {
                  if (i !== index) return v;
                  const obj = object(v);
                  if (e.target.value) obj['label'] = e.target.value;
                  else delete obj['label'];
                  return obj;
                });
                onChange(next);
              }}
            />
            <button
              type="button"
              aria-label={`Remove link ${index + 1}`}
              onClick={() => {
                const next = items.filter((_, i) => i !== index);
                onChange(next.length ? next : null);
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className="text-sm underline"
          type="button"
          disabled={items.length >= 10}
          onClick={() => onChange([...items, { url: '' }])}
        >
          Add link
        </button>
      </fieldset>
    );
  }
  if (field.type === 'long_text')
    return (
      <Textarea
        {...props}
        maxLength={10000}
        value={text(value)}
        onChange={(e) => onChange(e.target.value || null)}
      />
    );
  if (field.type === 'number')
    return (
      <Input
        {...props}
        type="number"
        step="any"
        min={-1e12}
        max={1e12}
        value={typeof value === 'number' ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    );
  if (field.type === 'datetime')
    return (
      <label className="text-xs">
        UTC
        <Input
          {...props}
          type="datetime-local"
          value={text(value).replace(/Z$/, '').slice(0, 16)}
          onChange={(e) => onChange(e.target.value ? `${e.target.value}:00Z` : null)}
        />
      </label>
    );
  return (
    <Input
      {...props}
      type={field.type === 'date' ? 'date' : 'text'}
      maxLength={500}
      value={text(value)}
      onChange={(e) => onChange(e.target.value || null)}
    />
  );
}
export function FieldTypeLabel({ field }: { field: Pick<LeadField, 'type'> }) {
  return <>{leadFieldTypes[field.type].label}</>;
}

const fieldIcons = {
  text: TypeIcon,
  hash: HashIcon,
  calendar: CalendarIcon,
  check: CheckIcon,
  list: ListIcon,
  phone: PhoneIcon,
  mail: MailIcon,
  map: MapPinIcon,
  link: LinkIcon,
  user: UserIcon,
  shield: ShieldIcon,
};
export function LeadFieldIcon({ icon }: { icon: LeadField['icon'] }) {
  const Icon = fieldIcons[icon];
  return <Icon className="size-4 text-muted-foreground" aria-hidden="true" />;
}
