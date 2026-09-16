import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';

import { DatabaseLeadStore } from '../src/leads/store.js';

function getDisposableTestDatabaseUrl(): string | undefined {
  const migrationUrl = process.env.TEST_MIGRATION_DATABASE_URL;
  const destructiveTestsEnabled = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';

  if (!migrationUrl && !destructiveTestsEnabled) return undefined;
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

// A distinct id range from every other integration test file sharing this
// disposable database (packages/db's rls/partners/catalogue/website-auth
// suites, and apps/backend's isolation.spec.ts).
const WORKSPACE = '11000000-0000-4000-8000-000000000b01';
const WORKSPACE_B = '11000000-0000-4000-8000-000000000b02';
const ACTOR = '21000000-0000-4000-8000-000000000b01';
const REQUEST_ID = '31000000-0000-4000-8000-000000000b01';
const PARTNER_APPROVED = '81000000-0000-4000-8000-000000000b01';
const PARTNER_SUSPENDED = '81000000-0000-4000-8000-000000000b02';
const PARTNER_FOREIGN = '81000000-0000-4000-8000-000000000b03';
const PRODUCT_AVAILABLE = '91000000-0000-4000-8000-000000000b01';
const PRODUCT_WITHDRAWN = '91000000-0000-4000-8000-000000000b02';
const OFFER_VERSION_AVAILABLE = '92000000-0000-4000-8000-000000000b01';
const OFFER_VERSION_WITHDRAWN = '92000000-0000-4000-8000-000000000b02';
const TEST_RUNTIME_PASSWORD = 'local_ci_runtime_password';

databaseTest('DatabaseLeadStore (T11)', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;
  let store: DatabaseLeadStore;

  beforeAll(async () => {
    if (!migrationUrl) throw new Error('TEST_MIGRATION_DATABASE_URL is required');

    admin = postgres(migrationUrl, { max: 1, prepare: false, ssl: false });
    await admin.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(745284914)`;
      await tx.unsafe(`ALTER ROLE app_runtime PASSWORD '${TEST_RUNTIME_PASSWORD}'`);
    });

    await admin`
      insert into app.workspaces (id, slug, name)
      values
        (${WORKSPACE}, 'ci-leads-workspace', 'CI Leads Workspace'),
        (${WORKSPACE_B}, 'ci-leads-workspace-b', 'CI Leads Workspace B')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.partners (id, workspace_id, name, referral_code, status)
      values
        (${PARTNER_APPROVED}, ${WORKSPACE}, 'Maple Leaf Referrals', 'MAPLE10', 'approved'),
        (${PARTNER_SUSPENDED}, ${WORKSPACE}, 'Suspended Referrals', 'PAUSED10', 'suspended'),
        (${PARTNER_FOREIGN}, ${WORKSPACE_B}, 'Foreign Referrals', 'FOREIGN10', 'approved')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.products (id, workspace_id, product_key)
      values
        (${PRODUCT_AVAILABLE}, ${WORKSPACE}, 'ci-available-plan'),
        (${PRODUCT_WITHDRAWN}, ${WORKSPACE}, 'ci-withdrawn-plan')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.offer_versions (id, workspace_id, product_id, content, content_hash)
      values
        (${OFFER_VERSION_AVAILABLE}, ${WORKSPACE}, ${PRODUCT_AVAILABLE}, '{"name": "Available"}'::jsonb, 'sha256:ci-leads-available'),
        (${OFFER_VERSION_WITHDRAWN}, ${WORKSPACE}, ${PRODUCT_WITHDRAWN}, '{"name": "Withdrawn"}'::jsonb, 'sha256:ci-leads-withdrawn')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.product_availability (product_id, workspace_id, revoked_at)
      values
        (${PRODUCT_AVAILABLE}, ${WORKSPACE}, null),
        (${PRODUCT_WITHDRAWN}, ${WORKSPACE}, now())
      on conflict (product_id) do update set revoked_at = excluded.revoked_at
    `;

    const runtimeUrl = new URL(migrationUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    database = createDatabaseClient({
      connectionString: runtimeUrl.toString(),
      maxConnections: 1,
      ssl: false,
    });
    store = new DatabaseLeadStore(database);
  });

  afterAll(async () => {
    await database.close();
    await admin.end();
  });

  test('an active partner code links and an unknown code is stored but flagged unmatched', async () => {
    const linked = await store.createLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      consentVersion: 'terms-2026-09',
      attribution: { partnerCode: 'MAPLE10' },
    });
    const [linkedRow] = await admin<
      {
        partner_id: string | null;
        attribution: { partnerCode: string; partnerCodeMatched: boolean };
      }[]
    >`
      select partner_id, attribution from app.leads where id = ${linked.lead.id}
    `;
    expect(linkedRow?.attribution).toMatchObject({
      partnerCode: 'MAPLE10',
      partnerCodeMatched: true,
    });
    expect(linkedRow?.partner_id).toBe(PARTNER_APPROVED);

    const unknown = await store.createLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      consentVersion: 'terms-2026-09',
      attribution: { partnerCode: 'NOT-A-REAL-CODE' },
    });
    const [unknownRow] = await admin<
      { attribution: { partnerCode: string; partnerCodeMatched: boolean } }[]
    >`
      select attribution from app.leads where id = ${unknown.lead.id}
    `;
    expect(unknownRow?.attribution).toMatchObject({
      partnerCode: 'NOT-A-REAL-CODE',
      partnerCodeMatched: false,
    });
  });

  test.each(['PAUSED10', 'FOREIGN10'])(
    'a suspended or foreign-workspace partner code is stored but not linked: %s',
    async (partnerCode) => {
      const created = await store.createLead({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST_ID,
        consentVersion: 'terms-2026-09',
        attribution: { partnerCode },
      });
      const [row] = await admin<
        { partner_id: string | null; attribution: { partnerCodeMatched: boolean } }[]
      >`
        select partner_id, attribution from app.leads where id = ${created.lead.id}
      `;
      expect(row?.partner_id).toBeNull();
      expect(row?.attribution.partnerCodeMatched).toBe(false);
    },
  );

  test('selected offer version resolves for an available product and stays null for a withdrawn one', async () => {
    const available = await store.createLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      consentVersion: 'terms-2026-09',
      productId: PRODUCT_AVAILABLE,
    });
    const [availableRow] = await admin<{ selected_offer_version_id: string | null }[]>`
      select selected_offer_version_id from app.leads where id = ${available.lead.id}
    `;
    expect(availableRow?.selected_offer_version_id).toBe(OFFER_VERSION_AVAILABLE);

    const withdrawn = await store.createLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      consentVersion: 'terms-2026-09',
      productId: PRODUCT_WITHDRAWN,
    });
    const [withdrawnRow] = await admin<{ selected_offer_version_id: string | null }[]>`
      select selected_offer_version_id from app.leads where id = ${withdrawn.lead.id}
    `;
    expect(withdrawnRow?.selected_offer_version_id).toBeNull();
  });

  test('a forged grant fails, a grant for a different lead fails, and an expired grant fails', async () => {
    const leadA = await store.createLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      consentVersion: 'terms-2026-09',
    });
    const leadB = await store.createLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      consentVersion: 'terms-2026-09',
    });

    const forged = await store.updateLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      leadId: leadA.lead.id,
      grantToken: 'cpldg_this-was-never-issued-by-us',
      contact: { fullName: 'Forged' },
    });
    expect(forged).toEqual({ status: 'grant_invalid' });

    const wrongLead = await store.updateLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      leadId: leadB.lead.id,
      grantToken: leadA.grant.token,
      contact: { fullName: 'Wrong lead' },
    });
    expect(wrongLead).toEqual({ status: 'grant_invalid' });

    await admin`
      update app.draft_grants set expires_at = now() - interval '1 minute'
      where lead_id = ${leadA.lead.id}
    `;
    const expired = await store.updateLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      leadId: leadA.lead.id,
      grantToken: leadA.grant.token,
      contact: { fullName: 'Too late' },
    });
    expect(expired).toEqual({ status: 'grant_expired' });
  });

  test('repeated saves with a valid grant update the same lead row', async () => {
    const created = await store.createLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      consentVersion: 'terms-2026-09',
      contact: { fullName: 'Jane Doe' },
    });

    const first = await store.updateLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      leadId: created.lead.id,
      grantToken: created.grant.token,
      contact: { email: 'jane@example.test' },
    });
    expect(first).toMatchObject({ status: 'updated', lead: { id: created.lead.id } });

    const second = await store.updateLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      leadId: created.lead.id,
      grantToken: created.grant.token,
      contact: { phone: '+1 555 0100' },
    });
    expect(second).toMatchObject({ status: 'updated', lead: { id: created.lead.id } });

    const [row] = await admin<{ full_name: string; email: string; phone: string }[]>`
      select full_name, email, phone from app.leads where id = ${created.lead.id}
    `;
    expect(row).toEqual({
      full_name: 'Jane Doe',
      email: 'jane@example.test',
      phone: '+1 555 0100',
    });

    const rowCount =
      await admin`select count(*)::int as count from app.leads where id = ${created.lead.id}`;
    expect(rowCount[0]?.['count']).toBe(1);

    const audits = await admin<
      { action: string; after: { changedFields?: string[]; fullName?: string } }[]
    >`
      select action, after from app.audit_events
      where workspace_id = ${WORKSPACE} and entity_id = ${created.lead.id}
      order by created_at
    `;
    expect(audits.map((event) => event.action)).toEqual([
      'lead.created',
      'lead.updated',
      'lead.updated',
    ]);
    expect(audits.every((event) => event.after.fullName === undefined)).toBe(true);
    expect(audits[1]?.after.changedFields).toEqual(['contact']);
  });
});
