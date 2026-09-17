import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { TEST_RUNTIME_PASSWORD, setTestRuntimePassword } from '@canadian-plans/db/test-helpers';
import type { CommercialOffer } from '@canadian-plans/contracts';

import { commercialContentHash } from '../src/catalogue/canonical.js';
import { DatabaseCatalogueStore } from '../src/catalogue/store.js';
import { hashDraftGrantToken } from '../src/leads/token.js';

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

const WORKSPACE = '10000000-0000-4000-8000-000000000621';
const FOREIGN_WORKSPACE = '10000000-0000-4000-8000-000000000622';
const ACTOR = '20000000-0000-4000-8000-000000000621';
const FOREIGN_ACTOR = '20000000-0000-4000-8000-000000000622';
const LEAD_VALID = '50000000-0000-4000-8000-000000000621';
const LEAD_SUBMITTED = '50000000-0000-4000-8000-000000000622';
const LEAD_CONSUMED = '50000000-0000-4000-8000-000000000623';
const LEAD_WITHDRAWN = '50000000-0000-4000-8000-000000000624';
const LEAD_EXPIRED = '50000000-0000-4000-8000-000000000625';
const LEAD_IMMEDIATE = '50000000-0000-4000-8000-000000000626';
const LEAD_HONOUR = '50000000-0000-4000-8000-000000000627';
const NOW = new Date('2026-09-16T12:00:00.000Z');

const GRANT_VALID = 'cpldg_store-integration-valid-grant';
const GRANT_SUBMITTED = 'cpldg_store-integration-submitted-grant';
const GRANT_CONSUMED = 'cpldg_store-integration-consumed-grant';
const GRANT_WITHDRAWN = 'cpldg_store-integration-withdrawn-grant';
const GRANT_EXPIRED = 'cpldg_store-integration-expired-grant';
const GRANT_IMMEDIATE = 'cpldg_store-integration-immediate-grant';
const GRANT_HONOUR = 'cpldg_store-integration-honour-grant';

const LEADS = [
  { id: LEAD_VALID, status: 'incomplete', grant: GRANT_VALID },
  { id: LEAD_SUBMITTED, status: 'submitted', grant: GRANT_SUBMITTED },
  { id: LEAD_CONSUMED, status: 'incomplete', grant: GRANT_CONSUMED },
  { id: LEAD_WITHDRAWN, status: 'incomplete', grant: GRANT_WITHDRAWN },
  { id: LEAD_EXPIRED, status: 'incomplete', grant: GRANT_EXPIRED },
  { id: LEAD_IMMEDIATE, status: 'incomplete', grant: GRANT_IMMEDIATE },
  { id: LEAD_HONOUR, status: 'incomplete', grant: GRANT_HONOUR },
];

function commercial(planKey: string, amountMinor: number): CommercialOffer {
  return {
    productKey: planKey,
    productTitle: 'Store Integration Plan',
    productType: 'sim',
    offerName: `${planKey} offer`,
    currency: 'CAD',
    recurringChargeAmountMinor: amountMinor,
    oneTimeFees: [],
    amountPayableTodayMinor: amountMinor,
    paymentRequired: false,
    documentChecklist: ['passport'],
    eligibility: 'TEST only',
    availability: 'TEST only',
    billingParty: 'TEST carrier',
    contractTerms: [{ _type: 'block', children: [] }],
    termsVersion: 'terms-1',
    specs: { carrier: 'TEST', dataAllowance: '10 GB' },
  };
}

