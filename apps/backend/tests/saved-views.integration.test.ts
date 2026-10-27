import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';
import type { OrderViewState } from '@canadian-plans/contracts';

import { DatabaseSavedViewStore } from '../src/views/store.js';

function disposableDatabaseUrl(): string | undefined {
  const url = process.env.TEST_MIGRATION_DATABASE_URL;
  const allowed = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!url && !allowed && !process.env.CI) return undefined;
  if (!url || !allowed) throw new Error('Both disposable database test settings are required.');
  if (!decodeURIComponent(new URL(url).pathname).endsWith('_test')) {
    throw new Error('The disposable database name must end in _test.');
  }
  return url;
}

const databaseUrl = disposableDatabaseUrl();
const databaseDescribe = databaseUrl ? describe : describe.skip;

const WORKSPACE = '10000000-0000-4000-8000-0000000009a1';
const OTHER_WORKSPACE = '10000000-0000-4000-8000-0000000009b1';
const OWNER = '20000000-0000-4000-8000-0000000009a1';
const COLLEAGUE = '20000000-0000-4000-8000-0000000009a2';
const REQUEST = '70000000-0000-4000-8000-0000000009a1';

const STATE: OrderViewState = {
  filters: { status: 'awaiting_customer', archiveState: 'active' },
  sort: { field: 'updatedAt', direction: 'desc' },
  hiddenColumns: ['source'],
};

databaseDescribe('private saved views against Postgres', () => {
  let admin: ReturnType<typeof postgres>;
  let client: DatabaseClient;
  let store: DatabaseSavedViewStore;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);
    await admin`
      insert into app.workspaces (id, slug, name) values
        (${WORKSPACE}, 'saved-views', 'Saved Views'),
        (${OTHER_WORKSPACE}, 'saved-views-2', 'Saved Views Two')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.memberships (workspace_id, user_id, membership_type, status, accepted_at) values
        (${WORKSPACE}, ${OWNER}, 'staff', 'active', now()),
        (${WORKSPACE}, ${COLLEAGUE}, 'staff', 'active', now()),
        (${OTHER_WORKSPACE}, ${OWNER}, 'staff', 'active', now())
      on conflict do nothing
    `;
    await admin`delete from app.saved_views where workspace_id in (${WORKSPACE}, ${OTHER_WORKSPACE})`;

    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    client = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
    store = new DatabaseSavedViewStore(client);
  });

  afterAll(async () => {
    await client?.close();
    await admin?.end();
  });

  test('a view is visible and editable only by the staff member who saved it', async () => {
    const owner = { workspaceId: WORKSPACE, actorId: OWNER, requestId: REQUEST };
    const colleague = { workspaceId: WORKSPACE, actorId: COLLEAGUE, requestId: REQUEST };

    const created = await store.create(owner, { object: 'orders', name: 'Waiting', state: STATE });
    expect(created.status).toBe('created');
    if (created.status !== 'created') return;
    expect(created.view.state).toEqual(STATE);

    expect(await store.list(colleague, 'orders')).toEqual([]);
    expect(
      await store.update(colleague, created.view.id, { expectedVersion: 1, name: 'Taken' }),
    ).toEqual({ status: 'not_found' });
    expect(await store.delete(colleague, created.view.id)).toEqual({ status: 'not_found' });

    // The same person in another workspace does not see it either.
    expect(await store.list({ ...owner, workspaceId: OTHER_WORKSPACE }, 'orders')).toEqual([]);

    // Row security blocks a direct read without the owner's context, not just the store's filter.
    const rows = await client.withTenantTx({ workspaceId: WORKSPACE, actorId: COLLEAGUE }, (tx) =>
      tx.execute<{ id: string }>(sql`select id from app.saved_views`),
    );
    expect(rows.length).toBe(0);

    const [audit] = await admin<{ action: string; after: unknown }[]>`
      select action, after from app.audit_events
      where workspace_id = ${WORKSPACE} and entity = 'saved_view' and entity_id = ${created.view.id}
    `;
    expect(audit).toEqual({
      action: 'saved_view.created',
      after: { object: 'orders', version: 1 },
    });
  });

  test('names are unique per person regardless of case, and versions guard updates', async () => {
    const owner = { workspaceId: WORKSPACE, actorId: OWNER, requestId: REQUEST };
    const first = await store.create(owner, { object: 'orders', name: 'Unpaid', state: STATE });
    expect(first.status).toBe('created');
    if (first.status !== 'created') return;
    expect(await store.create(owner, { object: 'orders', name: 'UNPAID', state: STATE })).toEqual({
      status: 'name_taken',
    });

    const colleague = { workspaceId: WORKSPACE, actorId: COLLEAGUE, requestId: REQUEST };
    expect(
      (await store.create(colleague, { object: 'orders', name: 'Unpaid', state: STATE })).status,
    ).toBe('created');

    const renamed = await store.update(owner, first.view.id, {
      expectedVersion: 1,
      name: 'Unpaid orders',
    });
    expect(renamed.status).toBe('updated');
    expect(
      await store.update(owner, first.view.id, { expectedVersion: 1, name: 'Stale tab' }),
    ).toEqual({ status: 'version_conflict' });
  });
});
