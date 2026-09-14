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

export interface WebsiteCredentialResolution {
  workspaceId: string;
  scopes: string[];
  revoked: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitInput {
  bucketKey: string;
  windowSeconds: number;
  maxCount: number;
}

export interface DatabaseClient {
  db: Database;
  withActorTx<T>(actorId: string, fn: (tx: TenantTransaction) => Promise<T> | T): Promise<T>;
  withTenantTx<T>(ctx: TenantContext, fn: (tx: TenantTransaction) => Promise<T> | T): Promise<T>;
  resolveWebsiteCredential(secretHash: string): Promise<WebsiteCredentialResolution | undefined>;
  rateLimitHit(input: RateLimitInput): Promise<RateLimitResult>;
  close(): Promise<void>;
}

interface CredentialRow {
  [key: string]: unknown;
  workspaceId: string;
  scopes: string[];
  revoked: boolean;
}

interface RateLimitRow {
  [key: string]: unknown;
  allowed: boolean;
  retryAfterSeconds: number;
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
    withActorTx: (actorId, fn) =>
      db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.actor_id', ${actorId}, true)`);
        return fn(tx);
      }),
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
    // Pre-tenant website bootstrap (PLATFORM_CONTEXT §4b): resolve a credential
    // to its own workspace/scopes/revocation through the SECURITY DEFINER
    // function without any caller-supplied workspace and without tenant context.
    resolveWebsiteCredential: async (secretHash) => {
      const rows = await db.execute<CredentialRow>(sql`
        select
          workspace_id as "workspaceId",
          scopes,
          revoked
        from app.resolve_website_credential(${secretHash})
      `);
      const row = rows[0];
      return row
        ? { workspaceId: row.workspaceId, scopes: row.scopes, revoked: row.revoked }
        : undefined;
    },
    rateLimitHit: async ({ bucketKey, windowSeconds, maxCount }) => {
      const rows = await db.execute<RateLimitRow>(sql`
        select
          allowed,
          retry_after_seconds as "retryAfterSeconds"
        from app.rate_limit_hit(${bucketKey}, ${windowSeconds}, ${maxCount})
      `);
      const row = rows[0];
      if (!row) throw new Error('rate_limit_hit returned no row');
      return { allowed: row.allowed, retryAfterSeconds: row.retryAfterSeconds };
    },
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

/** Runs the narrow pre-tenant staff bootstrap functions as a verified actor. */
export function withActorTx<T>(
  actorId: string,
  fn: (tx: TenantTransaction) => Promise<T> | T,
): Promise<T> {
  return getDefaultClient().withActorTx(actorId, fn);
}

/** Website bootstrap: resolve a credential secret hash to its workspace/scopes/revocation. */
export function resolveWebsiteCredential(
  secretHash: string,
): Promise<WebsiteCredentialResolution | undefined> {
  return getDefaultClient().resolveWebsiteCredential(secretHash);
}

/** Records one hit against a bounded per-key rate-limit window and reports whether it is allowed. */
export function rateLimitHit(input: RateLimitInput): Promise<RateLimitResult> {
  return getDefaultClient().rateLimitHit(input);
}
