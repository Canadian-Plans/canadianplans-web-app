import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';

import { DatabaseCatalogueStore } from '../src/catalogue/store.js';

function disposableDatabaseUrl(): string | undefined {
  const url = process.env.TEST_MIGRATION_DATABASE_URL;
  const allowed = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!url && !allowed) return undefined;
  if (!url || !allowed) throw new Error('Both disposable database test settings are required.');
  if (!decodeURIComponent(new URL(url).pathname).endsWith('_test')) {
    throw new Error('The disposable database name must end in _test.');
  }
  return url;
}

const databaseUrl = disposableDatabaseUrl();
const databaseDescribe = databaseUrl ? describe : describe.skip;

const WORKSPACE_A = '10000000-0000-4000-8000-000000000631';
const WORKSPACE_B = '10000000-0000-4000-8000-000000000632';
const WORKSPACE_C = '10000000-0000-4000-8000-000000000633';
const FOREIGN_WORKSPACE = '10000000-0000-4000-8000-000000000634';
const ACTOR_A = '20000000-0000-4000-8000-000000000631';
const ACTOR_B = '20000000-0000-4000-8000-000000000632';
const ACTOR_C = '20000000-0000-4000-8000-000000000633';
const FOREIGN_ACTOR = '20000000-0000-4000-8000-000000000634';
/** Ingest actor persisted on every seeded event; the drain only reads it back. */
const EVENT_ACTOR = '30000000-0000-4000-8000-000000000631';
const PROVIDER_ACCOUNT = 'project-drain-integration';
/** Attempt bound passed explicitly to the store listing; no drain default here. */
const MAX_ATTEMPTS = 3;

databaseDescribe('catalogue drain selection against Postgres', () => {
  let admin: ReturnType<typeof postgres>;
  let client: DatabaseClient;
  let store: DatabaseCatalogueStore;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);

    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    client = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
    store = new DatabaseCatalogueStore(client);
  });

  afterAll(async () => {
    await client?.close();
    await admin.end();
  });

  async function ensureWorkspace(id: string, slug: string): Promise<void> {
    await admin`
      insert into app.workspaces (id, slug, name)
      values (${id}, ${slug}, ${slug})
      on conflict (id) do nothing
    `;
  }

  async function seedEvent(workspaceId: string, deliveryId: string): Promise<string> {
    const accepted = await store.acceptEvent({
      workspaceId,
      actorId: EVENT_ACTOR,
      selector: 'site-1-sanity',
      providerAccount: PROVIDER_ACCOUNT,
      deliveryId,
      documentId: 'sanity-drain-offer',
      payload: { documentId: 'sanity-drain-offer' },
    });
    return accepted.eventId;
  }

  async function setEventState(
    workspaceId: string,
    eventId: string,
    status: string,
    attempts: number,
    createdAt: Date,
  ): Promise<void> {
    await admin`
      update app.catalogue_sync_events
      set status = ${status}, attempts = ${attempts}, created_at = ${createdAt}
      where workspace_id = ${workspaceId} and id = ${eventId}
    `;
  }

  async function listedIds(workspaceId: string, actorId: string, limit = 10) {
    const events = await store.listDrainableEvents(workspaceId, actorId, MAX_ATTEMPTS, limit);
    return events.map((event) => event.id);
  }

  test('lists pending and retry-eligible failed events by createdAt and excludes the rest', async () => {
    await ensureWorkspace(WORKSPACE_A, 'catalogue-drain-a');
    await ensureWorkspace(FOREIGN_WORKSPACE, 'catalogue-drain-foreign');

    const completed = await seedEvent(WORKSPACE_A, 'delivery-completed');
    const failedAtBound = await seedEvent(WORKSPACE_A, 'delivery-failed-bound');
    const processing = await seedEvent(WORKSPACE_A, 'delivery-processing');
    const foreignPending = await seedEvent(FOREIGN_WORKSPACE, 'delivery-foreign');
    const retryable = await seedEvent(WORKSPACE_A, 'delivery-retryable');
    const pendingEarly = await seedEvent(WORKSPACE_A, 'delivery-pending-early');
    const pendingLate = await seedEvent(WORKSPACE_A, 'delivery-pending-late');

    await setEventState(WORKSPACE_A, completed, 'completed', 0, new Date('2025-12-30T00:00:00Z'));
    await setEventState(
      WORKSPACE_A,
      failedAtBound,
      'failed',
      MAX_ATTEMPTS,
      new Date('2025-12-30T00:00:00Z'),
    );
    await setEventState(WORKSPACE_A, processing, 'processing', 0, new Date('2025-12-30T00:00:00Z'));
    // A pending row in another tenant must never appear for this workspace.
    await setEventState(
      FOREIGN_WORKSPACE,
      foreignPending,
      'pending',
      0,
      new Date('2025-12-30T00:00:00Z'),
    );
    await setEventState(WORKSPACE_A, retryable, 'failed', 2, new Date('2026-01-01T00:00:00Z'));
    await setEventState(WORKSPACE_A, pendingEarly, 'pending', 0, new Date('2026-01-02T00:00:00Z'));
    await setEventState(WORKSPACE_A, pendingLate, 'pending', 0, new Date('2026-01-03T00:00:00Z'));

    expect(await listedIds(WORKSPACE_A, ACTOR_A)).toEqual([retryable, pendingEarly, pendingLate]);
    expect(await listedIds(FOREIGN_WORKSPACE, FOREIGN_ACTOR)).toEqual([foreignPending]);
  });

  test('breaks equal createdAt ties by ascending id', async () => {
    await ensureWorkspace(WORKSPACE_B, 'catalogue-drain-b');
    const first = await seedEvent(WORKSPACE_B, 'delivery-tie-1');
    const second = await seedEvent(WORKSPACE_B, 'delivery-tie-2');
    const createdAt = new Date('2026-01-01T00:00:00Z');
    await setEventState(WORKSPACE_B, first, 'pending', 0, createdAt);
    await setEventState(WORKSPACE_B, second, 'pending', 0, createdAt);

    const expected = [first, second].sort();
    expect(await listedIds(WORKSPACE_B, ACTOR_B)).toEqual(expected);
  });

  test('bounds the listing to the requested limit in order', async () => {
    await ensureWorkspace(WORKSPACE_C, 'catalogue-drain-c');
    const first = await seedEvent(WORKSPACE_C, 'delivery-limit-1');
    const second = await seedEvent(WORKSPACE_C, 'delivery-limit-2');
    const third = await seedEvent(WORKSPACE_C, 'delivery-limit-3');
    await setEventState(WORKSPACE_C, first, 'pending', 0, new Date('2026-01-01T00:00:00Z'));
    await setEventState(WORKSPACE_C, second, 'pending', 0, new Date('2026-01-02T00:00:00Z'));
    await setEventState(WORKSPACE_C, third, 'pending', 0, new Date('2026-01-03T00:00:00Z'));

    expect(await listedIds(WORKSPACE_C, ACTOR_C, 2)).toEqual([first, second]);
  });
});
