import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createDatabaseClient, type DatabaseClient } from '../src/index.js';
import { applyMigrations } from '../src/migrations.js';
import { seedDatabase } from '../src/seed.js';

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

// A distinct id range from rls.integration.test.ts's WORKSPACE_A/B fixtures so
// the two suites never share rows on the same disposable test database.
const WORKSPACE_A = '10000000-0000-4000-8000-000000000011';
const WORKSPACE_B = '10000000-0000-4000-8000-000000000012';
const ACTOR_A = '20000000-0000-4000-8000-000000000011';
const ACTOR_B = '20000000-0000-4000-8000-000000000012';
const PARTNER_A_APPROVED = '80000000-0000-4000-8000-000000000011';
const PARTNER_A_PENDING = '80000000-0000-4000-8000-000000000012';
const PARTNER_A_TO_SUSPEND = '80000000-0000-4000-8000-000000000013';
const PARTNER_B_APPROVED = '80000000-0000-4000-8000-000000000014';
const SHARED_REFERRAL_CODE = 'MAPLE10';
const TEST_RUNTIME_PASSWORD = 'local_ci_runtime_password';

databaseTest('partners table (T4P)', () => {
  let admin: ReturnType<typeof postgres>;
  let runtimeSql: ReturnType<typeof postgres>;
  let tenantDatabase: DatabaseClient;

  beforeAll(async () => {
    if (!migrationUrl) throw new Error('TEST_MIGRATION_DATABASE_URL is required');

    await applyMigrations({ connectionString: migrationUrl, ssl: false });
    await seedDatabase({ connectionString: migrationUrl, ssl: false });
    admin = postgres(migrationUrl, { max: 1, prepare: false, ssl: false });

    // Synthetic CI-only password, matching rls.integration.test.ts.
    await admin.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(745284914)`;
      await tx.unsafe(`ALTER ROLE app_runtime PASSWORD '${TEST_RUNTIME_PASSWORD}'`);
    });

    await admin`
      insert into app.workspaces (id, slug, name)
      values
        (${WORKSPACE_A}, 'ci-partners-workspace-a', 'CI Partners Workspace A'),
        (${WORKSPACE_B}, 'ci-partners-workspace-b', 'CI Partners Workspace B')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.partners (id, workspace_id, name, referral_code, status)
      values
        (${PARTNER_A_APPROVED}, ${WORKSPACE_A}, 'Approved Agency A', ${SHARED_REFERRAL_CODE}, 'approved'),
        (${PARTNER_A_PENDING}, ${WORKSPACE_A}, 'Pending Agency A', 'PENDING5', 'pending'),
        (${PARTNER_A_TO_SUSPEND}, ${WORKSPACE_A}, 'Soon Suspended Agency A', 'FROSTY5', 'approved'),
        (${PARTNER_B_APPROVED}, ${WORKSPACE_B}, 'Approved Agency B', ${SHARED_REFERRAL_CODE}, 'approved')
      on conflict (id) do nothing
    `;

    const runtimeUrl = new URL(migrationUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    runtimeSql = postgres(runtimeUrl.toString(), { max: 1, prepare: false, ssl: false });
    tenantDatabase = createDatabaseClient({
      connectionString: runtimeUrl.toString(),
      maxConnections: 1,
      ssl: false,
    });
  });

  afterAll(async () => {
    await tenantDatabase.close();
    await runtimeSql.end();
    await admin.end();
  });

  test('referral code must be unique within a workspace', async () => {
    await expect(
      admin`
        insert into app.partners (workspace_id, name, referral_code, status)
        values (${WORKSPACE_A}, 'Duplicate Code Agency', ${SHARED_REFERRAL_CODE.toLowerCase()}, 'pending')
      `,
    ).rejects.toMatchObject({ code: '23505' });
  });

  test('status is constrained to pending, approved or suspended', async () => {
    await expect(
      admin`
        insert into app.partners (workspace_id, name, referral_code, status)
        values (${WORKSPACE_A}, 'Bad Status Agency', 'BADSTATUS', 'archived')
      `,
    ).rejects.toMatchObject({ code: '23514' });
  });

  test('the same referral code may be reused by a different workspace', async () => {
    const rows = await admin`
      select workspace_id from app.partners
      where lower(referral_code) = lower(${SHARED_REFERRAL_CODE})
        and workspace_id in (${WORKSPACE_A}, ${WORKSPACE_B})
      order by workspace_id
    `;
    expect(rows).toEqual([{ workspace_id: WORKSPACE_A }, { workspace_id: WORKSPACE_B }]);
  });

  test('a foreign-workspace referral code does not resolve under this tenant context', async () => {
    const rowsInA = await tenantDatabase.withTenantTx(
      { workspaceId: WORKSPACE_A, actorId: ACTOR_A },
      (tx) =>
        tx.execute<{ id: string }>(sql`
          select id from app.partners
          where lower(referral_code) = lower(${SHARED_REFERRAL_CODE})
        `),
    );
    expect(rowsInA).toEqual([{ id: PARTNER_A_APPROVED }]);

    const rowsInB = await tenantDatabase.withTenantTx(
      { workspaceId: WORKSPACE_B, actorId: ACTOR_B },
      (tx) =>
        tx.execute<{ id: string }>(sql`
          select id from app.partners
          where lower(referral_code) = lower(${SHARED_REFERRAL_CODE})
        `),
    );
    expect(rowsInB).toEqual([{ id: PARTNER_B_APPROVED }]);
  });

  test('wrong workspace context cannot see another workspace partner by id', async () => {
    const rows = await tenantDatabase.withTenantTx(
      { workspaceId: WORKSPACE_B, actorId: ACTOR_B },
      (tx) => tx.execute(sql`select id from app.partners where id = ${PARTNER_A_APPROVED}`),
    );
    expect(rows).toHaveLength(0);
  });

  test('a suspended partner referral code is excluded from an active-partner lookup', async () => {
    const activeLookup = () =>
      tenantDatabase.withTenantTx({ workspaceId: WORKSPACE_A, actorId: ACTOR_A }, (tx) =>
        tx.execute<{ id: string }>(sql`
          select id from app.partners
          where lower(referral_code) = lower('FROSTY5') and status = 'approved'
        `),
      );

    expect(await activeLookup()).toEqual([{ id: PARTNER_A_TO_SUSPEND }]);

    await admin`
      update app.partners set status = 'suspended' where id = ${PARTNER_A_TO_SUSPEND}
    `;

    expect(await activeLookup()).toHaveLength(0);

    const [row] = await admin<{ status: string }[]>`
      select status from app.partners where id = ${PARTNER_A_TO_SUSPEND}
    `;
    expect(row).toEqual({ status: 'suspended' });
  });

  test('a pending partner is not yet an active referral source', async () => {
    const rows = await tenantDatabase.withTenantTx(
      { workspaceId: WORKSPACE_A, actorId: ACTOR_A },
      (tx) =>
        tx.execute(sql`
          select id from app.partners
          where lower(referral_code) = lower('PENDING5') and status = 'approved'
        `),
    );
    expect(rows).toHaveLength(0);
  });
});
