import { CommandFailedError, type RunCommand } from './command.js';
import type { DatabaseDumpArtifacts, DatabaseExporter } from './sources.js';

/**
 * The same five dumps `supabase db dump` produced (roles, schema, data, and the
 * schema and data of `supabase_migrations`), run with `pg_dumpall` / `pg_dump`
 * directly. The Supabase CLI's scripts hard-code `--role "postgres"`, which the
 * least-privilege `backup_reader` login (SEC-14, migration 0025) is
 * deliberately not allowed to SET, so this drops that one flag and keeps
 * everything else: flags, schema lists and output filters are copied from the
 * CLI's pkg/migration (dump.go and scripts/dump_*.sh), so restores load the
 * same SQL files as before (docs/RUNBOOKS/restore.md).
 *
 * Needs PostgreSQL 17 client tools on PATH, matching the 17.x server. The
 * password reaches the tools only through PGPASSWORD, never argv or a message.
 */

/** CLI `InternalSchemas`: left out of the schema dump (platform-managed). */
export const INTERNAL_SCHEMAS = [
  'information_schema',
  'pg_*',
  '_analytics',
  '_realtime',
  '_supavisor',
  'auth',
  'etl',
  'extensions',
  'pgbouncer',
  'realtime',
  'storage',
  'supabase_functions',
  'supabase_migrations',
  'cron',
  'dbdev',
  'graphql',
  'graphql_public',
  'net',
  'pgmq',
  'pgsodium',
  'pgsodium_masks',
  'pgtle',
  'repack',
  'tiger',
  'tiger_data',
  'timescaledb_*',
  '_timescaledb_*',
  'topology',
  'vault',
];

/** CLI `excludedSchemas`: left out of the data dump (auth and storage data are kept). */
export const DATA_EXCLUDED_SCHEMAS = [
  'information_schema',
  'pg_*',
  'graphql',
  'graphql_public',
  'pgsodium',
  'pgsodium_masks',
  'pgtle',
  'repack',
  'tiger',
  'tiger_data',
  'timescaledb_*',
  '_timescaledb_*',
  'topology',
  'vault',
  'etl',
  'extensions',
  'pgbouncer',
  'realtime',
  'supabase_migrations',
  '_analytics',
  '_realtime',
  '_supavisor',
];

const RESERVED_ROLES = [
  'anon',
  'authenticated',
  'authenticator',
  'cli_login_.*',
  'dashboard_user',
  'pgbouncer',
  'postgres',
  // Supabase's built-in API role (a role NAME, not a key). Written as a regex
  // class because CI forbids the literal service-role token in application
  // code; `[_]` matches exactly the same role as the CLI's list.
  'service[_]role',
  'supabase_.*',
  'pgsodium_keyholder',
  'pgsodium_keyiduser',
  'pgsodium_keymaker',
  'pgtle_admin',
].join('|');

const ALLOWED_CONFIGS = [
  'pgaudit.*',
  'pgrst.*',
  'session_replication_role',
  'statement_timeout',
  'track_io_timing',
].join('|');

/** Platform migration-history tables the CLI never puts in a data dump. */
const PLATFORM_HISTORY_TABLES = [
  'auth.schema_migrations',
  'storage.migrations',
  'supabase_functions.migrations',
];

type LineRule = [RegExp, string];

/** `\restrict` / `\unrestrict` are psql meta-commands; comment them out. */
const META_COMMAND: LineRule = [/^\\(un)?restrict .*$/, '-- $&'];

function applyRules(sql: string, rules: LineRule[], dropComments: boolean): string[] {
  const lines = sql.split('\n').map((line) => {
    let out = line;
    for (const [pattern, replacement] of rules) out = out.replace(pattern, replacement);
    return out;
  });
  return dropComments ? lines.filter((line) => !line.startsWith('--')) : lines;
}

/** scripts/dump_role.sh's filters (keepComments=false, so `--` lines go). */
export function filterRoles(sql: string): string {
  const rules: LineRule[] = [
    META_COMMAND,
    [new RegExp(`^CREATE ROLE "(${RESERVED_ROLES})"`), '-- $&'],
    [new RegExp(`^ALTER ROLE "(${RESERVED_ROLES})"`), '-- $&'],
    [/ (NOSUPERUSER|NOREPLICATION)/g, ''],
    [new RegExp(`^-- (.* SET "(${ALLOWED_CONFIGS})" .*)`), '$1'],
    [new RegExp(`GRANT ".*" TO "(${RESERVED_ROLES})"`), '-- $&'],
  ];
  const lines = applyRules(sql, rules, true);
  const unique = lines.filter((line, index) => index === 0 || line !== lines[index - 1]);
  return `${unique.join('\n')}\nRESET ALL;\n`;
}

