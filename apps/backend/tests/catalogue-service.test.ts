import { describe, expect, it } from 'vitest';
import type { PublishedOffer, Quote } from '@canadian-plans/contracts';
import type { SanityCatalogue, SiteRevalidator } from '@canadian-plans/adapters';

import {
  CatalogueService,
  DEFAULT_MAX_EVENT_ATTEMPTS,
  type CatalogueProvider,
} from '../src/catalogue/service.js';
import type {
  AcceptedSyncEventInput,
  CatalogueStore,
  IssueQuoteInput,
  PersistPublishedInput,
  SyncEventRecord,
} from '../src/catalogue/store.js';
import type { QuoteWithdrawalPolicy } from '../src/catalogue/policy.js';
import { commercialContentHash } from '../src/catalogue/canonical.js';

const WORKSPACE = '10000000-0000-4000-8000-000000000401';
const ACTOR = '20000000-0000-4000-8000-000000000401';
/** Ingest actor stored on an event; deliberately different from `ACTOR` and the event id. */
const EVENT_ACTOR = '20000000-0000-4000-8000-000000000402';
const PRODUCT = '30000000-0000-4000-8000-000000000401';
const DRAFT = '40000000-0000-4000-8000-000000000401';
const GRANT = 'cpldg_valid-catalogue-grant-0001';

function offer(amount: number, revisionId = `rev-${amount}`): PublishedOffer {
  return {
    documentId: 'sanity-offer-1',
    revisionId,
    commercial: {
      productKey: 'rogers-sim-5gb',
      productTitle: 'Rogers SIM 5GB',
      productType: 'sim',
      offerName: 'Rogers 5GB',
      currency: 'CAD',
      recurringChargeAmountMinor: amount,
      oneTimeFees: [{ label: 'Activation', amountMinor: 1_000 }],
      amountPayableTodayMinor: amount + 1_000,
      paymentRequired: true,
      documentChecklist: ['passport'],
      eligibility: 'Synthetic eligibility',
      availability: 'Synthetic availability',
      billingParty: 'Synthetic carrier',
      contractTerms: [{ _type: 'block', children: [] }],
      termsVersion: 'test-terms-1',
      specs: { carrier: 'Synthetic', dataAllowance: '5 GB' },
    },
  };
}

class FakeProvider implements SanityCatalogue {
  current: PublishedOffer | undefined = offer(3_500);
  fail = false;
  listPublishedCalls = 0;
  fetchPublishedByDocumentIdCalls = 0;
  fetchPublishedByProductKeyCalls = 0;

  async fetchPublishedByDocumentId() {
    this.fetchPublishedByDocumentIdCalls += 1;
    if (this.fail) throw new Error('cms_outage');
    return this.current;
  }
  async fetchPublishedByProductKey() {
    this.fetchPublishedByProductKeyCalls += 1;
    if (this.fail) throw new Error('cms_outage');
    return this.current;
  }
  async listPublished() {
    this.listPublishedCalls += 1;
    if (this.fail) throw new Error('cms_outage');
    return this.current ? [this.current] : [];
  }
}

class FakeRevalidator implements SiteRevalidator {
  calls: string[] = [];
  async revalidate(productKey: string) {
    this.calls.push(productKey);
  }
}

interface StoredQuote {
  quote: Quote;
  draftId: string;
  revoked: boolean;
}

