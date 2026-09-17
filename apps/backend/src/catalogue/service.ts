import { randomUUID } from 'node:crypto';
import {
  HttpSiteRevalidator,
  SanityCatalogueAdapter,
  type SanityCatalogue,
  type SiteRevalidator,
} from '@canadian-plans/adapters';
import type { ChargeComponent, Quote } from '@canadian-plans/contracts';

import { MachineRegistry } from '../machines/registry.js';
import { commercialContentHash } from './canonical.js';
import type { QuoteWithdrawalPolicy } from './policy.js';
import type { CatalogueStore, PrepareQuoteResult, QuoteUseResult } from './store.js';

const DEFAULT_QUOTE_TTL_MS = 15 * 60 * 1_000;
const DEFAULT_LEASE_TTL_MS = 30 * 1_000;
const DEFAULT_DRAIN_LIMIT = 25;
/** A failed event is drained again only while its attempt count is below this bound. */
export const DEFAULT_MAX_EVENT_ATTEMPTS = 5;

export interface DrainEventsFailure {
  eventId: string;
  errorCode: string;
}

export interface DrainEventsResult {
  listed: number;
  processed: number;
  failed: number;
  failures: readonly DrainEventsFailure[];
}

export interface CatalogueProvider {
  account: string;
  catalogue: SanityCatalogue;
  revalidator: SiteRevalidator;
}

export type CatalogueProviderResolver = (workspaceId: string) => CatalogueProvider | undefined;

export function providerResolverFromRegistry(registry: MachineRegistry): CatalogueProviderResolver {
  return (workspaceId) => {
    const integration = registry.sanityForWorkspace(workspaceId);
    if (!integration) return undefined;
    return {
      account: integration.providerAccount,
      catalogue: new SanityCatalogueAdapter({
        projectId: integration.projectId,
        dataset: integration.dataset,
        apiVersion: integration.apiVersion,
        readToken: integration.readToken,
      }),
      revalidator: new HttpSiteRevalidator(integration.revalidateUrl, integration.revalidateSecret),
    };
  };
}

export type CreateQuoteOutcome =
  | { status: 'created'; quote: Quote }
  | {
      status:
        | 'checkout_disabled'
        | 'cms_unavailable'
        | 'offer_unavailable'
        | 'draft_invalid'
        | 'draft_expired'
        | 'product_not_found'
        | 'lease_busy';
    };

export interface CreateQuoteInput {
  workspaceId: string;
  actorId: string;
  draftId: string;
  productId: string;
  grantToken: string;
  requestId: string;
}

function chargeComponents(
  currency: string,
  recurringChargeAmountMinor: number,
  oneTimeFees: readonly { label: string; amountMinor: number }[],
): ChargeComponent[] {
  return [
    {
      code: 'recurring',
      label: 'Recurring charge',
      amount: { amountMinor: recurringChargeAmountMinor, currency },
    },
    ...oneTimeFees.map((fee, index) => ({
      code: `one_time_${index + 1}`,
      label: fee.label,
      amount: { amountMinor: fee.amountMinor, currency },
    })),
  ];
}

function totalOf(charges: readonly ChargeComponent[]): number {
  const total = charges.reduce((sum, charge) => sum + charge.amount.amountMinor, 0);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('invalid_charge_total');
  return total;
}

function safeFailureCode(error: unknown, fallback: string): string {
  if (error instanceof Error && /^[a-z][a-z0-9_]{0,63}$/.test(error.message)) {
    return error.message;
  }
  return fallback;
}

export class CatalogueService {
  constructor(
    private readonly store: CatalogueStore,
    private readonly resolveProvider: CatalogueProviderResolver,
    private readonly withdrawalPolicy: QuoteWithdrawalPolicy,
    private readonly now: () => Date = () => new Date(),
    private readonly quoteTtlMs = DEFAULT_QUOTE_TTL_MS,
    private readonly leaseTtlMs = DEFAULT_LEASE_TTL_MS,
  ) {}

