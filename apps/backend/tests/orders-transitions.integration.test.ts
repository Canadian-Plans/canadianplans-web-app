import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';

import { DatabaseOrderTransitionStore } from '../src/orders/transitions.js';

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

const WORKSPACE = '10000000-0000-4000-8000-000000000631';
const ACTOR = '20000000-0000-4000-8000-000000000631';
const REQUEST = '70000000-0000-4000-8000-000000000631';
const LEAD_MAIN = '50000000-0000-4000-8000-000000000631';
const LEAD_CANCEL = '50000000-0000-4000-8000-000000000632';
const LEAD_DISPATCH = '50000000-0000-4000-8000-000000000633';
const ORDER_MAIN = '80000000-0000-4000-8000-000000000631';
const ORDER_CANCEL = '80000000-0000-4000-8000-000000000632';
const ORDER_DISPATCH = '80000000-0000-4000-8000-000000000633';
const NOW = new Date('2026-09-16T12:00:00.000Z');

databaseDescribe('order transition store against Postgres', () => {
  let admin: ReturnType<typeof postgres>;
  let client: DatabaseClient;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);
    await admin`
      insert into app.workspaces (id, slug, name)
      values (${WORKSPACE}, 'orders-transitions-integration', 'Orders Transitions Integration')
      on conflict (id) do nothing
    `;
    for (const lead of [LEAD_MAIN, LEAD_CANCEL, LEAD_DISPATCH]) {
      await admin`
        insert into app.leads (id, workspace_id, status, consent_version)
        values (${lead}, ${WORKSPACE}, 'incomplete', 'terms-1')
        on conflict (id) do nothing
      `;
    }
    const orders = [
      { id: ORDER_MAIN, reference: 'CP-TRANSITION-MAIN', lead: LEAD_MAIN, status: 'submitted' },
      {
        id: ORDER_CANCEL,
        reference: 'CP-TRANSITION-CANCEL',
        lead: LEAD_CANCEL,
        status: 'submitted',
      },
      {
        id: ORDER_DISPATCH,
        reference: 'CP-TRANSITION-DISPATCH',
        lead: LEAD_DISPATCH,
        status: 'ready_for_delivery',
      },
    ];
    for (const order of orders) {
      await admin`
        insert into app.orders (
          id, workspace_id, reference, lead_id, status, payment_state, delivery_state,
          version, snapshot, payload, submitted_at
        ) values (
          ${order.id}, ${WORKSPACE}, ${order.reference}, ${order.lead}, ${order.status},
          'not_required', 'none', 1, '{}'::jsonb, '{}'::jsonb, ${NOW}
        )
        on conflict (id) do update set
          status = excluded.status,
          delivery_state = 'none',
          version = 1
      `;
    }

    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    client = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
  });

  afterAll(async () => {
    await client?.close();
    await admin.end();
  });

  test('transitioning submitted to in progress writes the version, history and audit rows', async () => {
    const store = new DatabaseOrderTransitionStore(client, false, () => NOW);
    const outcome = await store.transition({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST,
      orderId: ORDER_MAIN,
      expectedVersion: 1,
      toStatus: 'in_progress',
    });
    expect(outcome).toEqual({
      status: 'transitioned',
      orderId: ORDER_MAIN,
      orderStatus: 'in_progress',
      version: 2,
    });

    const [order] = await admin<{ status: string; version: number }[]>`
      select status, version from app.orders where id = ${ORDER_MAIN}
    `;
    expect(order).toEqual({ status: 'in_progress', version: 2 });

    const history = await admin<
      {
        from_status: string | null;
        to_status: string;
        order_version: number;
        actor_id: string;
        reason: string | null;
      }[]
    >`
      select from_status, to_status, order_version, actor_id, reason
      from app.order_status_history where order_id = ${ORDER_MAIN}
    `;
    expect(history).toEqual([
      {
        from_status: 'submitted',
        to_status: 'in_progress',
        order_version: 2,
        actor_id: ACTOR,
        reason: null,
      },
    ]);

    const audits = await admin<
      {
        action: string;
        entity: string;
        before: unknown;
        after: unknown;
        request_id: string;
      }[]
    >`
      select action, entity, before, after, request_id
      from app.audit_events where entity = 'order' and entity_id = ${ORDER_MAIN}
    `;
    expect(audits).toEqual([
      {
        action: 'order.status_changed',
        entity: 'order',
        before: { status: 'submitted', version: 1 },
        after: { status: 'in_progress', version: 2 },
        request_id: REQUEST,
      },
    ]);
  });

  test('a stale expected version conflicts without writing any rows', async () => {
    const store = new DatabaseOrderTransitionStore(client, false, () => NOW);
    expect(
      await store.transition({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        orderId: ORDER_MAIN,
        expectedVersion: 1,
        toStatus: 'awaiting_customer',
      }),
    ).toEqual({ status: 'version_conflict' });

    const [order] = await admin<{ status: string; version: number }[]>`
      select status, version from app.orders where id = ${ORDER_MAIN}
    `;
    expect(order).toEqual({ status: 'in_progress', version: 2 });

    const [counts] = await admin<{ history: number; audit: number }[]>`
      select
        (select count(*)::int from app.order_status_history
           where order_id = ${ORDER_MAIN}) as history,
        (select count(*)::int from app.audit_events
           where entity = 'order' and entity_id = ${ORDER_MAIN}) as audit
    `;
    expect(counts).toEqual({ history: 1, audit: 1 });
  });

  test('cancelling without a reason is rejected and leaves the order untouched', async () => {
    const store = new DatabaseOrderTransitionStore(client, false, () => NOW);
    expect(
      await store.transition({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        orderId: ORDER_CANCEL,
        expectedVersion: 1,
        toStatus: 'cancelled',
      }),
    ).toEqual({ status: 'cancellation_reason_required' });
    expect(
      await store.transition({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        orderId: ORDER_CANCEL,
        expectedVersion: 1,
        toStatus: 'cancelled',
        reason: '   ',
      }),
    ).toEqual({ status: 'cancellation_reason_required' });

    const [counts] = await admin<{ history: number; audit: number }[]>`
      select
        (select count(*)::int from app.order_status_history
           where order_id = ${ORDER_CANCEL}) as history,
        (select count(*)::int from app.audit_events
           where entity = 'order' and entity_id = ${ORDER_CANCEL}) as audit
    `;
    expect(counts).toEqual({ history: 0, audit: 0 });

    // A real reason still cancels, proving the reason is the only blocker.
    expect(
      await store.transition({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        orderId: ORDER_CANCEL,
        expectedVersion: 1,
        toStatus: 'cancelled',
        reason: 'customer withdrew the request',
      }),
    ).toEqual({
      status: 'transitioned',
      orderId: ORDER_CANCEL,
      orderStatus: 'cancelled',
      version: 2,
    });
    const [history] = await admin<{ from_status: string; to_status: string; reason: string }[]>`
      select from_status, to_status, reason
      from app.order_status_history where order_id = ${ORDER_CANCEL}
    `;
    expect(history).toEqual({
      from_status: 'submitted',
      to_status: 'cancelled',
      reason: 'customer withdrew the request',
    });
  });

  test('dispatch needs the operational-transition flag, courier details and then sets the delivery state', async () => {
    const gated = new DatabaseOrderTransitionStore(client, false, () => NOW);
    expect(
      await gated.transition({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        orderId: ORDER_DISPATCH,
        expectedVersion: 1,
        toStatus: 'dispatched',
        dispatch: { courier: 'Canada Post', dispatchedAt: NOW },
      }),
    ).toEqual({ status: 'feature_not_ready' });

    const operational = new DatabaseOrderTransitionStore(client, true, () => NOW);
    // Courier details are mandatory: dispatch and its record are one write.
    expect(
      await operational.transition({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        orderId: ORDER_DISPATCH,
        expectedVersion: 1,
        toStatus: 'dispatched',
      }),
    ).toEqual({ status: 'dispatch_details_required' });

    const [before] = await admin<{ status: string; delivery_state: string; version: number }[]>`
      select status, delivery_state, version from app.orders where id = ${ORDER_DISPATCH}
    `;
    expect(before).toEqual({ status: 'ready_for_delivery', delivery_state: 'none', version: 1 });

    expect(
      await operational.transition({
        workspaceId: WORKSPACE,
        actorId: ACTOR,
        requestId: REQUEST,
        orderId: ORDER_DISPATCH,
        expectedVersion: 1,
        toStatus: 'dispatched',
        dispatch: {
          courier: 'Canada Post',
          trackingReference: 'CP-TRACK-1',
          dispatchedAt: NOW,
        },
      }),
    ).toEqual({
      status: 'transitioned',
      orderId: ORDER_DISPATCH,
      orderStatus: 'dispatched',
      version: 2,
    });
    const [after] = await admin<{ status: string; delivery_state: string; version: number }[]>`
      select status, delivery_state, version from app.orders where id = ${ORDER_DISPATCH}
    `;
    expect(after).toEqual({ status: 'dispatched', delivery_state: 'dispatched', version: 2 });

    // The courier record lands in the same transaction as the status change.
    const records = await admin<
      { courier: string; tracking_reference: string | null; actor_id: string }[]
    >`
      select courier, tracking_reference, actor_id
      from app.dispatch_records where order_id = ${ORDER_DISPATCH}
    `;
    expect(records).toEqual([
      { courier: 'Canada Post', tracking_reference: 'CP-TRACK-1', actor_id: ACTOR },
    ]);
  });
});
