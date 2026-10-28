'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  NativeSelect,
} from '@canadian-plans/ui';
import {
  fieldApplies,
  leadTypeLabels,
  leadTypeSchema,
  leadViewSchema,
  type LeadModelResponse,
  type LeadSearchResponse,
  type LeadView,
  type LeadViewState,
} from '@canadian-plans/contracts';
import { describeLeadFilter, LeadFilterBuilder } from './leads/filter-builder';
import { formatLeadValue, leadError, useLeadWorkspace } from './leads/shared';

const emptyState: LeadViewState = { columns: [], filters: [] };
/** Only type and opaque view ID are shareable. */
function updateUrl(state: LeadViewState, viewId?: string) {
  const params = new URLSearchParams();
  if (state.leadType) params.set('leadType', state.leadType);
  if (viewId) params.set('view', viewId);
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${params.size ? `?${params}` : ''}`,
  );
}
export function LeadsList({ workspaceSlug }: { workspaceSlug: string }) {
  const { api, workspaceId } = useLeadWorkspace(workspaceSlug);
  const [model, setModel] = useState<LeadModelResponse>(),
    [views, setViews] = useState<LeadView[]>([]),
    [state, setState] = useState<LeadViewState>(emptyState);
  const [viewId, setViewId] = useState<string>(),
    [page, setPage] = useState(1),
    [data, setData] = useState<LeadSearchResponse>();
  const [loading, setLoading] = useState(true),
    [message, setMessage] = useState(''),
    [filterOpen, setFilterOpen] = useState(false),
    [saveOpen, setSaveOpen] = useState(false),
    [name, setName] = useState(''),
    [dialog, setDialog] = useState<'create' | 'rename'>('create'),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const generation = useRef(0),
    queryGeneration = useRef(0);
  const loadModel = useCallback(async () => {
    if (!api || !workspaceId) return;
    const version = ++generation.current;
    setLoading(true);
    setModel(undefined);
    setData(undefined);
    setMessage('');
    try {
      const m = await api.model(workspaceId);
      const saved = m.capabilities.canReadPersonal ? (await api.views(workspaceId)).views : [];
      if (version !== generation.current) return;
      const params = new URLSearchParams(window.location.search);
      const selected = saved.find(
        (v) => v.id === leadViewSchema.shape.id.safeParse(params.get('view')).data,
      );
      const leadType = leadTypeSchema.safeParse(params.get('leadType')).data;
      const defaults: LeadViewState = {
        columns: m.capabilities.canReadPersonal
          ? ['fullName', 'email', 'source', 'status', 'updatedAt'].filter((key) =>
              m.fields.some((f) => f.key === key && !f.sensitive),
            )
          : [],
        filters: [],
        leadType,
      };
      const next = selected?.state ?? defaults;
      setModel(m);
      setViews(saved);
      setState(next);
      setViewId(selected?.id);
      setPage(1);
      updateUrl(next, selected?.id);
    } catch (e) {
      if (version === generation.current) {
        setMessage(leadError(e));
        setLoading(false);
      }
    }
  }, [api, workspaceId]);
  useEffect(() => {
    void loadModel();
    return () => {
      generation.current += 1;
      queryGeneration.current += 1;
    };
  }, [loadModel]);
  useEffect(() => {
    if (!api || !workspaceId || !model) return;
    const version = ++queryGeneration.current;
    setLoading(true);
    setMessage('');
    void api
      .search(workspaceId, { ...state, page, pageSize: 25 })
      .then((response) => {
        if (version === queryGeneration.current) setData(response);
      })
      .catch((e: unknown) => {
        if (version === queryGeneration.current) {
          setData(undefined);
          setMessage(leadError(e));
        }
      })
      .finally(() => {
        if (version === queryGeneration.current) setLoading(false);
      });
    return () => {
      queryGeneration.current += 1;
    };
  }, [api, workspaceId, model, state, page]);
  /** Edits stay attached to the open view until saved, saved as new, or switched away. */
  const change = (next: LeadViewState) => {
    setState(next);
    setPage(1);
    setNotice('');
    updateUrl(next, viewId);
  };
  const available =
    model?.fields.filter(
      (f) => f.active && !f.sensitive && (!state.leadType || fieldApplies(f, state.leadType)),
    ) ?? [];
  const activeView = views.find((v) => v.id === viewId);
  const dirty =
    activeView !== undefined && JSON.stringify(activeView.state) !== JSON.stringify(state);
  const openDialog = (mode: 'create' | 'rename') => {
    setDialog(mode);
    setName(mode === 'rename' && activeView ? activeView.name : '');
    setMessage('');
    setSaveOpen(true);
  };
  const reorder = (key: string, offset: number) => {
    const columns = [...state.columns];
    const index = columns.indexOf(key);
    columns.splice(index, 1);
    columns.splice(index + offset, 0, key);
    change({ ...state, columns });
  };
  /** With `view`, updates that saved view (its version guards lost updates); otherwise creates one. */
  async function persistView(input: { view?: LeadView; name: string; state: LeadViewState }) {
    if (!api || !workspaceId || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = input.view
        ? await api.updateView(workspaceId, input.view.id, {
            name: input.name,
            state: input.state,
            expectedVersion: input.view.version,
          })
        : await api.createView(workspaceId, { name: input.name, state: input.state });
      setViews((v) => [...v.filter((item) => item.id !== result.view.id), result.view]);
      setViewId(result.view.id);
      updateUrl(result.view.state, result.view.id);
      setSaveOpen(false);
      setNotice(input.view ? 'View saved.' : 'View created.');
    } catch (e) {
      setMessage(leadError(e));
    } finally {
      setBusy(false);
    }
  }
  if (!model)
    return (
      <div>
        {loading ? (
          <p role="status">Loading leads…</p>
        ) : (
          <>
            <p role="alert">{message}</p>
            <Button onClick={() => void loadModel()}>Retry</Button>
          </>
        )}
      </div>
    );
  return (
    <section className="space-y-4" aria-label={model.settings.name}>
      <h1 className="text-xl font-semibold">{model.settings.name}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm">
          Lead type
          <NativeSelect
            aria-label="Lead type"
            value={state.leadType ?? ''}
            onChange={(e) => {
              const type = leadTypeSchema.safeParse(e.target.value).data;
              const keys = model.fields
                .filter((f) => !type || fieldApplies(f, type))
                .map((f) => f.key);
              change({
                ...state,
                leadType: type,
                filters: state.filters.filter((f) => keys.includes(f.key)),
                columns: state.columns.filter((key) => keys.includes(key)),
                sort: state.sort && keys.includes(state.sort.key) ? state.sort : undefined,
              });
            }}
          >
            <option value="">All lead types</option>
            {leadTypeSchema.options.map((t) => (
              <option key={t} value={t}>
                {leadTypeLabels[t]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="text-sm">
          Status
          <NativeSelect
            aria-label="Lead status"
            value={state.status ?? ''}
            onChange={(e) =>
              change({
                ...state,
                status:
                  e.target.value === 'incomplete' || e.target.value === 'submitted'
                    ? e.target.value
                    : undefined,
              })
            }
          >
            <option value="">All statuses</option>
            <option value="incomplete">Incomplete</option>
            <option value="submitted">Submitted</option>
          </NativeSelect>
        </label>
        {model.capabilities.canReadPersonal && (
          <>
            <label className="text-sm">
              View
              <NativeSelect
                aria-label="Personal view"
                value={viewId ?? ''}
                onChange={(e) => {
                  const selected = views.find((v) => v.id === e.target.value);
                  const next = selected?.state ?? {
                    columns: ['fullName', 'status', 'updatedAt'].filter((key) =>
                      available.some((f) => f.key === key),
                    ),
                    filters: [],
                  };
                  setState(next);
                  setViewId(selected?.id);
                  setPage(1);
                  updateUrl(next, selected?.id);
                }}
              >
                <option value="">Unsaved view</option>
                {views.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
            {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
            <Button
              variant="outline"
              disabled={busy || (activeView !== undefined && !dirty)}
              onClick={() =>
                activeView
                  ? void persistView({ view: activeView, name: activeView.name, state })
                  : openDialog('create')
              }
            >
              Save view
            </Button>
            {activeView && (
              <>
                <Button variant="ghost" disabled={busy} onClick={() => openDialog('create')}>
                  Save as new view
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => openDialog('rename')}>
                  Rename view
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    if (!api || !workspaceId) return;
                    setBusy(true);
                    try {
                      await api.deleteView(workspaceId, activeView.id);
                      setViews(views.filter((v) => v.id !== activeView.id));
                      setViewId(undefined);
                      setNotice('View deleted.');
                      updateUrl(state);
                    } catch (e) {
                      setMessage(leadError(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Delete view
                </Button>
              </>
            )}
          </>
        )}
        {model.capabilities.canManageDataModel && (
          <Link
            className="ml-auto text-sm underline"
            href={`/w/${workspaceSlug}/settings/data-model/leads`}
          >
            Manage fields
          </Link>
        )}
      </div>
      {model.capabilities.canReadPersonal && (
        <div className="flex flex-wrap items-start gap-2">
          <Button
            variant="outline"
            disabled={state.filters.length >= 10}
            onClick={() => setFilterOpen(true)}
          >
            Add filter
          </Button>
          <details className="rounded-md border px-3 py-2 text-sm">
            <summary className="cursor-pointer">Columns ({state.columns.length}/12)</summary>
            <div className="mt-3 max-h-80 space-y-2 overflow-auto">
              {available.map((field) => {
                const index = state.columns.indexOf(field.key);
                return (
                  <div key={field.key} className="flex items-center gap-2">
                    <label className="mr-auto flex gap-2">
                      <input
                        type="checkbox"
                        checked={index >= 0}
                        disabled={index < 0 && state.columns.length >= 12}
                        onChange={(e) =>
                          change({
                            ...state,
                            columns: e.target.checked
                              ? [...state.columns, field.key]
                              : state.columns.filter((key) => key !== field.key),
                          })
                        }
                      />
                      {field.label}
                    </label>
                    {index >= 0 && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Move ${field.label} column left`}
                          disabled={index === 0}
                          onClick={() => reorder(field.key, -1)}
                        >
                          ←
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Move ${field.label} column right`}
                          disabled={index === state.columns.length - 1}
                          onClick={() => reorder(field.key, 1)}
                        >
                          →
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
          {state.sort && (
            <Button variant="ghost" onClick={() => change({ ...state, sort: undefined })}>
              Clear sort
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {state.filters.map((filter, index) => (
          <button
            type="button"
            className="rounded-full border bg-muted/40 px-3 py-1 text-xs"
            key={`${filter.key}:${index}`}
            aria-label={`Remove filter ${describeLeadFilter(filter, available)}`}
            onClick={() =>
              change({ ...state, filters: state.filters.filter((_, i) => i !== index) })
            }
          >
            {describeLeadFilter(filter, available)} ×
          </button>
        ))}
      </div>
      {loading ? (
        <p role="status">Loading leads…</p>
      ) : data?.leads.length ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="p-3 font-medium">Lead</th>
                {state.columns.map((key) => {
                  const field = available.find((f) => f.key === key);
                  return (
                    <th
                      key={key}
                      className="p-3 font-medium"
                      aria-sort={
                        state.sort?.key === key
                          ? state.sort.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        type="button"
                        className="whitespace-nowrap"
                        onClick={() =>
                          change({
                            ...state,
                            sort: {
                              key,
                              direction:
                                state.sort?.key === key && state.sort.direction === 'asc'
                                  ? 'desc'
                                  : 'asc',
                              part: field?.type === 'address' ? 'city' : undefined,
                            },
                          })
                        }
                      >
                        {field?.label ?? key}{' '}
                        {state.sort?.key === key
                          ? state.sort.direction === 'asc'
                            ? '↑'
                            : '↓'
                          : ''}
                      </button>
                    </th>
                  );
                })}
                {!model.capabilities.canReadPersonal && <th className="p-3">Status</th>}
              </tr>
            </thead>
            <tbody>
              {data.leads.map((lead) => (
                <tr className="border-t hover:bg-muted/20" key={lead.id}>
                  <td className="p-3">
                    <Link
                      className="whitespace-nowrap underline"
                      href={`/w/${workspaceSlug}/leads/${lead.id}`}
                    >
                      Open lead{' '}
                      <span className="text-xs text-muted-foreground">{lead.id.slice(0, 8)}</span>
                    </Link>
                  </td>
                  {state.columns.map((key) => {
                    const field = available.find((f) => f.key === key);
                    return (
                      <td key={key} className="max-w-64 truncate p-3">
                        {field ? formatLeadValue(field, lead.fields[key]) : '—'}
                      </td>
                    );
                  })}
                  {!model.capabilities.canReadPersonal && <td className="p-3">{lead.status}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-6 text-sm text-muted-foreground">
          {message ? 'Leads could not be loaded.' : 'No leads match this view.'}
        </p>
      )}
      <nav aria-label="Lead pages" className="flex items-center gap-3">
        <Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {Math.max(1, Math.ceil((data?.page.total ?? 0) / 25))} ·{' '}
          {data?.page.total ?? 0} leads
        </span>
        <Button
          variant="outline"
          disabled={loading || page * 25 >= (data?.page.total ?? 0)}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </nav>
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {message && (
        <p role="alert" className="text-sm">
          {message}
        </p>
      )}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogTitle>Add filter</DialogTitle>
          <DialogDescription>
            Filter values stay private and never appear in the URL.
          </DialogDescription>
          <LeadFilterBuilder
            fields={available}
            onAdd={(filter) => {
              change({ ...state, filters: [...state.filters, filter] });
              setFilterOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogTitle>
            {dialog === 'rename' ? 'Rename view' : activeView ? 'Save as new view' : 'Save view'}
          </DialogTitle>
          <DialogDescription>This view is visible only to you.</DialogDescription>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void persistView(
                dialog === 'rename' && activeView
                  ? { view: activeView, name, state: activeView.state }
                  : { name, state },
              );
            }}
          >
            <label className="block text-sm">
              View name
              <Input
                aria-label="View name"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <Button disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            {message && <p role="alert">{message}</p>}
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
