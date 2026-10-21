import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';

import { DatabaseRegionWaitlistStore } from '../src/waitlist/store.js';

function getDisposableTestDatabaseUrl(): string | undefined {
  const migrationUrl = process.env.TEST_MIGRATION_DATABASE_URL;
  const destructiveTestsEnabled = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';

  if (!migrationUrl && !destructiveTestsEnabled) return undefined;
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

// A distinct id range from every other integration test file sharing this
// disposable database.
const WORKSPACE = '11000000-0000-4000-8000-000000000c01';
const WORKSPACE_B = '11000000-0000-4000-8000-000000000c02';
const ACTOR = '21000000-0000-4000-8000-000000000c01';
const REQUEST_ID = '31000000-0000-4000-8000-000000000c01';
const TEST_RUNTIME_PASSWORD = 'local_ci_runtime_password';

databaseTest('DatabaseRegionWaitlistStore (ADR 0005 D5)', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;
  let store: DatabaseRegionWaitlistStore;

  beforeAll(async () => {
    if (!migrationUrl) throw new Error('TEST_MIGRATION_DATABASE_URL is required');

    admin = postgres(migrationUrl, { max: 1, prepare: false, ssl: false });
    await admin.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(745284914)`;
      await tx.unsafe(`ALTER ROLE app_runtime PASSWORD '${TEST_RUNTIME_PASSWORD}'`);
    });
    await admin`
      insert into app.workspaces (id, slug, name)
      values
        (${WORKSPACE}, 'ci-waitlist-workspace', 'CI Waitlist Workspace'),
        (${WORKSPACE_B}, 'ci-waitlist-workspace-b', 'CI Waitlist Workspace B')
      on conflict (id) do nothing
    `;

    const runtimeUrl = new URL(migrationUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    database = createDatabaseClient({
      connectionString: runtimeUrl.toString(),
      maxConnections: 1,
      ssl: false,
    });
    store = new DatabaseRegionWaitlistStore(database);
  });

  afterAll(async () => {
    // The opted-in disposable database owns teardown; do not bypass erasure guards.
    await database.close();
    await admin.end();
  });

  const join = (workspaceId: string, email: string, province: 'ON' | 'QC' = 'ON') =>
    store.join({
      workspaceId,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      province,
      email,
      interest: 'internet',
      consentVersion: 'terms-2026-09',
    });

  const rows = (workspaceId: string) => admin<
    { province: string; email: string; interest: string | null; consent_version: string }[]
  >`
    select province, email, interest, consent_version from app.region_waitlist
    where workspace_id = ${workspaceId} order by province, email
  `;

  test('stores the wish, and a repeat in another letter case is stored once', async () => {
    await join(WORKSPACE, 'Pat@Example.test');
    await join(WORKSPACE, 'pat@example.test');
    expect(await rows(WORKSPACE)).toEqual([
      {
        province: 'ON',
        email: 'Pat@Example.test',
        interest: 'internet',
        consent_version: 'terms-2026-09',
      },
    ]);
  });

  test('the same email can ask about a second province', async () => {
    await join(WORKSPACE, 'pat@example.test', 'QC');
    expect((await rows(WORKSPACE)).map((row) => row.province)).toEqual(['ON', 'QC']);
  });

  test('audits the first join only, and the audit entry never holds the email', async () => {
    const audits = await admin<{ after: Record<string, unknown> }[]>`
      select after from app.audit_events
      where workspace_id = ${WORKSPACE} and action = 'region_waitlist.joined'
    `;
    expect(audits).toHaveLength(2);
    expect(JSON.stringify(audits)).not.toContain('example.test');
  });

  test('another workspace has its own list', async () => {
    await join(WORKSPACE_B, 'pat@example.test');
    expect(await rows(WORKSPACE_B)).toHaveLength(1);
    expect(await rows(WORKSPACE)).toHaveLength(2);
  });

  test('the runtime role can add to the list but not change or remove entries', async () => {
    await expect(
      database.withTenantTx({ workspaceId: WORKSPACE, actorId: ACTOR }, (tx) =>
        tx.execute(sql`delete from app.region_waitlist`),
      ),
    ).rejects.toThrow();
  });
});
