import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';

import { hashDraftGrantToken } from '../src/leads/token.js';
import { DatabaseLeadStore } from '../src/leads/store.js';
import { OrderService } from '../src/orders/service.js';
import { DatabaseOrderStore } from '../src/orders/store.js';

function disposableDatabaseUrl(): string | undefined {
  const url = process.env.TEST_MIGRATION_DATABASE_URL;
  const allowed = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!url && !allowed) return undefined;
  if (!url || !allowed) throw new Error('Both disposable database test settings are required.');
  if (!decodeURIComponent(new URL(url).pathname).endsWith('_test')) {
    throw new Error('The disposable database name must end in _test.');
  }
  return url;
}

const databaseUrl = disposableDatabaseUrl();
const databaseDescribe = databaseUrl ? describe : describe.skip;
const WORKSPACE = '10000000-0000-4000-8000-000000000612';
const ACTOR = '20000000-0000-4000-8000-000000000612';
const PRODUCT = '30000000-0000-4000-8000-000000000612';
const OFFER = '40000000-0000-4000-8000-000000000612';
const LEAD = '50000000-0000-4000-8000-000000000612';
const QUOTE = '60000000-0000-4000-8000-000000000612';
const REQUEST = '70000000-0000-4000-8000-000000000612';
const GRANT = 'cpldg_database-integration-test-grant-token';
const NOW = new Date('2026-09-16T12:00:00.000Z');

const offer = {
  productKey: 'integration-plan',
  productTitle: 'Integration Plan',
  productType: 'sim',
  offerName: 'Integration 10 GB',
  currency: 'CAD',
  recurringChargeAmountMinor: 4500,
  oneTimeFees: [],
  amountPayableTodayMinor: 0,
  paymentRequired: false,
  documentChecklist: ['passport'],
  eligibility: 'TEST only',
  availability: 'TEST only',
  billingParty: 'TEST carrier',
  contractTerms: [{ _type: 'block', children: [] }],
  termsVersion: 'terms-1',
  specs: { carrier: 'TEST', dataAllowance: '10 GB' },
};

const requestBody = {
  quoteId: QUOTE,
  termsVersion: 'terms-1',
  form: { schemaVersion: 1, payload: { fixture: true } },
  consent: { termsVersion: 'terms-1', marketingOptIn: false },
};

