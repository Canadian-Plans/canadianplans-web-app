'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ListWorkspaceJobsResponse } from '@canadian-plans/contracts';
import { Badge, Button } from '@canadian-plans/ui';

import { BackendError, listWorkspaceJobs, retryWorkspaceJob } from '../lib/api';
import { useStaffSession } from './staff-session-provider';

function time(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

export function JobsStatus({ workspaceSlug }: { workspaceSlug: string }) {
  const staff = useStaffSession();
  const workspaceId = staff.workspaces.find((item) => item.slug === workspaceSlug)?.id;
  const [result, setResult] = useState<ListWorkspaceJobsResponse>();
  const [message, setMessage] = useState<string>();
  const [busyJobId, setBusyJobId] = useState<string>();

  const refresh = useCallback(async () => {
    if (!staff.accessToken || !workspaceId) return;
    setMessage(undefined);
    try {
      const jobs = await listWorkspaceJobs(staff.accessToken, workspaceId);
      setResult(jobs);
    } catch (error) {
      setMessage(
        `Could not load job state. Reason: ${error instanceof BackendError ? error.code : 'internal_error'}.`,
      );
    }
  }, [staff.accessToken, workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function retry(jobId: string) {
    if (!staff.accessToken || !workspaceId || busyJobId) return;
    setBusyJobId(jobId);
    setMessage(undefined);
    try {
      await retryWorkspaceJob(staff.accessToken, workspaceId, jobId);
      await refresh();
    } catch (error) {
      setMessage(
        `Could not retry the job. Reason: ${error instanceof BackendError ? error.code : 'internal_error'}.`,
      );
    } finally {
      setBusyJobId(undefined);
    }
  }

  if (!result && !message) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!result && message) return <p role="status">{message}</p>;
  if (!result) return null;

  const pending = result.jobs.filter(
    (job) => job.status === 'pending' || job.status === 'processing',
  );
  const failed = result.jobs.filter((job) => job.status === 'failed' || job.status === 'uncertain');

  return (
    <section className="flex flex-col gap-8">
      {message ? <p role="status">{message}</p> : null}
      <div>
        <h2 className="text-base font-semibold">Pending</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs are waiting or processing.</p>
        ) : (
          <JobTable jobs={pending} />
        )}
      </div>
      <div>
        <h2 className="text-base font-semibold">Failed</h2>
        {failed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No failed jobs.</p>
        ) : (
          <JobTable
            jobs={failed}
            action={(job) =>
              job.status === 'failed' && result.canRetry ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyJobId !== undefined}
                  onClick={() => void retry(job.id)}
                >
                  {busyJobId === job.id ? 'Retrying…' : 'Retry'}
                </Button>
              ) : job.status === 'uncertain' ? (
                <span className="text-xs text-muted-foreground">Reconcile before retry</span>
              ) : null
            }
          />
        )}
      </div>
    </section>
  );
}

function JobTable({
  jobs,
  action,
}: {
  jobs: ListWorkspaceJobsResponse['jobs'];
  action?: (job: ListWorkspaceJobsResponse['jobs'][number]) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="mt-2 w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground uppercase">
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Attempts</th>
            <th className="py-2 pr-4">Next attempt / lease</th>
            <th className="py-2 pr-4">Error</th>
            {action ? (
              <th className="py-2">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b last:border-0">
              <td className="py-2 pr-4">
                <code>{job.jobType}</code>
              </td>
              <td className="py-2 pr-4">
                <Badge variant="secondary">{job.status}</Badge>
              </td>
              <td className="py-2 pr-4">{job.attempts}</td>
              <td className="py-2 pr-4">{time(job.leaseExpiresAt ?? job.availableAt)}</td>
              <td className="py-2 pr-4">
                <code>{job.lastErrorCode ?? '—'}</code>
              </td>
              {action ? <td className="py-2 text-right">{action(job)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
