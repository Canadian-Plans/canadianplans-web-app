'use client';

import { useState, type FormEvent } from 'react';
import { Button, Input, Label, NativeSelect, Textarea } from '@canadian-plans/ui';
import {
  createLeadFieldSchema,
  fieldIconSchema,
  fieldOptionSchema,
  leadFieldTypes,
  leadFieldTypeSchema,
  leadTypeLabels,
  leadTypeSchema,
  type CreateLeadField,
  type FieldOption,
  type LeadField,
  type LeadFieldType,
  type LeadType,
} from '@canadian-plans/contracts';
import { leadError } from './shared';

export function LeadFieldEditor({
  initial,
  onSave,
}: {
  initial?: LeadField;
  onSave(value: CreateLeadField): Promise<void>;
}) {
  const [type, setType] = useState<LeadFieldType | undefined>(initial?.type);
  const [label, setLabel] = useState(initial?.label ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'text');
  const [types, setTypes] = useState<LeadType[]>(initial?.leadTypes ?? []);
  const [options, setOptions] = useState<FieldOption[]>(initial?.options ?? []);
  const [sensitive, setSensitive] = useState(initial?.sensitive ?? false);
  const [websiteAccepted, setWebsiteAccepted] = useState(initial?.websiteAccepted ?? false);
  const [staffEditable, setStaffEditable] = useState(initial?.staffEditable ?? true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const builtin = initial?.origin === 'builtin';
  if (!type)
    return (
      <div>
        <h2 className="mb-3 text-base font-semibold">Choose a field type</h2>
        <div className="grid grid-cols-2 gap-2">
          {leadFieldTypeSchema.options.map((type) => (
            <Button variant="outline" key={type} onClick={() => setType(type)}>
              {leadFieldTypes[type].label}
            </Button>
          ))}
        </div>
      </div>
    );
  const changeOption = (value: string, patch: Partial<FieldOption>) =>
    setOptions((items) => items.map((o) => (o.value === value ? { ...o, ...patch } : o)));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const result = createLeadFieldSchema.safeParse({
      label,
      description,
      icon,
      type,
      options,
      sensitive,
      websiteAccepted,
      staffEditable,
      leadTypes: types,
      active: initial?.active ?? true,
    });
    if (!result.success) {
      setError('Enter a name and valid options for this field.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave(result.data);
    } catch (e) {
      setError(leadError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {leadFieldTypes[type].label} · {builtin ? 'Standard' : 'Custom'}
        </p>
        {!initial && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setType(undefined);
              setOptions([]);
            }}
          >
            Change type
          </Button>
        )}
      </div>
      {initial && (
        <p className="text-xs text-muted-foreground">
          Key: <code>{initial.key}</code>
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="field-label">Name</Label>
        <Input
          id="field-label"
          autoFocus
          required
          maxLength={80}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-description">Description</Label>
        <Textarea
          id="field-description"
          maxLength={500}
          disabled={builtin}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-icon">Icon</Label>
        <NativeSelect
          id="field-icon"
          disabled={builtin}
          value={icon}
          onChange={(e) => setIcon(fieldIconSchema.parse(e.target.value))}
        >
          {fieldIconSchema.options.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </NativeSelect>
      </div>
      <fieldset disabled={builtin} className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Lead types</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={types.length === 0}
            onChange={(e) => setTypes(e.target.checked ? [] : ['sim'])}
          />
          All lead types
        </label>
        {leadTypeSchema.options.map((type) => (
          <label key={type} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={types.includes(type)}
              onChange={(e) =>
                setTypes(e.target.checked ? [...types, type] : types.filter((v) => v !== type))
              }
            />
            {leadTypeLabels[type]}
          </label>
        ))}
      </fieldset>
      {(type === 'select' || type === 'multi_select') && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Options</legend>
          {options.map((option, index) => (
            <div key={option.value} className="space-y-2 rounded-md border p-3">
              <div className="flex gap-2">
                <Input
                  aria-label={`Option ${index + 1} label`}
                  maxLength={80}
                  required
                  value={option.label}
                  onChange={(e) => changeOption(option.value, { label: e.target.value })}
                />
                <NativeSelect
                  aria-label={`Option ${index + 1} colour`}
                  value={option.colour}
                  onChange={(e) =>
                    changeOption(option.value, {
                      colour: fieldOptionSchema.shape.colour.parse(e.target.value),
                    })
                  }
                >
                  {fieldOptionSchema.shape.colour.unwrap().options.map((colour) => (
                    <option key={colour}>{colour}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={option.hidden}
                    onChange={(e) => changeOption(option.value, { hidden: e.target.checked })}
                  />
                  Hide option
                </label>
                {!builtin && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOptions(options.filter((o) => o.value !== option.value))}
                  >
                    Remove option {index + 1}
                  </Button>
                )}
              </div>
              <p className="break-all text-xs text-muted-foreground">
                Stored value: {option.value}
              </p>
            </div>
          ))}
          {!builtin && (
            <Button
              type="button"
              variant="outline"
              disabled={options.length >= 100}
              onClick={() =>
                setOptions([
                  ...options,
                  {
                    value: `option_${crypto.randomUUID()}`,
                    label: '',
                    colour: 'gray',
                    hidden: false,
                  },
                ])
              }
            >
              Add option
            </Button>
          )}
        </fieldset>
      )}
      <fieldset disabled={builtin} className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Access</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sensitive}
            onChange={(e) => setSensitive(e.target.checked)}
          />
          Sensitive
        </label>
        <p className="text-xs text-muted-foreground">
          Sensitive fields are visible only in lead details to staff with personal-data access. They
          cannot be columns, filters, sorts or exports.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={websiteAccepted}
            onChange={(e) => setWebsiteAccepted(e.target.checked)}
          />
          Accepted from the website
        </label>
        <p className="text-xs text-muted-foreground">
          A developer still needs to add the website input.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={staffEditable}
            onChange={(e) => setStaffEditable(e.target.checked)}
          />
          Staff editable
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? 'Saving…' : initial ? 'Save field' : 'Create field'}
      </Button>
    </form>
  );
}
