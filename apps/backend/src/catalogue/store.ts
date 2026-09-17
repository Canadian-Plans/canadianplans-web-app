import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import {
  catalogueSyncEvents,
  catalogueSyncLeases,
  catalogueSyncState,
  auditEvents,
  draftGrants,
  leads,
  offerVersions,
  productAvailability,
  products,
  quotes,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import {
  catalogueStatusResponseSchema,
  chargeComponentSchema,
  commercialOfferSchema,
  quoteSchema,
  type CatalogueStatusResponse,
  type ChargeComponent,
  type CommercialOffer,
  type Quote,
} from '@canadian-plans/contracts';

import { hashDraftGrantToken } from '../leads/token.js';
import type { QuoteWithdrawalPolicy } from './policy.js';

type CatalogueDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: CatalogueDatabase = { withTenantTx };

export interface AcceptedSyncEventInput {
  workspaceId: string;
  /** Verified machine actor that ingested the delivery; drives every later drain write. */
  actorId: string;
  selector: string;
  providerAccount: string;
  deliveryId: string;
  documentId: string;
  payload: Record<string, unknown>;
  occurredAt?: Date;
}

export interface SyncEventRecord {
  id: string;
  workspaceId: string;
  /** Persisted ingest actor, reused by `processEvent` so drain attribution is stable. */
  actorId: string;
  selector: string;
  providerAccount: string;
  documentId: string;
  status: string;
}

export interface PersistPublishedInput {
  workspaceId: string;
  actorId: string;
  content: CommercialOffer;
  contentHash: string;
  documentId: string;
  revisionId: string;
  syncedAt: Date;
}

export interface PersistPublishedResult {
  productId: string;
  offerVersionId: string;
  createdVersion: boolean;
}

export type PrepareQuoteResult =
  | { status: 'ready'; productKey: string }
  | { status: 'draft_invalid' }
  | { status: 'draft_expired' }
  | { status: 'product_not_found' };

export interface IssueQuoteInput extends PersistPublishedInput {
  draftId: string;
  expectedProductId: string;
  requestId: string;
  grantToken: string;
  charges: readonly ChargeComponent[];
  totalAmountMinor: number;
  expiresAt: Date;
}

export type IssueQuoteResult =
  | { status: 'created'; quote: Quote }
  | { status: 'draft_invalid' }
  | { status: 'draft_expired' }
  | { status: 'product_not_found' };

export type QuoteUseResult =
  | { status: 'valid'; offerVersionId: string }
  | { status: 'not_found' | 'expired' | 'withdrawn' | 'consumed' };

function toQuote(row: typeof quotes.$inferSelect): Quote {
  const charges = chargeComponentSchema.array().parse(row.charges);
  return quoteSchema.parse({
    id: row.id,
    workspaceId: row.workspaceId,
    productId: row.productId,
    offerVersionId: row.offerVersionId,
    currency: row.currency,
    charges,
    total: { amountMinor: row.totalAmountMinor, currency: row.currency },
    amountPayableToday: {
      amountMinor: row.amountPayableTodayMinor,
      currency: row.currency,
    },
    paymentRequired: row.paymentRequired,
    documentChecklist: row.documentChecklist,
    termsVersion: row.termsVersion,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  });
}

async function selectVersion(
  tx: TenantTransaction,
  workspaceId: string,
  productId: string,
  contentHash: string,
) {
  const [row] = await tx
    .select({ id: offerVersions.id })
    .from(offerVersions)
    .where(
      and(
        eq(offerVersions.workspaceId, workspaceId),
        eq(offerVersions.productId, productId),
        eq(offerVersions.contentHash, contentHash),
      ),
    )
    .limit(1);
  if (!row) throw new Error('offer_version_upsert_failed');
  return row.id;
}

async function persistPublishedInTransaction(
  tx: TenantTransaction,
  input: PersistPublishedInput,
): Promise<PersistPublishedResult> {
  const insertedProducts = await tx
    .insert(products)
    .values({ workspaceId: input.workspaceId, productKey: input.content.productKey })
    .onConflictDoNothing({ target: [products.workspaceId, products.productKey] })
    .returning({ id: products.id });
  const [existingProduct] = await tx
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.workspaceId, input.workspaceId),
        eq(products.productKey, input.content.productKey),
      ),
    )
    .limit(1);
  const productId = insertedProducts[0]?.id ?? existingProduct?.id;
  if (!productId) throw new Error('product_upsert_failed');

  const insertedVersions = await tx
    .insert(offerVersions)
    .values({
      workspaceId: input.workspaceId,
      productId,
      content: input.content,
      contentHash: input.contentHash,
      cmsDocumentId: input.documentId,
      cmsRevisionId: input.revisionId,
    })
    .onConflictDoNothing({
      target: [offerVersions.workspaceId, offerVersions.productId, offerVersions.contentHash],
    })
    .returning({ id: offerVersions.id });
  const offerVersionId =
    insertedVersions[0]?.id ??
    (await selectVersion(tx, input.workspaceId, productId, input.contentHash));

  await tx
    .insert(productAvailability)
    .values({
      workspaceId: input.workspaceId,
      productId,
      currentOfferVersionId: offerVersionId,
      revokedAt: null,
      lastSyncedAt: input.syncedAt,
    })
    .onConflictDoUpdate({
      target: productAvailability.productId,
      set: {
        currentOfferVersionId: offerVersionId,
        revokedAt: null,
        lastSyncedAt: input.syncedAt,
      },
    });

  return { productId, offerVersionId, createdVersion: insertedVersions.length === 1 };
}

