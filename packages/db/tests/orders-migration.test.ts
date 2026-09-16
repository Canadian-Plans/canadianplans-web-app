import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = fileURLToPath(new URL('../drizzle/0011_lovely_blur.sql', import.meta.url));
const consentMigrationPath = fileURLToPath(
  new URL('../drizzle/0013_order_consent.sql', import.meta.url),
);

describe('T12 additive orders migration', () => {
  it('creates the order envelope and operational child tables without recreating prerequisites', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    for (const table of [
      'orders',
      'order_status_history',
      'order_amendments',
      'order_change_requests',
      'idempotency_keys',
      'outbox_jobs',
      'dispatch_records',
      'payment_records',
    ]) {
      expect(sql).toContain(`CREATE TABLE "app"."${table}"`);
    }
    expect(sql).not.toContain('CREATE TABLE "app"."partners"');
    expect(sql).not.toContain('CREATE TABLE "app"."quotes"');
    expect(sql).toContain('ALTER TABLE "app"."quotes" ADD COLUMN "consumed_by_order_id"');
  });

  it('enforces database uniqueness for one order per lead and per scoped key', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toContain('CONSTRAINT "orders_workspace_lead_unique"');
    expect(sql).toContain('CONSTRAINT "orders_workspace_reference_unique"');
    expect(sql).toContain('CONSTRAINT "idempotency_keys_workspace_scope_key_unique"');
    expect(sql).toContain('CONSTRAINT "quotes_workspace_consumed_order_fk"');
    expect(sql).toContain('CREATE TRIGGER "orders_submission_immutable"');
    expect(sql).toContain('NEW.snapshot IS DISTINCT FROM OLD.snapshot');
    expect(sql).toContain('CREATE TRIGGER "idempotency_outcome_immutable"');
  });

  it('forces tenant RLS and does not grant deletion of order history', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    for (const table of [
      'orders',
      'order_status_history',
      'order_amendments',
      'order_change_requests',
      'idempotency_keys',
      'outbox_jobs',
      'dispatch_records',
      'payment_records',
    ]) {
      expect(sql).toContain(`ALTER TABLE "app"."${table}" FORCE ROW LEVEL SECURITY`);
    }
    expect(sql).not.toMatch(/GRANT[^;]*DELETE[^;]*"app"\."orders"/);
    expect(sql).not.toMatch(/GRANT[^;]*DELETE[^;]*"app"\."order_status_history"/);
  });
});

describe('0013 additive order consent migration', () => {
  it('adds a nullable consent column guarded by an object check without recreating orders', async () => {
    const sql = await readFile(consentMigrationPath, 'utf8');
    expect(sql).toContain('ALTER TABLE "app"."orders" ADD COLUMN "consent" jsonb');
    expect(sql).not.toContain('CREATE TABLE "app"."orders"');
    expect(sql).toContain('CONSTRAINT "orders_consent_object_check"');
    expect(sql).toContain(
      `"app"."orders"."consent" is null or jsonb_typeof("app"."orders"."consent") = 'object'`,
    );
  });

  it('extends the submission-immutability trigger to freeze consent', async () => {
    const sql = await readFile(consentMigrationPath, 'utf8');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION "app"."prevent_order_submission_mutation"()');
    expect(sql).toContain('NEW.consent IS DISTINCT FROM OLD.consent');
  });
});
