import { and, eq, isNull } from 'drizzle-orm';
import {
  auditEvents,
  draftGrants,
  idempotencyKeys,
  leads,
  offerVersions,
  orders,
  orderStatusHistory,
  outboxJobs,
  quotes,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import {
  chargeComponentSchema,
  commercialOfferSchema,
  orderSnapshotSchema,
  orderSummarySchema,
  type OrderSnapshot,
  type OrderSummary,
  type SubmitOrderRequest,
} from '@canadian-plans/contracts';

import { hashDraftGrantToken } from '../leads/token.js';

type OrderDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: OrderDatabase = { withTenantTx };

export interface SubmitOrderStoreInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  grantToken: string;
  keyHash: string;
  requestFingerprint: string;
  reference: string;
  body: SubmitOrderRequest;
  now: Date;
}

export type SubmitOrderStoreResult =
  | { status: 'created' | 'existing'; order: OrderSummary }
  | {
      status:
        | 'idempotency_conflict'
        | 'draft_invalid'
        | 'draft_expired'
        | 'quote_not_found'
        | 'quote_expired'
        | 'quote_withdrawn'
        | 'quote_consumed'
        | 'terms_version_unsupported'
        | 'draft_already_submitted'
        | 'reference_collision';
    };

function constraintName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('constraint_name' in error && typeof error.constraint_name === 'string') {
    return error.constraint_name;
  }
  if ('constraint' in error && typeof error.constraint === 'string') return error.constraint;
  if ('cause' in error) return constraintName(error.cause);
  return undefined;
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && error.code === '23505') return true;
  return 'cause' in error && isUniqueViolation(error.cause);
}

