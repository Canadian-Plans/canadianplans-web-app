import { describe, expect, it } from 'vitest';

import type { RunCommand, RunCommandInput } from './command.js';
import {
  INTERNAL_SCHEMAS,
  PgDumpDatabaseExporter,
  filterData,
  filterRoles,
  filterSchema,
  parseConnectionUrl,
} from './pg-dump.js';

const URL_WITH_SECRET =
  'postgresql://backup_reader.projref:s3cretPassw0rd@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

function recordingRun(stdout = 'SELECT 1;\n') {
  const calls: { command: string; args: readonly string[]; options?: RunCommandInput }[] = [];
  const run: RunCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    return { stdout: new TextEncoder().encode(stdout), stderr: '', exitCode: 0 };
  };
  return { run, calls };
}

describe('PgDumpDatabaseExporter', () => {
  it('runs the five Supabase dumps directly, never switching to the postgres role', async () => {
    const { run, calls } = recordingRun();
    const artifacts = await new PgDumpDatabaseExporter(URL_WITH_SECRET, run, {}).exportAll();

    expect(calls.map((call) => call.command)).toEqual([
      'pg_dumpall',
      'pg_dump',
      'pg_dump',
      'pg_dump',
      'pg_dump',
    ]);
    for (const call of calls) {
      expect(call.args).not.toContain('--role');
      expect(call.args.join(' ')).not.toContain('postgres"');
    }
    expect(calls[0]?.args).toEqual([
      '--roles-only',
      '--quote-all-identifier',
      '--no-role-passwords',
      '--no-comments',
    ]);
    expect(calls[1]?.args).toEqual([
      '--schema-only',
      '--quote-all-identifier',
      '--exclude-schema',
      INTERNAL_SCHEMAS.join('|'),
    ]);
    expect(calls[2]?.args).toContain('--data-only');
    expect(calls[2]?.args).toContain('"storage"."buckets_vectors"');
    expect(calls[2]?.args).toContain('"storage"."vector_indexes"');
    expect(calls[2]?.args).toContain('auth.schema_migrations');
    expect(calls[3]?.args).toContain('--schema=supabase_migrations');
    expect(calls[4]?.args.slice(-2)).toEqual(['--schema', 'supabase_migrations']);

    const text = (bytes: Uint8Array | undefined) => new TextDecoder().decode(bytes);
    expect(text(artifacts.roles)).toContain('RESET ALL;');
    expect(text(artifacts.data).startsWith('SET session_replication_role = replica;')).toBe(true);
    expect(text(artifacts.historyData)).toContain('RESET ALL;');
  });

  it('passes the password only through PGPASSWORD, never argv', async () => {
    const { run, calls } = recordingRun();
    await new PgDumpDatabaseExporter(URL_WITH_SECRET, run, { PATH: '/usr/bin' }).exportAll();
    for (const call of calls) {
      expect(call.args.join(' ')).not.toContain('s3cretPassw0rd');
      expect(call.options?.env).toMatchObject({
        PATH: '/usr/bin',
        PGHOST: 'aws-0-us-west-2.pooler.supabase.com',
        PGPORT: '5432',
        PGUSER: 'backup_reader.projref',
        PGPASSWORD: 's3cretPassw0rd',
        PGDATABASE: 'postgres',
        PGSSLMODE: 'require',
      });
    }
  });

  it('fails with the tool error and no password', async () => {
    const run: RunCommand = async () => ({
      stdout: new Uint8Array(),
      stderr: `pg_dump: error: connection to server failed: ${URL_WITH_SECRET}`,
      exitCode: 1,
    });
    const error = await new PgDumpDatabaseExporter(URL_WITH_SECRET, run, {})
      .exportAll()
      .catch((caught: unknown) => caught);
    expect(String(error)).toContain('pg_dumpall_failed:1:');
    expect(String(error)).not.toContain('s3cretPassw0rd');
  });
});

describe('parseConnectionUrl', () => {
  it('splits a pooler URL, decoding the user and password', () => {
    expect(
      parseConnectionUrl('postgresql://backup_reader.ref:p%40ss@host.example:6543/postgres'),
    ).toEqual({
      host: 'host.example',
      port: '6543',
      user: 'backup_reader.ref',
      password: 'p@ss',
      database: 'postgres',
    });
  });
  it('rejects anything but a postgres URL', () => {
    expect(() => parseConnectionUrl('https://example.test')).toThrow(/postgres:\/\//);
  });
});

describe('output filters (copied from the Supabase CLI scripts)', () => {
  it('roles: reserved roles and comments dropped, superuser-only attributes stripped', () => {
    const sql = [
      '\\restrict abc',
      '--',
      '-- Roles',
      'CREATE ROLE "postgres";',
      'ALTER ROLE "postgres" WITH SUPERUSER;',
      'CREATE ROLE "app_runtime";',
      'ALTER ROLE "app_runtime" WITH NOSUPERUSER INHERIT NOREPLICATION LOGIN;',
      '-- ALTER ROLE "app_runtime" SET "statement_timeout" TO \'8s\';',
      'GRANT "pg_read_all_data" TO "supabase_admin";',
      'GRANT "pg_read_all_data" TO "backup_reader";',
      'GRANT "pg_read_all_data" TO "backup_reader";',
      '',
    ].join('\n');
    expect(filterRoles(sql)).toBe(
      [
        'CREATE ROLE "app_runtime";',
        'ALTER ROLE "app_runtime" WITH INHERIT LOGIN;',
        'ALTER ROLE "app_runtime" SET "statement_timeout" TO \'8s\';',
        'GRANT "pg_read_all_data" TO "backup_reader";',
        '',
        'RESET ALL;',
        '',
      ].join('\n'),
    );
  });

  it('schema: idempotent creates, platform statements and comments dropped', () => {
    const sql = [
      '\\restrict abc',
      'SET transaction_timeout = 0;',
      'CREATE SCHEMA "app";',
      'CREATE TABLE "app"."leads" (',
      'CREATE OR REPLACE FUNCTION "app"."x"() RETURNS void',
      'CREATE FUNCTION "app"."y"() RETURNS void',
      'CREATE EVENT TRIGGER "issue_pg_graphql_access" ON "ddl_command_end"',
      'GRANT USAGE ON SCHEMA "auth" TO "anon";',
      'GRANT USAGE ON SCHEMA "app" TO "app_runtime";',
      'COMMENT ON EXTENSION "pgcrypto" IS \'x\';',
    ].join('\n');
    expect(filterSchema(sql, INTERNAL_SCHEMAS).split('\n')).toEqual([
      'CREATE SCHEMA IF NOT EXISTS "app";',
      'CREATE TABLE IF NOT EXISTS "app"."leads" (',
      'CREATE OR REPLACE FUNCTION "app"."x"() RETURNS void',
      'CREATE OR REPLACE FUNCTION "app"."y"() RETURNS void',
      'GRANT USAGE ON SCHEMA "app" TO "app_runtime";',
    ]);
  });

  it('data: replica mode around the dump, comments kept, meta-commands disabled', () => {
    expect(
      filterData('\\restrict abc\n-- Data for Name: leads\nCOPY "app"."leads" FROM stdin;\n'),
    ).toBe(
      [
        'SET session_replication_role = replica;',
        '',
        '-- \\restrict abc',
        '-- Data for Name: leads',
        'COPY "app"."leads" FROM stdin;',
        '',
        'RESET ALL;',
        '',
      ].join('\n'),
    );
  });
});
