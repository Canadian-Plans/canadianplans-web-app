import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = fileURLToPath(new URL('../drizzle/0012_dashing_bug.sql', import.meta.url));

describe('T15 additive outbox migration', () => {
  it('extends the existing outbox instead of recreating it', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).not.toContain('CREATE TABLE "app"."outbox_jobs"');
    expect(sql).toContain('ADD COLUMN "lease_owner_id"');
    expect(sql).toContain('ADD COLUMN "lease_expires_at"');
    expect(sql).toContain('ADD COLUMN "message_id"');
  });

  it('protects the alert table with forced RLS and runtime grants', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toContain('ALTER TABLE "app"."outbox_job_alerts" FORCE ROW LEVEL SECURITY');
    expect(sql).toContain(
      'GRANT SELECT, INSERT, UPDATE ON TABLE "app"."outbox_job_alerts" TO "app_runtime"',
    );
    expect(sql).toContain('outbox_job_alerts_tenant_policy');
  });
});
