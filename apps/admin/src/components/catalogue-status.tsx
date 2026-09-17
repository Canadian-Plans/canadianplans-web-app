'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CatalogueStatusResponse } from '@canadian-plans/contracts';
import { Badge } from '@canadian-plans/ui';

import { BackendError, getCatalogueStatus } from '../lib/api';
import { useStaffSession } from './staff-session-provider';

function time(value: string | null): string {
  return value ? new Date(value).toLocaleString() : 'Never';
}

export function CatalogueStatus({ workspaceSlug }: { workspaceSlug: string }) {
  const staff = useStaffSession();
  const workspaceId = staff.workspaces.find((item) => item.slug === workspaceSlug)?.id;
  const [status, setStatus] = useState<CatalogueStatusResponse>();
  const [message, setMessage] = useState<string>();

  const refresh = useCallback(async () => {
    if (!staff.accessToken || !workspaceId) return;
    setMessage(undefined);
    try {
      setStatus(await getCatalogueStatus(staff.accessToken, workspaceId));
    } catch (error) {
      setMessage(
        `Could not load catalogue state. Reason: ${error instanceof BackendError ? error.code : 'internal_error'}.`,
      );
    }
  }, [staff.accessToken, workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!status && !message) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (message) return <p role="status">{message}</p>;
  if (!status) return null;

  return (
    <section className="flex flex-col gap-6">
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground uppercase">Last attempt</dt>
          <dd>{time(status.sync.lastAttemptAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground uppercase">Last success</dt>
          <dd>{time(status.sync.lastSuccessAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground uppercase">Current error</dt>
          <dd>{status.sync.lastErrorCode ?? 'None'}</dd>
        </div>
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground uppercase">
              <th className="py-2 pr-4">Product</th>
              <th className="py-2 pr-4">Offer</th>
              <th className="py-2 pr-4">Availability</th>
              <th className="py-2 pr-4">Version</th>
              <th className="py-2 pr-4">Last synced</th>
            </tr>
          </thead>
          <tbody>
            {status.offers.map((offer) => (
              <tr key={offer.productId} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  <code>{offer.productKey}</code>
                </td>
                <td className="py-2 pr-4">{offer.offerName ?? '—'}</td>
                <td className="py-2 pr-4">
                  <Badge variant={offer.available ? 'default' : 'secondary'}>
                    {offer.available ? 'Available' : 'Withdrawn'}
                  </Badge>
                </td>
                <td className="py-2 pr-4">
                  <code>{offer.offerVersionId ?? '—'}</code>
                </td>
                <td className="py-2 pr-4">{time(offer.lastSyncedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {status.offers.length === 0 ? <p>No synchronised offers yet.</p> : null}
      </div>

      <div>
        <h2 className="text-base font-semibold">Recent sync errors</h2>
        {status.errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sync errors recorded.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {status.errors.map((error) => (
              <li key={error.eventId}>
                <code>{error.errorCode}</code> · {error.documentId} · {time(error.occurredAt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