function summary(row: typeof orders.$inferSelect): OrderSummary {
  const snapshot = orderSnapshotSchema.parse(row.snapshot);
  return orderSummarySchema.parse({
    id: row.id,
    workspaceId: row.workspaceId,
    reference: row.reference,
    fulfilmentStatus: row.status,
    paymentState: row.paymentState,
    deliveryState: row.deliveryState,
    archiveState: row.archivedAt ? 'archived' : 'active',
    total: snapshot.total,
    amountPayableToday: snapshot.amountPayableToday,
    recordVersion: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

async function loadOrder(
  tx: TenantTransaction,
  workspaceId: string,
  orderId: string,
): Promise<OrderSummary> {
  const [row] = await tx
    .select()
    .from(orders)
    .where(and(eq(orders.workspaceId, workspaceId), eq(orders.id, orderId)))
    .limit(1);
  if (!row) throw new Error('completed_idempotency_order_missing');
  return summary(row);
}

async function grantForLead(
  tx: TenantTransaction,
  workspaceId: string,
  leadId: string,
  grantToken: string,
) {
  const [row] = await tx
    .select({
      expiresAt: draftGrants.expiresAt,
      revokedAt: draftGrants.revokedAt,
      leadStatus: leads.status,
    })
    .from(draftGrants)
    .innerJoin(
      leads,
      and(eq(leads.workspaceId, draftGrants.workspaceId), eq(leads.id, draftGrants.leadId)),
    )
    .where(
      and(
        eq(draftGrants.workspaceId, workspaceId),
        eq(draftGrants.leadId, leadId),
        eq(draftGrants.tokenHash, hashDraftGrantToken(grantToken)),
      ),
    )
    .limit(1);
  return row;
}

async function existingOutcome(
  tx: TenantTransaction,
  input: SubmitOrderStoreInput,
  row: typeof idempotencyKeys.$inferSelect,
): Promise<SubmitOrderStoreResult> {
  const grant = await grantForLead(tx, input.workspaceId, row.leadId, input.grantToken);
  if (!grant || grant.revokedAt !== null) return { status: 'draft_invalid' };
  if (row.requestFingerprint !== input.requestFingerprint) {
    return { status: 'idempotency_conflict' };
  }
  if (row.status !== 'completed' || !row.orderId || !row.responseReference) {
    throw new Error('incomplete_idempotency_claim');
  }
  const order = await loadOrder(tx, input.workspaceId, row.orderId);
  if (order.reference !== row.responseReference) throw new Error('idempotency_outcome_mismatch');
  return { status: 'existing', order };
}

async function submitInTransaction(
  tx: TenantTransaction,
  input: SubmitOrderStoreInput,
): Promise<SubmitOrderStoreResult> {
  const [prior] = await tx
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.workspaceId, input.workspaceId),
        eq(idempotencyKeys.scope, 'order_submission'),
        eq(idempotencyKeys.keyHash, input.keyHash),
      ),
    )
    .limit(1);
  if (prior) return existingOutcome(tx, input, prior);

  const [quote] = await tx
    .select({
      id: quotes.id,
      draftId: quotes.draftId,
      productId: quotes.productId,
      offerVersionId: quotes.offerVersionId,
      currency: quotes.currency,
      charges: quotes.charges,
      totalAmountMinor: quotes.totalAmountMinor,
      amountPayableTodayMinor: quotes.amountPayableTodayMinor,
      paymentRequired: quotes.paymentRequired,
      documentChecklist: quotes.documentChecklist,
      termsVersion: quotes.termsVersion,
      expiresAt: quotes.expiresAt,
      revokedAt: quotes.revokedAt,
      consumedByOrderId: quotes.consumedByOrderId,
      offerContent: offerVersions.content,
      partnerId: leads.partnerId,
    })
    .from(quotes)
    .innerJoin(
      offerVersions,
      and(
        eq(offerVersions.workspaceId, quotes.workspaceId),
        eq(offerVersions.id, quotes.offerVersionId),
      ),
    )
    .innerJoin(leads, and(eq(leads.workspaceId, quotes.workspaceId), eq(leads.id, quotes.draftId)))
    .where(and(eq(quotes.workspaceId, input.workspaceId), eq(quotes.id, input.body.quoteId)))
    .limit(1)
    .for('update');
  if (!quote) return { status: 'quote_not_found' };

  // A concurrent request with this key may have committed while this request
  // waited on the quote row lock. Resolve that stored outcome before looking
  // at the now-consumed quote.
  const [concurrentWinner] = await tx
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.workspaceId, input.workspaceId),
        eq(idempotencyKeys.scope, 'order_submission'),
        eq(idempotencyKeys.keyHash, input.keyHash),
      ),
    )
    .limit(1);
  if (concurrentWinner) return existingOutcome(tx, input, concurrentWinner);

  const grant = await grantForLead(tx, input.workspaceId, quote.draftId, input.grantToken);
  if (!grant) return { status: 'draft_invalid' };
  if (grant.revokedAt !== null || grant.expiresAt.getTime() <= input.now.getTime()) {
    return { status: 'draft_expired' };
  }
  if (grant.leadStatus !== 'incomplete') return { status: 'draft_already_submitted' };
  if (quote.consumedByOrderId !== null) return { status: 'quote_consumed' };
  if (quote.revokedAt !== null) return { status: 'quote_withdrawn' };
  if (quote.expiresAt.getTime() <= input.now.getTime()) return { status: 'quote_expired' };
  if (
    quote.termsVersion !== input.body.termsVersion ||
    quote.termsVersion !== input.body.consent.termsVersion
  ) {
    return { status: 'terms_version_unsupported' };
  }

  const claimed = await tx
    .insert(idempotencyKeys)
    .values({
      workspaceId: input.workspaceId,
      scope: 'order_submission',
      keyHash: input.keyHash,
      requestFingerprint: input.requestFingerprint,
      leadId: quote.draftId,
    })
    .onConflictDoNothing({
      target: [idempotencyKeys.workspaceId, idempotencyKeys.scope, idempotencyKeys.keyHash],
    })
    .returning({ id: idempotencyKeys.id });

  if (!claimed[0]) {
    const [winner] = await tx
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.workspaceId, input.workspaceId),
          eq(idempotencyKeys.scope, 'order_submission'),
          eq(idempotencyKeys.keyHash, input.keyHash),
        ),
      )
      .limit(1);
    if (!winner) throw new Error('idempotency_claim_missing');
    return existingOutcome(tx, input, winner);
  }

  const charges = chargeComponentSchema.array().parse(quote.charges);
  const offer = commercialOfferSchema.parse(quote.offerContent);
  const snapshot: OrderSnapshot = orderSnapshotSchema.parse({
    quoteId: quote.id,
    productId: quote.productId,
    offerVersionId: quote.offerVersionId,
    offer,
    currency: quote.currency,
    charges,
    total: { amountMinor: quote.totalAmountMinor, currency: quote.currency },
    amountPayableToday: {
      amountMinor: quote.amountPayableTodayMinor,
      currency: quote.currency,
    },
    paymentRequired: quote.paymentRequired,
    documentChecklist: quote.documentChecklist,
    termsVersion: quote.termsVersion,
  });

  const [order] = await tx
    .insert(orders)
    .values({
      workspaceId: input.workspaceId,
      reference: input.reference,
      leadId: quote.draftId,
      status: 'submitted',
      paymentState: quote.paymentRequired ? 'pending' : 'not_required',
      deliveryState: 'none',
      snapshot,
      payload: input.body.form,
      consent: input.body.consent,
      partnerId: quote.partnerId,
      submittedAt: input.now,
      updatedAt: input.now,
    })
    .returning();
  if (!order) throw new Error('order_insert_failed');

  const consumed = await tx
    .update(quotes)
    .set({ consumedByOrderId: order.id, consumedAt: input.now, updatedAt: input.now })
    .where(
      and(
        eq(quotes.workspaceId, input.workspaceId),
        eq(quotes.id, quote.id),
        isNull(quotes.consumedByOrderId),
      ),
    )
    .returning({ id: quotes.id });
  if (!consumed[0]) throw new Error('quote_consumption_race');

  const submittedLead = await tx
    .update(leads)
    .set({
      status: 'submitted',
      selectedOfferVersionId: quote.offerVersionId,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(leads.workspaceId, input.workspaceId),
        eq(leads.id, quote.draftId),
        eq(leads.status, 'incomplete'),
      ),
    )
    .returning({ id: leads.id });
  if (!submittedLead[0]) throw new Error('lead_submission_race');

  await tx.insert(orderStatusHistory).values({
    workspaceId: input.workspaceId,
    orderId: order.id,
    actorId: input.actorId,
    fromStatus: null,
    toStatus: 'submitted',
    orderVersion: order.version,
    reason: 'order_submitted',
  });
  await tx.insert(outboxJobs).values([
    {
      workspaceId: input.workspaceId,
      jobType: 'order_acknowledgement_email',
      dedupeKey: order.id,
      payload: { orderId: order.id, reference: order.reference },
      availableAt: input.now,
      updatedAt: input.now,
    },
    {
      workspaceId: input.workspaceId,
      jobType: 'analytics_order_submitted',
      dedupeKey: order.id,
      payload: { orderId: order.id },
      availableAt: input.now,
      updatedAt: input.now,
    },
  ]);
  await tx.insert(auditEvents).values({
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    actorLabel: 'website credential',
    action: 'order.submitted',
    entity: 'order',
    entityId: order.id,
    requestId: input.requestId,
    after: { reference: order.reference, status: 'submitted', version: order.version },
  });
  await tx
    .update(idempotencyKeys)
    .set({
      orderId: order.id,
      responseReference: order.reference,
      status: 'completed',
      completedAt: input.now,
    })
    .where(eq(idempotencyKeys.id, claimed[0].id));

  return { status: 'created', order: summary(order) };
}

export interface OrderSubmissionStore {
  submit(input: SubmitOrderStoreInput): Promise<SubmitOrderStoreResult>;
}

export class DatabaseOrderStore implements OrderSubmissionStore {
  constructor(private readonly database: OrderDatabase = defaultDatabase) {}

  async submit(input: SubmitOrderStoreInput): Promise<SubmitOrderStoreResult> {
    try {
      return await this.database.withTenantTx(
        { workspaceId: input.workspaceId, actorId: input.actorId },
        (tx) => submitInTransaction(tx, input),
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const constraint = constraintName(error);
      if (constraint === 'orders_workspace_reference_unique')
        return { status: 'reference_collision' };
      if (constraint === 'orders_workspace_lead_unique') {
        return { status: 'draft_already_submitted' };
      }
      throw error;
    }
  }
}
