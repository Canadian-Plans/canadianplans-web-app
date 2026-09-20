import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = fileURLToPath(
  new URL('../drizzle/0016_thick_tombstone.sql', import.meta.url),
);

describe('T17 additive documents migration', () => {
  it('creates the three document tables', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    for (const table of ['files', 'file_revisions', 'file_review_events']) {
      expect(sql).toContain(`CREATE TABLE "app"."${table}"`);
    }
    // It must not recreate prerequisite tables.
    expect(sql).not.toContain('CREATE TABLE "app"."orders"');
    expect(sql).not.toContain('CREATE TABLE "app"."leads"');
  });

  it('enforces the full status lifecycle and available-object provenance', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toContain("'uploading', 'verifying', 'available', 'rejected', 'deleted'");
    expect(sql).toContain('CONSTRAINT "files_available_provenance_check"');
    expect(sql).toContain('CREATE UNIQUE INDEX "files_object_key_unique"');
    expect(sql).toContain('CREATE UNIQUE INDEX "files_staging_key_unique"');
  });

  it('forces row-level security and grants the restricted runtime role', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toContain('ALTER TABLE "app"."files" FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE "app"."file_revisions" FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE "app"."file_review_events" FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE "app"."files" TO "app_runtime"');
    expect(sql).toContain('GRANT SELECT, INSERT ON TABLE "app"."file_revisions" TO "app_runtime"');
    expect(sql).toContain(
      'GRANT SELECT, INSERT ON TABLE "app"."file_review_events" TO "app_runtime"',
    );
  });
});
