import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';

import { DatabaseOrderTransitionStore } from '../src/orders/transitions.js';
import { DatabaseCommissionActivationHook } from '../src/partners/activation.js';
import { DatabasePartnerStore } from '../src/partners/store.js';

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

const WORKSPACE = '10000000-0000-4000-8000-000000000751';
const ACTOR = '20000000-0000-4000-8000-000000000751';
const REQUEST = '70000000-0000-4000-8000-000000000751';
const PARTNER = '80000000-0000-4000-8000-000000000751';
const RULE_1 = '81000000-0000-4000-8000-000000000751';
const RULE_2 = '81000000-0000-4000-8000-000000000752';
const RULE_TEST = '81000000-0000-4000-8000-000000000753';
const NOW = new Date('2026-09-20T12:00:00.000Z');

interface OrderFixture {
  id: string;
  lead: string;
  reference: string;
}

databaseDescribe('partner commission model against Postgres (T19)', () => {
  let admin: ReturnType<typeof postgres>;
  let client: DatabaseClient;
  let orderSeq = 0;

  async function seedOrder(status: string): Promise<OrderFixture> {
    orderSeq += 1;
    const suffix = orderSeq.toString().padStart(3, '0');
    const lead = `50000000-0000-4000-8000-0009000${suffix}`;
    const id = `82000000-0000-4000-8000-0009000${suffix}`;
    await admin`
      insert into app.leads (id, workspace_id, status, consent_version, partner_id)
      values (${lead}, ${WORKSPACE}, 'submitted', 'terms-1', ${PARTNER})
    `;
    await admin`
      insert into app.orders (
        id, workspace_id, reference, lead_id, status, payment_state, delivery_state,
        version, snapshot, payload, partner_id, submitted_at
      ) values (
        ${id}, ${WORKSPACE}, ${'CP-COMM-' + suffix}, ${lead}, ${status},
        'not_required', 'none', 1, '{}'::jsonb, '{}'::jsonb, ${PARTNER}, ${NOW}
      )
    `;
    return { id, lead, reference: 'CP-COMM-' + suffix };
  }

  function store(nodeEnv = 'test') {
    return new DatabaseOrderTransitionStore(
      client,
      true,
      () => NOW,
      new DatabaseCommissionActivationHook(nodeEnv),
    );
  }

  async function countLines(orderId: string): Promise<number> {
    const rows = await admin<{ count: string }[]>`
      select count(*)::int as count from app.commission_lines
      where workspace_id = ${WORKSPACE} and order_id = ${orderId}
    `;
    return Number(rows[0]?.count ?? 0);
  }

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);
    await admin`
      insert into app.workspaces (id, slug, name)
      values (${WORKSPACE}, 'partners-commission-integration', 'Partners Commission Integration')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.partners (id, workspace_id, name, referral_code, status)
      values (${PARTNER}, ${WORKSPACE}, 'Maple Referrals', 'MAPLE-COMM', 'approved')
      on conflict (id) do nothing
    `;

    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    client = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
  });

  beforeEach(async () => {
    await admin`delete from app.commission_line_events where workspace_id = ${WORKSPACE}`;
    await admin`delete from app.commission_lines where workspace_id = ${WORKSPACE}`;
    await admin`delete from app.commission_rules where workspace_id = ${WORKSPACE}`;
    await admin`delete from app.orders where workspace_id = ${WORKSPACE}`;
    await admin`delete from app.leads where workspace_id = ${WORKSPACE}`;
  });

  afterAll(async () => {
    await client.close();
    await admin.end();
  });

  async function insertRule(
    id: string,
    valueMinor: number,
    effectiveFrom: Date,
    options: { isTest?: boolean; effectiveTo?: Date | null } = {},
  ): Promise<void> {
    await admin`
      insert into app.commission_rules (
        id, workspace_id, rule_type, value_minor, currency, is_test, effective_from, effective_to
      ) values (
        ${id}, ${WORKSPACE}, 'fixed', ${valueMinor}, 'CAD', ${options.isTest ?? false},
        ${effectiveFrom}, ${options.effectiveTo ?? null}
      )
    `;
  }

  test('activation creates exactly one commission line, even when retried', async () => {
    await insertRule(RULE_1, 1500, new Date('2026-01-01T00:00:00.000Z'));
    const order = await seedOrder('dispatched');
    const transition = store();

    const first = await transition.transition({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: order.id,
      expectedVersion: 1,
      toStatus: 'activated',
    });
    expect(first.status).toBe('transitioned');
    expect(await countLines(order.id)).toBe(1);

    // Retrying activation on the already-activated order is an illegal
    // transition and never creates a second line.
    const retry = await transition.transition({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: order.id,
      expectedVersion: 2,
      toStatus: 'activated',
    });
    expect(retry.status).toBe('illegal_transition');
    expect(await countLines(order.id)).toBe(1);

    const [line] = await admin<{ amount_minor: number; state: string; rule_id: string }[]>`
      select amount_minor, state, rule_id from app.commission_lines
      where workspace_id = ${WORKSPACE} and order_id = ${order.id}
    `;
    expect(line).toMatchObject({ amount_minor: 1500, state: 'earned', rule_id: RULE_1 });
    const events = await admin<{ to_state: string }[]>`
      select to_state from app.commission_line_events where workspace_id = ${WORKSPACE}
    `;
    expect(events.map((event) => event.to_state)).toEqual(['earned']);
  });

  test('a later rule change leaves already-earned lines untouched', async () => {
    await insertRule(RULE_1, 1000, new Date('2026-01-01T00:00:00.000Z'));
    const first = await seedOrder('dispatched');
    const transition = store();
    await transition.transition({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: first.id,
      expectedVersion: 1,
      toStatus: 'activated',
    });

    // Introduce a superseding rule effective now.
    await insertRule(RULE_2, 2000, new Date('2026-09-01T00:00:00.000Z'));

    const firstLine = await admin<{ amount_minor: number; rule_id: string }[]>`
      select amount_minor, rule_id from app.commission_lines
      where workspace_id = ${WORKSPACE} and order_id = ${first.id}
    `;
    expect(firstLine[0]).toMatchObject({ amount_minor: 1000, rule_id: RULE_1 });

    // A subsequently activated order uses the newer rule; the old line stands.
    const second = await seedOrder('dispatched');
    await transition.transition({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: second.id,
      expectedVersion: 1,
      toStatus: 'activated',
    });
    const secondLine = await admin<{ amount_minor: number; rule_id: string }[]>`
      select amount_minor, rule_id from app.commission_lines
      where workspace_id = ${WORKSPACE} and order_id = ${second.id}
    `;
    expect(secondLine[0]).toMatchObject({ amount_minor: 2000, rule_id: RULE_2 });
    // The original line is still exactly as earned.
    const reread = await admin<{ amount_minor: number; rule_id: string }[]>`
      select amount_minor, rule_id from app.commission_lines
      where workspace_id = ${WORKSPACE} and order_id = ${first.id}
    `;
    expect(reread[0]).toMatchObject({ amount_minor: 1000, rule_id: RULE_1 });
  });

  test('commission state is independent of order status', async () => {
    await insertRule(RULE_1, 1500, new Date('2026-01-01T00:00:00.000Z'));
    const order = await seedOrder('dispatched');
    await store().transition({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: order.id,
      expectedVersion: 1,
      toStatus: 'activated',
    });
    const [line] = await admin<{ id: string }[]>`
      select id from app.commission_lines where workspace_id = ${WORKSPACE} and order_id = ${order.id}
    `;
    if (!line) throw new Error('expected a commission line');

    const partnerStore = new DatabasePartnerStore(client, () => NOW);
    const outcome = await partnerStore.changeCommissionState({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      partnerId: PARTNER,
      commissionId: line.id,
      toState: 'carrier_paid',
    });
    expect(outcome.status).toBe('updated');

    // The order's fulfilment status is unchanged by the commission action.
    const [orderRow] = await admin<{ status: string }[]>`
      select status from app.orders where workspace_id = ${WORKSPACE} and id = ${order.id}
    `;
    expect(orderRow).toEqual({ status: 'activated' });
    const [commissionRow] = await admin<{ state: string }[]>`
      select state from app.commission_lines where workspace_id = ${WORKSPACE} and id = ${line.id}
    `;
    expect(commissionRow).toEqual({ state: 'carrier_paid' });
  });

  test('partner_paid stays disabled (OPEN_INPUTS #18)', async () => {
    await insertRule(RULE_1, 1500, new Date('2026-01-01T00:00:00.000Z'));
    const order = await seedOrder('dispatched');
    await store().transition({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: order.id,
      expectedVersion: 1,
      toStatus: 'activated',
    });
    const [line] = await admin<{ id: string }[]>`
      select id from app.commission_lines where workspace_id = ${WORKSPACE} and order_id = ${order.id}
    `;
    if (!line) throw new Error('expected a commission line');
    const partnerStore = new DatabasePartnerStore(client, () => NOW);
    await partnerStore.changeCommissionState({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      partnerId: PARTNER,
      commissionId: line.id,
      toState: 'carrier_paid',
    });
    const disabled = await partnerStore.changeCommissionState({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      partnerId: PARTNER,
      commissionId: line.id,
      toState: 'partner_paid',
    });
    expect(disabled.status).toBe('partner_paid_disabled');
  });

  test('a TEST rule never enters live records in production, leaving order state unchanged', async () => {
    await insertRule(RULE_TEST, 0, new Date('2026-01-01T00:00:00.000Z'), { isTest: true });
    const order = await seedOrder('dispatched');
    const productionStore = store('production');
    const outcome = await productionStore.transition({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: order.id,
      expectedVersion: 1,
      toStatus: 'activated',
    });
    expect(outcome.status).toBe('feature_not_ready');
    expect(await countLines(order.id)).toBe(0);
    const [orderRow] = await admin<{ status: string; version: number }[]>`
      select status, version from app.orders where workspace_id = ${WORKSPACE} and id = ${order.id}
    `;
    expect(orderRow).toEqual({ status: 'dispatched', version: 1 });
  });

  test('activation without any effective rule is rejected and leaves order state unchanged', async () => {
    const order = await seedOrder('dispatched');
    const outcome = await store().transition({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: order.id,
      expectedVersion: 1,
      toStatus: 'activated',
    });
    expect(outcome.status).toBe('feature_not_ready');
    expect(await countLines(order.id)).toBe(0);
    const [orderRow] = await admin<{ status: string; version: number }[]>`
      select status, version from app.orders where workspace_id = ${WORKSPACE} and id = ${order.id}
    `;
    expect(orderRow).toEqual({ status: 'dispatched', version: 1 });
  });
});
