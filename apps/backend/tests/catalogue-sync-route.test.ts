import type { Server } from 'node:http';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MachineRegistry } from '../src/machines/registry.js';
import { requestId } from '../src/requestId.js';
import { createCatalogueSyncRouter } from '../src/routes/catalogue-sync.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000781';
const ACTOR = '20000000-0000-4000-8000-000000000781';
const SECRET = 'catalogue-sync-secret-value-00000781';

const EMPTY_SUMMARY = {
  workspaces: 1,
  listed: 0,
  processed: 0,
  drainFailed: 0,
  reconciled: 1,
  failures: [],
};

describe('/api/internal/catalogue/sync', () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
  });

  async function setup(
    options: { scope?: 'reconcile:run' | 'outbox:run'; environment?: string } = {},
  ) {
    const run = vi.fn(async () => EMPTY_SUMMARY);
    const registry = new MachineRegistry({
      webhooks: [],
      schedulers: [
        {
          selector: 'catalogue-sync',
          secret: SECRET,
          actorId: ACTOR,
          workspaceIds: [WORKSPACE],
          scopes: [options.scope ?? 'reconcile:run'],
          revoked: false,
        },
      ],
    });
    const app = express();
    app.use(requestId);
    app.use(
      '/api/internal/catalogue',
      createCatalogueSyncRouter({
        registry,
        run,
        selector: 'catalogue-sync',
        deploymentEnvironment: options.environment ?? 'production',
      }),
    );
    server = app.listen(0);
    await new Promise<void>((resolve) => server?.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('expected TCP server');
    return { run, url: `http://127.0.0.1:${address.port}/api/internal/catalogue/sync` };
  }

  it('runs drain+reconcile only for the registry-authorized workspace set and actor', async () => {
    const { run, url } = await setup();
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith({ authorizedWorkspaceIds: [WORKSPACE], actorId: ACTOR });
    expect(await response.json()).toMatchObject({ workspaces: 1, reconciled: 1 });
  });

  it('denies a wrong secret and a scheduler without the reconcile:run scope', async () => {
    let setupResult = await setup();
    let response = await fetch(setupResult.url, {
      method: 'POST',
      headers: { authorization: 'Bearer definitely-wrong-secret' },
    });
    expect(response.status).toBe(401);
    expect(setupResult.run).not.toHaveBeenCalled();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;

    // An outbox-only scheduler identity must not reach the catalogue schedule.
    setupResult = await setup({ scope: 'outbox:run' });
    response = await fetch(setupResult.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(response.status).toBe(403);
    expect(setupResult.run).not.toHaveBeenCalled();
  });

  it('refuses to schedule work on a preview deployment', async () => {
    const { run, url } = await setup({ environment: 'preview' });
    const response = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(response.status).toBe(403);
    expect(run).not.toHaveBeenCalled();
  });
});
