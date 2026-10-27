'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { UserIcon } from 'lucide-react';
import { Button } from '@canadian-plans/ui';
import {
  fieldApplies,
  leadTypeLabels,
  type LeadDetailResponse,
  type LeadField,
  type LeadModelResponse,
} from '@canadian-plans/contracts';
import { PageHeader } from '../crm/page-header';
import { PageBody } from '../crm/page-body';
import { formatLeadValue, leadError, LeadValueControl, useLeadWorkspace } from './shared';

function EditableField({
  field,
  value,
  editable,
  onSave,
}: {
  field: LeadField;
  value: unknown;
  editable: boolean;
  onSave(value: unknown): Promise<void>;
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState<unknown>(value),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) trigger.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  async function save() {
    setBusy(true);
    setError('');
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e) {
      setError(leadError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-3 border-b py-4 last:border-0 sm:grid-cols-[minmax(8rem,1fr)_3fr]">
      <div>
        <p className="text-sm font-medium">
          {field.label}
          {field.sensitive && <span className="ml-2 text-xs text-muted-foreground">Sensitive</span>}
        </p>
        {field.description && (
          <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
        )}
      </div>
      <div>
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <LeadValueControl field={field} value={draft} onChange={setDraft} disabled={busy} />
            <div className="flex gap-2">
              <Button size="sm" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setDraft(null)}
              >
                Clear value
              </Button>
            </div>
            {error && (
              <p role="alert" className="text-sm">
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0 text-sm break-words whitespace-pre-wrap">
              {formatLeadValue(field, value)}
            </span>
            {editable && field.staffEditable && (
              <Button
                ref={trigger}
                variant="ghost"
                size="sm"
                aria-label={`Edit ${field.label}`}
                onClick={() => {
                  setDraft(value);
                  setEditing(true);
                  setError('');
                }}
              >
                Edit
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export function LeadDetail({ workspaceSlug, leadId }: { workspaceSlug: string; leadId: string }) {
  const { api, workspaceId } = useLeadWorkspace(workspaceSlug);
  const [model, setModel] = useState<LeadModelResponse>(),
    [detail, setDetail] = useState<LeadDetailResponse>();
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!api || !workspaceId) return;
    const version = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const [m, d] = await Promise.all([api.model(workspaceId), api.detail(workspaceId, leadId)]);
      if (version !== generation.current) return;
      setModel(m);
      setDetail(d);
    } catch (e) {
      if (version === generation.current) {
        setError(leadError(e));
        setDetail(undefined);
      }
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [api, workspaceId, leadId]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current += 1;
    };
  }, [refresh]);
  if (loading)
    return (
      <PageBody>
        <p role="status">Loading lead…</p>
      </PageBody>
    );
  if (!api || !workspaceId || !model || !detail)
    return (
      <PageBody>
        <p role="alert">{error || 'Lead not found.'}</p>
        <Button onClick={() => void refresh()}>Reload</Button>
      </PageBody>
    );
  const fields = model.fields.filter((f) => f.active && fieldApplies(f, detail.lead.leadType));
  const layout = model.layouts[detail.lead.leadType];
  const missing = fields.filter((f) => !layout.sections.some((s) => s.fields.includes(f.key)));
  const sections = [
    ...layout.sections,
    ...(missing.length
      ? [{ id: 'additional', label: 'More details', fields: missing.map((f) => f.key) }]
      : []),
  ];
  const personal = model.capabilities.canReadPersonal;
  return (
    <>
      <PageHeader
        icon={UserIcon}
        title={
          typeof detail.lead.fields['fullName'] === 'string'
            ? detail.lead.fields['fullName']
            : 'Lead'
        }
      />
      <PageBody>
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          <Link className="underline" href={`/w/${workspaceSlug}/leads`}>
            Back to leads
          </Link>
          <span className="text-muted-foreground">
            {leadTypeLabels[detail.lead.leadType]} · {detail.lead.status}
          </span>
          <Button variant="ghost" size="sm" onClick={() => void refresh()}>
            Reload
          </Button>
        </div>
        {!personal ? (
          <p className="text-sm text-muted-foreground">
            Your role does not have access to this lead’s personal details.
          </p>
        ) : (
          <div className="max-w-4xl space-y-6">
            {sections.map((section) => {
              const visible = section.fields
                .map((key) => fields.find((f) => f.key === key))
                .filter((field): field is LeadField => Boolean(field));
              return visible.length ? (
                <section key={section.id} className="rounded-lg border p-5">
                  <h2 className="mb-2 text-base font-semibold">{section.label}</h2>
                  {visible.map((field) => (
                    <EditableField
                      key={field.key}
                      field={field}
                      value={detail.lead.fields[field.key]}
                      editable={model.capabilities.canEdit}
                      onSave={async (value) => {
                        const result = await api.edit(workspaceId, leadId, {
                          expectedVersion: detail.lead.version,
                          values: { [field.key]: value },
                        });
                        setDetail(result);
                      }}
                    />
                  ))}
                </section>
              ) : null;
            })}
            {detail.legacy.length > 0 && (
              <section className="rounded-lg border p-5">
                <h2 className="text-base font-semibold">Legacy answers</h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  Older answers are preserved as read-only data.
                </p>
                <dl className="space-y-3">
                  {detail.legacy.map((item) => (
                    <div key={item.key}>
                      <dt className="text-sm font-medium">{item.label}</dt>
                      <dd className="text-sm break-words whitespace-pre-wrap">
                        {typeof item.value === 'string' ? item.value : JSON.stringify(item.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        )}
        <section className="mt-8 max-w-4xl">
          <h2 className="mb-4 text-base font-semibold">Activity</h2>
          {detail.history.length ? (
            <ol className="space-y-4 border-l pl-5">
              {detail.history.map((event) => (
                <li key={event.id}>
                  <p className="text-sm">
                    {event.fields.length
                      ? `Changed ${event.fields.map((f) => f.label).join(', ')}`
                      : event.action.replaceAll('.', ' ').replaceAll('_', ' ')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time> · Actor{' '}
                    {event.actorId?.slice(0, 8) ?? 'system'}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No field changes yet.</p>
          )}
        </section>
      </PageBody>
    </>
  );
}
