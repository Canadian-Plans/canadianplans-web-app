'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type {
  DeletionSubjectType,
  FindDeletionSubjectsResponse,
  RequestSubjectDeletionResponse,
} from '@canadian-plans/contracts';
import { Badge, Button, Input, Label } from '@canadian-plans/ui';

import { BackendError, findDeletionSubjects, requestSubjectDeletion } from '../lib/api';
import { useStaffSession } from './staff-session-provider';

type Subject = FindDeletionSubjectsResponse['subjects'][number];

const SUBJECT_LABELS: Record<DeletionSubjectType, string> = {
  order: 'Order',
  lead: 'Unsubmitted draft',
  region_waitlist: 'Wish-list entry',
};

const DEFAULT_REASON = 'Verified customer deletion request';

function failure(error: unknown): { text: string; mfa: boolean } {
  const code = error instanceof BackendError ? error.code : 'internal_error';
  if (code === 'mfa_required') {
    return { text: 'Verify multi-factor access before deleting customer data.', mfa: true };
  }
  if (code === 'permission_denied') {
    return { text: 'Only the Owner or Finance role can delete customer data.', mfa: false };
  }
  if (code === 'feature_not_ready') {
    return { text: 'Customer-data deletion is not configured on this backend.', mfa: false };
  }
  return { text: `The request failed. Reason: ${code}.`, mfa: false };
}

function subjectKey(subject: Pick<Subject, 'subjectType' | 'subjectId'>): string {
  return `${subject.subjectType}:${subject.subjectId}`;
}

/**
 * Finds the records held for one verified requester and deletes the ones the
 * staff member selects. Search never deletes; each record is deleted
 * explicitly, because sharing an email address does not authorize deleting
 * another person's order (docs/RUNBOOKS/data-deletion.md).
 */
export function CustomerDataDeletion({ workspaceSlug }: { workspaceSlug: string }) {
  const staff = useStaffSession();
  const workspaceId = staff.workspaces.find((item) => item.slug === workspaceSlug)?.id;
  const [email, setEmail] = useState('');
  const [searched, setSearched] = useState<string>();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<FindDeletionSubjectsResponse>();
  const [selected, setSelected] = useState<Subject>();
  const [reason, setReason] = useState(DEFAULT_REASON);
  const [verified, setVerified] = useState(false);
  const [outcomes, setOutcomes] = useState<Record<string, RequestSubjectDeletionResponse>>({});
  const [message, setMessage] = useState<{ text: string; mfa: boolean }>();
  const [busy, setBusy] = useState(false);
  const searchVersion = useRef(0);

  async function load(address: string, nextPage: number) {
    if (!staff.accessToken || !workspaceId) return;
    const version = ++searchVersion.current;
    setBusy(true);
    setMessage(undefined);
    try {
      const found = await findDeletionSubjects(staff.accessToken, workspaceId, {
        email: address,
        page: nextPage,
      });
      if (searchVersion.current !== version) return;
      setResult(found);
      setSearched(address);
      setPage(found.page);
    } catch (error) {
      if (searchVersion.current !== version) return;
      setMessage(failure(error));
    } finally {
      if (searchVersion.current === version) setBusy(false);
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSelected(undefined);
    setOutcomes({});
    void load(email.trim(), 1);
  }

  async function confirmDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!staff.accessToken || !workspaceId || !selected || !verified || busy) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const outcome = await requestSubjectDeletion(
        staff.accessToken,
        workspaceId,
        selected.subjectType,
        selected.subjectId,
        { reason: reason.trim() },
      );
      setOutcomes((current) => ({ ...current, [subjectKey(selected)]: outcome }));
      setSelected(undefined);
      setVerified(false);
      setReason(DEFAULT_REASON);
    } catch (error) {
      setMessage(failure(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <form onSubmit={search} className="flex max-w-lg flex-col gap-2" role="search">
        <Label htmlFor="deletion-email">Requester&apos;s email address</Label>
        <div className="flex gap-2">
          <Input
            id="deletion-email"
            type="email"
            autoComplete="off"
            maxLength={254}
            required
            disabled={busy}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" disabled={busy || !workspaceId}>
            Find records
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Verify the requester&apos;s identity before searching. Searching never deletes anything.
        </p>
      </form>

      {message ? (
        <p role="alert" className="text-sm">
          {message.text}{' '}
          {message.mfa ? (
            <Link className="underline" href="/mfa/challenge">
              Verify now
            </Link>
          ) : null}
        </p>
      ) : null}

      {result && searched ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Records for this address</h2>
          {result.subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No retained records match.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground uppercase">
                    <th className="py-2 pr-4">Record</th>
                    <th className="py-2 pr-4">Reference</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.subjects.map((subject) => {
                    const outcome = outcomes[subjectKey(subject)];
                    return (
                      <tr key={subjectKey(subject)} className="border-b last:border-0">
                        <td className="py-2 pr-4">{SUBJECT_LABELS[subject.subjectType]}</td>
                        <td className="py-2 pr-4">
                          <code>{subject.reference ?? '—'}</code>
                        </td>
                        <td className="py-2 pr-4">
                          {new Date(subject.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 text-right">
                          {outcome ? (
                            <Badge variant="secondary">
                              {outcome.cleanupStatus === 'completed'
                                ? 'Deleted'
                                : outcome.ledgerStatus === 'acknowledged'
                                  ? 'Deletion in progress'
                                  : 'Restricted, awaiting ledger'}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              aria-label={`Delete ${SUBJECT_LABELS[subject.subjectType]} ${subject.reference ?? subject.subjectId}`}
                              onClick={() => {
                                setSelected(subject);
                                setVerified(false);
                              }}
                            >
                              Delete…
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {page > 1 || result.hasMore ? (
            <nav aria-label="Record pages" className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || page <= 1}
                onClick={() => void load(searched, page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || !result.hasMore}
                onClick={() => void load(searched, page + 1)}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </div>
      ) : null}

      {selected ? (
        <form
          onSubmit={confirmDeletion}
          aria-labelledby="deletion-confirm-title"
          className="flex max-w-lg flex-col gap-3 rounded-md border p-4"
        >
          <h2 id="deletion-confirm-title" className="text-base font-semibold">
            Delete {SUBJECT_LABELS[selected.subjectType].toLowerCase()} {selected.reference ?? ''}
          </h2>
          <p className="text-sm text-muted-foreground">
            Access is restricted immediately. Personal data and documents are erased after the
            deletion ledger acknowledges; the commercial record is kept. This cannot be undone.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="deletion-reason">Reason (no personal details)</Label>
            <Input
              id="deletion-reason"
              required
              maxLength={500}
              disabled={busy}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={verified}
              disabled={busy}
              onChange={(event) => setVerified(event.target.checked)}
            />
            I verified that this record belongs to the person requesting deletion.
          </label>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="destructive"
              disabled={busy || !verified || reason.trim() === ''}
            >
              {busy ? 'Deleting…' : 'Delete customer data'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setSelected(undefined)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
