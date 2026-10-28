'use client';
import { useState } from 'react';
import { Button, Input, NativeSelect } from '@canadian-plans/ui';
import {
  fieldFilterSchema,
  leadFieldTypes,
  type LeadField,
  type LeadFieldFilter,
} from '@canadian-plans/contracts';

const labels: Record<LeadFieldFilter['operator'], string> = {
  eq: 'Is',
  neq: 'Is not',
  contains: 'Contains',
  starts_with: 'Starts with',
  gt: 'Greater than',
  gte: 'At least',
  lt: 'Less than',
  lte: 'At most',
  has_any: 'Has any of',
  has_all: 'Has all of',
  empty: 'Is empty',
  not_empty: 'Is not empty',
};
export function LeadFilterBuilder({
  fields,
  onAdd,
}: {
  fields: LeadField[];
  onAdd(filter: LeadFieldFilter): void;
}) {
  const [key, setKey] = useState(fields[0]?.key ?? ''),
    [operator, setOperator] = useState<LeadFieldFilter['operator']>(
      fields[0]?.type === 'multi_select' ? 'has_any' : 'eq',
    );
  const [part, setPart] = useState<'city' | 'province' | 'postalCode' | 'country'>('city');
  const [value, setValue] = useState<LeadFieldFilter['value']>(''),
    [error, setError] = useState('');
  const field = fields.find((f) => f.key === key);
  if (!field) return <p>No filterable fields are available.</p>;
  const noValue = operator === 'empty' || operator === 'not_empty';
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const result = fieldFilterSchema.safeParse({
          key,
          operator,
          part: field.type === 'address' ? part : undefined,
          value: noValue ? undefined : value,
        });
        if (!result.success || (!noValue && value === '')) {
          setError('Enter a filter value.');
          return;
        }
        onAdd(result.data);
      }}
    >
      <label className="block text-sm">
        Field
        <NativeSelect
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setValue('');
            setOperator(
              fields.find((f) => f.key === e.target.value)?.type === 'multi_select'
                ? 'has_any'
                : 'eq',
            );
          }}
        >
          {fields.map((f) => (
            <option value={f.key} key={f.key}>
              {f.label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="block text-sm">
        Condition
        <NativeSelect
          value={operator}
          onChange={(e) => setOperator(fieldFilterSchema.shape.operator.parse(e.target.value))}
        >
          {leadFieldTypes[field.type].operators.map((o) => (
            <option key={o} value={o}>
              {labels[o]}
            </option>
          ))}
        </NativeSelect>
      </label>
      {field.type === 'address' && (
        <label className="block text-sm">
          Address part
          <NativeSelect
            value={part}
            onChange={(e) => setPart(fieldFilterSchema.shape.part.unwrap().parse(e.target.value))}
          >
            {['city', 'province', 'postalCode', 'country'].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </NativeSelect>
        </label>
      )}
      {!noValue &&
        (field.type === 'multi_select' ? (
          <fieldset>
            <legend>Values</legend>
            {field.options.map((o) => (
              <label key={o.value} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(o.value)}
                  onChange={(e) => {
                    const selected = Array.isArray(value) ? value : [];
                    setValue(
                      e.target.checked
                        ? [...selected, o.value]
                        : selected.filter((v) => v !== o.value),
                    );
                  }}
                />
                {o.label}
              </label>
            ))}
          </fieldset>
        ) : field.type === 'select' || field.type === 'boolean' ? (
          <label className="block text-sm">
            Value
            <NativeSelect
              aria-label="Filter value"
              value={String(value ?? '')}
              onChange={(e) =>
                setValue(
                  field.type === 'boolean' && e.target.value
                    ? e.target.value === 'true'
                    : e.target.value,
                )
              }
            >
              <option value="">Choose a value</option>
              {field.type === 'boolean' ? (
                <>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </>
              ) : (
                field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))
              )}
            </NativeSelect>
          </label>
        ) : (
          <label className="block text-sm">
            Value{field.type === 'datetime' && ' (UTC)'}
            <Input
              aria-label="Filter value"
              maxLength={10000}
              type={
                field.type === 'number'
                  ? 'number'
                  : field.type === 'date'
                    ? 'date'
                    : field.type === 'datetime'
                      ? 'datetime-local'
                      : 'text'
              }
              step={field.type === 'number' ? 'any' : undefined}
              value={
                typeof value === 'string' && field.type === 'datetime'
                  ? value.replace(/:00Z$/, '')
                  : typeof value === 'string' || typeof value === 'number'
                    ? value
                    : ''
              }
              onChange={(e) =>
                setValue(
                  field.type === 'number' && e.target.value !== ''
                    ? Number(e.target.value)
                    : field.type === 'datetime' && e.target.value
                      ? `${e.target.value}:00Z`
                      : e.target.value,
                )
              }
            />
          </label>
        ))}
      {error && <p role="alert">{error}</p>}
      <Button type="submit">Apply filter</Button>
    </form>
  );
}
export function describeLeadFilter(filter: LeadFieldFilter, fields: readonly LeadField[]): string {
  const field = fields.find((f) => f.key === filter.key);
  const value = Array.isArray(filter.value)
    ? filter.value.map((v) => field?.options.find((o) => o.value === v)?.label ?? v).join(', ')
    : (field?.options.find((o) => o.value === filter.value)?.label ?? String(filter.value ?? ''));
  return `${field?.label ?? 'Field'}${filter.part ? ` ${filter.part}` : ''} ${labels[filter.operator].toLowerCase()} ${value}`.trim();
}
