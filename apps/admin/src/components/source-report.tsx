'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SourceReportGroup, SourceReportResponse } from '@canadian-plans/contracts';

import { BackendError, getSourceReport } from '../lib/api';
import { useStaffSession } from './staff-session-provider';

const DIMENSION_LABELS: Record<SourceReportGroup['dimension'], string> = {
  utm_source: 'UTM source',
  utm_medium: 'UTM medium',
  utm_campaign: 'UTM campaign',
  partner: 'Partner',
};

/** A `YYYY-MM-DD` input becomes a UTC day boundary; the report groups by stored timestamps. */
function startOfDay(value: string): string | undefined {
  return value ? `${value}T00:00:00.000Z` : undefined;
}
function endOfDay(value: string): string | undefined {
  return value ? `${value}T23:59:59.999Z` : undefined;
}

export function SourceReport({ workspaceSlug }: { workspaceSlug: string }) {
  const staff = useStaffSession();
  const workspace = staff.workspaces.find((item) => item.slug === workspaceSlug);
  const workspaceId = workspace?.id;
  const accessToken = staff.accessToken;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [report, setReport] = useState<SourceReportResponse>();
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken || !workspaceId) return;
    setLoading(true);
    setMessage(undefined);
    try {
      const result = await getSourceReport(accessToken, workspaceId, range);
      setReport(result);
    } catch (error) {
      setMessage(
        `Could not load the report. Reason: ${error instanceof BackendError ? error.code : 'internal_error'}.`,
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId, range]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const groups = report?.groups ?? [];

  return (
    <section className="flex flex-col gap-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setRange({ from: startOfDay(from), to: endOfDay(to) });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">From</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded-md border border-input px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">To</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="rounded-md border border-input px-2 py-1"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </form>

      {report ? (
        <p className="text-sm text-muted-foreground" data-testid="source-report-totals">
          {report.totals.leads} leads · {report.totals.orders} orders
        </p>
      ) : null}

      {loading && groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attributed leads or orders in range.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground uppercase">
                <th className="py-2 pr-4 font-medium">Dimension</th>
                <th className="py-2 pr-4 font-medium">Value</th>
                <th className="py-2 pr-4 font-medium">Leads</th>
                <th className="py-2 pr-4 font-medium">Orders</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={`${group.dimension}:${group.value}`} className="border-b last:border-0">
                  <td className="py-2 pr-4">{DIMENSION_LABELS[group.dimension]}</td>
                  <td className="py-2 pr-4">
                    <code className="text-xs">{group.value}</code>
                  </td>
                  <td className="py-2 pr-4">{group.leads}</td>
                  <td className="py-2 pr-4">{group.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message ? (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </section>
  );
}
