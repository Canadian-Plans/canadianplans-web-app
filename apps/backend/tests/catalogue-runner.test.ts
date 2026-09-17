import { describe, expect, it, vi } from 'vitest';

import type { DrainEventsResult } from '../src/catalogue/service.js';
import { CatalogueSyncRunner } from '../src/catalogue/runner.js';

const WORKSPACE_A = '10000000-0000-4000-8000-000000000791';
const WORKSPACE_B = '10000000-0000-4000-8000-000000000792';
const ACTOR = '20000000-0000-4000-8000-000000000793';

function drainResult(overrides: Partial<DrainEventsResult> = {}): DrainEventsResult {
  return { listed: 2, processed: 2, failed: 0, failures: [], ...overrides };
}

describe('CatalogueSyncRunner', () => {
  it('drains then reconciles each authorized workspace in order with the supplied actor', async () => {
    const calls: string[] = [];
    const drainEvents = vi.fn(async (workspaceId: string) => {
      calls.push(`drain:${workspaceId}`);
      return drainResult();
    });
    const reconcile = vi.fn(async (workspaceId: string) => {
      calls.push(`reconcile:${workspaceId}`);
    });
    const runner = new CatalogueSyncRunner({ handlers: { drainEvents, reconcile } });

    const summary = await runner.run({
      authorizedWorkspaceIds: [WORKSPACE_A, WORKSPACE_B],
      actorId: ACTOR,
    });

    expect(calls).toEqual([
      `drain:${WORKSPACE_A}`,
      `reconcile:${WORKSPACE_A}`,
      `drain:${WORKSPACE_B}`,
      `reconcile:${WORKSPACE_B}`,
    ]);
    expect(drainEvents).toHaveBeenCalledWith(WORKSPACE_A, ACTOR);
    expect(reconcile).toHaveBeenCalledWith(WORKSPACE_B, ACTOR);
    expect(summary).toEqual({
      workspaces: 2,
      listed: 4,
      processed: 4,
      drainFailed: 0,
      reconciled: 2,
      failures: [],
    });
  });

  it('stops starting new workspaces once the run deadline passes', async () => {
    let clock = 0;
    const drainEvents = vi.fn(async () => {
      // The first workspace's CMS read is slow enough to blow the budget.
      clock = 150;
      return drainResult();
    });
    const reconcile = vi.fn(async () => undefined);
    const runner = new CatalogueSyncRunner({
      handlers: { drainEvents, reconcile },
      runDeadlineMs: 100,
      now: () => clock,
    });

    const summary = await runner.run({
      authorizedWorkspaceIds: [WORKSPACE_A, WORKSPACE_B],
      actorId: ACTOR,
    });

    expect(drainEvents).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith(WORKSPACE_A, ACTOR);
    expect(summary.workspaces).toBe(2);
    expect(summary.reconciled).toBe(1);
  });

  it('records a failing stage and continues with the remaining workspaces', async () => {
    const drainEvents = vi.fn(async (workspaceId: string) => {
      if (workspaceId === WORKSPACE_A) throw new Error('provider_unavailable');
      return drainResult();
    });
    const reconcile = vi.fn(async (workspaceId: string) => {
      if (workspaceId === WORKSPACE_B) throw new Error('reconcile_failed');
    });
    const runner = new CatalogueSyncRunner({ handlers: { drainEvents, reconcile } });

    const summary = await runner.run({
      authorizedWorkspaceIds: [WORKSPACE_A, WORKSPACE_B],
      actorId: ACTOR,
    });

    // A failed drain still attempts reconciliation, the convergence path for a
    // missing webhook, and the second workspace is not skipped.
    expect(summary.failures).toEqual([
      { workspaceId: WORKSPACE_A, stage: 'drain', errorCode: 'provider_unavailable' },
      { workspaceId: WORKSPACE_B, stage: 'reconcile', errorCode: 'reconcile_failed' },
    ]);
    expect(summary.reconciled).toBe(1);
    expect(reconcile).toHaveBeenCalledWith(WORKSPACE_A, ACTOR);
  });

  it('surfaces the inbox failures a drain pass could not process', async () => {
    const drainEvents = vi.fn(async () => ({
      listed: 2,
      processed: 1,
      failed: 1,
      failures: [{ eventId: 'delivery-poison', errorCode: 'catalogue_fetch_failed' }],
    }));
    const reconcile = vi.fn(async () => undefined);
    const runner = new CatalogueSyncRunner({ handlers: { drainEvents, reconcile } });

    const summary = await runner.run({
      authorizedWorkspaceIds: [WORKSPACE_A],
      actorId: ACTOR,
    });

    expect(summary.drainFailed).toBe(1);
    expect(summary.failures).toEqual([
      { workspaceId: WORKSPACE_A, stage: 'drain', errorCode: 'catalogue_fetch_failed' },
    ]);
  });
});