class MemoryCatalogueStore implements CatalogueStore {
  readonly events = new Map<string, SyncEventRecord>();
  readonly deliveryIds = new Map<string, string>();
  readonly versions = new Map<
    string,
    { id: string; content: PersistPublishedInput['content']; revisionId: string }
  >();
  readonly quotes = new Map<string, StoredQuote>();
  readonly leases = new Map<string, string>();
  /** Revisions recorded on the event row by `markEvent`, keyed by event id. */
  readonly eventRevisions = new Map<string, string | undefined>();
  /** Attempt count incremented by `markEvent('processing')`, keyed by event id. */
  readonly eventAttempts = new Map<string, number>();
  /** Drain ordering key; a test may overwrite it to force out-of-order rows. */
  readonly eventCreatedAt = new Map<string, Date>();
  /** Event ids in the order `processEvent` moved them to `processing`. */
  readonly processingOrder: string[] = [];
  /** Actors passed to `markEvent`, in call order. */
  readonly markEventActors: string[] = [];
  /** Actors passed to `persistPublished`, in call order. */
  readonly persistActors: string[] = [];
  /** Product keys persisted at least once; reconcile withdraws known keys absent from the CMS list. */
  readonly knownProductKeys = new Set<string>();
  /** Product keys passed to `withdrawProduct`, in call order. */
  readonly withdrawnKeys: string[] = [];
  currentVersionId: string | undefined;
  syncError: string | undefined;
  private versionCounter = 0;
  private quoteCounter = 0;

