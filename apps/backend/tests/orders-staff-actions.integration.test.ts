import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';

import { DatabaseStaffOrderActionStore } from '../src/orders/staff-actions.js';
import { DatabaseOrderQueryStore } from '../src/orders/query-store.js';

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

const NOW = new Date('2026-09-16T12:00:00.000Z');
const WORKSPACE = '10000000-0000-4000-8000-0000000007a1';
const OTHER_WORKSPACE = '10000000-0000-4000-8000-0000000007b1';
const ACTOR = '20000000-0000-4000-8000-0000000007a1';
const COLLEAGUE = '20000000-0000-4000-8000-0000000007a2';
const REQUEST = '70000000-0000-4000-8000-0000000007a1';
const MEMBERSHIP_SELF = '30000000-0000-4000-8000-0000000007a1';
const MEMBERSHIP_COLLEAGUE = '30000000-0000-4000-8000-0000000007a2';
const MEMBERSHIP_REVOKED = '30000000-0000-4000-8000-0000000007a3';
const MEMBERSHIP_FOREIGN = '30000000-0000-4000-8000-0000000007b1';

const LEAD_MAIN = '50000000-0000-4000-8000-0000000007a1';
const LEAD_SECOND = '50000000-0000-4000-8000-0000000007a2';
const LEAD_THIRD = '50000000-0000-4000-8000-0000000007a3';
const LEAD_FOREIGN = '50000000-0000-4000-8000-0000000007b1';

const ORDER_MAIN = '80000000-0000-4000-8000-0000000007a1';
const ORDER_SECOND = '80000000-0000-4000-8000-0000000007a2';
const ORDER_THIRD = '80000000-0000-4000-8000-0000000007a3';
const ORDER_FOREIGN = '80000000-0000-4000-8000-0000000007b1';
const ORDER_MISSING = '80000000-0000-4000-8000-0000000007ff';

const offer = {
  productKey: 'rogers-basic',
  productTitle: 'Rogers Basic',
  productType: 'sim',
  offerName: 'Basic 10 GB',
  currency: 'CAD',
  recurringChargeAmountMinor: 4500,
  oneTimeFees: [],
  amountPayableTodayMinor: 0,
  paymentRequired: false,
  documentChecklist: ['passport'],
  eligibility: 'New arrivals',
  availability: 'Canada',
  billingParty: 'Rogers',
  contractTerms: [{ _type: 'block', children: [] }],
  termsVersion: 'terms-2026-09',
  specs: { carrier: 'Rogers', dataAllowance: '10 GB' },
};

const snapshot = {
  quoteId: '90000000-0000-4000-8000-0000000007a1',
  productId: '91000000-0000-4000-8000-0000000007a1',
  offerVersionId: '92000000-0000-4000-8000-0000000007a1',
  offer,
  currency: 'CAD',
  charges: [
    { code: 'base', label: 'Monthly plan', amount: { amountMinor: 4500, currency: 'CAD' } },
  ],
  total: { amountMinor: 4500, currency: 'CAD' },
  amountPayableToday: { amountMinor: 0, currency: 'CAD' },
  paymentRequired: false,
  documentChecklist: ['passport'],
  termsVersion: 'terms-2026-09',
};

const payload = {
  schemaVersion: 1,
  payload: { destination: 'Toronto', arrivalDate: '2026-10-01' },
};

