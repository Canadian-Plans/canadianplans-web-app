import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = fileURLToPath(
  new URL('../drizzle/0010_unknown_stingray.sql', import.meta.url),
);

describe('T10 additive catalogue migration', () => {
  it('extends T10A without recreating its immutable catalogue tables', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).not.toContain('CREATE TABLE "app"."products"');
    expect(sql).not.toContain('CREATE TABLE "app"."offer_versions"');
    expect(sql).toContain('ALTER TABLE "app"."product_availability" ADD COLUMN');
    expect(sql).not.toContain('consumed_by_order_id');
  });

  it('forces RLS and grants only the operations used by each new tenant table', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    for (const table of [
      'catalogue_sync_events',
      'catalogue_sync_leases',
      'catalogue_sync_state',
      'quotes',
    ]) {
      expect(sql).toContain(`ALTER TABLE "app"."${table}" FORCE ROW LEVEL SECURITY`);
    }
    expect(sql).toContain(
      'GRANT SELECT, INSERT, UPDATE ON TABLE "app"."catalogue_sync_events" TO app_runtime',
    );
    expect(sql).not.toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "app"."quotes" TO app_runtime',
    );
  });
});
