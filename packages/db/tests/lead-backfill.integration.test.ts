import { randomUUID } from 'node:crypto';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { expect, test } from 'vitest';
import { migrationsFolder, applyMigrations } from '../src/migrations.js';
import { assertDisposableDatabaseUrl } from '../src/test-helpers.js';
const url = process.env.TEST_MIGRATION_DATABASE_URL;
(url ? test : test.skip)(
  '0029 preserves populated lead payloads and backfills only justified types',
  async () => {
    if (!url || process.env.DB_TEST_ALLOW_DESTRUCTIVE !== '1')
      throw new Error('Disposable database opt-in required');
    assertDisposableDatabaseUrl(url);
    const databaseName = `lead_backfill_${randomUUID().replaceAll('-', '')}_test`;
    const admin = postgres(url, { ssl: false, max: 1, prepare: false });
    const temporary = await mkdtemp(path.join(tmpdir(), 'lead-migrations-'));
    const target = new URL(url);
    target.pathname = `/${databaseName}`;
    let database: ReturnType<typeof postgres> | undefined;
    try {
      // The only identifier interpolation is this code-generated UUID database name.
      await admin.unsafe(`create database ${databaseName}`);
      database = postgres(target.toString(), { ssl: false, max: 1, prepare: false });
      await cp(migrationsFolder, temporary, { recursive: true });
      const journalPath = path.join(temporary, 'meta/_journal.json');
      const journal: unknown = JSON.parse(await readFile(journalPath, 'utf8'));
      if (
        typeof journal !== 'object' ||
        journal === null ||
        !('entries' in journal) ||
        !Array.isArray(journal.entries)
      )
        throw new Error('invalid journal');
      await writeFile(
        journalPath,
        JSON.stringify({
          ...journal,
          entries: journal.entries.filter(
            (entry: unknown) =>
              typeof entry === 'object' &&
              entry !== null &&
              'idx' in entry &&
              typeof entry.idx === 'number' &&
              entry.idx < 29,
          ),
        }),
      );
      // Roles are cluster-wide, while PostgreSQL advisory locks are database-local.
      // Coordinate the temporary database's historical ALTER ROLE statements with
      // migration/password setup in the main integration database.
      const migrationClient = database;
      await admin.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(745284913)`;
        await tx`select pg_advisory_xact_lock(745284914)`;
        await migrate(drizzle(migrationClient), { migrationsFolder: temporary });
      });
      await database.end();
      database = postgres(target.toString(), { ssl: false, max: 1, prepare: false });
      const workspace = randomUUID();
      await database`insert into app.workspaces(id,slug,name) values (${workspace},${workspace},'Synthetic migration')`;
      const fixtures = [
        {
          expected: 'sim',
          payload: {
            currentCountry: 'Bangladesh',
            destination: 'Toronto',
            arrivalDate: '2026-12-01',
          },
        },
        {
          expected: 'mobile',
          payload: { category: 'mobile', lines: 2, keepNumber: false, simType: 'esim' },
        },
        {
          expected: 'internet',
          payload: {
            category: 'internet',
            province: 'ON',
            dateOfBirth: '1990-01-01',
            address: { street: 'Test', city: 'Ottawa', postalCode: 'K1A 0B1' },
          },
        },
        { expected: 'legacy', payload: { unknownOldAnswer: 'Preserved' } },
      ];
      const ids: string[] = [];
      for (const fixture of fixtures) {
        const id = randomUUID();
        ids.push(id);
        await database`insert into app.leads(id,workspace_id,status,consent_version,payload) values (${id},${workspace},'incomplete','test',${database.json({ schemaVersion: 1, payload: fixture.payload })})`;
      }
      await applyMigrations({ connectionString: target.toString(), ssl: false });
      for (const [index, fixture] of fixtures.entries()) {
        const id = ids[index];
        if (!id) throw new Error('missing fixture');
        const [row] =
          await database`select lead_type,payload,custom_values from app.leads where id=${id}`;
        expect(row?.lead_type).toBe(fixture.expected);
        expect(row?.payload).toEqual({ schemaVersion: 1, payload: fixture.payload });
        expect(row?.custom_values).toEqual({});
      }
      const [seeded] =
        await database`select count(*)::int as count from app.lead_fields where workspace_id=${workspace} and origin='builtin'`;
      expect(seeded?.count).toBeGreaterThan(20);
      await applyMigrations({ connectionString: target.toString(), ssl: false });
    } finally {
      await database?.end();
      await admin.unsafe(`drop database if exists ${databaseName} with (force)`);
      await admin.end();
      await rm(temporary, { recursive: true, force: true });
    }
  },
  30_000,
);
