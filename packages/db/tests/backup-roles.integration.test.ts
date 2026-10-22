import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { applyMigrations } from '../src/migrations.js';

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
// Synthetic CI-only passwords; production passwords are set out of band.
const READER_PASSWORD = 'local_ci_backup_reader_password';
const WRITER_PASSWORD = 'local_ci_backup_lease_writer_password';
const WORKSPACE = '10000000-0000-4000-8000-000000000925';

function connectAs(role: string, password: string): ReturnType<typeof postgres> {
  if (!migrationUrl) throw new Error('missing migration URL');
  const url = new URL(migrationUrl);
  url.username = role;
  url.password = password;
  return postgres(url.toString(), { max: 1, prepare: false, ssl: false });
}

// SEC-14: the backup job's two database logins can do only their own job.
databaseTest('backup roles (migration 0025)', () => {
  let admin: ReturnType<typeof postgres>;
  let reader: ReturnType<typeof postgres>;
  let writer: ReturnType<typeof postgres>;

  beforeAll(async () => {
    if (!migrationUrl) throw new Error('missing migration URL');
    await applyMigrations({ connectionString: migrationUrl, ssl: false });
    admin = postgres(migrationUrl, { max: 1, prepare: false, ssl: false });
    await admin.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(745284914)`;
      await tx.unsafe(`ALTER ROLE backup_reader PASSWORD '${READER_PASSWORD}'`);
      await tx.unsafe(`ALTER ROLE backup_lease_writer PASSWORD '${WRITER_PASSWORD}'`);
    });
    await admin`
      insert into app.workspaces (id, slug, name)
      values (${WORKSPACE}, 'ci-backup-roles', 'CI Backup Roles')
      on conflict do nothing
    `;
    reader = connectAs('backup_reader', READER_PASSWORD);
    writer = connectAs('backup_lease_writer', WRITER_PASSWORD);
  });

  afterAll(async () => {
    await admin`delete from app.backup_leases where run_id like 'ci-backup-roles-%'`;
    await reader?.end();
    await writer?.end();
    await admin?.end();
  });

  test('the reader sees every row through forced RLS and cannot write', async () => {
    const rows = await reader<{ id: string }[]>`
      select id from app.workspaces where id = ${WORKSPACE}
    `;
    expect(rows).toHaveLength(1);
    const [attributes] = await admin<{ rolbypassrls: boolean; rolsuper: boolean }[]>`
      select rolbypassrls, rolsuper from pg_roles where rolname = 'backup_reader'
    `;
    expect(attributes).toEqual({ rolbypassrls: true, rolsuper: false });
    await expect(
      reader`insert into app.backup_leases (run_id, expires_at) values ('ci-backup-roles-r', now())`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      reader`update app.workspaces set name = name where id = ${WORKSPACE}`,
    ).rejects.toMatchObject({ code: '42501' });
  });

  test('the lease writer manages leases and reads nothing else', async () => {
    await writer`
      insert into app.backup_leases (run_id, expires_at)
      values ('ci-backup-roles-w', now() + interval '1 minute')
      on conflict (run_id) do update set expires_at = excluded.expires_at
    `;
    const leases = await writer<{ run_id: string }[]>`
      select run_id from app.backup_leases where run_id = 'ci-backup-roles-w'
    `;
    expect(leases).toHaveLength(1);
    await writer`delete from app.backup_leases where run_id = 'ci-backup-roles-w'`;
    await expect(writer`select id from app.workspaces limit 1`).rejects.toMatchObject({
      code: '42501',
    });
    await expect(writer`select id from app.orders limit 1`).rejects.toMatchObject({
      code: '42501',
    });
  });
});
