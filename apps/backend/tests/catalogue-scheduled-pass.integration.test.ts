import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { createDatabaseClient, type DatabaseClient } from '@canadian-plans/db';
import { applyMigrations } from '@canadian-plans/db/migrations';
import type { PublishedOffer } from '@canadian-plans/contracts';
import type { SanityCatalogue, SiteRevalidator } from '@canadian-plans/adapters';

import { DatabaseCatalogueStore } from '../src/catalogue/store.js';
import { CatalogueService, type CatalogueProvider } from '../src/catalogue/service.js';
import { CatalogueSyncRunner } from '../src/catalogue/runner.js';

function disposableDatabaseUrl(): string | undefined {
  const url = process.env.TEST_MIGRATION_DATABASE_URL;
  const enabled = process.env.DB_TEST_ALLOW_DESTRUCTIVE === '1';
  if (!url && !enabled) return undefined;
  if (!url || !enabled) throw new Error('Both disposable database test settings are required.');
  if (!decodeURIComponent(new URL(url).pathname).endsWith('_test')) {
    throw new Error('The disposable database name must end in _test.');
  }
  return url;
}

const databaseUrl = disposableDatabaseUrl();
const databaseDescribe = databaseUrl ? describe : describe.skip;

/** Narrows the optional URL for use inside the suite body. */
function requireDatabaseUrl(): string {
  if (!databaseUrl) throw new Error('disposable database URL missing');
  return databaseUrl;
}

const WORKSPACE_DUPLICATE = '10000000-0000-4000-8000-000000000801';
const WORKSPACE_OUT_OF_ORDER = '10000000-0000-4000-8000-000000000802';
const WORKSPACE_MISSING = '10000000-0000-4000-8000-000000000803';
const INGEST_ACTOR = '20000000-0000-4000-8000-000000000804';
const SCHEDULER_ACTOR = '20000000-0000-4000-8000-000000000805';
const PROVIDER_ACCOUNT = 'project-scheduled-pass';

const DUPLICATE_DOCUMENT = 'sanity-scheduled-duplicate';
const OUT_OF_ORDER_DOCUMENT = 'sanity-scheduled-order';
const MISSING_DOCUMENT = 'sanity-scheduled-missing';

function offer(
  productKey: string,
  documentId: string,
  amountMinor: number,
  revisionId: string,
): PublishedOffer {
  return {
    documentId,
    revisionId,
    commercial: {
      productKey,
      productTitle: 'Scheduled Pass Plan',
      productType: 'sim',
      offerName: 'Scheduled 10 GB',
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
    },
  };
}

/** Catalogue double whose published set a test can set directly. */
class ControllableCatalogue implements SanityCatalogue {
  published: PublishedOffer[] = [];
  async fetchPublishedByDocumentId(documentId: string) {
    return this.published.find((candidate) => candidate.documentId === documentId);
  }
  async fetchPublishedByProductKey(productKey: string) {
    return this.published.find((candidate) => candidate.commercial.productKey === productKey);
  }
  async listPublished() {
    return [...this.published];
  }
}

const revalidator: SiteRevalidator = { revalidate: async () => undefined };

