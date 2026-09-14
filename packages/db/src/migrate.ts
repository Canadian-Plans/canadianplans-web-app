import { applyMigrations } from './migrations.js';

const connectionString = process.env.MIGRATION_DATABASE_URL;
if (!connectionString) throw new Error('MIGRATION_DATABASE_URL is required');

const sslMode = process.env.MIGRATION_DATABASE_SSL_MODE ?? 'require';
if (sslMode !== 'require' && sslMode !== 'disable') {
  throw new Error('MIGRATION_DATABASE_SSL_MODE must be either "require" or "disable"');
}

await applyMigrations({
  connectionString,
  ssl: sslMode === 'require' ? 'require' : false,
});
