import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';

import { codeBindingHash, emailBindingHash } from '../src/tracking/secrets.js';
import { DatabaseTrackingStore } from '../src/tracking/store.js';

function disposableDatabaseUrl(): string | undefined {
  const url = process.env.TEST_MIGRATION_DATABASE_URL;
  const allowed = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!url && !allowed) return undefined;
  if (!url || !allowed) throw new Error('Both disposable database test settings are required.');
  return url;
}

const databaseUrl = disposableDatabaseUrl();
const databaseTest = databaseUrl ? describe : describe.skip;

const WORKSPACE = '14000000-0000-4000-8000-000000000e01';
const ACTOR = '24000000-0000-4000-8000-000000000e01';
const LEAD = '54000000-0000-4000-8000-000000000e01';
const ORDER = '64000000-0000-4000-8000-000000000e01';
const REFERENCE = 'CP-TRACK01';
const EMAIL = 'jane@example.test';

databaseTest('DatabaseTrackingStore (T22)', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);
    await admin`
      insert into app.workspaces (id, slug, name)
      values (${WORKSPACE}, 'ci-tracking-workspace', 'CI Tracking Workspace')
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.leads (id, workspace_id, status, consent_version, email)
      values (${LEAD}, ${WORKSPACE}, 'submitted', 'terms-1', ${EMAIL})
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.orders (id, workspace_id, reference, lead_id, status, payment_state, delivery_state, snapshot, payload, submitted_at)
      values (${ORDER}, ${WORKSPACE}, ${REFERENCE}, ${LEAD}, 'dispatched', 'paid', 'dispatched',
        ${admin.json({ documentChecklist: ['passport'] })}, '{}'::jsonb, now())
      on conflict (id) do nothing
    `;
    await admin`
      insert into app.dispatch_records (workspace_id, order_id, actor_id, courier, tracking_reference, dispatched_at)
      values (${WORKSPACE}, ${ORDER}, ${ACTOR}, 'TEST Courier', 'TRACK-9', now())
    `;

    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    database = createDatabaseClient({
      connectionString: runtimeUrl.toString(),
      maxConnections: 1,
      ssl: false,
    });
  });

  afterAll(async () => {
    await database.close();
    await admin.end();
  });

  test('matches, consumes once, and returns a PII-free status', async () => {
    const store = new DatabaseTrackingStore(database);
    const secret = 'tracking-store-integration-secret-32-chars';

    const match = await store.matchOrder({
      workspaceId: WORKSPACE,
      reference: REFERENCE,
      normalizedEmail: EMAIL,
    });
    expect(match?.orderId).toBe(ORDER);

    const emailHash = emailBindingHash(secret, WORKSPACE, ORDER, EMAIL);
    await store.createChallenge({
      workspaceId: WORKSPACE,
      orderId: ORDER,
      emailHash,
      codeHash: codeBindingHash(secret, WORKSPACE, ORDER, EMAIL, '123456'),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });

    const wrong = await store.consume({
      workspaceId: WORKSPACE,
      orderId: ORDER,
      emailHash,
      candidateCodeHash: codeBindingHash(secret, WORKSPACE, ORDER, EMAIL, '000000'),
      now: new Date(),
    });
    expect(wrong).toBe('invalid');

    const ok = await store.consume({
      workspaceId: WORKSPACE,
      orderId: ORDER,
      emailHash,
      candidateCodeHash: codeBindingHash(secret, WORKSPACE, ORDER, EMAIL, '123456'),
      now: new Date(),
    });
    expect(ok).toBe('verified');

    // A second consumption of the same challenge is denied.
    const again = await store.consume({
      workspaceId: WORKSPACE,
      orderId: ORDER,
      emailHash,
      candidateCodeHash: codeBindingHash(secret, WORKSPACE, ORDER, EMAIL, '123456'),
      now: new Date(),
    });
    expect(again).toBe('not_found');

    // The challenge stores hashes, never the plaintext code.
    const rows = await admin<{ code_hash: string; email_hash: string }[]>`
      select code_hash, email_hash from app.tracking_challenges where workspace_id = ${WORKSPACE} and order_id = ${ORDER}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.code_hash).not.toContain('123456');
    expect(rows[0]?.email_hash).not.toContain(EMAIL);

    const status = await store.status({ workspaceId: WORKSPACE, orderId: ORDER });
    expect(status).toMatchObject({
      reference: REFERENCE,
      fulfilmentStatus: 'dispatched',
      trackingReference: 'TRACK-9',
      documentsRequired: ['passport'],
    });
    expect(JSON.stringify(status)).not.toContain(EMAIL);
  });
});
