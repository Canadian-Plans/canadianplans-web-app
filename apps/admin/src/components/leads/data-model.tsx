'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRightIcon, DatabaseIcon, PlusIcon, SearchIcon } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
} from '@canadian-plans/ui';
import {
  fieldApplies,
  leadFieldTypes,
  leadTypeLabels,
  leadTypeSchema,
  type LeadField,
  type LeadLayout,
  type LeadObjectSettings,
  type LeadType,
} from '@canadian-plans/contracts';
import { BackendError } from '../../lib/api';
import { PageHeader } from '../crm/page-header';
import { PageBody } from '../crm/page-body';
import { LeadFieldEditor } from './field-editor';
import { LeadLayoutEditor } from './layout-editor';
import { leadError, LeadFieldIcon, useLeadWorkspace } from './shared';

export function DataModelSettingsLink({ workspaceSlug }: { workspaceSlug: string }) {
  const { api, workspaceId } = useLeadWorkspace(workspaceSlug);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    setAllowed(false);
    if (api && workspaceId)
      void api
        .model(workspaceId)
        .then((r) => {
          if (active) setAllowed(r.capabilities.canManageDataModel);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api, workspaceId]);
  return allowed ? (
    <Link
      className="text-sm font-medium underline"
      href={`/w/${workspaceSlug}/settings/data-model/leads`}
    >
      Data model
    </Link>
  ) : null;
}
export function LeadDataModel({
  workspaceSlug,
  fieldId,
}: {
  workspaceSlug: string;
  fieldId?: string;
}) {
  const { api, workspaceId, isOwner } = useLeadWorkspace(workspaceSlug);
  const [fields, setFields] = useState<LeadField[]>([]),
    [settings, setSettings] = useState<LeadObjectSettings>(),
    [layout, setLayout] = useState<LeadLayout>();
  const [type, setType] = useState<LeadType>('sim'),
    [tab, setTab] = useState<'Fields' | 'Settings' | 'Layout'>('Fields');
  const [search, setSearch] = useState(''),
    [origin, setOrigin] = useState('all'),
    [active, setActive] = useState('all');
  const [loading, setLoading] = useState(true),
    [denied, setDenied] = useState(false),
    [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false),
    [busy, setBusy] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [revision, setRevision] = useState(0);
  const [members, setMembers] = useState<{ id: string; label: string; allowed: boolean }[]>([]);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!api || !workspaceId) return;
    const version = ++generation.current;
    setLoading(true);
    setDenied(false);
    setMessage('');
    try {
      const [f, s, l] = await Promise.all([
        api.fields(workspaceId),
        api.settings(workspaceId),
        api.layout(workspaceId, type),
      ]);
      if (version !== generation.current) return;
      setFields(f.fields);
      setSettings(s.settings);
      setLayout(l.layout);
      setRevision((v) => v + 1);
      if (isOwner) {
        const m = await api.members(workspaceId);
        if (version === generation.current) setMembers(m.members);
      }
    } catch (e) {
      if (version === generation.current) {
        setDenied(e instanceof BackendError && e.status === 403);
        setMessage(leadError(e));
      }
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [api, workspaceId, type, isOwner]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current += 1;
    };
  }, [refresh]);
  const field = fields.find((f) => f.id === fieldId);
  const base = `/w/${workspaceSlug}/settings/data-model/leads`;
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await action();
      await refresh();
      setMessage('Changes saved.');
    } catch (e) {
      setMessage(leadError(e));
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <PageBody>
        <p role="status">Loading data model…</p>
      </PageBody>
    );
  if (denied)
    return (
      <PageBody>
        <h1 className="text-lg font-semibold">Data model access</h1>
        <p role="alert">{message}</p>
      </PageBody>
    );
  if (!api || !workspaceId || !settings || !layout)
    return (
      <PageBody>
        <p role="alert">{message || 'The data model could not be loaded.'}</p>
        <Button onClick={() => void refresh()}>Retry</Button>
      </PageBody>
    );
  const client = api,
    workspace = workspaceId;
  if (fieldId)
    return (
      <>
        <PageHeader icon={DatabaseIcon} title={field?.label ?? 'Field'} />
        <PageBody>
          <Link href={base} className="text-sm underline">
            Back to fields
          </Link>
          {field ? (
            <div className="mt-6 max-w-xl space-y-6">
              <LeadFieldEditor
                key={`${field.id}:${field.version}`}
                initial={field}
                onSave={async (value) => {
                  const { type: _type, ...editable } = value;
                  await client.updateField(
                    workspace,
                    field.id,
                    field.origin === 'builtin'
                      ? {
                          expectedVersion: field.version,
                          label: value.label,
                          options: value.options,
                        }
                      : { ...editable, expectedVersion: field.version },
                  );
                  await refresh();
                  setMessage('Field saved.');
                }}
              />
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      client.updateField(workspace, field.id, {
                        expectedVersion: field.version,
                        active: !field.active,
                      }),
                    )
                  }
                >
                  {field.active ? 'Deactivate field' : 'Reactivate field'}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Deactivation hides the field and keeps all values.
                </p>
              </div>
              {field.origin === 'custom' && (
                <div className="space-y-2">
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete field
                  </Button>
                  {confirmDelete && (
                    <div role="group" aria-label="Confirm field deletion">
                      <p className="text-sm">
                        Delete this field if no lead holds a value? Its key will stay reserved.
                      </p>
                      <Button
                        variant="destructive"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await client.deleteField(workspace, field.id);
                            setConfirmDelete(false);
                            window.location.assign(base);
                          })
                        }
                      >
                        Confirm delete
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <p role="status" aria-live="polite" className="text-sm">
                {message}
              </p>
            </div>
          ) : (
            <p role="status">This field was not found.</p>
          )}
        </PageBody>
      </>
    );
  const shown = fields.filter(
    (f) =>
      f.label.toLowerCase().includes(search.toLowerCase()) &&
      (origin === 'all' || f.origin === origin) &&
      (active === 'all' || f.active === (active === 'active')),
  );
  return (
    <>
      <PageHeader icon={DatabaseIcon} title={settings.name}>
        <span className="text-xs text-muted-foreground">Data model</span>
      </PageHeader>
      <PageBody>
        <p className="mb-5 text-sm text-muted-foreground">
          Manage the fields and layout of leads for this site.
        </p>
        <div role="tablist" aria-label="Lead object settings" className="mb-6 flex gap-5 border-b">
          {(['Fields', 'Settings', 'Layout'] as const).map((item, index, tabs) => (
            <button
              type="button"
              role="tab"
              key={item}
              id={`tab-${item}`}
              aria-selected={tab === item}
              aria-controls={`panel-${item}`}
              tabIndex={tab === item ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const next = tabs[(index + (e.key === 'ArrowRight' ? 1 : 2)) % 3];
                  if (next) {
                    setTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  }
                }
              }}
              className={`border-b-2 px-1 pb-3 text-sm ${tab === item ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'Fields' && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative mr-auto">
                  <SearchIcon
                    className="absolute top-2.5 left-2 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    className="pl-8"
                    aria-label="Search fields"
                    placeholder="Search fields"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <NativeSelect
                  className="w-auto"
                  aria-label="Field origin"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                >
                  <option value="all">All origins</option>
                  <option value="builtin">Standard</option>
                  <option value="custom">Custom</option>
                </NativeSelect>
                <NativeSelect
                  className="w-auto"
                  aria-label="Field activity"
                  value={active}
                  onChange={(e) => setActive(e.target.value)}
                >
                  <option value="all">All fields</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </NativeSelect>
                <Button onClick={() => setAdding(true)}>
                  <PlusIcon className="size-4" />
                  Add field
                </Button>
              </div>
              <div className="overflow-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-xs text-muted-foreground">
                    <tr>
                      {['Name', 'Origin', 'Data type', 'Lead types', 'Status', ''].map((label) => (
                        <th key={label} className="p-3 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((field) => (
                      <tr key={field.id} className="border-t hover:bg-muted/20">
                        <td className="p-3">
                          <Link
                            className="flex items-center gap-2 font-medium"
                            href={`${base}/fields/${field.id}`}
                          >
                            <LeadFieldIcon icon={field.icon} />
                            {field.label}
                          </Link>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {field.origin === 'builtin' ? 'Standard' : 'Custom'}
                        </td>
                        <td className="p-3">{leadFieldTypes[field.type].label}</td>
                        <td className="p-3 text-muted-foreground">
                          {field.leadTypes.length
                            ? field.leadTypes.map((t) => leadTypeLabels[t]).join(', ')
                            : 'All lead types'}
                        </td>
                        <td className="p-3">{field.active ? 'Active' : 'Inactive'}</td>
                        <td className="p-3">
                          <Link
                            aria-label={`Open ${field.label}`}
                            href={`${base}/fields/${field.id}`}
                          >
                            <ChevronRightIcon className="size-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {shown.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    No fields match your search.
                  </p>
                )}
              </div>
            </>
          )}
          {tab === 'Settings' && (
            <div className="max-w-xl space-y-8">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() => client.saveSettings(workspace, settings));
                }}
              >
                <Label htmlFor="object-name">Object name</Label>
                <Input
                  id="object-name"
                  maxLength={80}
                  required
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
                <Label htmlFor="default-sort">Default sort</Label>
                <NativeSelect
                  id="default-sort"
                  value={settings.defaultSort.key}
                  onChange={(e) => {
                    const selected = fields.find((f) => f.key === e.target.value);
                    setSettings({
                      ...settings,
                      defaultSort: {
                        ...settings.defaultSort,
                        key: e.target.value,
                        part: selected?.type === 'address' ? 'city' : undefined,
                      },
                    });
                  }}
                >
                  {fields
                    .filter((f) => f.active && !f.sensitive)
                    .map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                </NativeSelect>
                <NativeSelect
                  aria-label="Default sort direction"
                  value={settings.defaultSort.direction}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultSort: {
                        ...settings.defaultSort,
                        direction: e.target.value === 'asc' ? 'asc' : 'desc',
                      },
                    })
                  }
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </NativeSelect>
                <Button disabled={busy}>Save settings</Button>
              </form>
              {isOwner && (
                <section className="space-y-3 border-t pt-5">
                  <h2 className="text-sm font-semibold">Manage data model permission</h2>
                  <p className="text-xs text-muted-foreground">
                    Grant this permission to staff who should manage fields and layouts.
                    Personal-data access stays separate.
                  </p>
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="break-all">{member.label}</span>
                      <input
                        aria-label={`Manage data model for ${member.label}`}
                        type="checkbox"
                        disabled={busy}
                        checked={member.allowed}
                        onChange={(e) => {
                          const allowed = e.target.checked;
                          setMembers((current) =>
                            current.map((item) =>
                              item.id === member.id ? { ...item, allowed } : item,
                            ),
                          );
                          void run(async () => {
                            try {
                              await client.grant(workspace, member.id, allowed);
                            } catch (error) {
                              setMembers((current) =>
                                current.map((item) =>
                                  item.id === member.id
                                    ? { ...item, allowed: member.allowed }
                                    : item,
                                ),
                              );
                              throw error;
                            }
                          });
                        }}
                      />
                    </label>
                  ))}
                </section>
              )}
            </div>
          )}
          {tab === 'Layout' && (
            <div className="space-y-5">
              <label className="block max-w-xs space-y-2 text-sm">
                Lead type
                <NativeSelect
                  value={type}
                  onChange={(e) => setType(leadTypeSchema.parse(e.target.value))}
                >
                  {leadTypeSchema.options.map((type) => (
                    <option key={type} value={type}>
                      {leadTypeLabels[type]}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <LeadLayoutEditor
                key={`${type}:${revision}`}
                initial={layout}
                fields={fields.filter((f) => fieldApplies(f, type))}
                onSave={async (next) => {
                  await client.saveLayout(workspace, type, next);
                  setLayout(next);
                }}
              />
            </div>
          )}
        </div>
        <p role="status" aria-live="polite" className="mt-4 text-sm">
          {message}
        </p>
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogContent className="max-h-[85vh] overflow-auto">
            <DialogTitle>Add field</DialogTitle>
            <DialogDescription>Choose a type and configure a custom lead field.</DialogDescription>
            <LeadFieldEditor
              onSave={async (value) => {
                await client.createField(workspace, value);
                setAdding(false);
                await refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      </PageBody>
    </>
  );
}