databaseDescribe('scheduled catalogue pass (drain + reconcile)', () => {
  let admin: ReturnType<typeof postgres>;
  let database: DatabaseClient;
  let store: DatabaseCatalogueStore;
  let service: CatalogueService;
  let catalogues: Map<string, ControllableCatalogue>;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('disposable database URL missing');
    await applyMigrations({ connectionString: databaseUrl, ssl: false });
    admin = postgres(databaseUrl, { max: 1, prepare: false, ssl: false });
    const workspaces: [string, string][] = [
      [WORKSPACE_DUPLICATE, 'scheduled-pass-duplicate'],
      [WORKSPACE_OUT_OF_ORDER, 'scheduled-pass-order'],
      [WORKSPACE_MISSING, 'scheduled-pass-missing'],
    ];
    for (const [id, slug] of workspaces) {
      await admin`
        insert into app.workspaces (id, slug, name)
        values (${id}, ${slug}, ${slug})
        on conflict (id) do nothing
      `;
    }
  });

  beforeEach(() => {
    const runtimeUrl = new URL(requireDatabaseUrl());
    runtimeUrl.username = 'app_runtime';
    runtimeUrl.password = 'local_ci_runtime_password';
    database = createDatabaseClient({ connectionString: runtimeUrl.toString(), ssl: false });
    store = new DatabaseCatalogueStore(database);
    catalogues = new Map();
    service = new CatalogueService(
      store,
      (workspaceId): CatalogueProvider | undefined => {
        const catalogue = catalogues.get(workspaceId);
        if (!catalogue) return undefined;
        return { account: PROVIDER_ACCOUNT, catalogue, revalidator };
      },
      'immediate',
    );
  });

  afterAll(async () => {
    await database?.close();
    await admin.end();
  });

  function runner(): CatalogueSyncRunner {
    return new CatalogueSyncRunner({ handlers: service });
  }

  async function accept(
    workspaceId: string,
    documentId: string,
    deliveryId: string,
  ): Promise<string> {
    const accepted = await store.acceptEvent({
      workspaceId,
      actorId: INGEST_ACTOR,
      selector: 'site-1-sanity',
      providerAccount: PROVIDER_ACCOUNT,
      deliveryId,
      documentId,
      payload: { documentId },
    });
    return accepted.eventId;
  }

  async function setCreatedAt(workspaceId: string, eventId: string, createdAt: Date) {
    await admin`
      update app.catalogue_sync_events
      set created_at = ${createdAt}
      where workspace_id = ${workspaceId} and id = ${eventId}
    `;
  }

  async function versionCount(workspaceId: string, documentId: string): Promise<string> {
    const rows = await admin<{ count: string }[]>`
      select count(*)::text as count from app.offer_versions
      where workspace_id = ${workspaceId} and cms_document_id = ${documentId}
    `;
    return rows[0]?.count ?? '0';
  }

  async function availability(workspaceId: string, productKey: string) {
    const rows = await admin<
      {
        cms_revision_id: string | null;
        content: { recurringChargeAmountMinor: number };
        revoked_at: Date | null;
      }[]
    >`
      select v.cms_revision_id, v.content, a.revoked_at
      from app.product_availability a
      left join app.offer_versions v
        on v.workspace_id = a.workspace_id and v.id = a.current_offer_version_id
      join app.products p on p.workspace_id = a.workspace_id and p.id = a.product_id
      where a.workspace_id = ${workspaceId} and p.product_key = ${productKey}
    `;
    return rows[0];
  }

  test('a duplicate delivery is ingested once and drained once', async () => {
    const catalogue = new ControllableCatalogue();
    catalogue.published = [offer('scheduled-duplicate-plan', DUPLICATE_DOCUMENT, 5_000, 'r1')];
    catalogues.set(WORKSPACE_DUPLICATE, catalogue);

    const deliveryId = 'delivery-duplicate-801';
    const accepted = await store.acceptEvent({
      workspaceId: WORKSPACE_DUPLICATE,
      actorId: INGEST_ACTOR,
      selector: 'site-1-sanity',
      providerAccount: PROVIDER_ACCOUNT,
      deliveryId,
      documentId: DUPLICATE_DOCUMENT,
      payload: { documentId: DUPLICATE_DOCUMENT },
    });
    const replay = await store.acceptEvent({
      workspaceId: WORKSPACE_DUPLICATE,
      actorId: INGEST_ACTOR,
      selector: 'site-1-sanity',
      providerAccount: PROVIDER_ACCOUNT,
      deliveryId,
      documentId: DUPLICATE_DOCUMENT,
      payload: { documentId: DUPLICATE_DOCUMENT },
    });
    expect(accepted.duplicate).toBe(false);
    expect(replay).toEqual({ eventId: accepted.eventId, duplicate: true });

    const summary = await runner().run({
      authorizedWorkspaceIds: [WORKSPACE_DUPLICATE],
      actorId: SCHEDULER_ACTOR,
    });
    expect(summary.listed).toBe(1);
    expect(summary.processed).toBe(1);
    expect(summary.drainFailed).toBe(0);
    expect(summary.reconciled).toBe(1);
    expect(summary.failures).toEqual([]);

    // One version only: the replay and the reconciling pass both converge.
    expect(await versionCount(WORKSPACE_DUPLICATE, DUPLICATE_DOCUMENT)).toBe('1');
    const state = await availability(WORKSPACE_DUPLICATE, 'scheduled-duplicate-plan');
    expect(state?.cms_revision_id).toBe('r1');
    expect(state?.revoked_at).toBeNull();
  });

  test('an older delivery drained after a newer one converges on the newer revision', async () => {
    const catalogue = new ControllableCatalogue();
    catalogue.published = [offer('scheduled-order-plan', OUT_OF_ORDER_DOCUMENT, 7_500, 'r2')];
    catalogues.set(WORKSPACE_OUT_OF_ORDER, catalogue);

    const newer = await accept(WORKSPACE_OUT_OF_ORDER, OUT_OF_ORDER_DOCUMENT, 'delivery-order-r2');
    const older = await accept(WORKSPACE_OUT_OF_ORDER, OUT_OF_ORDER_DOCUMENT, 'delivery-order-r1');
    // Force the drain order newest-first so the stale r1 delivery is processed
    // after the r2 delivery that already advanced the offer.
    await setCreatedAt(WORKSPACE_OUT_OF_ORDER, newer, new Date('2026-09-16T00:00:00Z'));
    await setCreatedAt(WORKSPACE_OUT_OF_ORDER, older, new Date('2026-09-16T00:05:00Z'));

    const summary = await runner().run({
      authorizedWorkspaceIds: [WORKSPACE_OUT_OF_ORDER],
      actorId: SCHEDULER_ACTOR,
    });
    expect(summary.processed).toBe(2);
    expect(summary.drainFailed).toBe(0);

    const state = await availability(WORKSPACE_OUT_OF_ORDER, 'scheduled-order-plan');
    expect(state?.cms_revision_id).toBe('r2');
    expect(state?.content.recurringChargeAmountMinor).toBe(7_500);
    // The late stale delivery never persisted a superseded snapshot.
    expect(await versionCount(WORKSPACE_OUT_OF_ORDER, OUT_OF_ORDER_DOCUMENT)).toBe('1');

    const events = await admin<{ status: string; cms_revision_id: string | null }[]>`
      select status, cms_revision_id from app.catalogue_sync_events
      where workspace_id = ${WORKSPACE_OUT_OF_ORDER}
      order by created_at
    `;
    expect(events.map((event) => event.status)).toEqual(['completed', 'completed']);
    expect(events.map((event) => event.cms_revision_id)).toEqual(['r2', 'r2']);
  });

  test('a published product whose webhook never arrived is created by reconciliation', async () => {
    const catalogue = new ControllableCatalogue();
    catalogue.published = [offer('scheduled-missing-plan', MISSING_DOCUMENT, 4_200, 'r1')];
    catalogues.set(WORKSPACE_MISSING, catalogue);

    // No inbox event exists for this workspace at all: the only path to the
    // published state is the reconciliation half of the scheduled pass.
    const summary = await runner().run({
      authorizedWorkspaceIds: [WORKSPACE_MISSING],
      actorId: SCHEDULER_ACTOR,
    });
    expect(summary.listed).toBe(0);
    expect(summary.processed).toBe(0);
    expect(summary.reconciled).toBe(1);
    expect(summary.failures).toEqual([]);

    const state = await availability(WORKSPACE_MISSING, 'scheduled-missing-plan');
    expect(state?.cms_revision_id).toBe('r1');
    expect(state?.content.recurringChargeAmountMinor).toBe(4_200);
    expect(state?.revoked_at).toBeNull();
    expect(await versionCount(WORKSPACE_MISSING, MISSING_DOCUMENT)).toBe('1');
  });
});
