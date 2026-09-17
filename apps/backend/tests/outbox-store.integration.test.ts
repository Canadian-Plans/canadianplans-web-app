import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';

import { DatabaseOutboxStore } from '../src/jobs/store.js';

function disposableDatabaseUrl(): string | undefined {
  const url = process.env.TEST_MIGRATION_DATABASE_URL;
  const enabled = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!url && !enabled) return undefined;
  if (!url || !enabled) throw new Error('Outbox DB tests require both destructive-test variables.');
  if (!decodeURIComponent(new URL(url).pathname).endsWith('_test')) {
    throw new Error('Outbox DB tests require a disposable database ending in _test.');
  }
  return url;
}

const migrationUrl = disposableDatabaseUrl();
const databaseTest = migrationUrl ? describe : describe.skip;
const WORKSPACE_A = '10000000-0000-4000-8000-000000000781';
const WORKSPACE_B = '10000000-0000-4000-8000-000000000782';
const ACTOR = '20000000-0000-4000-8000-000000000781';
const PASSWORD = 'local_ci_runtime_password';

databaseTest('database outbox store', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;
  let store: DatabaseOutboxStore;

  beforeAll(async () => {
    if (!migrationUrl) throw new Error('missing migration URL');
    await applyMigrations({ connectionString: migrationUrl, ssl: false });
    admin = postgres(migrationUrl, { max: 1, prepare: false, ssl: false });
    await admin.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(745284914)`;
      await tx.unsafe(`ALTER ROLE app_runtime PASSWORD '${PASSWORD}'`);
    });
    await admin`
      insert into app.workspaces (id, slug, name)
      values
        (${WORKSPACE_A}, 'ci-outbox-a', 'CI Outbox A'),
        (${WORKSPACE_B}, 'ci-outbox-b', 'CI Outbox B')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.outbox_jobs (workspace_id, job_type, dedupe_key, payload)
      values
        (${WORKSPACE_A}, 'analytics_order_submitted', 'order:a1', ${admin.json({ orderId: crypto.randomUUID() })}),
        (${WORKSPACE_A}, 'analytics_order_submitted', 'order:a2', ${admin.json({ orderId: crypto.randomUUID() })}),
        (${WORKSPACE_B}, 'analytics_order_submitted', 'order:b1', ${admin.json({ orderId: crypto.randomUUID() })})
      on conflict (workspace_id, job_type, dedupe_key) do update set available_at = now(), status = 'pending', attempts = 0, lease_owner_id = null, lease_expires_at = null
    `;
    const runtimeUrl = new URL(migrationUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = PASSWORD;
    database = createDatabaseClient({
      connectionString: runtimeUrl.toString(),
      ssl: false,
      maxConnections: 4,
    });
    store = new DatabaseOutboxStore(database);
  });

  afterAll(async () => {
    await database.close();
    await admin.end();
  });

  test('parallel SKIP LOCKED claims are exclusive and workspace scoped', async () => {
    const now = new Date();
    const claim = (leaseOwnerId: string) =>
      store.claim({
        workspaceId: WORKSPACE_A,
        actorId: ACTOR,
        leaseOwnerId,
        limit: 1,
        now,
        leaseExpiresAt: new Date(now.getTime() + 60_000),
        maxAttempts: 8,
      });
    const [first, second] = await Promise.all([
      claim(crypto.randomUUID()),
      claim(crypto.randomUUID()),
    ]);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    const firstJob = first[0];
    const secondJob = second[0];
    if (!firstJob || !secondJob) throw new Error('expected two claimed jobs');
    expect(firstJob.id).not.toBe(secondJob.id);
    expect([...first, ...second].every((job) => job.workspaceId === WORKSPACE_A)).toBe(true);

    const persisted = await admin`
      select status, lease_owner_id
      from app.outbox_jobs
      where id = ${firstJob.id}
    `;
    expect(persisted[0]).toMatchObject({
      status: 'processing',
      lease_owner_id: firstJob.leaseOwnerId,
    });
  });

  test('terminal failure creates an alert and staff retry requeues it', async () => {
    const processing = await admin`
      select id, lease_owner_id
      from app.outbox_jobs
      where workspace_id = ${WORKSPACE_A} and status = 'processing'
      limit 1
    `;
    const jobId = String(processing[0]?.id);
    const leaseOwnerId = String(processing[0]?.lease_owner_id);
    expect(
      await store.recordOutcome({
        workspaceId: WORKSPACE_A,
        actorId: ACTOR,
        jobId,
        leaseOwnerId,
        outcome: { status: 'failed', errorCode: 'provider_rejected' },
        now: new Date(),
      }),
    ).toBe('recorded');
    const alerts = await admin`
      select alert_code from app.outbox_job_alerts
      where workspace_id = ${WORKSPACE_A} and job_id = ${jobId}
    `;
    expect(alerts).toHaveLength(1);
    expect(
      await store.retry({
        workspaceId: WORKSPACE_A,
        actorId: ACTOR,
        jobId,
        requestId: crypto.randomUUID(),
      }),
    ).toBe('retried');
    const requeued = await admin`select status, attempts from app.outbox_jobs where id = ${jobId}`;
    expect(requeued[0]).toMatchObject({ status: 'pending', attempts: 0 });
  });

  test('dedupe keys are unique per workspace and job type', async () => {
    await expect(admin`
      insert into app.outbox_jobs (workspace_id, job_type, dedupe_key, payload)
      values (${WORKSPACE_A}, 'analytics_order_submitted', 'order:a1', '{}'::jsonb)
    `).rejects.toMatchObject({ code: '23505' });
  });
});