  async createQuote(input: CreateQuoteInput): Promise<CreateQuoteOutcome> {
    if (this.withdrawalPolicy === 'unresolved') return { status: 'checkout_disabled' };
    const provider = this.resolveProvider(input.workspaceId);
    if (!provider) return { status: 'cms_unavailable' };

    const startedAt = this.now();
    const prepared: PrepareQuoteResult = await this.store.prepareQuote(
      input.workspaceId,
      input.actorId,
      input.draftId,
      input.productId,
      input.grantToken,
      startedAt,
    );
    if (prepared.status !== 'ready') return prepared;

    const ownerId = randomUUID();
    const leased = await this.store.acquireLease(
      input.workspaceId,
      input.actorId,
      prepared.productKey,
      ownerId,
      startedAt,
      this.leaseTtlMs,
    );
    if (!leased) return { status: 'lease_busy' };

    try {
      // This authoritative read is deliberately after lease acquisition and
      // outside any DB transaction, so quote/version content cannot diverge.
      let published;
      try {
        published = await provider.catalogue.fetchPublishedByProductKey(prepared.productKey);
      } catch {
        return { status: 'cms_unavailable' };
      }
      if (!published) {
        await this.store.withdrawProduct(
          input.workspaceId,
          input.actorId,
          prepared.productKey,
          this.withdrawalPolicy,
          this.now(),
        );
        return { status: 'offer_unavailable' };
      }

      const issuedAt = this.now();
      const charges = chargeComponents(
        published.commercial.currency,
        published.commercial.recurringChargeAmountMinor,
        published.commercial.oneTimeFees,
      );
      const outcome = await this.store.issueQuote({
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        draftId: input.draftId,
        expectedProductId: input.productId,
        requestId: input.requestId,
        grantToken: input.grantToken,
        content: published.commercial,
        contentHash: commercialContentHash(published.commercial),
        documentId: published.documentId,
        revisionId: published.revisionId,
        syncedAt: issuedAt,
        charges,
        totalAmountMinor: totalOf(charges),
        expiresAt: new Date(issuedAt.getTime() + this.quoteTtlMs),
      });
      return outcome;
    } finally {
      await this.store.releaseLease(input.workspaceId, input.actorId, prepared.productKey, ownerId);
    }
  }

  /** Manual T10 handler. T10B registers this same idempotent handler with the scheduler. */
  async processEvent(workspaceId: string, eventId: string): Promise<void> {
    // The inbox row is read with the event id only as the non-null RLS read
    // token; every write below uses the ingest actor persisted on the event, so
    // a later drain keeps the original machine attribution (never a random UUID
    // and never the event id).
    const event = await this.store.getEvent(workspaceId, eventId, eventId);
    if (!event || event.status === 'completed' || event.status === 'ignored') return;
    const actorId = event.actorId;
    await this.store.markEvent(workspaceId, actorId, eventId, 'processing');
    const attemptedAt = this.now();
    let productKey: string | undefined;
    let ownerId: string | undefined;
    try {
      const provider = this.resolveProvider(workspaceId);
      if (!provider || provider.account !== event.providerAccount)
        throw new Error('provider_mismatch');

      const initial = await provider.catalogue.fetchPublishedByDocumentId(event.documentId);
      productKey =
        initial?.commercial.productKey ??
        (await this.store.productKeyByDocumentId(workspaceId, actorId, event.documentId));
      if (!productKey) {
        await this.store.markEvent(workspaceId, actorId, eventId, 'ignored');
        await this.store.recordSyncResult(workspaceId, actorId, attemptedAt);
        return;
      }

      ownerId = randomUUID();
      const leased = await this.store.acquireLease(
        workspaceId,
        actorId,
        productKey,
        ownerId,
        this.now(),
        this.leaseTtlMs,
      );
      if (!leased) throw new Error('lease_busy');

      // Re-fetch after taking the lease. An older event can never overwrite a
      // newer published state merely because its provider delivery arrived late.
      const current = await provider.catalogue.fetchPublishedByDocumentId(event.documentId);
      if (!current) {
        await this.store.withdrawProduct(
          workspaceId,
          actorId,
          productKey,
          this.withdrawalPolicy,
          this.now(),
        );
        await provider.revalidator.revalidate(productKey);
        await this.store.markEvent(workspaceId, actorId, eventId, 'completed');
      } else {
        if (current.commercial.productKey !== productKey) throw new Error('product_key_changed');
        await this.store.persistPublished({
          workspaceId,
          actorId,
          content: current.commercial,
          contentHash: commercialContentHash(current.commercial),
          documentId: current.documentId,
          revisionId: current.revisionId,
          syncedAt: this.now(),
        });
        await provider.revalidator.revalidate(productKey);
        await this.store.markEvent(
          workspaceId,
          actorId,
          eventId,
          'completed',
          undefined,
          current.revisionId,
        );
      }
      await this.store.recordSyncResult(workspaceId, actorId, attemptedAt);
    } catch (error) {
      const errorCode = safeFailureCode(error, 'sync_failed');
      await this.store.markEvent(workspaceId, actorId, eventId, 'failed', errorCode);
      await this.store.recordSyncResult(workspaceId, actorId, attemptedAt, errorCode);
      throw new Error(errorCode);
    } finally {
      if (productKey && ownerId) {
        await this.store.releaseLease(workspaceId, actorId, productKey, ownerId);
      }
    }
  }

