import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';
import { InMemoryDeletionLedger } from '@canadian-plans/adapters';

import { DatabaseDeletionStore } from '../src/deletion/store.js';
import { DatabaseDeletionLedgerStore, DeletionLedgerService } from '../src/deletion/ledger.js';

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
const databaseTest = databaseUrl ? describe : describe.skip;

const WORKSPACE = '13000000-0000-4000-8000-000000000d01';
const ACTOR = '23000000-0000-4000-8000-000000000d01';
const LEAD = '53000000-0000-4000-8000-000000000d01';
const ORDER = '63000000-0000-4000-8000-000000000d01';
const NOTE = '73000000-0000-4000-8000-000000000d01';
const AMENDMENT = '73000000-0000-4000-8000-000000000d02';
const CHANGE_REQUEST = '73000000-0000-4000-8000-000000000d03';
const REMINDER = '73000000-0000-4000-8000-000000000d04';
const REQUEST_ID = '83000000-0000-4000-8000-000000000d01';

const SNAPSHOT = { offerVersionId: '90000000-0000-4000-8000-0000000000d1', currency: 'CAD' };

databaseTest('customer-data deletion (T21)', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;
  let store: DatabaseDeletionStore;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);

    await admin`
      insert into app.workspaces (id, slug, name)
      values (${WORKSPACE}, 'ci-deletion-workspace', 'CI Deletion Workspace')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.leads (id, workspace_id, status, consent_version, full_name, email, phone, country_code, payload)
      values (${LEAD}, ${WORKSPACE}, 'submitted', 'terms-1', 'Jane Customer', 'jane@example.test', '+15550100', 'BD',
        ${admin.json({ schemaVersion: 1, payload: { destination: 'Toronto' } })})
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.orders (id, workspace_id, reference, lead_id, status, payment_state, delivery_state, snapshot, payload, submitted_at)
      values (${ORDER}, ${WORKSPACE}, 'CP-DELETE1', ${LEAD}, 'submitted', 'not_required', 'none',
        ${admin.json(SNAPSHOT)}, ${admin.json({ contact: { email: 'jane@example.test' } })}, now())
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.order_notes (id, workspace_id, order_id, author_id, body)
      values (${NOTE}, ${WORKSPACE}, ${ORDER}, ${ACTOR}, 'Call back jane@example.test')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.order_amendments (id, workspace_id, order_id, actor_id, reason, patch, before, after)
      values (${AMENDMENT}, ${WORKSPACE}, ${ORDER}, ${ACTOR}, 'fix email',
        ${admin.json({ email: 'new@example.test' })}, ${admin.json({ email: 'jane@example.test' })}, ${admin.json({ email: 'new@example.test' })})
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.order_change_requests (id, workspace_id, order_id, requested_by, payload, status)
      values (${CHANGE_REQUEST}, ${WORKSPACE}, ${ORDER}, ${ACTOR}, ${admin.json({ patch: { phone: '+15550199' } })}, 'pending')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.order_reminders (id, workspace_id, order_id, created_by, remind_at, note)
      values (${REMINDER}, ${WORKSPACE}, ${ORDER}, ${ACTOR}, now(), 'Follow up with Jane')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.audit_events (workspace_id, actor_id, actor_label, action, entity, entity_id, before, after, request_id)
      values (${WORKSPACE}, ${ACTOR}, 'staff', 'order.submitted', 'order', ${ORDER}, null,
        ${admin.json({ reference: 'CP-DELETE1', email: 'jane@example.test' })}, ${REQUEST_ID})
    `;
    await admin`
      insert into app.outbox_jobs (workspace_id, job_type, dedupe_key, payload)
      values (${WORKSPACE}, 'analytics_order_submitted', ${ORDER}, ${admin.json({ orderId: ORDER })})
      on conflict (workspace_id, job_type, dedupe_key) do nothing
    `;

    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    database = createDatabaseClient({
      connectionString: runtimeUrl.toString(),
      maxConnections: 1,
      ssl: false,
    });
    store = new DatabaseDeletionStore(database);
  });

  afterAll(async () => {
    await database.close();
    await admin.end();
  });

  test('restricts every linked personal copy and keeps the commercial record', async () => {
    const outcome = await store.deleteCustomerData({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      requestId: REQUEST_ID,
      orderId: ORDER,
      reason: 'customer request',
    });
    expect(outcome.status).toBe('deleted');
    const deletionId = outcome.status === 'deleted' ? outcome.deletionId : '';

    const [order] = await admin<
      { reference: string; snapshot: unknown; payload: unknown; consent: unknown }[]
    >`select reference, snapshot, payload, consent from app.orders where id = ${ORDER}`;
    expect(order?.reference).toBe('CP-DELETE1');
    expect(order?.snapshot).toEqual(SNAPSHOT);
    expect(order?.payload).toEqual({});
    expect(order?.consent).toBeNull();

    const [lead] = await admin<
      { full_name: string | null; email: string | null; phone: string | null; payload: unknown }[]
    >`select full_name, email, phone, payload from app.leads where id = ${LEAD}`;
    expect(lead).toEqual({ full_name: null, email: null, phone: null, payload: null });

    for (const table of [
      'order_notes',
      'order_amendments',
      'order_change_requests',
      'order_reminders',
    ]) {
      const rows = await admin.unsafe(
        `select count(*)::int as count from app.${table} where order_id = $1`,
        [ORDER],
      );
      expect(rows[0]?.['count'], `${table} emptied`).toBe(0);
    }

    const scrubbed = await admin<
      { before: unknown; after: unknown; action: string }[]
    >`select before, after, action from app.audit_events
      where workspace_id = ${WORKSPACE} and entity_id in (${ORDER}, ${LEAD}) order by created_at`;
    const prior = scrubbed.filter((row) => row.action !== 'order.customer_data_deleted');
    expect(prior.every((row) => row.before === null && row.after === null)).toBe(true);

    const deletionAudit = scrubbed.find((row) => row.action === 'order.customer_data_deleted');
    expect(deletionAudit?.after).toEqual({ reason: 'customer request' });
    expect(JSON.stringify(deletionAudit)).not.toContain('jane@example.test');

    const [job] = await admin<{ payload: unknown }[]>`
      select payload from app.outbox_jobs
      where workspace_id = ${WORKSPACE} and job_type = 'analytics_order_submitted' and dedupe_key = ${ORDER}
    `;
    expect(job?.payload).toEqual({});

    const [intent] = await admin<{ status: string; ledger_ack_id: string | null }[]>`
      select status, ledger_ack_id from app.deletion_intents where id = ${deletionId}
    `;
    expect(intent?.status).toBe('pending');

    const [publishJob] = await admin<{ job_type: string }[]>`
      select job_type from app.outbox_jobs
      where workspace_id = ${WORKSPACE} and job_type = 'deletion_ledger_publish' and dedupe_key = ${deletionId}
    `;
    expect(publishJob?.job_type).toBe('deletion_ledger_publish');
  });

  test('publishes to the ledger and marks the intent acknowledged', async () => {
    const [pending] = await admin<{ id: string }[]>`
      select id from app.deletion_intents where workspace_id = ${WORKSPACE} and status = 'pending' limit 1
    `;
    if (!pending) throw new Error('expected a pending deletion intent');

    const ledger = new InMemoryDeletionLedger();
    const service = new DeletionLedgerService({
      ledger,
      store: new DatabaseDeletionLedgerStore(),
    });
    const result = await service.publish({ workspaceId: WORKSPACE, deletionId: pending.id });
    expect(result.status).toBe('acknowledged');
    expect(ledger.has(pending.id)).toBe(true);

    const [row] = await admin<{ status: string; ledger_ack_id: string | null }[]>`
      select status, ledger_ack_id from app.deletion_intents where id = ${pending.id}
    `;
    expect(row?.status).toBe('acknowledged');
    expect(row?.ledger_ack_id).toBe(`in-memory-ledger:${pending.id}`);
  });
});