databaseDescribe('catalogue store against Postgres', () => {
  let admin: ReturnType<typeof postgres>;
  let clientA: DatabaseClient;
  let clientB: DatabaseClient;
  let store: DatabaseCatalogueStore;
  let foreignStore: DatabaseCatalogueStore;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    await setTestRuntimePassword(admin);
    await admin`
      insert into app.workspaces (id, slug, name)
      values
        (${WORKSPACE}, 'catalogue-store-integration', 'Catalogue Store Integration'),
        (${FOREIGN_WORKSPACE}, 'catalogue-store-foreign', 'Catalogue Store Foreign')
      on conflict (id) do nothing
    `;
    for (const lead of LEADS) {
      await admin`
        insert into app.leads (id, workspace_id, status, consent_version)
        values (${lead.id}, ${WORKSPACE}, ${lead.status}, 'terms-1')
        on conflict (id) do update set status = excluded.status
      `;
      await admin`
        insert into app.draft_grants (workspace_id, lead_id, token_hash, expires_at)
        values (
          ${WORKSPACE}, ${lead.id}, ${hashDraftGrantToken(lead.grant)},
          ${new Date(Date.now() + 24 * 3_600_000)}
        )
        on conflict (token_hash) do nothing
      `;
    }

    const runtimeUrl = new URL(databaseUrl);
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = TEST_RUNTIME_PASSWORD;
    clientA = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
    clientB = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
    store = new DatabaseCatalogueStore(clientA);
    foreignStore = new DatabaseCatalogueStore(clientB);
  });

  afterAll(async () => {
    await clientA?.close();
    await clientB?.close();
    await admin.end();
  });

  async function publish(planKey: string, amountMinor: number, revisionId: string) {
    const content = commercial(planKey, amountMinor);
    const contentHash = commercialContentHash(content);
    const result = await store.persistPublished({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      content,
      contentHash,
      documentId: `document-${planKey}`,
      revisionId,
      syncedAt: NOW,
    });
    return { content, contentHash, ...result };
  }

  async function issueQuoteFor(input: {
    planKey: string;
    amountMinor: number;
    leadId: string;
    grantToken: string;
    revisionId: string;
    expiresAt?: Date;
    syncedAt?: Date;
  }) {
    const content = commercial(input.planKey, input.amountMinor);
    const contentHash = commercialContentHash(content);
    const published = await store.persistPublished({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      content,
      contentHash,
      documentId: `document-${input.planKey}`,
      revisionId: input.revisionId,
      syncedAt: NOW,
    });
    const result = await store.issueQuote({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      draftId: input.leadId,
      expectedProductId: published.productId,
      requestId: randomUUID(),
      grantToken: input.grantToken,
      content,
      contentHash,
      documentId: `document-${input.planKey}`,
      revisionId: input.revisionId,
      syncedAt: input.syncedAt ?? NOW,
      charges: [
        {
          code: 'recurring',
          label: 'Recurring charge',
          amount: { amountMinor: input.amountMinor, currency: 'CAD' },
        },
      ],
      totalAmountMinor: input.amountMinor,
      expiresAt: input.expiresAt ?? new Date(NOW.getTime() + 900_000),
    });
    return { ...published, content, contentHash, result };
  }

  test('a lease is exclusive, renewable, takeover-able at expiry and released only by its owner', async () => {
    const planKey = 'store-lease-plan';
    const ownerA = randomUUID();
    const ownerB = randomUUID();
    const ownerC = randomUUID();

    expect(await store.acquireLease(WORKSPACE, ACTOR, planKey, ownerA, NOW, 30_000)).toBe(true);
    expect(await store.acquireLease(WORKSPACE, ACTOR, planKey, ownerB, NOW, 30_000)).toBe(false);
    // The current owner may renew its own lease before it expires.
    expect(await store.acquireLease(WORKSPACE, ACTOR, planKey, ownerA, NOW, 30_000)).toBe(true);
    // Not yet expired: a different owner cannot take over.
    expect(
      await store.acquireLease(
        WORKSPACE,
        ACTOR,
        planKey,
        ownerB,
        new Date(NOW.getTime() + 29_999),
        30_000,
      ),
    ).toBe(false);
    // At expiry a different owner takes over.
    expect(
      await store.acquireLease(
        WORKSPACE,
        ACTOR,
        planKey,
        ownerB,
        new Date(NOW.getTime() + 30_000),
        30_000,
      ),
    ).toBe(true);

    const [held] = await admin<{ owner_id: string }[]>`
      select owner_id from app.catalogue_sync_leases
      where workspace_id = ${WORKSPACE} and product_key = ${planKey}
    `;
    expect(held?.owner_id).toBe(ownerB);

    // Releasing as a non-owner is a no-op; the actual owner still holds it.
    await store.releaseLease(WORKSPACE, ACTOR, planKey, ownerA);
    expect(await store.acquireLease(WORKSPACE, ACTOR, planKey, ownerC, NOW, 30_000)).toBe(false);
    // Releasing as the owner frees the lease.
    await store.releaseLease(WORKSPACE, ACTOR, planKey, ownerB);
    expect(await store.acquireLease(WORKSPACE, ACTOR, planKey, ownerC, NOW, 30_000)).toBe(true);
  });

  test('the same content hash reuses one version and a price change appends a second', async () => {
    const planKey = 'store-version-plan';
    const first = await publish(planKey, 3_500, 'revision-1');
    expect(first.createdVersion).toBe(true);

    // Re-syncing the identical commercial payload never creates a duplicate.
    const replay = await publish(planKey, 3_500, 'revision-2');
    expect(replay).toEqual({ ...first, createdVersion: false });
    expect(replay.offerVersionId).toBe(first.offerVersionId);
    expect(replay.productId).toBe(first.productId);

    const changed = await publish(planKey, 5_500, 'revision-3');
    expect(changed.createdVersion).toBe(true);
    expect(changed.productId).toBe(first.productId);
    expect(changed.offerVersionId).not.toBe(first.offerVersionId);

    // Both immutable rows exist; the first snapshot is untouched.
    const versions = await admin<{ id: string; content: { recurringChargeAmountMinor: number } }[]>`
      select id, content from app.offer_versions
      where workspace_id = ${WORKSPACE} and product_id = ${first.productId}
      order by created_at, id
    `;
    expect(versions).toHaveLength(2);
    expect(versions[0]?.id).toBe(first.offerVersionId);
    expect(versions[0]?.content.recurringChargeAmountMinor).toBe(3_500);
    expect(versions[1]?.content.recurringChargeAmountMinor).toBe(5_500);

    const [availability] = await admin<{ current_offer_version_id: string | null }[]>`
      select current_offer_version_id from app.product_availability
      where workspace_id = ${WORKSPACE} and product_id = ${first.productId}
    `;
    expect(availability?.current_offer_version_id).toBe(changed.offerVersionId);
  });

  test('the immediate withdrawal policy revokes open quotes', async () => {
    const issued = await issueQuoteFor({
      planKey: 'store-immediate-plan',
      amountMinor: 4_200,
      leadId: LEAD_IMMEDIATE,
      grantToken: GRANT_IMMEDIATE,
      revisionId: 'revision-immediate',
    });
    expect(issued.result.status).toBe('created');
    if (issued.result.status !== 'created') throw new Error('quote not created');
    const quoteId = issued.result.quote.id;

    expect(
      await store.withdrawProduct(WORKSPACE, ACTOR, 'store-immediate-plan', 'immediate', NOW),
    ).toBe(true);

    const [quote] = await admin<{ revoked_at: Date | null }[]>`
      select revoked_at from app.quotes where id = ${quoteId}
    `;
    expect(quote?.revoked_at).not.toBeNull();
    expect(await store.validateQuote(WORKSPACE, ACTOR, quoteId, LEAD_IMMEDIATE, NOW)).toEqual({
      status: 'withdrawn',
    });

    const [availability] = await admin<
      { revoked_at: Date | null; current_offer_version_id: string | null }[]
    >`
      select a.revoked_at, a.current_offer_version_id
      from app.product_availability a
      join app.products p
        on p.workspace_id = a.workspace_id and p.id = a.product_id
      where a.workspace_id = ${WORKSPACE} and p.product_key = 'store-immediate-plan'
    `;
    expect(availability?.revoked_at).not.toBeNull();
    expect(availability?.current_offer_version_id).toBeNull();
  });

  test('the honour-until-expiry policy leaves open quotes usable', async () => {
    const issued = await issueQuoteFor({
      planKey: 'store-honour-plan',
      amountMinor: 3_300,
      leadId: LEAD_HONOUR,
      grantToken: GRANT_HONOUR,
      revisionId: 'revision-honour',
    });
    expect(issued.result.status).toBe('created');
    if (issued.result.status !== 'created') throw new Error('quote not created');
    const quoteId = issued.result.quote.id;

    expect(
      await store.withdrawProduct(
        WORKSPACE,
        ACTOR,
        'store-honour-plan',
        'honour_until_expiry',
        NOW,
      ),
    ).toBe(true);

    const [quote] = await admin<{ revoked_at: Date | null }[]>`
      select revoked_at from app.quotes where id = ${quoteId}
    `;
    expect(quote?.revoked_at).toBeNull();
    expect(await store.validateQuote(WORKSPACE, ACTOR, quoteId, LEAD_HONOUR, NOW)).toEqual({
      status: 'valid',
      offerVersionId: issued.result.quote.offerVersionId,
    });
  });

  test('issuing a quote for an already-submitted lead fails without writing a quote', async () => {
    const content = commercial('store-submitted-plan', 3_000);
    const contentHash = commercialContentHash(content);
    const published = await store.persistPublished({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      content,
      contentHash,
      documentId: 'document-store-submitted-plan',
      revisionId: 'revision-submitted',
      syncedAt: NOW,
    });

    const result = await store.issueQuote({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      draftId: LEAD_SUBMITTED,
      expectedProductId: published.productId,
      requestId: randomUUID(),
      grantToken: GRANT_SUBMITTED,
      content,
      contentHash,
      documentId: 'document-store-submitted-plan',
      revisionId: 'revision-submitted',
      syncedAt: NOW,
      charges: [
        {
          code: 'recurring',
          label: 'Recurring charge',
          amount: { amountMinor: 3_000, currency: 'CAD' },
        },
      ],
      totalAmountMinor: 3_000,
      expiresAt: new Date(NOW.getTime() + 900_000),
    });
    expect(result).toEqual({ status: 'draft_invalid' });

    const quotes = await admin<{ count: number }[]>`
      select count(*)::int as count from app.quotes
      where workspace_id = ${WORKSPACE} and draft_id = ${LEAD_SUBMITTED}
    `;
    expect(quotes[0]?.count).toBe(0);
  });

  test('quote validation reports consumed, then withdrawn, then expired, then valid', async () => {
    const consumed = await issueQuoteFor({
      planKey: 'store-precedence-plan',
      amountMinor: 2_000,
      leadId: LEAD_CONSUMED,
      grantToken: GRANT_CONSUMED,
      revisionId: 'revision-consumed',
    });
    const withdrawn = await issueQuoteFor({
      planKey: 'store-precedence-plan',
      amountMinor: 2_100,
      leadId: LEAD_WITHDRAWN,
      grantToken: GRANT_WITHDRAWN,
      revisionId: 'revision-withdrawn',
    });
    const expired = await issueQuoteFor({
      planKey: 'store-precedence-plan',
      amountMinor: 2_200,
      leadId: LEAD_EXPIRED,
      grantToken: GRANT_EXPIRED,
      revisionId: 'revision-expired',
    });
    const valid = await issueQuoteFor({
      planKey: 'store-precedence-plan',
      amountMinor: 2_300,
      leadId: LEAD_VALID,
      grantToken: GRANT_VALID,
      revisionId: 'revision-valid',
    });
    for (const outcome of [consumed, withdrawn, expired, valid]) {
      expect(outcome.result.status).toBe('created');
    }
    if (
      consumed.result.status !== 'created' ||
      withdrawn.result.status !== 'created' ||
      expired.result.status !== 'created' ||
      valid.result.status !== 'created'
    ) {
      throw new Error('precedence quotes not created');
    }

    const orderId = randomUUID();
    await admin`
      insert into app.orders (
        id, workspace_id, reference, lead_id, status, payment_state, delivery_state,
        snapshot, payload, submitted_at
      ) values (
        ${orderId}, ${WORKSPACE}, 'CP-STORE-PRECEDENCE', ${LEAD_CONSUMED},
        'submitted', 'not_required', 'none', '{}'::jsonb, '{}'::jsonb, ${NOW}
      )
    `;
    const past = new Date(NOW.getTime() - 1);
    // The consumed quote is simultaneously withdrawn and expired: consumption wins.
    await admin`
      update app.quotes
      set consumed_by_order_id = ${orderId}, consumed_at = ${NOW}, revoked_at = ${NOW},
          expires_at = ${past}
      where id = ${consumed.result.quote.id}
    `;
    // Withdrawn and expired: withdrawal wins.
    await admin`
      update app.quotes
      set revoked_at = ${NOW}, expires_at = ${past}
      where id = ${withdrawn.result.quote.id}
    `;
    await admin`
      update app.quotes set expires_at = ${past} where id = ${expired.result.quote.id}
    `;

    expect(
      await store.validateQuote(WORKSPACE, ACTOR, consumed.result.quote.id, LEAD_CONSUMED, NOW),
    ).toEqual({ status: 'consumed' });
    expect(
      await store.validateQuote(WORKSPACE, ACTOR, withdrawn.result.quote.id, LEAD_WITHDRAWN, NOW),
    ).toEqual({ status: 'withdrawn' });
    expect(
      await store.validateQuote(WORKSPACE, ACTOR, expired.result.quote.id, LEAD_EXPIRED, NOW),
    ).toEqual({ status: 'expired' });
    expect(
      await store.validateQuote(WORKSPACE, ACTOR, valid.result.quote.id, LEAD_VALID, NOW),
    ).toEqual({ status: 'valid', offerVersionId: valid.result.quote.offerVersionId });
  });

  test('a foreign workspace context sees no catalogue rows or quotes', async () => {
    const issued = await issueQuoteFor({
      planKey: 'store-foreign-plan',
      amountMinor: 1_900,
      leadId: LEAD_VALID,
      grantToken: GRANT_VALID,
      revisionId: 'revision-foreign',
    });
    expect(issued.result.status).toBe('created');
    if (issued.result.status !== 'created') throw new Error('quote not created');

    const seen = await clientB.withTenantTx(
      { workspaceId: FOREIGN_WORKSPACE, actorId: FOREIGN_ACTOR },
      (tx) =>
        tx.execute<{ products: number; versions: number; quotes: number; leases: number }>(sql`
          select
            (select count(*)::int from app.products) as products,
            (select count(*)::int from app.offer_versions) as versions,
            (select count(*)::int from app.quotes) as quotes,
            (select count(*)::int from app.catalogue_sync_leases) as leases
        `),
    );
    expect(seen[0]).toEqual({ products: 0, versions: 0, quotes: 0, leases: 0 });

    expect(
      await foreignStore.validateQuote(
        FOREIGN_WORKSPACE,
        FOREIGN_ACTOR,
        issued.result.quote.id,
        LEAD_VALID,
        NOW,
      ),
    ).toEqual({ status: 'not_found' });
    expect(
      await foreignStore.prepareQuote(
        FOREIGN_WORKSPACE,
        FOREIGN_ACTOR,
        LEAD_VALID,
        issued.productId,
        GRANT_VALID,
        NOW,
      ),
    ).toEqual({ status: 'draft_invalid' });
  });
});