async function grantState(
  tx: TenantTransaction,
  workspaceId: string,
  draftId: string,
  grantToken: string,
  now: Date,
): Promise<'valid' | 'invalid' | 'expired'> {
  const [grant] = await tx
    .select({ expiresAt: draftGrants.expiresAt, revokedAt: draftGrants.revokedAt })
    .from(draftGrants)
    .innerJoin(
      leads,
      and(eq(leads.workspaceId, draftGrants.workspaceId), eq(leads.id, draftGrants.leadId)),
    )
    .where(
      and(
        eq(draftGrants.workspaceId, workspaceId),
        eq(draftGrants.leadId, draftId),
        eq(draftGrants.tokenHash, hashDraftGrantToken(grantToken)),
        eq(leads.status, 'incomplete'),
      ),
    )
    .limit(1);
  if (!grant) return 'invalid';
  if (grant.revokedAt !== null || grant.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'valid';
}

export interface CatalogueStore {
  acceptEvent(input: AcceptedSyncEventInput): Promise<{ eventId: string; duplicate: boolean }>;
  getEvent(
    workspaceId: string,
    actorId: string,
    eventId: string,
  ): Promise<SyncEventRecord | undefined>;
  /**
   * Bounded drain selection for one workspace: pending events plus failed events
   * whose `attempts` is still below `maxAttempts`, ordered by `createdAt` then
   * `id`. `processing` rows are intentionally excluded so an in-flight event is
   * not picked up twice by a second drain.
   */
  listDrainableEvents(
    workspaceId: string,
    actorId: string,
    maxAttempts: number,
    limit: number,
  ): Promise<readonly SyncEventRecord[]>;
  markEvent(
    workspaceId: string,
    actorId: string,
    eventId: string,
    status: 'processing' | 'completed' | 'failed' | 'ignored',
    errorCode?: string,
    revisionId?: string,
  ): Promise<void>;
  productKeyByDocumentId(
    workspaceId: string,
    actorId: string,
    documentId: string,
  ): Promise<string | undefined>;
  listProductKeys(workspaceId: string, actorId: string): Promise<readonly string[]>;
  acquireLease(
    workspaceId: string,
    actorId: string,
    productKey: string,
    ownerId: string,
    now: Date,
    ttlMs: number,
  ): Promise<boolean>;
  releaseLease(
    workspaceId: string,
    actorId: string,
    productKey: string,
    ownerId: string,
  ): Promise<void>;
  persistPublished(input: PersistPublishedInput): Promise<PersistPublishedResult>;
  withdrawProduct(
    workspaceId: string,
    actorId: string,
    productKey: string,
    policy: QuoteWithdrawalPolicy,
    now: Date,
  ): Promise<boolean>;
  recordSyncResult(
    workspaceId: string,
    actorId: string,
    attemptedAt: Date,
    errorCode?: string,
  ): Promise<void>;
  prepareQuote(
    workspaceId: string,
    actorId: string,
    draftId: string,
    productId: string,
    grantToken: string,
    now: Date,
  ): Promise<PrepareQuoteResult>;
  issueQuote(input: IssueQuoteInput): Promise<IssueQuoteResult>;
  validateQuote(
    workspaceId: string,
    actorId: string,
    quoteId: string,
    draftId: string,
    now: Date,
  ): Promise<QuoteUseResult>;
  catalogueStatus(
    workspaceId: string,
    actorId: string,
    requestId: string,
  ): Promise<CatalogueStatusResponse>;
}

export class DatabaseCatalogueStore implements CatalogueStore {
  constructor(private readonly database: CatalogueDatabase = defaultDatabase) {}

  async acceptEvent(input: AcceptedSyncEventInput) {
    // The row id is random; the tenant actor is the verified machine identity
    // passed in, never the event id or a random UUID.
    const eventId = randomUUID();
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const inserted = await tx
          .insert(catalogueSyncEvents)
          .values({ id: eventId, ...input })
          .onConflictDoNothing({
            target: [
              catalogueSyncEvents.workspaceId,
              catalogueSyncEvents.providerAccount,
              catalogueSyncEvents.deliveryId,
            ],
          })
          .returning({ id: catalogueSyncEvents.id });
        if (inserted[0]) return { eventId: inserted[0].id, duplicate: false };
        const [existing] = await tx
          .select({ id: catalogueSyncEvents.id })
          .from(catalogueSyncEvents)
          .where(
            and(
              eq(catalogueSyncEvents.workspaceId, input.workspaceId),
              eq(catalogueSyncEvents.providerAccount, input.providerAccount),
              eq(catalogueSyncEvents.deliveryId, input.deliveryId),
            ),
          )
          .limit(1);
        if (!existing) throw new Error('catalogue_event_dedupe_failed');
        return { eventId: existing.id, duplicate: true };
      },
    );
  }

  async getEvent(workspaceId: string, actorId: string, eventId: string) {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const [event] = await tx
        .select({
          id: catalogueSyncEvents.id,
          workspaceId: catalogueSyncEvents.workspaceId,
          actorId: catalogueSyncEvents.actorId,
          selector: catalogueSyncEvents.selector,
          providerAccount: catalogueSyncEvents.providerAccount,
          documentId: catalogueSyncEvents.documentId,
          status: catalogueSyncEvents.status,
        })
        .from(catalogueSyncEvents)
        .where(
          and(
            eq(catalogueSyncEvents.workspaceId, workspaceId),
            eq(catalogueSyncEvents.id, eventId),
          ),
        )
        .limit(1);
      return event;
    });
  }

  async listDrainableEvents(
    workspaceId: string,
    actorId: string,
    maxAttempts: number,
    limit: number,
  ): Promise<readonly SyncEventRecord[]> {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      // Bounded, deterministic selection for a single drain pass. The
      // (workspace_id, status, created_at) index backs the ordered scan.
      const rows = await tx
        .select({
          id: catalogueSyncEvents.id,
          workspaceId: catalogueSyncEvents.workspaceId,
          actorId: catalogueSyncEvents.actorId,
          selector: catalogueSyncEvents.selector,
          providerAccount: catalogueSyncEvents.providerAccount,
          documentId: catalogueSyncEvents.documentId,
          status: catalogueSyncEvents.status,
        })
        .from(catalogueSyncEvents)
        .where(
          and(
            eq(catalogueSyncEvents.workspaceId, workspaceId),
            or(
              eq(catalogueSyncEvents.status, 'pending'),
              and(
                eq(catalogueSyncEvents.status, 'failed'),
                lt(catalogueSyncEvents.attempts, maxAttempts),
              ),
            ),
          ),
        )
        .orderBy(catalogueSyncEvents.createdAt, catalogueSyncEvents.id)
        .limit(limit);
      return rows;
    });
  }

  async markEvent(
    workspaceId: string,
    actorId: string,
    eventId: string,
    status: 'processing' | 'completed' | 'failed' | 'ignored',
    errorCode?: string,
    revisionId?: string,
  ) {
    await this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      await tx
        .update(catalogueSyncEvents)
        .set({
          status,
          attempts:
            status === 'processing'
              ? sql`${catalogueSyncEvents.attempts} + 1`
              : catalogueSyncEvents.attempts,
          errorCode: errorCode ?? null,
          cmsRevisionId: revisionId,
          processedAt: status === 'completed' || status === 'ignored' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(catalogueSyncEvents.workspaceId, workspaceId),
            eq(catalogueSyncEvents.id, eventId),
          ),
        );
    });
  }

  async productKeyByDocumentId(workspaceId: string, actorId: string, documentId: string) {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const [row] = await tx
        .select({ productKey: products.productKey })
        .from(offerVersions)
        .innerJoin(
          products,
          and(
            eq(products.workspaceId, offerVersions.workspaceId),
            eq(products.id, offerVersions.productId),
          ),
        )
        .where(
          and(
            eq(offerVersions.workspaceId, workspaceId),
            eq(offerVersions.cmsDocumentId, documentId),
          ),
        )
        .orderBy(desc(offerVersions.createdAt))
        .limit(1);
      return row?.productKey;
    });
  }

  async listProductKeys(workspaceId: string, actorId: string) {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const rows = await tx
        .select({ productKey: products.productKey })
        .from(products)
        .where(eq(products.workspaceId, workspaceId));
      return rows.map((row) => row.productKey);
    });
  }

  async acquireLease(
    workspaceId: string,
    actorId: string,
    productKey: string,
    ownerId: string,
    now: Date,
    ttlMs: number,
  ) {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      // A `Date` interpolated straight into a raw fragment reaches the driver
      // unencoded and fails to bind, so timestamps are passed as ISO strings.
      const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
      const nowIso = now.toISOString();
      const rows = await tx.execute<{ ownerId: string }>(sql`
        insert into app.catalogue_sync_leases (
          workspace_id, product_key, owner_id, expires_at, created_at, updated_at
        ) values (
          ${workspaceId}, ${productKey}, ${ownerId}, ${expiresAt}, ${nowIso}, ${nowIso}
        )
        on conflict (workspace_id, product_key) do update
          set owner_id = excluded.owner_id,
              expires_at = excluded.expires_at,
              updated_at = excluded.updated_at
          where app.catalogue_sync_leases.expires_at <= ${nowIso}
             or app.catalogue_sync_leases.owner_id = ${ownerId}
        returning owner_id as "ownerId"
      `);
      return rows[0]?.ownerId === ownerId;
    });
  }

  async releaseLease(workspaceId: string, actorId: string, productKey: string, ownerId: string) {
    await this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      await tx
        .delete(catalogueSyncLeases)
        .where(
          and(
            eq(catalogueSyncLeases.workspaceId, workspaceId),
            eq(catalogueSyncLeases.productKey, productKey),
            eq(catalogueSyncLeases.ownerId, ownerId),
          ),
        );
    });
  }

  async persistPublished(input: PersistPublishedInput) {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      (tx) => persistPublishedInTransaction(tx, input),
    );
  }

  async withdrawProduct(
    workspaceId: string,
    actorId: string,
    productKey: string,
    policy: QuoteWithdrawalPolicy,
    now: Date,
  ) {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const [product] = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.workspaceId, workspaceId), eq(products.productKey, productKey)))
        .limit(1);
      if (!product) return false;
      await tx
        .insert(productAvailability)
        .values({
          workspaceId,
          productId: product.id,
          currentOfferVersionId: null,
          revokedAt: now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: productAvailability.productId,
          set: { currentOfferVersionId: null, revokedAt: now, lastSyncedAt: now },
        });
      if (policy === 'immediate') {
        await tx
          .update(quotes)
          .set({ revokedAt: now, updatedAt: now })
          .where(
            and(
              eq(quotes.workspaceId, workspaceId),
              eq(quotes.productId, product.id),
              isNull(quotes.revokedAt),
            ),
          );
      }
      return true;
    });
  }

  async recordSyncResult(
    workspaceId: string,
    actorId: string,
    attemptedAt: Date,
    errorCode?: string,
  ) {
    await this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      await tx
        .insert(catalogueSyncState)
        .values({
          workspaceId,
          lastAttemptAt: attemptedAt,
          lastSuccessAt: errorCode ? null : attemptedAt,
          lastErrorCode: errorCode ?? null,
          updatedAt: attemptedAt,
        })
        .onConflictDoUpdate({
          target: catalogueSyncState.workspaceId,
          set: {
            lastAttemptAt: attemptedAt,
            ...(errorCode ? {} : { lastSuccessAt: attemptedAt }),
            lastErrorCode: errorCode ?? null,
            updatedAt: attemptedAt,
          },
        });
    });
  }

  async prepareQuote(
    workspaceId: string,
    actorId: string,
    draftId: string,
    productId: string,
    grantToken: string,
    now: Date,
  ): Promise<PrepareQuoteResult> {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const state = await grantState(tx, workspaceId, draftId, grantToken, now);
      if (state === 'invalid') return { status: 'draft_invalid' };
      if (state === 'expired') return { status: 'draft_expired' };
      const [product] = await tx
        .select({ productKey: products.productKey })
        .from(products)
        .where(and(eq(products.workspaceId, workspaceId), eq(products.id, productId)))
        .limit(1);
      return product
        ? { status: 'ready', productKey: product.productKey }
        : { status: 'product_not_found' };
    });
  }

  async issueQuote(input: IssueQuoteInput): Promise<IssueQuoteResult> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const state = await grantState(
          tx,
          input.workspaceId,
          input.draftId,
          input.grantToken,
          input.syncedAt,
        );
        if (state === 'invalid') return { status: 'draft_invalid' };
        if (state === 'expired') return { status: 'draft_expired' };
        const persisted = await persistPublishedInTransaction(tx, input);
        if (persisted.productId !== input.expectedProductId) {
          return { status: 'product_not_found' };
        }
        const [row] = await tx
          .insert(quotes)
          .values({
            workspaceId: input.workspaceId,
            draftId: input.draftId,
            productId: persisted.productId,
            offerVersionId: persisted.offerVersionId,
            currency: input.content.currency,
            charges: input.charges,
            totalAmountMinor: input.totalAmountMinor,
            amountPayableTodayMinor: input.content.amountPayableTodayMinor,
            paymentRequired: input.content.paymentRequired,
            documentChecklist: input.content.documentChecklist,
            termsVersion: input.content.termsVersion,
            expiresAt: input.expiresAt,
          })
          .returning();
        if (!row) throw new Error('quote_insert_failed');
        await tx.insert(auditEvents).values({
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          actorLabel: 'website credential',
          action: 'quote.created',
          entity: 'quote',
          entityId: row.id,
          requestId: input.requestId,
          after: {
            draftId: input.draftId,
            productId: persisted.productId,
            offerVersionId: persisted.offerVersionId,
            termsVersion: input.content.termsVersion,
            expiresAt: input.expiresAt.toISOString(),
          },
        });
        return { status: 'created', quote: toQuote(row) };
      },
    );
  }

  async validateQuote(
    workspaceId: string,
    actorId: string,
    quoteId: string,
    draftId: string,
    now: Date,
  ): Promise<QuoteUseResult> {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const [row] = await tx
        .select({
          offerVersionId: quotes.offerVersionId,
          expiresAt: quotes.expiresAt,
          revokedAt: quotes.revokedAt,
          consumedByOrderId: quotes.consumedByOrderId,
        })
        .from(quotes)
        .where(
          and(
            eq(quotes.workspaceId, workspaceId),
            eq(quotes.id, quoteId),
            eq(quotes.draftId, draftId),
          ),
        )
        .limit(1);
      if (!row) return { status: 'not_found' };
      if (row.consumedByOrderId !== null) return { status: 'consumed' };
      if (row.revokedAt !== null) return { status: 'withdrawn' };
      if (row.expiresAt.getTime() <= now.getTime()) return { status: 'expired' };
      return { status: 'valid', offerVersionId: row.offerVersionId };
    });
  }

  async catalogueStatus(workspaceId: string, actorId: string, requestId: string) {
    return this.database.withTenantTx({ workspaceId, actorId }, async (tx) => {
      const [state] = await tx
        .select()
        .from(catalogueSyncState)
        .where(eq(catalogueSyncState.workspaceId, workspaceId))
        .limit(1);
      const offerRows = await tx
        .select({
          productId: products.id,
          productKey: products.productKey,
          revokedAt: productAvailability.revokedAt,
          offerVersionId: productAvailability.currentOfferVersionId,
          lastSyncedAt: productAvailability.lastSyncedAt,
          content: offerVersions.content,
          contentHash: offerVersions.contentHash,
          cmsRevisionId: offerVersions.cmsRevisionId,
        })
        .from(products)
        .leftJoin(
          productAvailability,
          and(
            eq(productAvailability.workspaceId, products.workspaceId),
            eq(productAvailability.productId, products.id),
          ),
        )
        .leftJoin(
          offerVersions,
          and(
            eq(offerVersions.workspaceId, productAvailability.workspaceId),
            eq(offerVersions.id, productAvailability.currentOfferVersionId),
          ),
        )
        .where(eq(products.workspaceId, workspaceId))
        .orderBy(products.productKey);
      const errorRows = await tx
        .select({
          eventId: catalogueSyncEvents.id,
          documentId: catalogueSyncEvents.documentId,
          errorCode: catalogueSyncEvents.errorCode,
          occurredAt: catalogueSyncEvents.updatedAt,
        })
        .from(catalogueSyncEvents)
        .where(
          and(
            eq(catalogueSyncEvents.workspaceId, workspaceId),
            isNotNull(catalogueSyncEvents.errorCode),
          ),
        )
        .orderBy(desc(catalogueSyncEvents.updatedAt))
        .limit(10);

      return catalogueStatusResponseSchema.parse({
        sync: {
          lastAttemptAt: state?.lastAttemptAt?.toISOString() ?? null,
          lastSuccessAt: state?.lastSuccessAt?.toISOString() ?? null,
          lastErrorCode: state?.lastErrorCode ?? null,
        },
        offers: offerRows.map((row) => {
          const content = row.content ? commercialOfferSchema.safeParse(row.content) : undefined;
          return {
            productId: row.productId,
            productKey: row.productKey,
            available: row.offerVersionId !== null && row.revokedAt === null,
            offerVersionId: row.offerVersionId,
            contentHash: row.contentHash,
            offerName: content?.success ? content.data.offerName : null,
            currency: content?.success ? content.data.currency : null,
            cmsRevisionId: row.cmsRevisionId,
            lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
          };
        }),
        errors: errorRows.map((row) => ({
          eventId: row.eventId,
          documentId: row.documentId,
          errorCode: row.errorCode,
          occurredAt: row.occurredAt.toISOString(),
        })),
        requestId,
      });
    });
  }
}
