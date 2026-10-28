import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';

import { hashDraftGrantToken } from '../src/leads/token.js';
import { DatabaseLeadStore } from '../src/leads/store.js';
import { OrderService } from '../src/orders/service.js';
import { DatabaseOrderStore, ORDER_RETRY_WINDOW_MS } from '../src/orders/store.js';

function disposableDatabaseUrl(): string | undefined {
  const url = process.env.TEST_MIGRATION_DATABASE_URL;
  const allowed = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!url && !allowed && !process.env.CI) return undefined;
  if (!url || !allowed) throw new Error('Both disposable database test settings are required.');
  if (!decodeURIComponent(new URL(url).pathname).endsWith('_test')) {
    throw new Error('The disposable database name must end in _test.');
  }
  return url;
}

const databaseUrl = disposableDatabaseUrl();
const databaseDescribe = databaseUrl ? describe : describe.skip;
const WORKSPACE = randomUUID();
const ACTOR = randomUUID();
const PRODUCT = randomUUID();
const OFFER = randomUUID();
const LEAD = randomUUID();
const QUOTE = randomUUID();
const SECOND_QUOTE = randomUUID();
const ROLLBACK_LEAD = randomUUID();
const ROLLBACK_QUOTE = randomUUID();
const REQUEST = randomUUID();
const GRANT = `cpldg_${randomUUID()}`;
const ROLLBACK_GRANT = `cpldg_${randomUUID()}`;
const FOREIGN_WORKSPACE = randomUUID();
const FOREIGN_ACTOR = randomUUID();
const NOW = new Date('2026-09-16T12:00:00.000Z');
// G16 retry-window fixture: a completed key whose `completedAt` the injected
// clock can move past the fixed window.
const RETRY_LEAD = randomUUID();
const RETRY_QUOTE = randomUUID();
const RETRY_REQUEST = randomUUID();
const RETRY_GRANT = `cpldg_${randomUUID()}`;
const RETRY_NOW = new Date('2026-09-20T12:00:00.000Z');

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
  form: {
    schemaVersion: 1,
    payload: { fixture: true, custom_order_answer: 'Private lead answer' },
  },
  consent: { termsVersion: 'terms-1', marketingOptIn: false },
};