  async acceptEvent(input: AcceptedSyncEventInput) {
    const key = `${input.workspaceId}:${input.providerAccount}:${input.deliveryId}`;
    const existing = this.deliveryIds.get(key);
    if (existing) return { eventId: existing, duplicate: true };
    // Distinct deliveries get distinct event ids, so a test can enqueue two
    // revisions of one document and process them in either order.
    const eventId = `50000000-0000-4000-8000-${String(this.events.size + 1).padStart(12, '0')}`;
    this.deliveryIds.set(key, eventId);
    this.events.set(eventId, {
      id: eventId,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      selector: input.selector,
      providerAccount: input.providerAccount,
      documentId: input.documentId,
      status: 'pending',
    });
    this.eventAttempts.set(eventId, 0);
    this.eventCreatedAt.set(eventId, new Date(Date.UTC(2026, 0, 1) + this.events.size * 1_000));
    return { eventId, duplicate: false };
  }
  async getEvent(_workspaceId: string, _actorId: string, eventId: string) {
    return this.events.get(eventId);
  }
  async listDrainableEvents(
    workspaceId: string,
    _actorId: string,
    maxAttempts: number,
    limit: number,
  ) {
    return [...this.events.values()]
      .filter((event) => event.workspaceId === workspaceId)
      .filter((event) => {
        if (event.status === 'pending') return true;
        if (event.status !== 'failed') return false;
        return (this.eventAttempts.get(event.id) ?? 0) < maxAttempts;
      })
      .sort((left, right) => {
        const leftAt = this.eventCreatedAt.get(left.id)?.getTime() ?? 0;
        const rightAt = this.eventCreatedAt.get(right.id)?.getTime() ?? 0;
        if (leftAt !== rightAt) return leftAt - rightAt;
        return left.id.localeCompare(right.id);
      })
      .slice(0, limit);
  }
  async markEvent(
    _workspaceId: string,
    actorId: string,
    eventId: string,
    status: 'processing' | 'completed' | 'failed' | 'ignored',
    _errorCode?: string,
    revisionId?: string,
  ) {
    this.markEventActors.push(actorId);
    const event = this.events.get(eventId);
    if (event) this.events.set(eventId, { ...event, status });
    if (status === 'processing') {
      this.eventAttempts.set(eventId, (this.eventAttempts.get(eventId) ?? 0) + 1);
      this.processingOrder.push(eventId);
    }
    this.eventRevisions.set(eventId, revisionId);
  }
  async productKeyByDocumentId() {
    return this.versions.size > 0 ? 'rogers-sim-5gb' : undefined;
  }
  async listProductKeys() {
    return [...this.knownProductKeys];
  }
  async acquireLease(_workspaceId: string, _actorId: string, productKey: string, ownerId: string) {
    if (this.leases.has(productKey)) return false;
    this.leases.set(productKey, ownerId);
    return true;
  }
  async releaseLease(_workspaceId: string, _actorId: string, productKey: string, ownerId: string) {
    if (this.leases.get(productKey) === ownerId) this.leases.delete(productKey);
  }
  async persistPublished(input: PersistPublishedInput) {
    this.persistActors.push(input.actorId);
    this.knownProductKeys.add(input.content.productKey);
    let stored = this.versions.get(input.contentHash);
    const createdVersion = stored === undefined;
    if (!stored) {
      stored = {
        id: `60000000-0000-4000-8000-${String(++this.versionCounter).padStart(12, '0')}`,
        content: input.content,
        revisionId: input.revisionId,
      };
      this.versions.set(input.contentHash, stored);
    }
    this.currentVersionId = stored.id;
    return { productId: PRODUCT, offerVersionId: stored.id, createdVersion };
  }
  async withdrawProduct(
    _workspaceId: string,
    _actorId: string,
    productKey: string,
    policy: QuoteWithdrawalPolicy,
  ) {
    this.withdrawnKeys.push(productKey);
    this.currentVersionId = undefined;
    if (policy === 'immediate') {
      for (const stored of this.quotes.values()) stored.revoked = true;
    }
    return true;
  }
  async recordSyncResult(
    _workspaceId: string,
    _actorId: string,
    _attemptedAt: Date,
    errorCode?: string,
  ) {
    this.syncError = errorCode;
  }
  async prepareQuote(
    _workspaceId: string,
    _actorId: string,
    _draftId: string,
    productId: string,
    grantToken: string,
  ) {
    if (grantToken !== GRANT) return { status: 'draft_invalid' } as const;
    if (productId !== PRODUCT) return { status: 'product_not_found' } as const;
    return { status: 'ready', productKey: 'rogers-sim-5gb' } as const;
  }
  async issueQuote(input: IssueQuoteInput) {
    const persisted = await this.persistPublished(input);
    const id = `70000000-0000-4000-8000-${String(++this.quoteCounter).padStart(12, '0')}`;
    const quote: Quote = {
      id,
      workspaceId: input.workspaceId,
      productId: PRODUCT,
      offerVersionId: persisted.offerVersionId,
      currency: input.content.currency,
      charges: [...input.charges],
      total: { amountMinor: input.totalAmountMinor, currency: input.content.currency },
      amountPayableToday: {
        amountMinor: input.content.amountPayableTodayMinor,
        currency: input.content.currency,
      },
      paymentRequired: input.content.paymentRequired,
      documentChecklist: input.content.documentChecklist,
      termsVersion: input.content.termsVersion,
      createdAt: input.syncedAt.toISOString(),
      expiresAt: input.expiresAt.toISOString(),
    };
    this.quotes.set(id, { quote, draftId: input.draftId, revoked: false });
    return { status: 'created', quote } as const;
  }
  async validateQuote(
    _workspaceId: string,
    _actorId: string,
    quoteId: string,
    draftId: string,
    now: Date,
  ) {
    const stored = this.quotes.get(quoteId);
    if (!stored || stored.draftId !== draftId) return { status: 'not_found' } as const;
    if (stored.revoked) return { status: 'withdrawn' } as const;
    if (Date.parse(stored.quote.expiresAt) <= now.getTime()) return { status: 'expired' } as const;
    return { status: 'valid', offerVersionId: stored.quote.offerVersionId } as const;
  }
  async catalogueStatus(_workspaceId: string, _actorId: string, requestId: string) {
    return {
      sync: { lastAttemptAt: null, lastSuccessAt: null, lastErrorCode: this.syncError ?? null },
      offers: [],
      errors: [],
      requestId,
    };
  }
}

function harness(policy: QuoteWithdrawalPolicy = 'immediate') {
  const store = new MemoryCatalogueStore();
  const sanity = new FakeProvider();
  const revalidator = new FakeRevalidator();
  let now = new Date('2026-09-16T00:00:00.000Z');
  const provider: CatalogueProvider = {
    account: 'project-site-1',
    catalogue: sanity,
    revalidator,
  };
  const service = new CatalogueService(
    store,
    () => provider,
    policy,
    () => new Date(now),
  );
  return { store, sanity, revalidator, service, setNow: (value: Date) => (now = value) };
}