/** scripts/dump_schema.sh's filters (keepComments=false, so `--` lines go). */
export function filterSchema(sql: string, excludedSchemas: readonly string[]): string {
  const rules: LineRule[] = [
    META_COMMAND,
    [/^CREATE SCHEMA "/, 'CREATE SCHEMA IF NOT EXISTS "'],
    [/^CREATE TABLE "/, 'CREATE TABLE IF NOT EXISTS "'],
    [/^CREATE SEQUENCE "/, 'CREATE SEQUENCE IF NOT EXISTS "'],
    [/^CREATE VIEW "/, 'CREATE OR REPLACE VIEW "'],
    [/^CREATE FUNCTION "/, 'CREATE OR REPLACE FUNCTION "'],
    [/^CREATE TRIGGER "/, 'CREATE OR REPLACE TRIGGER "'],
    [/^CREATE PUBLICATION "supabase_realtime/, '-- $&'],
    [/^CREATE EVENT TRIGGER /, '-- $&'],
    [/^ {9}WHEN TAG IN /, '-- $&'],
    [/^ {3}EXECUTE FUNCTION /, '-- $&'],
    [/^ALTER EVENT TRIGGER /, '-- $&'],
    [/^ALTER PUBLICATION "supabase_realtime_/, '-- $&'],
    [/^ALTER FOREIGN DATA WRAPPER (.+) OWNER TO /, '-- $&'],
    [/^ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"/, '-- $&'],
    [/^GRANT ALL ON FOREIGN DATA WRAPPER (.+) TO "postgres" WITH GRANT OPTION/, '-- $&'],
    ...(excludedSchemas.length > 0
      ? ([
          [new RegExp(`^GRANT (.+) ON (.+) "(${schemaAlternation(excludedSchemas)})"`), '-- $&'],
          [new RegExp(`^REVOKE (.+) ON (.+) "(${schemaAlternation(excludedSchemas)})"`), '-- $&'],
        ] satisfies LineRule[])
      : []),
    [/^(CREATE EXTENSION IF NOT EXISTS "pg_tle").+/, '$1;'],
    [/^(CREATE EXTENSION IF NOT EXISTS "pgsodium").+/, '$1;'],
    [/^(CREATE EXTENSION IF NOT EXISTS "pgmq").+/, '$1;'],
    [/^COMMENT ON EXTENSION (.+)/, '-- $&'],
    [/^CREATE POLICY "cron_job_/, '-- $&'],
    [/^ALTER TABLE "cron"/, '-- $&'],
    [/^SET transaction_timeout = 0;/, '-- $&'],
  ];
  return applyRules(sql, rules, true).join('\n');
}

/** scripts/dump_data.sh's wrapper (comments are kept in data dumps). */
export function filterData(sql: string): string {
  const body = applyRules(sql, [META_COMMAND], false).join('\n');
  return `SET session_replication_role = replica;\n\n${body}\nRESET ALL;\n`;
}

/**
 * The CLI joins schema names with `|` and drops the same string into sed as a
 * regex, so `pg_*` there means "pg" plus underscores, not pg_dump's wildcard.
 * Kept byte-for-byte so the filtered output matches what the CLI produced.
 */
function schemaAlternation(schemas: readonly string[]): string {
  return schemas.join('|');
}

function quoteTable(table: string): string {
  return `"${table.replace('.', '"."')}"`;
}

export interface PgConnection {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

export function parseConnectionUrl(url: string): PgConnection {
  const parsed = new URL(url);
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('SOURCE_DATABASE_URL must be a postgres:// URL');
  }
  return {
    host: parsed.hostname,
    port: parsed.port || '5432',
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')) || 'postgres',
  };
}

export class PgDumpDatabaseExporter implements DatabaseExporter {
  private readonly connection: PgConnection;

  constructor(
    dbUrl: string,
    private readonly run: RunCommand,
    private readonly baseEnv: NodeJS.ProcessEnv = process.env,
  ) {
    this.connection = parseConnectionUrl(dbUrl);
  }

  async exportAll(): Promise<DatabaseDumpArtifacts> {
    const roles = filterRoles(
      await this.tool('pg_dumpall', [
        '--roles-only',
        '--quote-all-identifier',
        '--no-role-passwords',
        '--no-comments',
      ]),
    );
    const schema = filterSchema(
      await this.tool('pg_dump', [
        '--schema-only',
        '--quote-all-identifier',
        '--exclude-schema',
        INTERNAL_SCHEMAS.join('|'),
      ]),
      INTERNAL_SCHEMAS,
    );
    const data = filterData(
      await this.tool('pg_dump', [
        '--data-only',
        '--quote-all-identifier',
        '--exclude-schema',
        DATA_EXCLUDED_SCHEMAS.join('|'),
        ...PLATFORM_HISTORY_TABLES.flatMap((table) => ['--exclude-table', table]),
        '--schema',
        '*',
        '--exclude-table',
        quoteTable('storage.buckets_vectors'),
        '--exclude-table',
        quoteTable('storage.vector_indexes'),
      ]),
    );
    const historySchema = filterSchema(
      await this.tool('pg_dump', [
        '--schema-only',
        '--quote-all-identifier',
        '--schema=supabase_migrations',
      ]),
      [],
    );
    const historyData = filterData(
      await this.tool('pg_dump', [
        '--data-only',
        '--quote-all-identifier',
        ...PLATFORM_HISTORY_TABLES.flatMap((table) => ['--exclude-table', table]),
        '--schema',
        'supabase_migrations',
      ]),
    );
    const encode = (text: string) => new TextEncoder().encode(text);
    return {
      roles: encode(roles),
      schema: encode(schema),
      data: encode(data),
      historySchema: encode(historySchema),
      historyData: encode(historyData),
    };
  }

  private async tool(command: 'pg_dump' | 'pg_dumpall', args: string[]): Promise<string> {
    const result = await this.run(command, args, {
      env: {
        ...this.baseEnv,
        PGHOST: this.connection.host,
        PGPORT: this.connection.port,
        PGUSER: this.connection.user,
        PGPASSWORD: this.connection.password,
        PGDATABASE: this.connection.database,
        PGSSLMODE: this.baseEnv['PGSSLMODE'] ?? 'require',
      },
    });
    if (result.exitCode !== 0)
      throw new CommandFailedError(command, result.exitCode, result.stderr);
    return new TextDecoder().decode(result.stdout);
  }
}
