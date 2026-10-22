import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';

import { DatabaseAbandonedLeadPruner } from '../src/retention/abandoned-leads.js';

function getDisposableTestDatabaseUrl(): string | undefined {
  const migrationUrl = process.env.TEST_MIGRATION_DATABASE_URL;
  const destructiveTestsEnabled = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!migrationUrl && !destructiveTestsEnabled && !process.env.CI) return undefined;
  if (!migrationUrl || !destructiveTestsEnabled) {
    throw new Error(
      'Database integration tests require TEST_MIGRATION_DATABASE_URL and DB_TEST_ALLOW_DESTRUCTIVE=1 together.',
    );
  }
  const databaseName = decodeURIComponent(new URL(migrationUrl).pathname.slice(1));
  if (!databaseName.endsWith('_test')) {
    throw new Error('TEST_MIGRATION_DATABASE_URL must name a disposable database ending in _test.');
  }
  return migrationUrl;
}

const migrationUrl = getDisposableTestDatabaseUrl();
const databaseTest = migrationUrl ? describe : describe.skip;

const WORKSPACE = '11000000-0000-4000-8000-000000000c12';
const ACTOR = '21000000-0000-4000-8000-000000000c12';
const OLD_DRAFT = '51000000-0000-4000-8000-000000000c01';
const RECENT_DRAFT = '51000000-0000-4000-8000-000000000c02';
const OLD_SUBMITTED = '51000000-0000-4000-8000-000000000c03';
const NOW = new Date('2026-10-22T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const TEST_RUNTIME_PASSWORD = 'local_ci_runtime_password';

// SEC-12: abandoned order forms lose their personal data after 90 days.
databaseTest('abandoned order forms (SEC-12)', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;

  beforeAll(async () => {
    if (!migrationUrl) throw new Error('missing migration URL');
    await applyMigrations({ connectionString: migrationUrl, ssl: false });
    admin = postgres(migrationUrl, { max: 1, prepare: false, ssl: false });
    await admin.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(745284914)`;
      await tx.unsafe(`ALTER ROLE app_runtime PASSWORD '${TEST_RUNTIME_PASSWORD}'`);
    });
    await admin`
      insert into app.workspaces (id, slug, name)
      values (${WORKSPACE}, 'ci-abandoned-leads', 'CI Abandoned Leads')
      on conflict (id) do nothing
    `;
    await admin`delete from app.audit_events where workspace_id = ${WORKSPACE}`;
    await admin`delete from app.leads where workspace_id = ${WORKSPACE}`;
    const insertLead = (id: string, status: string, updatedAt: Date) => admin`
      insert into app.leads (
        id, workspace_id, status, full_name, email, phone, country_code, payload,
        consent_version, attribution, updated_at
      ) values (
        ${id}, ${WORKSPACE}, ${status}, 'Synthetic Visitor', 'visitor@example.test',
        '+16045550100', 'IN', ${admin.json({ plan: 'synthetic' })}, 'terms-1',
        ${admin.json({ source: 'google' })}, ${updatedAt}
      )
    `;
    await insertLead(OLD_DRAFT, 'incomplete', new Date(NOW.getTime() - 100 * DAY));
    await insertLead(RECENT_DRAFT, 'incomplete', new Date(NOW.getTime() - 1 * DAY));
    await insertLead(OLD_SUBMITTED, 'submitted', new Date(NOW.getTime() - 100 * DAY));
    await admin`
      insert into app.draft_grants (workspace_id, lead_id, token_hash, expires_at)
      values (${WORKSPACE}, ${OLD_DRAFT}, 'synthetic-old-grant-hash', ${new Date(NOW.getTime() - 70 * DAY)})
    `;

    const runtimeUrl = new URL(migrationUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    database = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
  });

  afterAll(async () => {
    await database?.close();
    await admin?.end();
  });

  test('erases only drafts unchanged for 90 days, keeps the row, and audits it', async () => {
    const pruner = new DatabaseAbandonedLeadPruner(database);
    expect(
      await pruner.restrictAbandoned({ workspaceId: WORKSPACE, actorId: ACTOR, now: NOW }),
    ).toEqual({
      restrictedLeads: 1,
    });

    const rows = await admin<
      {
        id: string;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        country_code: string | null;
        payload: unknown;
        attribution: unknown;
        restricted: boolean;
      }[]
    >`
      select id, full_name, email, phone, country_code, payload, attribution,
        customer_data_restricted_at is not null as restricted
      from app.leads where workspace_id = ${WORKSPACE}
    `;
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(OLD_DRAFT)).toMatchObject({
      full_name: null,
      email: null,
      phone: null,
      country_code: null,
      payload: null,
      attribution: { source: 'google' },
      restricted: true,
    });
    expect(byId.get(RECENT_DRAFT)).toMatchObject({
      email: 'visitor@example.test',
      restricted: false,
    });
    expect(byId.get(OLD_SUBMITTED)).toMatchObject({
      email: 'visitor@example.test',
      restricted: false,
    });

    const grants = await admin`select id from app.draft_grants where lead_id = ${OLD_DRAFT}`;
    expect(grants).toHaveLength(0);
    const audits = await admin<{ entity_id: string; action: string }[]>`
      select entity_id, action from app.audit_events where workspace_id = ${WORKSPACE}
    `;
    expect(audits).toEqual([{ entity_id: OLD_DRAFT, action: 'lead.abandoned_draft_restricted' }]);

    // A second run finds nothing more to do.
    expect(
      await pruner.restrictAbandoned({ workspaceId: WORKSPACE, actorId: ACTOR, now: NOW }),
    ).toEqual({ restrictedLeads: 0 });
  });
});
