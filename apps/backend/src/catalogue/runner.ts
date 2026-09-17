import { safeFailureCode, type DrainEventsResult } from './service.js';

/**
 * The two already-tested T10 handlers the T10B schedule runs for one workspace,
 * in order: a bounded inbox drain first (delayed or duplicate deliveries), then
 * a published reconciliation for deliveries that never arrived at all.
 */
export interface CatalogueSyncHandlers {
  drainEvents(workspaceId: string, actorId: string): Promise<DrainEventsResult>;
  reconcile(workspaceId: string, actorId: string): Promise<void>;
}

export interface CatalogueSyncFailure {
  workspaceId: string;
  stage: 'drain' | 'reconcile';
  errorCode: string;
}

export interface CatalogueSyncRunSummary {
  workspaces: number;
  listed: number;
  processed: number;
  drainFailed: number;
  reconciled: number;
  failures: readonly CatalogueSyncFailure[];
}

export interface CatalogueSyncRunnerOptions {
  handlers: CatalogueSyncHandlers;
  /**
   * Wall-clock budget after which no further workspace is started; work already
   * in flight is still completed and recorded. `0` disables the bound.
   */
  runDeadlineMs?: number;
  now?: () => number;
}

/**
 * Runs drain+reconcile for each registry-authorized workspace with the same
 * bounded-run shape as the outbox runner: a slow CMS stops new work at the run
 * deadline but never abandons work already started. One workspace's failure is
 * recorded and the pass continues, so an unattended five-minute schedule cannot
 * stall on a single poison workspace.
 */
export class CatalogueSyncRunner {
  private readonly runDeadlineMs: number;
  private readonly now: () => number;

  constructor(private readonly options: CatalogueSyncRunnerOptions) {
    this.runDeadlineMs = options.runDeadlineMs ?? 120_000;
    this.now = options.now ?? Date.now;
  }

  async run(input: {
    authorizedWorkspaceIds: readonly string[];
    actorId: string;
  }): Promise<CatalogueSyncRunSummary> {
    const workspaceIds = [...new Set(input.authorizedWorkspaceIds)];
    const failures: CatalogueSyncFailure[] = [];
    const summary = {
      workspaces: workspaceIds.length,
      listed: 0,
      processed: 0,
      drainFailed: 0,
      reconciled: 0,
      failures,
    };
    const deadline =
      this.runDeadlineMs > 0 ? this.now() + this.runDeadlineMs : Number.POSITIVE_INFINITY;

    for (const workspaceId of workspaceIds) {
      // Once the deadline passes, stop starting new workspaces. Anything already
      // started above is finished and recorded below.
      if (this.now() >= deadline) break;
      try {
        const drained = await this.options.handlers.drainEvents(workspaceId, input.actorId);
        summary.listed += drained.listed;
        summary.processed += drained.processed;
        summary.drainFailed += drained.failed;
        for (const failure of drained.failures) {
          failures.push({ workspaceId, stage: 'drain', errorCode: failure.errorCode });
        }
      } catch (error) {
        failures.push({
          workspaceId,
          stage: 'drain',
          errorCode: safeFailureCode(error, 'drain_failed'),
        });
      }
      // Reconciliation is the convergence path for a webhook that never
      // arrived, so it still runs when the drain itself failed.
      try {
        await this.options.handlers.reconcile(workspaceId, input.actorId);
        summary.reconciled += 1;
      } catch (error) {
        failures.push({
          workspaceId,
          stage: 'reconcile',
          errorCode: safeFailureCode(error, 'reconcile_failed'),
        });
      }
    }
    return summary;
  }
}
