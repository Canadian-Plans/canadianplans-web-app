import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createDatabaseClient, type DatabaseClient } from '../src/index.js';
import { applyMigrations } from '../src/migrations.js';

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

const WORKSPACE_A = '10000000-0000-4000-8000-000000000001';
const WORKSPACE_B = '10000000-0000-4000-8000-000000000002';
const ACTOR_A = '20000000-0000-4000-8000-000000000001';
const ACTOR_B = '20000000-0000-4000-8000-000000000002';
const MEMBERSHIP_A = '30000000-0000-4000-8000-000000000001';
const MEMBERSHIP_B = '30000000-0000-4000-8000-000000000002';
const ROLE_B = '40000000-0000-4000-8000-000000000002';
const CROSS_WORKSPACE_JOIN = '50000000-0000-4000-8000-000000000001';
const AUDIT_EVENT_A = '60000000-0000-4000-8000-000000000001';
const AUDIT_REQUEST_A = '70000000-0000-4000-8000-000000000001';
const TEST_RUNTIME_PASSWORD = 'local_ci_runtime_password';

databaseTest('tenant RLS and transaction-pool context', () => {
  let admin: ReturnType<typeof postgres>;
  let runtimeSql: ReturnType<typeof postgres>;
  let tenantDatabase: DatabaseClient;

  beforeAll(async () => {
    if (!migrationUrl) throw new Error('TEST_MIGRATION_DATABASE_URL is required');

    await applyMigrations({ connectionString: migrationUrl, ssl: false });
    admin = postgres(migrationUrl, { max: 1, prepare: false, ssl: false });

    // Synthetic CI-only password. Production role passwords are provisioned
    // outside migrations and are never committed.
    await admin.unsafe(`ALTER ROLE app_runtime PASSWORD '${TEST_RUNTIME_PASSWORD}'`);

    await admin`
      insert into app.workspaces (id, slug, name)
      values
        (${WORKSPACE_A}, 'ci-workspace-a', 'CI Workspace A'),
        (${WORKSPACE_B}, 'ci-workspace-b', 'CI Workspace B')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.memberships (id, workspace_id, user_id, membership_type, status)
      values
        (${MEMBERSHIP_A}, ${WORKSPACE_A}, ${ACTOR_A}, 'staff', 'active'),
        (${MEMBERSHIP_B}, ${WORKSPACE_B}, ${ACTOR_B}, 'staff', 'active')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.roles (id, workspace_id, name)
      values (${ROLE_B}, ${WORKSPACE_B}, 'viewer')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.audit_events (
        id,
        workspace_id,
        actor_id,
        actor_label,
        action,
        entity,
        entity_id,
        request_id
      )
      values (
        ${AUDIT_EVENT_A},
        ${WORKSPACE_A},
        ${ACTOR_A},
        'CI actor',
        'membership.created',
        'membership',
        ${MEMBERSHIP_A},
        ${AUDIT_REQUEST_A}
      )
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

  test('missing context denies tenant reads and writes', async () => {
    const rows = await runtimeSql`select id from app.memberships`;
    expect(rows).toHaveLength(0);

    await expect(
      runtimeSql`
        insert into app.memberships (workspace_id, user_id, membership_type, status)
        values (${WORKSPACE_A}, ${ACTOR_B}, 'staff', 'active')
      `,
    ).rejects.toMatchObject({ code: '42501' });
  });

  test('runtime role cannot enumerate the global workspace registry', async () => {
    await expect(runtimeSql`select id from app.workspaces`).rejects.toMatchObject({
      code: '42501',
    });
  });

  test('wrong workspace context sees zero rows', async () => {
    const rows = await tenantDatabase.withTenantTx(
      { workspaceId: WORKSPACE_B, actorId: ACTOR_B },
      (tx) =>
        tx.execute(sql`
          select id from app.memberships
          where id = ${MEMBERSHIP_A}
        `),
    );

    expect(rows).toHaveLength(0);
  });

  test('composite foreign key rejects a cross-workspace child', async () => {
    await expect(
      admin`
        insert into app.membership_roles (id, workspace_id, membership_id, role_id)
        values (${CROSS_WORKSPACE_JOIN}, ${WORKSPACE_A}, ${MEMBERSHIP_A}, ${ROLE_B})
      `,
    ).rejects.toMatchObject({ code: '23503' });
  });

  test('runtime role is non-owner and cannot bypass RLS', async () => {
    const [role] = await admin<
      { rolbypassrls: boolean; rolsuper: boolean; ownsTenantTable: boolean }[]
    >`
      select
        rolbypassrls,
        rolsuper,
        pg_has_role('app_runtime', c.relowner, 'member') as "ownsTenantTable"
      from pg_roles
      cross join pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where rolname = 'app_runtime'
        and n.nspname = 'app'
        and c.relname = 'memberships'
    `;

    expect(role).toEqual({
      rolbypassrls: false,
      rolsuper: false,
      ownsTenantTable: false,
    });

    await expect(
      runtimeSql.begin(async (tx) => {
        await tx`set local row_security = off`;
        await tx`select id from app.memberships`;
      }),
    ).rejects.toMatchObject({ code: '42501' });
  });

  test('runtime role cannot update audit history', async () => {
    await expect(
      tenantDatabase.withTenantTx({ workspaceId: WORKSPACE_A, actorId: ACTOR_A }, (tx) =>
        tx.execute(sql`
            update app.audit_events
            set actor_label = 'tampered'
            where id = ${AUDIT_EVENT_A}
          `),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
  });

  test('runtime role cannot delete audit history', async () => {
    await expect(
      tenantDatabase.withTenantTx({ workspaceId: WORKSPACE_A, actorId: ACTOR_A }, (tx) =>
        tx.execute(sql`delete from app.audit_events where id = ${AUDIT_EVENT_A}`),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
  });

  test('sequential units on one pooled connection do not leak SET LOCAL context', async () => {
    const [first] = await tenantDatabase.withTenantTx(
      { workspaceId: WORKSPACE_A, actorId: ACTOR_A },
      (tx) =>
        tx.execute<{ actorId: string; pid: number; workspaceId: string }>(sql`
          select
            current_setting('app.actor_id', true) as "actorId",
            pg_backend_pid() as pid,
            current_setting('app.workspace_id', true) as "workspaceId"
        `),
    );

    const between = await tenantDatabase.db.execute(sql`select id from app.memberships`);

    const [second] = await tenantDatabase.withTenantTx(
      { workspaceId: WORKSPACE_B, actorId: ACTOR_B },
      (tx) =>
        tx.execute<{ actorId: string; pid: number; workspaceId: string }>(sql`
          select
            current_setting('app.actor_id', true) as "actorId",
            pg_backend_pid() as pid,
            current_setting('app.workspace_id', true) as "workspaceId"
        `),
    );

    expect(first).toEqual({ actorId: ACTOR_A, pid: first?.pid, workspaceId: WORKSPACE_A });
    expect(between).toHaveLength(0);
    expect(second).toEqual({ actorId: ACTOR_B, pid: first?.pid, workspaceId: WORKSPACE_B });
  });
});