databaseDescribe('staff order actions against Postgres', () => {
  let admin: ReturnType<typeof postgres>;
  let client: DatabaseClient;
  let actions: DatabaseStaffOrderActionStore;
  let query: DatabaseOrderQueryStore;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);

    await admin`
      insert into app.workspaces (id, slug, name) values
        (${WORKSPACE}, 'staff-orders-actions', 'Staff Orders Actions'),
        (${OTHER_WORKSPACE}, 'staff-orders-actions-2', 'Staff Orders Actions Two')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.memberships (id, workspace_id, user_id, membership_type, status, accepted_at) values
        (${MEMBERSHIP_SELF}, ${WORKSPACE}, ${ACTOR}, 'staff', 'active', now()),
        (${MEMBERSHIP_COLLEAGUE}, ${WORKSPACE}, ${COLLEAGUE}, 'staff', 'active', now()),
        (${MEMBERSHIP_REVOKED}, ${WORKSPACE}, ${'20000000-0000-4000-8000-0000000007a3'}, 'staff', 'revoked', now()),
        (${MEMBERSHIP_FOREIGN}, ${OTHER_WORKSPACE}, ${ACTOR}, 'staff', 'active', now())
      on conflict (id) do nothing
    `;

    const leads = [
      {
        id: LEAD_MAIN,
        workspace: WORKSPACE,
        name: 'Jane Doe',
        email: 'jane@example.test',
        attribution: { utmSource: 'google', utmMedium: 'cpc' },
      },
      {
        id: LEAD_SECOND,
        workspace: WORKSPACE,
        name: 'John Roe',
        email: 'john@example.test',
        attribution: { partnerCode: 'MAPLE10', partnerCodeMatched: true },
      },
      {
        id: LEAD_THIRD,
        workspace: WORKSPACE,
        name: 'Amy Direct',
        email: 'amy@example.test',
        attribution: {},
      },
      {
        id: LEAD_FOREIGN,
        workspace: OTHER_WORKSPACE,
        name: 'Jane Foreign',
        email: 'jane.f@example.test',
        attribution: {},
      },
    ];
    for (const lead of leads) {
      await admin`
        insert into app.leads (id, workspace_id, status, full_name, email, phone, country_code, attribution, consent_version)
        values (${lead.id}, ${lead.workspace}, 'submitted', ${lead.name}, ${lead.email}, '+14165550123', 'CA',
                ${admin.json(lead.attribution)}, 'terms-2026-09')
        on conflict (id) do update set
          full_name = excluded.full_name,
          email = excluded.email,
          attribution = excluded.attribution
      `;
    }

    const orders = [
      {
        id: ORDER_MAIN,
        workspace: WORKSPACE,
        reference: 'CP-ACTIONS-MAIN',
        lead: LEAD_MAIN,
        status: 'submitted',
      },
      {
        id: ORDER_SECOND,
        workspace: WORKSPACE,
        reference: 'CP-ACTIONS-SECOND',
        lead: LEAD_SECOND,
        status: 'in_progress',
      },
      {
        id: ORDER_THIRD,
        workspace: WORKSPACE,
        reference: 'CP-ACTIONS-THIRD',
        lead: LEAD_THIRD,
        status: 'submitted',
      },
      {
        id: ORDER_FOREIGN,
        workspace: OTHER_WORKSPACE,
        reference: 'CP-ACTIONS-FOREIGN',
        lead: LEAD_FOREIGN,
        status: 'submitted',
      },
    ];
    for (const order of orders) {
      await admin`
        insert into app.orders (
          id, workspace_id, reference, lead_id, status, payment_state, delivery_state,
          archived_at, version, snapshot, payload, submitted_at
        ) values (
          ${order.id}, ${order.workspace}, ${order.reference}, ${order.lead}, ${order.status},
          'pending', 'none', null, 1, ${admin.json(snapshot)}, ${admin.json(payload)}, ${NOW}
        )
        on conflict (id) do update set
          status = excluded.status,
          payment_state = 'pending',
          archived_at = null,
          version = 1,
          snapshot = excluded.snapshot,
          payload = excluded.payload
      `;
    }
    // The seeded orders keep a clean amendment/change-request history.
    await admin`delete from app.order_amendments where workspace_id in (${WORKSPACE}, ${OTHER_WORKSPACE})`;
    await admin`delete from app.order_change_requests where workspace_id in (${WORKSPACE}, ${OTHER_WORKSPACE})`;
    await admin`delete from app.payment_records where workspace_id in (${WORKSPACE}, ${OTHER_WORKSPACE})`;
    await admin`delete from app.order_notes where workspace_id in (${WORKSPACE}, ${OTHER_WORKSPACE})`;
    await admin`delete from app.order_reminders where workspace_id in (${WORKSPACE}, ${OTHER_WORKSPACE})`;
    await admin`delete from app.audit_events where workspace_id in (${WORKSPACE}, ${OTHER_WORKSPACE})`;

    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    client = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
    actions = new DatabaseStaffOrderActionStore(client, () => NOW);
    query = new DatabaseOrderQueryStore(client);
  });

  afterAll(async () => {
    await client?.close();
    await admin.end();
  });

  test('a note is stored, attributed and audited without copying its text into the audit', async () => {
    const outcome = await actions.addNote({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_MAIN,
      body: 'Customer asked to change the arrival date.',
    });
    expect(outcome.status).toBe('created');

    const [note] = await admin<{ author_id: string; body: string }[]>`
      select author_id, body from app.order_notes where order_id = ${ORDER_MAIN}
    `;
    expect(note).toEqual({
      author_id: ACTOR,
      body: 'Customer asked to change the arrival date.',
    });

    const [audit] = await admin<{ action: string; after: Record<string, unknown> }[]>`
      select action, after from app.audit_events
      where entity = 'order' and entity_id = ${ORDER_MAIN} and action = 'order.note_added'
    `;
    expect(audit?.action).toBe('order.note_added');
    expect(Object.keys(audit?.after ?? {})).toEqual(['noteId']);
    expect(JSON.stringify(audit?.after)).not.toContain('Customer asked');
  });

  test('assignment accepts an active member, rejects a revoked one and audits the change', async () => {
    const rejected = await actions.assign({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_MAIN,
      assigneeId: MEMBERSHIP_REVOKED,
      expectedVersion: 1,
    });
    expect(rejected).toEqual({ status: 'assignee_not_found' });
    const [before] = await admin<{ assignee_id: string | null; version: number }[]>`
      select assignee_id, version from app.orders where id = ${ORDER_MAIN}
    `;
    expect(before).toEqual({ assignee_id: null, version: 1 });

    const assigned = await actions.assign({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_MAIN,
      assigneeId: MEMBERSHIP_COLLEAGUE,
      expectedVersion: 1,
    });
    expect(assigned).toEqual({ status: 'updated' });
    const [after] = await admin<{ assignee_id: string; version: number }[]>`
      select assignee_id, version from app.orders where id = ${ORDER_MAIN}
    `;
    expect(after).toEqual({ assignee_id: MEMBERSHIP_COLLEAGUE, version: 2 });
  });

  test('bulk assignment reports each order, including stale and missing rows', async () => {
    const outcome = await actions.bulkAssign({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      assigneeId: MEMBERSHIP_SELF,
      orders: [
        { orderId: ORDER_SECOND, expectedVersion: 1 },
        { orderId: ORDER_THIRD, expectedVersion: 99 },
        { orderId: ORDER_MISSING, expectedVersion: 1 },
      ],
    });
    expect(outcome).toEqual({
      status: 'assigned',
      results: [
        { orderId: ORDER_SECOND, status: 'assigned', version: 2 },
        { orderId: ORDER_THIRD, status: 'version_conflict' },
        { orderId: ORDER_MISSING, status: 'not_found' },
      ],
    });
    const [second] = await admin<{ assignee_id: string; version: number }[]>`
      select assignee_id, version from app.orders where id = ${ORDER_SECOND}
    `;
    expect(second).toEqual({ assignee_id: MEMBERSHIP_SELF, version: 2 });
    const [third] = await admin<{ assignee_id: string | null; version: number }[]>`
      select assignee_id, version from app.orders where id = ${ORDER_THIRD}
    `;
    expect(third).toEqual({ assignee_id: null, version: 1 });
  });

  test('a manual payment and the payment state commit together, and a stale write changes nothing', async () => {
    const stale = await actions.recordPayment({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_THIRD,
      paymentState: 'paid',
      amountMinor: 4500,
      expectedVersion: 5,
    });
    expect(stale).toEqual({ status: 'version_conflict' });
    const [counts] = await admin<{ payments: number; version: number; state: string }[]>`
      select
        (select count(*)::int from app.payment_records where order_id = ${ORDER_THIRD}) as payments,
        version, payment_state as state
      from app.orders where id = ${ORDER_THIRD}
    `;
    expect(counts).toEqual({ payments: 0, version: 1, state: 'pending' });

    const recorded = await actions.recordPayment({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_THIRD,
      paymentState: 'paid',
      method: 'interac',
      reference: 'PAY-77',
      amountMinor: 4500,
      expectedVersion: 1,
    });
    expect(recorded).toEqual({ status: 'updated' });
    const [after] = await admin<
      {
        from_state: string;
        to_state: string;
        amount_minor: number;
        currency: string;
        method: string;
      }[]
    >`
      select from_state, to_state, amount_minor, currency, method
      from app.payment_records where order_id = ${ORDER_THIRD}
    `;
    expect(after).toEqual({
      from_state: 'pending',
      to_state: 'paid',
      amount_minor: 4500,
      currency: 'CAD',
      method: 'interac',
    });
    const [order] = await admin<{ version: number; state: string }[]>`
      select version, payment_state as state from app.orders where id = ${ORDER_THIRD}
    `;
    expect(order).toEqual({ version: 2, state: 'paid' });
  });

  test('approving a change request writes exactly one amendment, applies contact data and is single-use', async () => {
    const created = await actions.createChangeRequest({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_MAIN,
      payload: {
        patch: { contact: { fullName: 'Jane A. Doe' }, form: { destination: 'Vancouver' } },
        note: 'customer emailed a correction',
      },
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') return;

    const approved = await actions.resolveChangeRequest({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_MAIN,
      changeRequestId: created.changeRequest.id,
      decision: 'approve',
      reason: 'verified with the customer',
      expectedVersion: 2,
    });
    expect(approved).toEqual({ status: 'updated' });

    const amendments = await admin<
      {
        reason: string;
        patch: Record<string, unknown>;
        before: Record<string, unknown>;
        after: Record<string, unknown>;
      }[]
    >`
      select reason, patch, before, after from app.order_amendments where order_id = ${ORDER_MAIN}
    `;
    expect(amendments).toHaveLength(1);
    expect(amendments[0]?.reason).toBe('verified with the customer');
    expect(amendments[0]?.before).toEqual({ fullName: 'Jane Doe' });
    expect(amendments[0]?.after).toEqual({ fullName: 'Jane A. Doe', destination: 'Vancouver' });

    // The lead is mutable operational data; the submitted order payload is not.
    const [lead] = await admin<{ full_name: string }[]>`
      select full_name from app.leads where id = ${LEAD_MAIN}
    `;
    expect(lead).toEqual({ full_name: 'Jane A. Doe' });
    const [order] = await admin<
      { payload: { payload: { destination: string } }; version: number }[]
    >`
      select payload, version from app.orders where id = ${ORDER_MAIN}
    `;
    expect(order?.payload.payload.destination).toBe('Toronto');
    expect(order?.version).toBe(3);

    const again = await actions.resolveChangeRequest({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_MAIN,
      changeRequestId: created.changeRequest.id,
      decision: 'approve',
      expectedVersion: 3,
    });
    expect(again).toEqual({ status: 'change_request_resolved' });
    const [remaining] = await admin<{ count: number }[]>`
      select count(*)::int from app.order_amendments where order_id = ${ORDER_MAIN}
    `;
    expect(remaining?.count).toBe(1);
  });

  test('rejecting a change request changes no customer data', async () => {
    const created = await actions.createChangeRequest({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_SECOND,
      payload: { patch: { contact: { fullName: 'Not Applied' } } },
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') return;

    const rejected = await actions.resolveChangeRequest({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_SECOND,
      changeRequestId: created.changeRequest.id,
      decision: 'reject',
      expectedVersion: 2,
    });
    expect(rejected).toEqual({ status: 'updated' });

    const [counts] = await admin<{ amendments: number; status: string }[]>`
      select
        (select count(*)::int from app.order_amendments where order_id = ${ORDER_SECOND}) as amendments,
        status
      from app.order_change_requests where id = ${created.changeRequest.id}
    `;
    expect(counts).toEqual({ amendments: 0, status: 'rejected' });
    const [lead] = await admin<{ full_name: string }[]>`
      select full_name from app.leads where id = ${LEAD_SECOND}
    `;
    expect(lead).toEqual({ full_name: 'John Roe' });
  });

  test('search and filters stay inside the workspace and match the derived source label', async () => {
    const byName = await query.listOrders({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      search: 'jane',
      includeContactSearch: true,
    });
    expect(byName.orders.map((order) => order.id)).toEqual([ORDER_MAIN]);
    expect(byName.orders[0]?.source).toBe('utm:google/cpc');

    const referenceOnly = await query.listOrders({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      search: 'jane',
      includeContactSearch: false,
    });
    expect(referenceOnly.orders).toEqual([]);

    const partnerSource = await query.listOrders({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      source: 'partner:MAPLE10',
      includeContactSearch: true,
    });
    expect(partnerSource.orders.map((order) => order.id)).toEqual([ORDER_SECOND]);

    const directSource = await query.listOrders({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      source: 'direct',
      includeContactSearch: true,
    });
    expect(directSource.orders.map((order) => order.id)).toEqual([ORDER_THIRD]);

    // The same search in the other workspace never sees this workspace's rows.
    const foreign = await query.listOrders({
      workspaceId: OTHER_WORKSPACE,
      actorId: ACTOR,
      search: 'jane',
      includeContactSearch: true,
    });
    expect(foreign.orders.map((order) => order.id)).toEqual([ORDER_FOREIGN]);
  });

  test('the archive dimension is a visibility filter, not a status change', async () => {
    const archived = await actions.archive({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_MAIN,
      archived: true,
      expectedVersion: 3,
    });
    expect(archived).toEqual({ status: 'updated' });

    const active = await query.listOrders({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      archiveState: 'active',
      includeContactSearch: false,
    });
    expect(active.orders.map((order) => order.id)).not.toContain(ORDER_MAIN);

    const onlyArchived = await query.listOrders({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      archiveState: 'archived',
      includeContactSearch: false,
    });
    expect(onlyArchived.orders.map((order) => order.id)).toEqual([ORDER_MAIN]);

    const [order] = await admin<{ status: string; archived_at: Date | null; version: number }[]>`
      select status, archived_at, version from app.orders where id = ${ORDER_MAIN}
    `;
    expect(order?.status).toBe('submitted');
    expect(order?.archived_at).not.toBeNull();
    expect(order?.version).toBe(4);
  });
});