databaseDescribe('orders database transaction', () => {
  let admin: ReturnType<typeof postgres>;
  let clientA: DatabaseClient;
  let clientB: DatabaseClient;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);
    await admin`
      insert into app.workspaces (id, slug, name)
      values (${WORKSPACE}, 'orders-integration', 'Orders Integration')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.products (id, workspace_id, product_key)
      values (${PRODUCT}, ${WORKSPACE}, 'integration-plan')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.offer_versions (
        id, workspace_id, product_id, content, content_hash
      ) values (
        ${OFFER}, ${WORKSPACE}, ${PRODUCT}, ${admin.json(offer)}, 'sha256:orders-integration'
      ) on conflict (id) do nothing
    `;
    await admin`
      insert into app.leads (id, workspace_id, status, consent_version)
      values (${LEAD}, ${WORKSPACE}, 'incomplete', 'terms-1')
      on conflict (id) do update set status = 'incomplete'
    `;
    await admin`
      insert into app.draft_grants (
        workspace_id, lead_id, token_hash, expires_at
      ) values (
        ${WORKSPACE}, ${LEAD}, ${hashDraftGrantToken(GRANT)}, ${new Date(NOW.getTime() + 3_600_000)}
      ) on conflict (token_hash) do nothing
    `;
    await admin`
      insert into app.quotes (
        id, workspace_id, draft_id, product_id, offer_version_id, currency,
        charges, total_amount_minor, amount_payable_today_minor, payment_required,
        document_checklist, terms_version, expires_at
      ) values (
        ${QUOTE}, ${WORKSPACE}, ${LEAD}, ${PRODUCT}, ${OFFER}, 'CAD',
        ${admin.json([
          {
            code: 'recurring',
            label: 'Recurring charge',
            amount: { amountMinor: 4500, currency: 'CAD' },
          },
        ])},
        4500, 0, false, array['passport'], 'terms-1', ${new Date(NOW.getTime() + 900_000)}
      ) on conflict (id) do update set
        consumed_by_order_id = null,
        consumed_at = null,
        revoked_at = null,
        expires_at = excluded.expires_at
    `;

    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    clientA = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
    clientB = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
  });

  afterAll(async () => {
    await clientA.close();
    await clientB.close();
    await admin.end();
  });

  it('parallel retries commit one order, one consumption, and the two required jobs', async () => {
    const serviceA = new OrderService(
      new DatabaseOrderStore(clientA),
      'honour_until_expiry',
      () => NOW,
      () => 'CP-INTEGRATION-A',
    );
    const serviceB = new OrderService(
      new DatabaseOrderStore(clientB),
      'honour_until_expiry',
      () => NOW,
      () => 'CP-INTEGRATION-B',
    );
    const input = {
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      grantToken: GRANT,
      idempotencyKey: 'orders-integration-key',
      body: requestBody,
    };
    const outcomes = await Promise.all([serviceA.submit(input), serviceB.submit(input)]);
    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual(['created', 'existing']);
    const references = outcomes.flatMap((outcome) =>
      outcome.status === 'created' || outcome.status === 'existing'
        ? [outcome.order.reference]
        : [],
    );
    expect(new Set(references).size).toBe(1);

    const [counts] = await admin`
      select
        (select count(*)::int from app.orders where workspace_id = ${WORKSPACE} and lead_id = ${LEAD}) as orders,
        (select count(*)::int from app.outbox_jobs where workspace_id = ${WORKSPACE}) as jobs,
        (select count(*)::int from app.order_status_history where workspace_id = ${WORKSPACE}) as history,
        (select count(*)::int from app.quotes where id = ${QUOTE} and consumed_by_order_id is not null) as consumed
    `;
    expect(counts).toEqual({ orders: 1, jobs: 2, history: 1, consumed: 1 });

    // Consent (invariant 11) is stored exactly as the request carried it.
    const [consentRow] = await admin<{ consent: unknown }[]>`
      select consent from app.orders where workspace_id = ${WORKSPACE} and lead_id = ${LEAD}
    `;
    expect(consentRow?.consent).toEqual(requestBody.consent);

    await expect(
      admin`
        update app.orders
        set snapshot = jsonb_set(snapshot, '{termsVersion}', '"changed"'::jsonb)
        where workspace_id = ${WORKSPACE} and lead_id = ${LEAD}
      `,
    ).rejects.toMatchObject({ code: '23514' });

    // The runtime role holds UPDATE on orders for status transitions, but the
    // submission-immutability trigger freezes consent for it too.
    await expect(
      clientA.withTenantTx({ workspaceId: WORKSPACE, actorId: ACTOR }, (tx) =>
        tx.execute(
          sql`update app.orders set consent = '{}'::jsonb
              where workspace_id = ${WORKSPACE} and lead_id = ${LEAD}`,
        ),
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('returns the stored result after quote expiry and conflicts on a changed payload', async () => {
    await admin`update app.quotes set expires_at = ${new Date(NOW.getTime() - 1)} where id = ${QUOTE}`;
    const orderService = new OrderService(
      new DatabaseOrderStore(clientA),
      'honour_until_expiry',
      () => new Date(NOW.getTime() + 1_000),
      () => 'CP-UNUSED',
    );
    const input = {
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      grantToken: GRANT,
      idempotencyKey: 'orders-integration-key',
      body: requestBody,
    };
    expect(await orderService.submit(input)).toMatchObject({ status: 'existing' });
    expect(
      await orderService.submit({
        ...input,
        body: { ...requestBody, form: { schemaVersion: 1, payload: { changed: true } } },
      }),
    ).toEqual({ status: 'idempotency_conflict' });
  });

  it('rejects a lead PATCH after submission without touching the row or audit log, yet still serves the order retry', async () => {
    type LeadProbe = { fullName: string | null; updatedAt: Date; audits: number };
    const probe = () => admin<LeadProbe[]>`
      select
        full_name as "fullName",
        updated_at as "updatedAt",
        (select count(*)::int from app.audit_events
           where workspace_id = ${WORKSPACE} and entity = 'lead' and entity_id = ${LEAD}) as audits
      from app.leads where id = ${LEAD}
    `;
    const [before] = await probe();

    const leadStore = new DatabaseLeadStore(clientA);
    const rejected = await leadStore.updateLead({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      leadId: LEAD,
      grantToken: GRANT,
      contact: { fullName: 'Edited after submission' },
      attribution: { partnerCode: 'SNEAKY' },
    });
    expect(rejected).toEqual({ status: 'draft_submitted' });

    const [after] = await probe();
    expect(after?.fullName).toBeNull();
    expect(after?.updatedAt.getTime()).toBe(before?.updatedAt.getTime());
    expect(after?.audits).toBe(before?.audits);

    const orderService = new OrderService(
      new DatabaseOrderStore(clientA),
      'honour_until_expiry',
      () => NOW,
      () => 'CP-UNUSED-RETRY',
    );
    expect(
      await orderService.submit({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        grantToken: GRANT,
        idempotencyKey: 'orders-integration-key',
        body: requestBody,
      }),
    ).toMatchObject({ status: 'existing' });
  });
});
