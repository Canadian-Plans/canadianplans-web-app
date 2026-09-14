import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { schema } from './schema.js';

export * from './schema.js';

export interface TenantContext {
  workspaceId: string;
  actorId: string;
}

export interface DatabaseClientOptions {
  connectionString: string;
  ssl?: 'require' | false;
  maxConnections?: number;
}

export type Database = PostgresJsDatabase<typeof schema>;
export type TenantTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface DatabaseClient {
  db: Database;
  withTenantTx<T>(ctx: TenantContext, fn: (tx: TenantTransaction) => Promise<T> | T): Promise<T>;
  close(): Promise<void>;
}

function createClient(options: DatabaseClientOptions) {
  return postgres(options.connectionString, {
    max: options.maxConnections ?? 1,
    prepare: false,
    ssl: options.ssl ?? 'require',
  });
}

/**
 * Creates the serverless runtime client. Supavisor transaction mode does not
 * support named prepared statements, so `prepare` is always disabled. A warm
 * Vercel instance shares this small application-side pool.
 */
export function createDatabaseClient(options: DatabaseClientOptions): DatabaseClient {
  const sqlClient = createClient(options);
  const db = drizzle(sqlClient, { schema });

  return {
    db,
    withTenantTx: (ctx, fn) =>
      db.transaction(async (tx) => {
        // set_config(..., true) is PostgreSQL's parameter-safe equivalent of
        // SET LOCAL. Both values disappear automatically at transaction end.
        await tx.execute(
          sql`
            select
              set_config('app.workspace_id', ${ctx.workspaceId}, true),
              set_config('app.actor_id', ${ctx.actorId}, true)
          `,
        );
        return fn(tx);
      }),
    close: () => sqlClient.end(),
  };
}

let defaultClient: DatabaseClient | undefined;

function runtimeSsl(): 'require' | false {
  const mode = process.env.DATABASE_SSL_MODE ?? 'require';
  if (mode === 'require') return 'require';
  if (mode === 'disable') return false;
  throw new Error('DATABASE_SSL_MODE must be either "require" or "disable"');
}

function getDefaultClient(): DatabaseClient {
  if (defaultClient) return defaultClient;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  defaultClient = createDatabaseClient({ connectionString, ssl: runtimeSsl() });
  return defaultClient;
}

/**
 * Runs exactly one tenant unit of work in a transaction on the pooled runtime
 * connection. Commit/rollback and tenant-context cleanup are automatic.
 */
export function withTenantTx<T>(
  ctx: TenantContext,
  fn: (tx: TenantTransaction) => Promise<T> | T,
): Promise<T> {
  return getDefaultClient().withTenantTx(ctx, fn);
}
