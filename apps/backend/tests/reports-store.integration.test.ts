import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';

import { DatabaseReportStore } from '../src/reports/store.js';

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
const databaseTest = databaseUrl ? describe : describe.skip;

// A distinct id range from the other integration suites sharing this database.
const WORKSPACE = '12000000-0000-4000-8000-000000000c01';
const FOREIGN_WORKSPACE = '12000000-0000-4000-8000-000000000c02';
const ACTOR = '22000000-0000-4000-8000-000000000c01';
const PARTNER = '82000000-0000-4000-8000-000000000c01';
const LEAD_A = '52000000-0000-4000-8000-000000000c01';
const LEAD_B = '52000000-0000-4000-8000-000000000c02';
const FOREIGN_LEAD = '52000000-0000-4000-8000-000000000c03';
const ORDER_A = '62000000-0000-4000-8000-000000000c01';

databaseTest('DatabaseReportStore (T20)', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;
  let store: DatabaseReportStore;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);

    await admin`
      insert into app.workspaces (id, slug, name)
      values
        (${WORKSPACE}, 'ci-reports-workspace', 'CI Reports Workspace'),
        (${FOREIGN_WORKSPACE}, 'ci-reports-workspace-b', 'CI Reports Workspace B')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.partners (id, workspace_id, name, referral_code, status)
      values (${PARTNER}, ${WORKSPACE}, 'Maple Leaf Referrals', 'REPORTS10', 'approved')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.leads (id, workspace_id, status, consent_version, attribution, partner_id, created_at)
      values
        (${LEAD_A}, ${WORKSPACE}, 'incomplete', 'terms-1',
          ${admin.json({ utmSource: 'google', utmMedium: 'cpc' })}::jsonb, ${PARTNER}, '2026-09-10T12:00:00Z'),
        (${LEAD_B}, ${WORKSPACE}, 'incomplete', 'terms-1',
          ${admin.json({ utmSource: 'google' })}::jsonb, null, '2026-09-20T12:00:00Z'),
        (${FOREIGN_LEAD}, ${FOREIGN_WORKSPACE}, 'incomplete', 'terms-1',
          ${admin.json({ utmSource: 'google' })}::jsonb, null, '2026-09-10T12:00:00Z')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.orders (
        id, workspace_id, reference, lead_id, status, payment_state, delivery_state,
        snapshot, payload, partner_id, submitted_at
      ) values (
        ${ORDER_A}, ${WORKSPACE}, 'CP-REPORT1', ${LEAD_A}, 'submitted', 'not_required', 'none',
        '{}'::jsonb, '{}'::jsonb, ${PARTNER}, '2026-09-11T12:00:00Z'
      ) on conflict (id) do nothing
    `;

    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    database = createDatabaseClient({
      connectionString: runtimeUrl.toString(),
      maxConnections: 1,
      ssl: false,
    });
    store = new DatabaseReportStore(database);
  });

  afterAll(async () => {
    await database.close();
    await admin.end();
  });

  test('counts leads and orders by UTM and partner, workspace-scoped', async () => {
    const result = await store.sourceReport({ workspaceId: WORKSPACE, actorId: ACTOR });

    expect(result.totals).toEqual({ leads: 2, orders: 1 });
    expect(result.groups).toContainEqual({
      dimension: 'utm_source',
      value: 'google',
      leads: 2,
      orders: 1,
    });
    expect(result.groups).toContainEqual({
      dimension: 'utm_medium',
      value: 'cpc',
      leads: 1,
      orders: 1,
    });
    expect(result.groups).toContainEqual({
      dimension: 'partner',
      value: 'Maple Leaf Referrals',
      leads: 1,
      orders: 1,
    });
    // The foreign workspace's lead never leaks into this workspace's counts.
    const foreign = result.groups.find((group) => group.value === WORKSPACE);
    expect(foreign).toBeUndefined();
  });

  test('honours the from/to date window', async () => {
    const result = await store.sourceReport({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      from: new Date('2026-09-15T00:00:00.000Z'),
    });

    expect(result.totals).toEqual({ leads: 1, orders: 0 });
    expect(result.groups).toContainEqual({
      dimension: 'utm_source',
      value: 'google',
      leads: 1,
      orders: 0,
    });
  });
});