  /**
   * Drains a bounded batch of drainable inbox events — pending ones plus failed
   * ones still below the attempt bound — by calling {@link processEvent} for each
   * in order. A failing event is recorded and skipped so one poison delivery
   * cannot block the queue, which matches how a scheduler must run unattended.
   * The `actorId` argument scopes the listing read; each event's sync writes use
   * the actor persisted at ingest, so a drain never re-attributes an event.
   * T10B schedules this together with `reconcile` under the existing
   * `reconcile:run` machine scope.
   */
  async drainEvents(
    workspaceId: string,
    actorId: string,
    limit = DEFAULT_DRAIN_LIMIT,
  ): Promise<DrainEventsResult> {
    const events = await this.store.listDrainableEvents(
      workspaceId,
      actorId,
      DEFAULT_MAX_EVENT_ATTEMPTS,
      limit,
    );
    const failures: DrainEventsFailure[] = [];
    let processed = 0;
    for (const event of events) {
      try {
        await this.processEvent(workspaceId, event.id);
        processed += 1;
      } catch (error) {
        failures.push({ eventId: event.id, errorCode: safeFailureCode(error, 'drain_failed') });
      }
    }
    return { listed: events.length, processed, failed: failures.length, failures };
  }

  /**
   * Manual reconciliation. Missing webhook deliveries converge to this published
   * snapshot. `listPublished()` is the authoritative read for the whole pass and
   * is called exactly once; the per-product post-lease re-fetch belongs to
   * {@link processEvent} (ADR 0003), where a late webhook must not overwrite a
   * newer published state. The caller supplies a registry-backed scheduler
   * `actorId` — this method never invents one.
   */
  async reconcile(workspaceId: string, actorId: string): Promise<void> {
    const attemptedAt = this.now();
    try {
      const provider = this.resolveProvider(workspaceId);
      if (!provider) throw new Error('provider_unavailable');
      const published = await provider.catalogue.listPublished();
      const byProduct = new Map<string, (typeof published)[number]>();
      for (const offer of published) {
        if (byProduct.has(offer.commercial.productKey)) throw new Error('ambiguous_product');
        byProduct.set(offer.commercial.productKey, offer);
      }

      for (const [productKey, offer] of byProduct) {
        const ownerId = randomUUID();
        const leased = await this.store.acquireLease(
          workspaceId,
          actorId,
          productKey,
          ownerId,
          this.now(),
          this.leaseTtlMs,
        );
        if (!leased) continue;
        try {
          // Persist the listed snapshot itself; reconcile does no second CMS
          // read for the same product.
          await this.store.persistPublished({
            workspaceId,
            actorId,
            content: offer.commercial,
            contentHash: commercialContentHash(offer.commercial),
            documentId: offer.documentId,
            revisionId: offer.revisionId,
            syncedAt: this.now(),
          });
          await provider.revalidator.revalidate(productKey);
        } finally {
          await this.store.releaseLease(workspaceId, actorId, productKey, ownerId);
        }
      }

      const known = await this.store.listProductKeys(workspaceId, actorId);
      for (const productKey of known) {
        if (!byProduct.has(productKey)) {
          const ownerId = randomUUID();
          const leased = await this.store.acquireLease(
            workspaceId,
            actorId,
            productKey,
            ownerId,
            this.now(),
            this.leaseTtlMs,
          );
          if (!leased) continue;
          try {
            await this.store.withdrawProduct(
              workspaceId,
              actorId,
              productKey,
              this.withdrawalPolicy,
              this.now(),
            );
            await provider.revalidator.revalidate(productKey);
          } finally {
            await this.store.releaseLease(workspaceId, actorId, productKey, ownerId);
          }
        }
      }
      await this.store.recordSyncResult(workspaceId, actorId, attemptedAt);
    } catch (error) {
      const errorCode = safeFailureCode(error, 'reconcile_failed');
      await this.store.recordSyncResult(workspaceId, actorId, attemptedAt, errorCode);
      throw new Error(errorCode);
    }
  }

  validateQuote(
    workspaceId: string,
    actorId: string,
    quoteId: string,
    draftId: string,
  ): Promise<QuoteUseResult> {
    return this.store.validateQuote(workspaceId, actorId, quoteId, draftId, this.now());
  }
}
