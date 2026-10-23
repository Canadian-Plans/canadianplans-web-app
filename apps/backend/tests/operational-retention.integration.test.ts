import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';

import { DatabaseOperationalPruner } from '../src/retention/operational.js';

function getDisposableTestDatabaseUrl(): string | undefined {
  const migrationUrl = process.env.TEST_MIGRATION_DATABASE_URL;
  const destructiveTestsEnabled = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!migrationUrl && !destructiveTestsEnabled && !process.env.CI) return undefined;
  if (!migrationUrl || !destructiveTestsEnabled) {
    throw new Error(
      'Database integration tests require TEST_MIGRATION_DATABASE_URL and DB_TEST_ALLOW_DESTRUCTIVE=1 together.',
    );
  }
  const databaseName = decodeURIComponent(new URL(migrationUrl).pathname.slice(1));
  if (!databaseName.endsWith('_test')) {
    throw new Error('TEST_MIGRATION_DATABASE_URL must name a disposable database ending in _test.');
  }
  return migrationUrl;
}

const migrationUrl = getDisposableTestDatabaseUrl();
const databaseTest = migrationUrl ? describe : describe.skip;

const WORKSPACE = '11000000-0000-4000-8000-000000000d19';
const OTHER_WORKSPACE = '11000000-0000-4000-8000-000000000d20';
const ACTOR = '21000000-0000-4000-8000-000000000d19';
const NOW = new Date('2026-10-22T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);
const TEST_RUNTIME_PASSWORD = 'local_ci_runtime_password';

// REL-19: the prune function removes only rows past their window.
databaseTest('operational retention (migration 0026)', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;

  beforeAll(async () => {
    if (!migrationUrl) throw new Error('missing migration URL');
    await applyMigrations({ connectionString: migrationUrl, ssl: false });
    admin = postgres(migrationUrl, { max: 1, prepare: false, ssl: false });
    await admin.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(745284914)`;
      await tx.unsafe(`ALTER ROLE app_runtime PASSWORD '${TEST_RUNTIME_PASSWORD}'`);
    });
    await admin`
      insert into app.workspaces (id, slug, name)
      values
        (${WORKSPACE}, 'ci-operational-retention', 'CI Operational Retention'),
        (${OTHER_WORKSPACE}, 'ci-operational-retention-b', 'CI Operational Retention B')
      on conflict (id) do nothing
    `;
    await admin`delete from app.outbox_jobs where workspace_id in (${WORKSPACE}, ${OTHER_WORKSPACE})`;
    const job = (workspace: string, key: string, status: string, completedAt: Date | null) => admin`
      insert into app.outbox_jobs (workspace_id, job_type, dedupe_key, payload, status, completed_at, updated_at)
      values (${workspace}, 'analytics_order_submitted', ${key}, ${admin.json({ orderId: crypto.randomUUID() })},
        ${status}, ${completedAt}, ${completedAt ?? NOW})
    `;
    await job(WORKSPACE, 'retention:old-completed', 'completed', daysAgo(40));
    await job(WORKSPACE, 'retention:recent-completed', 'completed', daysAgo(10));
    await job(WORKSPACE, 'retention:old-failed', 'failed', null);
    await admin`
      update app.outbox_jobs set updated_at = ${daysAgo(40)}
      where workspace_id = ${WORKSPACE} and dedupe_key = 'retention:old-failed'
    `;
    await job(OTHER_WORKSPACE, 'retention:other-old-completed', 'completed', daysAgo(40));

    const runtimeUrl = new URL(migrationUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    database = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
  });

  afterAll(async () => {
    await database?.close();
    await admin?.end();
  });

  test('deletes completed jobs older than 30 days in this workspace only', async () => {
    const result = await new DatabaseOperationalPruner(database).prune({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      now: NOW,
    });
    expect(result).toContainEqual({ tableName: 'outbox_jobs', deleted: 1 });
    expect(result.map((row) => row.tableName).sort()).toEqual(
      [
        'catalogue_sync_events',
        'email_provider_events',
        'outbox_job_alerts',
        'outbox_jobs',
        'quotes',
        'tracking_challenges',
      ].sort(),
    );
    const remaining = await admin<{ dedupe_key: string }[]>`
      select dedupe_key from app.outbox_jobs
      where workspace_id in (${WORKSPACE}, ${OTHER_WORKSPACE}) order by dedupe_key
    `;
    expect(remaining.map((row) => row.dedupe_key)).toEqual([
      'retention:old-failed',
      'retention:other-old-completed',
      'retention:recent-completed',
    ]);
  });

  test('refuses a workspace other than the transaction tenant', async () => {
    await expect(
      database.withTenantTx({ workspaceId: WORKSPACE, actorId: ACTOR }, (tx) =>
        tx.execute(sql`select * from app.prune_operational_rows(${OTHER_WORKSPACE}::uuid, now())`),
      ),
    ).rejects.toThrow(/workspace_context_mismatch/);
  });
});