databaseDescribe('orders database transaction', () => {
  let admin: ReturnType<typeof postgres>;
  let clientA: DatabaseClient;
  let clientB: DatabaseClient;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    // Order submission hashes the lead contact for email suppression/consent
    // (T18), so the fixture needs the key whenever a lead carries an address.
    process.env['EMAIL_CONTACT_HASH_SECRET'] = 'orders-integration-contact-secret';
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 2, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);
    await admin`
      insert into app.workspaces (id, slug, name)
      values (${WORKSPACE}, ${`orders-integration-${WORKSPACE}`}, 'Orders Integration')
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
      insert into app.leads (id, workspace_id, status, consent_version, email)
      values (${LEAD}, ${WORKSPACE}, 'incomplete', 'terms-1', 'lead@example.test')
      on conflict (id) do update set status = 'incomplete'
    `;
    // `DatabaseLeadStore` validates grant expiry against the real clock while
    // order submission uses the injected `NOW`, so this grant must be valid
    // relative to the wall clock or the lead-PATCH test ages out.
    await admin`
      insert into app.draft_grants (
        workspace_id, lead_id, token_hash, expires_at
      ) values (
        ${WORKSPACE}, ${LEAD}, ${hashDraftGrantToken(GRANT)}, ${new Date(Date.now() + 24 * 3_600_000)}
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
    // A second, independently-issued quote for the same lead (G6): the
    // submission claim is keyed on the quote, and the order's one-per-lead
    // unique constraint is what must stop it.
    await admin`
      insert into app.quotes (
        id, workspace_id, draft_id, product_id, offer_version_id, currency,
        charges, total_amount_minor, amount_payable_today_minor, payment_required,
        document_checklist, terms_version, expires_at
      ) values (
        ${SECOND_QUOTE}, ${WORKSPACE}, ${LEAD}, ${PRODUCT}, ${OFFER}, 'CAD',
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
    // An untouched lead/quote/grant for the forced-rollback case.
    await admin`
      insert into app.leads (id, workspace_id, status, consent_version)
      values (${ROLLBACK_LEAD}, ${WORKSPACE}, 'incomplete', 'terms-1')
      on conflict (id) do update set status = 'incomplete'
    `;
    await admin`
      insert into app.draft_grants (
        workspace_id, lead_id, token_hash, expires_at
      ) values (
        ${WORKSPACE}, ${ROLLBACK_LEAD}, ${hashDraftGrantToken(ROLLBACK_GRANT)},
        ${new Date(Date.now() + 24 * 3_600_000)}
      ) on conflict (token_hash) do nothing
    `;
    await admin`
      insert into app.quotes (
        id, workspace_id, draft_id, product_id, offer_version_id, currency,
        charges, total_amount_minor, amount_payable_today_minor, payment_required,
        document_checklist, terms_version, expires_at
      ) values (
        ${ROLLBACK_QUOTE}, ${WORKSPACE}, ${ROLLBACK_LEAD}, ${PRODUCT}, ${OFFER}, 'CAD',
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
    // A second synthetic workspace for the cross-tenant visibility check T8
    // deferred until these order tables existed.
    await admin`
      insert into app.workspaces (id, slug, name)
      values (${FOREIGN_WORKSPACE}, ${`orders-integration-${FOREIGN_WORKSPACE}`}, 'Orders Integration Foreign')
      on conflict (id) do nothing
    `;
    // G16: a fresh lead/quote/grant/key, seeded once, whose completed key is
    // retried from both sides of the fixed retry window.
    await admin`
      insert into app.leads (id, workspace_id, status, consent_version, email)
      values (${RETRY_LEAD}, ${WORKSPACE}, 'incomplete', 'terms-1', 'retry@example.test')
      on conflict (id) do update set status = 'incomplete'
    `;
    await admin`
      insert into app.draft_grants (
        workspace_id, lead_id, token_hash, expires_at
      ) values (
        ${WORKSPACE}, ${RETRY_LEAD}, ${hashDraftGrantToken(RETRY_GRANT)},
        ${new Date(RETRY_NOW.getTime() + 24 * 3_600_000)}
      ) on conflict (token_hash) do nothing
    `;
    await admin`
      insert into app.quotes (
        id, workspace_id, draft_id, product_id, offer_version_id, currency,
        charges, total_amount_minor, amount_payable_today_minor, payment_required,
        document_checklist, terms_version, expires_at
      ) values (
        ${RETRY_QUOTE}, ${WORKSPACE}, ${RETRY_LEAD}, ${PRODUCT}, ${OFFER}, 'CAD',
        ${admin.json([
          {
            code: 'recurring',
            label: 'Recurring charge',
            amount: { amountMinor: 4500, currency: 'CAD' },
          },
        ])},
        4500, 0, false, array['passport'], 'terms-1', ${new Date(RETRY_NOW.getTime() + 900_000)}
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
    delete process.env['EMAIL_CONTACT_HASH_SECRET'];
    await clientA.close();
    await clientB.close();
    await admin.end();
  });

  it('parallel retries commit one order, one consumption, and the two required jobs', async () => {
    await admin`insert into app.lead_fields(workspace_id,key,type,origin,config) values (${WORKSPACE},'custom_order_answer','text','custom','{"label":"Order exclusion","type":"text"}'::jsonb) on conflict (workspace_id,key) do nothing`;
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
    const [storedForm] =
      await admin`select payload from app.orders where workspace_id=${WORKSPACE} and lead_id=${LEAD}`;
    expect(storedForm?.payload).toEqual({ schemaVersion: 1, payload: { fixture: true } });

    await expect(
      admin`
        update app.orders
        set snapshot = jsonb_set(snapshot, '{termsVersion}', '"changed"'::jsonb)
        where workspace_id = ${WORKSPACE} and lead_id = ${LEAD}
      `,
    ).rejects.toMatchObject({ code: '23514' });

    // The runtime role holds UPDATE on orders for status transitions, but the
    // submission-immutability trigger freezes consent for it too. Drizzle
    // wraps the driver error, so the SQLSTATE is on `cause`.
    await expect(
      clientA.withTenantTx({ workspaceId: WORKSPACE, actorId: ACTOR }, (tx) =>
        tx.execute(
          sql`update app.orders set consent = '{}'::jsonb
              where workspace_id = ${WORKSPACE} and lead_id = ${LEAD}`,
        ),
      ),
    ).rejects.toMatchObject({ cause: { code: '23514' } });
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
    expect(after?.fullName).toBe(before?.fullName);
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

  it('rejects a second quote for the same lead through the lead unique constraint', async () => {
    type OrderCounts = {
      orders: number;
      keys: number;
      jobs: number;
      history: number;
      audit: number;
    };
    const counts = () => admin<OrderCounts[]>`
      select
        (select count(*)::int from app.orders
           where workspace_id = ${WORKSPACE} and lead_id = ${LEAD}) as orders,
        (select count(*)::int from app.idempotency_keys
           where workspace_id = ${WORKSPACE} and lead_id = ${LEAD}) as keys,
        (select count(*)::int from app.outbox_jobs
           where workspace_id = ${WORKSPACE}) as jobs,
        (select count(*)::int from app.order_status_history
           where workspace_id = ${WORKSPACE}) as history,
        (select count(*)::int from app.audit_events
           where workspace_id = ${WORKSPACE} and entity = 'order') as audit
    `;
    // The application-level guard reads the lead status inside the
    // transaction. Reset it to incomplete so the only remaining guarantee is
    // the database's one-order-per-lead unique constraint (invariant 6).
    await admin`update app.leads set status = 'incomplete' where id = ${LEAD}`;
    const [before] = await counts();
    expect(before).toEqual({ orders: 1, keys: 1, jobs: 2, history: 1, audit: 1 });

    const orderService = new OrderService(
      new DatabaseOrderStore(clientA),
      'honour_until_expiry',
      () => NOW,
      () => 'CP-SECOND-KEY',
    );
    expect(
      await orderService.submit({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        grantToken: GRANT,
        idempotencyKey: 'orders-integration-second-key',
        body: { ...requestBody, quoteId: SECOND_QUOTE },
      }),
    ).toEqual({ status: 'draft_already_submitted' });

    // The rejected claim rolled back, so every count is unchanged.
    const [after] = await counts();
    expect(after).toEqual(before);
    const [secondQuote] = await admin<{ consumed: string | null; revoked: Date | null }[]>`
      select consumed_by_order_id as consumed, revoked_at as revoked
      from app.quotes where id = ${SECOND_QUOTE}
    `;
    expect(secondQuote?.consumed).toBeNull();
    expect(secondQuote?.revoked).toBeNull();
  });

  it('rolls back every submission write when the tenant transaction aborts after its inserts', async () => {
    // The decorator runs the real store inside a tenant transaction and then
    // throws, forcing a rollback after all submission rows were inserted.
    let captured: unknown;
    const abortingStore = new DatabaseOrderStore({
      withTenantTx: (ctx, fn) =>
        clientA.withTenantTx(ctx, async (tx) => {
          captured = await fn(tx);
          throw new Error('forced_rollback');
        }),
    });
    const orderService = new OrderService(
      abortingStore,
      'honour_until_expiry',
      () => NOW,
      () => 'CP-ROLLBACK',
    );
    await expect(
      orderService.submit({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        grantToken: ROLLBACK_GRANT,
        idempotencyKey: 'orders-integration-rollback-key',
        body: { ...requestBody, quoteId: ROLLBACK_QUOTE },
      }),
    ).rejects.toThrow('forced_rollback');
    // The aborted unit of work had fully created the order before it threw.
    expect(captured).toMatchObject({ status: 'created' });

    const [state] = await admin<
      { orders: number; keys: number; history: number; jobs: number; audit: number }[]
    >`
      select
        (select count(*)::int from app.orders
           where workspace_id = ${WORKSPACE} and lead_id = ${ROLLBACK_LEAD}) as orders,
        (select count(*)::int from app.idempotency_keys
           where workspace_id = ${WORKSPACE} and lead_id = ${ROLLBACK_LEAD}) as keys,
        (select count(*)::int from app.order_status_history h
           where h.workspace_id = ${WORKSPACE}
             and h.order_id in (
               select o.id from app.orders o
               where o.workspace_id = ${WORKSPACE} and o.lead_id = ${ROLLBACK_LEAD}
             )) as history,
        (select count(*)::int from app.outbox_jobs j
           where j.workspace_id = ${WORKSPACE}
             and j.dedupe_key in (
               select o.id::text from app.orders o
               where o.workspace_id = ${WORKSPACE} and o.lead_id = ${ROLLBACK_LEAD}
             )) as jobs,
        (select count(*)::int from app.audit_events a
           where a.workspace_id = ${WORKSPACE} and a.entity = 'order'
             and a.entity_id in (
               select o.id from app.orders o
               where o.workspace_id = ${WORKSPACE} and o.lead_id = ${ROLLBACK_LEAD}
             )) as audit
    `;
    expect(state).toEqual({ orders: 0, keys: 0, history: 0, jobs: 0, audit: 0 });

    const [quote] = await admin<
      { consumed: string | null; consumedAt: Date | null; revoked: Date | null }[]
    >`
      select
        consumed_by_order_id as consumed,
        consumed_at as "consumedAt",
        revoked_at as revoked
      from app.quotes where id = ${ROLLBACK_QUOTE}
    `;
    expect(quote).toEqual({ consumed: null, consumedAt: null, revoked: null });

    const [lead] = await admin<{ status: string }[]>`
      select status from app.leads where id = ${ROLLBACK_LEAD}
    `;
    expect(lead?.status).toBe('incomplete');
  });

  it('hides the order, idempotency key and outbox rows from a foreign workspace context', async () => {
    const [order] = await admin<{ id: string }[]>`
      select id from app.orders where workspace_id = ${WORKSPACE} and lead_id = ${LEAD}
    `;
    if (!order) throw new Error('submitted order missing');

    const seen = await clientB.withTenantTx(
      { workspaceId: FOREIGN_WORKSPACE, actorId: FOREIGN_ACTOR },
      (tx) =>
        tx.execute<{ orders: number; keys: number; outbox: number }>(sql`
          select
            (select count(*)::int from app.orders where id = ${order.id}) as orders,
            (select count(*)::int from app.idempotency_keys where lead_id = ${LEAD}) as keys,
            (select count(*)::int from app.outbox_jobs where dedupe_key = ${order.id}) as outbox
        `),
    );
    expect(seen[0]).toEqual({ orders: 0, keys: 0, outbox: 0 });
  });

  it('honours a completed-key retry only inside the fixed window after completion', async () => {
    let clock = RETRY_NOW;
    const orderService = new OrderService(
      new DatabaseOrderStore(clientA),
      'honour_until_expiry',
      () => clock,
      () => 'CP-RETRY-WINDOW',
    );
    const input = {
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: RETRY_REQUEST,
      grantToken: RETRY_GRANT,
      idempotencyKey: 'orders-integration-retry-window-key',
      body: { ...requestBody, quoteId: RETRY_QUOTE },
    };
    expect(await orderService.submit(input)).toMatchObject({ status: 'created' });

    // Just inside the window the stored order is still returned even though its
    // quote is now consumed (invariant 6).
    clock = new Date(RETRY_NOW.getTime() + ORDER_RETRY_WINDOW_MS - 1);
    expect(await orderService.submit(input)).toMatchObject({ status: 'existing' });

    // Just outside it the prior-key path no longer honours the retry, and it
    // reports the lapse honestly rather than creating or duplicating an order.
    clock = new Date(RETRY_NOW.getTime() + ORDER_RETRY_WINDOW_MS + 1);
    expect(await orderService.submit(input)).toEqual({ status: 'draft_expired' });

    const [state] = await admin<{ orders: number; keys: number }[]>`
      select
        (select count(*)::int from app.orders
           where workspace_id = ${WORKSPACE} and lead_id = ${RETRY_LEAD}) as orders,
        (select count(*)::int from app.idempotency_keys
           where workspace_id = ${WORKSPACE} and lead_id = ${RETRY_LEAD}) as keys
    `;
    expect(state).toEqual({ orders: 1, keys: 1 });
  });
  it('serializes submission with an earlier draft edit before reading email', async () => {
    const leadId = crypto.randomUUID();
    const quoteId = crypto.randomUUID();
    const token = `cpldg_${crypto.randomUUID()}`;
    await admin`
      insert into app.leads (id, workspace_id, status, consent_version, email)
      values (${leadId}, ${WORKSPACE}, 'incomplete', 'terms-1', 'before@example.test')
    `;
    await admin`
      insert into app.draft_grants (workspace_id, lead_id, token_hash, expires_at)
      values (${WORKSPACE}, ${leadId}, ${hashDraftGrantToken(token)}, ${new Date(Date.now() + 86_400_000)})
    `;
    await admin`
      insert into app.quotes
        (id, workspace_id, draft_id, product_id, offer_version_id, currency, charges,
         total_amount_minor, amount_payable_today_minor, payment_required,
         document_checklist, terms_version, expires_at)
      select ${quoteId}, workspace_id, ${leadId}, product_id, offer_version_id, currency,
        charges, total_amount_minor, amount_payable_today_minor, payment_required,
        document_checklist, terms_version, ${new Date(NOW.getTime() + 900_000)}
      from app.quotes where id = ${QUOTE}
    `;
    const service = new OrderService(
      new DatabaseOrderStore(clientA),
      'honour_until_expiry',
      () => NOW,
    );
    let pending: Promise<unknown> = Promise.resolve();
    await admin.begin(async (tx) => {
      const [connection] = await tx<{ pid: number }[]>`select pg_backend_pid() as pid`;
      if (!connection) throw new Error('missing lock-holder connection');
      await tx`select id from app.leads where id = ${leadId} for update`;
      await tx`update app.leads set email = 'after@example.test' where id = ${leadId}`;
      pending = service.submit({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        grantToken: token,
        idempotencyKey: crypto.randomUUID(),
        body: { ...requestBody, quoteId },
      });
      await vi.waitFor(
        async () => {
          const [waiting] = await admin<{ count: number }[]>`
          select count(*)::int as count from pg_stat_activity
            where datname = current_database() and ${connection.pid} = any(pg_blocking_pids(pid))
        `;
          expect(waiting?.count).toBeGreaterThan(0);
        },
        { timeout: 5_000 },
      );
    });
    expect(await pending).toMatchObject({ status: 'created' });
    const [email] = await admin`
      select j.payload->>'toAddress' as recipient
      from app.outbox_jobs j join app.orders o on o.id = (j.payload->>'orderId')::uuid
      where o.lead_id = ${leadId} and j.job_type = 'order_acknowledgement_email'
    `;
    expect(email?.recipient).toBe('after@example.test');
  });
});
