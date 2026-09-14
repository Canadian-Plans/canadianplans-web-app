import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export interface MigrationOptions {
  connectionString: string;
  ssl?: 'require' | false;
}

export const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../drizzle',
);

/** Runs checked-in migrations with the separate privileged migration URL. */
export async function applyMigrations(options: MigrationOptions): Promise<void> {
  const client = postgres(options.connectionString, {
    max: 1,
    prepare: false,
    ssl: options.ssl ?? 'require',
  });

  try {
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    await client.end();
  }
}