async function issue(service: CatalogueService) {
  return service.createQuote({
    workspaceId: WORKSPACE,
    actorId: ACTOR,
    draftId: DRAFT,
    productId: PRODUCT,
    grantToken: GRANT,
    requestId: '90000000-0000-4000-8000-000000000401',
  });
}

async function enqueue(store: MemoryCatalogueStore, deliveryId = 'delivery-1') {
  return store.acceptEvent({
    workspaceId: WORKSPACE,
    actorId: EVENT_ACTOR,
    selector: 'sanity-site-1',
    providerAccount: 'project-site-1',
    deliveryId,
    documentId: 'sanity-offer-1',
    payload: { documentId: 'sanity-offer-1' },
  });
}

describe('catalogue sync and quote consistency', () => {
  it('deduplicates delivery IDs and out-of-order processing converges on the current document', async () => {
    const { store, sanity, service } = harness();
    const first = await enqueue(store);
    const duplicate = await enqueue(store);
    expect(duplicate).toEqual({ eventId: first.eventId, duplicate: true });

    sanity.current = offer(5_000, 'newest');
    await service.processEvent(WORKSPACE, first.eventId);
    await service.processEvent(WORKSPACE, first.eventId);

    expect(store.versions.size).toBe(1);
    expect(store.versions.has(commercialContentHash(offer(5_000).commercial))).toBe(true);
    expect(store.events.get(first.eventId)?.status).toBe('completed');
  });

  it('attributes the sync writes to the persisted ingest actor, not the event id', async () => {
    const { store, sanity, service } = harness();
    sanity.current = offer(5_000, 'attribution');
    const event = await enqueue(store, 'delivery-attribution');

    await service.processEvent(WORKSPACE, event.eventId);

    expect(store.persistActors.length).toBeGreaterThan(0);
    expect(store.persistActors).toEqual(store.persistActors.map(() => EVENT_ACTOR));
    expect(store.markEventActors).toEqual(store.markEventActors.map(() => EVENT_ACTOR));
    // Neither the event id nor the drain actor leaks into a sync write.
    expect(store.persistActors).not.toContain(event.eventId);
    expect(store.persistActors).not.toContain(ACTOR);
  });

  it('converges on the current CMS document when two revisions are processed in reverse order', async () => {
    const { store, sanity, service } = harness();
    // Two distinct deliveries for two revisions of the same document.
    const olderDelivery = await enqueue(store, 'delivery-r1');
    const newerDelivery = await enqueue(store, 'delivery-r2');
    expect(olderDelivery.eventId).not.toBe(newerDelivery.eventId);
    expect(store.events.size).toBe(2);

    // The provider's published state has already advanced to r2 by the time
    // either delivery is processed; the r2 event is handled *first*.
    sanity.current = offer(7_500, 'r2');
    await service.processEvent(WORKSPACE, newerDelivery.eventId);
    // Then the older r1 delivery arrives late.
    await service.processEvent(WORKSPACE, olderDelivery.eventId);

    // Both inbox rows converge on the current published revision, and the
    // late older delivery never resurrects its superseded snapshot.
    expect(store.eventRevisions.get(newerDelivery.eventId)).toBe('r2');
    expect(store.eventRevisions.get(olderDelivery.eventId)).toBe('r2');
    expect(store.events.get(newerDelivery.eventId)?.status).toBe('completed');
    expect(store.events.get(olderDelivery.eventId)?.status).toBe('completed');
    expect(store.versions.size).toBe(1);
    const only = [...store.versions.values()][0];
    expect(only?.revisionId).toBe('r2');
    expect(only?.content.recurringChargeAmountMinor).toBe(7_500);
    expect(store.currentVersionId).toBe(only?.id);
  });

  it('stays withdrawn when an unpublish is followed by a stale publish delivery', async () => {
    const { store, sanity, service } = harness();
    // The document is published, then unpublished, then a stale publish
    // delivery for that now-withdrawn document is processed.
    sanity.current = offer(3_500, 'r1');
    const published = await enqueue(store, 'delivery-publish-r1');
    await service.processEvent(WORKSPACE, published.eventId);
    expect(store.currentVersionId).toBeDefined();
    expect(store.versions.size).toBe(1);

    sanity.current = undefined;
    const unpublished = await enqueue(store, 'delivery-unpublish');
    await service.processEvent(WORKSPACE, unpublished.eventId);
    expect(store.currentVersionId).toBeUndefined();

    const stalePublish = await enqueue(store, 'delivery-stale-publish');
    await service.processEvent(WORKSPACE, stalePublish.eventId);

    // The stale publish must not re-publish: nothing is current and no
    // replacement version is written.
    expect(store.currentVersionId).toBeUndefined();
    expect(store.versions.size).toBe(1);
    expect(store.events.get(stalePublish.eventId)?.status).toBe('completed');
  });

  it('keeps quote fields and immutable version content exact across a webhook race', async () => {
    const { store, sanity, service } = harness();
    sanity.current = offer(4_200, 'race-revision');
    const quoted = await issue(service);
    expect(quoted.status).toBe('created');
    if (quoted.status !== 'created') return;

    const event = await enqueue(store, 'late-old-webhook');
    await service.processEvent(WORKSPACE, event.eventId);

    const version = [...store.versions.values()].find(
      (item) => item.id === quoted.quote.offerVersionId,
    );
    expect(version?.content.recurringChargeAmountMinor).toBe(4_200);
    expect(quoted.quote.charges[0]?.amount.amountMinor).toBe(4_200);
  });

  it.each([
    ['immediate', 'withdrawn'],
    ['honour_until_expiry', 'valid'],
  ] as const)(
    'applies the %s TEST withdrawal policy to existing quotes',
    async (policy, expected) => {
      const { store, sanity, service } = harness(policy);
      const quoted = await issue(service);
      expect(quoted.status).toBe('created');
      if (quoted.status !== 'created') return;
      const event = await enqueue(store);
      sanity.current = undefined;
      await service.processEvent(WORKSPACE, event.eventId);
      expect((await service.validateQuote(WORKSPACE, ACTOR, quoted.quote.id, DRAFT)).status).toBe(
        expected,
      );
    },
  );

  it('rejects an expired quote', async () => {
    const { service, setNow } = harness('honour_until_expiry');
    const quoted = await issue(service);
    expect(quoted.status).toBe('created');
    if (quoted.status !== 'created') return;
    setNow(new Date('2026-09-16T00:16:00.000Z'));
    expect((await service.validateQuote(WORKSPACE, ACTOR, quoted.quote.id, DRAFT)).status).toBe(
      'expired',
    );
  });

  it('returns the unpriced-lead outcome during a CMS outage', async () => {
    const { sanity, service } = harness();
    sanity.fail = true;
    expect(await issue(service)).toEqual({ status: 'cms_unavailable' });
  });

  it('keeps historical offer versions when the price changes', async () => {
    const { store, sanity, service } = harness();
    const first = await issue(service);
    expect(first.status).toBe('created');
    sanity.current = offer(5_500);
    const second = await issue(service);
    expect(second.status).toBe('created');
    expect(store.versions.size).toBe(2);
    expect(
      [...store.versions.values()].map((item) => item.content.recurringChargeAmountMinor),
    ).toEqual([3_500, 5_500]);
  });

  it('reconciliation repairs a missed webhook and revalidates the storefront', async () => {
    const { store, revalidator, service } = harness();
    await service.reconcile(WORKSPACE, ACTOR);
    expect(store.versions.size).toBe(1);
    expect(revalidator.calls).toEqual(['rogers-sim-5gb']);
  });

  it('reconciles from one published snapshot with no per-product CMS re-fetch', async () => {
    const { store, sanity, revalidator, service } = harness();
    // A product the store already knows, but which the current list omits,
    // must be withdrawn by the same pass.
    const legacy = offer(1_200, 'legacy-rev');
    legacy.commercial.productKey = 'legacy-sim';
    await store.persistPublished({
      workspaceId: WORKSPACE,
      actorId: ACTOR,
      content: legacy.commercial,
      contentHash: commercialContentHash(legacy.commercial),
      documentId: legacy.documentId,
      revisionId: legacy.revisionId,
      syncedAt: new Date('2026-09-15T00:00:00.000Z'),
    });
    sanity.current = offer(3_500, 'current-rev');

    await service.reconcile(WORKSPACE, ACTOR);

    // The single authoritative snapshot replaces the old N+1 per-product read.
    expect(sanity.listPublishedCalls).toBe(1);
    expect(sanity.fetchPublishedByDocumentIdCalls).toBe(0);
    expect(sanity.fetchPublishedByProductKeyCalls).toBe(0);
    // Listed content is persisted, and the known-but-absent product withdrawn.
    expect(store.versions.has(commercialContentHash(offer(3_500).commercial))).toBe(true);
    expect(store.withdrawnKeys).toEqual(['legacy-sim']);
    expect(revalidator.calls).toEqual(['rogers-sim-5gb', 'legacy-sim']);
  });

  it('drains pending and retry-eligible failed events in createdAt order', async () => {
    const { store, service } = harness();
    const retryable = await enqueue(store, 'delivery-retryable');
    const pending = await enqueue(store, 'delivery-pending');
    const exhausted = await enqueue(store, 'delivery-exhausted');
    await store.markEvent(WORKSPACE, ACTOR, retryable.eventId, 'failed');
    await store.markEvent(WORKSPACE, ACTOR, exhausted.eventId, 'failed');
    store.eventAttempts.set(retryable.eventId, DEFAULT_MAX_EVENT_ATTEMPTS - 1);
    store.eventAttempts.set(exhausted.eventId, DEFAULT_MAX_EVENT_ATTEMPTS);
    // Force a createdAt order different from insertion order so the assertion
    // fails unless the drain actually honours the deterministic ordering.
    store.eventCreatedAt.set(retryable.eventId, new Date('2026-01-02T00:00:00.000Z'));
    store.eventCreatedAt.set(pending.eventId, new Date('2026-01-01T00:00:00.000Z'));
    store.eventCreatedAt.set(exhausted.eventId, new Date('2026-01-03T00:00:00.000Z'));

    const result = await service.drainEvents(WORKSPACE, ACTOR);

    // The failed event at the attempt bound is excluded, so only two are listed.
    expect(result).toEqual({ listed: 2, processed: 2, failed: 0, failures: [] });
    expect(store.processingOrder).toEqual([pending.eventId, retryable.eventId]);
    expect(store.events.get(pending.eventId)?.status).toBe('completed');
    expect(store.events.get(retryable.eventId)?.status).toBe('completed');
    expect(store.events.get(exhausted.eventId)?.status).toBe('failed');
  });

  it('records a failing event and keeps draining the remaining backlog', async () => {
    const { store, service } = harness();
    const first = await enqueue(store, 'delivery-fails');
    const second = await enqueue(store, 'delivery-succeeds');
    const failing = store.events.get(first.eventId);
    if (!failing) throw new Error('missing event');
    // A provider-account mismatch makes exactly this event fail inside
    // processEvent without needing a CMS outage for the whole drain.
    store.events.set(first.eventId, { ...failing, providerAccount: 'project-other' });

    const result = await service.drainEvents(WORKSPACE, ACTOR);

    expect(result.listed).toBe(2);
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failures).toEqual([{ eventId: first.eventId, errorCode: 'provider_mismatch' }]);
    expect(store.processingOrder).toEqual([first.eventId, second.eventId]);
    expect(store.events.get(first.eventId)?.status).toBe('failed');
    expect(store.events.get(second.eventId)?.status).toBe('completed');
  });

  it('bounds a drain pass to the requested limit', async () => {
    const { store, service } = harness();
    await enqueue(store, 'delivery-1');
    await enqueue(store, 'delivery-2');

    const result = await service.drainEvents(WORKSPACE, ACTOR, 1);

    expect(result.listed).toBe(1);
    expect(result.processed).toBe(1);
    expect(store.processingOrder).toHaveLength(1);
  });
});
