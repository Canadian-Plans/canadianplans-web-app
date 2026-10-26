import { and, desc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import {
  auditEvents,
  dispatchRecords,
  fileReviewEvents,
  files,
  leads,
  orderAmendments,
  orderChangeRequests,
  orderInfoRequests,
  orders,
  outboxJobs,
  trackingChallenges,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import {
  amendableFieldKeySchema,
  amendableFormPatchSchema,
  commercialOfferSchema,
  deliveryStateSchema,
  orderChangeRequestStatusSchema,
  orderFulfilmentStatusSchema,
  paymentStateSchema,
  patchFieldKeys,
  type AmendableFieldKey,
  type OrderChangeRequestPatch,
  type TrackingChangeRequest,
  type TrackingDocument,
  type TrackingOrderDetail,
  type TrackingOrderSummary,
} from '@canadian-plans/contracts';
import { z } from 'zod';

import { hashesEqual } from './secrets.js';
import { unsatisfiedDocumentTypes } from '../orders/document-prerequisite.js';
import { changeRequestPayloadSchema } from '../orders/query-store.js';
import { lockCustomerLeadForOrder } from '../deletion/restriction.js';

/**
 * Tracking persistence (T22, REQ 05/21). Every read/write runs inside the
 * credential's workspace RLS tenant context, and every order lookup matches
 * the reference **and** the verified email in the same query, so a grant can
 * never reach another email's or another website's order. `consume` locks the
 * pending challenge so two concurrent verifications consume it at most once.
 */

export const MAX_TRACKING_ATTEMPTS = 5;
/** How many orders one email's list shows; tracking is not an archive search. */
export const MAX_TRACKED_ORDERS = 50;
/** Open customer change requests one order may carry before staff resolve some. */
export const MAX_PENDING_CUSTOMER_CHANGES = 3;

export type ConsumeOutcome = 'verified' | 'invalid' | 'expired' | 'exhausted' | 'not_found';

export interface QueueTrackingChallengeInput {
  workspaceId: string;
  challengeId: string;
  normalizedEmail: string;
  emailHash: string;
  codeHash: string;
  expiresAt: Date;
  now: Date;
  sealedCode: string;
  contactHash: string;
}

export interface CustomerChangeInput {
  workspaceId: string;
  /** The website credential that carried the request; the audit actor. */
  actorId: string;
  requestId: string;
  normalizedEmail: string;
  reference: string;
  patch: OrderChangeRequestPatch;
  note?: string;
  /** Present when the change answers a staff request for missing details. */
  infoRequestId?: string;
  now: Date;
}

export type CustomerChangeOutcome =
  | { status: 'created'; changeRequest: TrackingChangeRequest }
  | { status: 'not_found' }
  | { status: 'info_request_not_found' }
  | { status: 'fields_mismatch' }
  | { status: 'too_many_pending' };

export interface TrackingStore {
  hasActiveOrders(input: { workspaceId: string; normalizedEmail: string }): Promise<boolean>;
  createChallengeAndQueue(input: QueueTrackingChallengeInput): Promise<void>;
  consume(input: {
    workspaceId: string;
    normalizedEmail: string;
    emailHash: string;
    candidateCodeHash: string;
    now: Date;
  }): Promise<ConsumeOutcome>;
  listOrders(input: {
    workspaceId: string;
    normalizedEmail: string;
  }): Promise<TrackingOrderSummary[]>;
  orderDetail(input: {
    workspaceId: string;
    normalizedEmail: string;
    reference: string;
  }): Promise<TrackingOrderDetail | undefined>;
  orderId(input: {
    workspaceId: string;
    normalizedEmail: string;
    reference: string;
  }): Promise<string | undefined>;
  createCustomerChange(input: CustomerChangeInput): Promise<CustomerChangeOutcome>;
}

type TrackingDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: TrackingDatabase = { withTenantTx };

// Only the fields tracking shows, so a snapshot frozen under an older offer
// shape still lists for its customer.
const snapshotSchema = z.object({
  offer: commercialOfferSchema.pick({
    productTitle: true,
    offerName: true,
    productType: true,
    billingPeriod: true,
    recurringChargeAmountMinor: true,
  }),
  currency: z.string().regex(/^[A-Z]{3}$/),
  total: z.object({ amountMinor: z.int(), currency: z.string() }),
  amountPayableToday: z.object({ amountMinor: z.int(), currency: z.string() }),
  paymentRequired: z.boolean(),
  documentChecklist: z.array(z.string()).optional(),
});
const payloadFormSchema = z.object({
  payload: z.object({
    currentCountry: z.string().max(120).optional(),
    destination: z.string().max(120).optional(),
    arrivalDate: z.string().max(64).optional(),
  }),
});
const infoFieldsSchema = z.array(amendableFieldKeySchema).min(1);
const trackingSummaryStates = z.object({
  fulfilmentStatus: orderFulfilmentStatusSchema,
  paymentState: paymentStateSchema,
  deliveryState: deliveryStateSchema,
});

/** The verified email's active orders: never a restricted order or lead. */
function ownedBy(workspaceId: string, normalizedEmail: string): SQL {
  return and(
    eq(orders.workspaceId, workspaceId),
    isNull(orders.customerDataRestrictedAt),
    isNull(leads.customerDataRestrictedAt),
    sql`lower(btrim(${leads.email})) = ${normalizedEmail}`,
  )!;
}

const leadJoin = and(eq(leads.workspaceId, orders.workspaceId), eq(leads.id, orders.leadId));

function needsAction(input: {
  documentsRequired: readonly string[];
  pendingInfoRequests: number;
}): boolean {
  return input.documentsRequired.length > 0 || input.pendingInfoRequests > 0;
}

interface OrderRow {
  id: string;
  leadId: string;
  reference: string;
  fulfilmentStatus: string;
  paymentState: string;
  deliveryState: string;
  snapshot: unknown;
  submittedAt: Date;
  updatedAt: Date;
}

/** Attached files for a set of orders (order- and lead-level), with their review history. */
async function documentsFor(
  tx: TenantTransaction,
  workspaceId: string,
  rows: readonly OrderRow[],
): Promise<{
  files: { id: string; recordType: string; recordId: string; documentType: string; at: Date }[];
  reviewsNewestFirst: { fileId: string; decision: string }[];
}> {
  if (rows.length === 0) return { files: [], reviewsNewestFirst: [] };
  const attached = await tx
    .select({
      id: files.id,
      recordType: files.recordType,
      recordId: files.recordId,
      documentType: files.documentType,
      finalizedAt: files.finalizedAt,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(
      and(
        eq(files.workspaceId, workspaceId),
        eq(files.status, 'available'),
        isNull(files.deletedAt),
        or(
          and(
            eq(files.recordType, 'order'),
            inArray(
              files.recordId,
              rows.map((row) => row.id),
            ),
          ),
          and(
            eq(files.recordType, 'lead'),
            inArray(
              files.recordId,
              rows.map((row) => row.leadId),
            ),
          ),
        ),
      ),
    );
  if (attached.length === 0) return { files: [], reviewsNewestFirst: [] };
  const withTime = attached.map(({ finalizedAt, createdAt, ...file }) => ({
    ...file,
    at: finalizedAt ?? createdAt,
  }));
  const reviewsNewestFirst = await tx
    .select({ fileId: fileReviewEvents.fileId, decision: fileReviewEvents.decision })
    .from(fileReviewEvents)
    .where(
      and(
        eq(fileReviewEvents.workspaceId, workspaceId),
        inArray(
          fileReviewEvents.fileId,
          attached.map((file) => file.id),
        ),
      ),
    )
    .orderBy(desc(fileReviewEvents.createdAt));
  return { files: withTime, reviewsNewestFirst };
}

function filesOf(
  row: OrderRow,
  all: Awaited<ReturnType<typeof documentsFor>>['files'],
): Awaited<ReturnType<typeof documentsFor>>['files'] {
  return all.filter(
    (file) =>
      (file.recordType === 'order' && file.recordId === row.id) ||
      (file.recordType === 'lead' && file.recordId === row.leadId),
  );
}

/**
 * The customer's view of each document. A rejected file is shown as needing a
 * replacement only until a newer file of the same type arrives.
 */
function customerDocuments(
  owned: Awaited<ReturnType<typeof documentsFor>>['files'],
  reviewsNewestFirst: readonly { fileId: string; decision: string }[],
): TrackingDocument[] {
  const latest = new Map<string, string>();
  for (const review of reviewsNewestFirst) {
    if (!latest.has(review.fileId)) latest.set(review.fileId, review.decision);
  }
  const newestFirst = [...owned].sort((a, b) => b.at.getTime() - a.at.getTime());
  const seenType = new Set<string>();
  const result: TrackingDocument[] = [];
  for (const file of newestFirst) {
    const decision = latest.get(file.id);
    const status =
      decision === 'approved'
        ? 'approved'
        : decision === 'rejected'
          ? 'needs_replacement'
          : 'received';
    const superseded = seenType.has(file.documentType);
    seenType.add(file.documentType);
    if (status === 'needs_replacement' && superseded) continue;
    result.push({
      id: file.id,
      documentType: file.documentType,
      status,
      uploadedAt: file.at.toISOString(),
    });
  }
  return result;
}

export class DatabaseTrackingStore implements TrackingStore {
  constructor(private readonly database: TrackingDatabase = defaultDatabase) {}

  private tx<T>(workspaceId: string, fn: (tx: TenantTransaction) => Promise<T>): Promise<T> {
    return this.database.withTenantTx({ workspaceId, actorId: workspaceId }, fn);
  }

  async hasActiveOrders(input: { workspaceId: string; normalizedEmail: string }): Promise<boolean> {
    return this.tx(input.workspaceId, async (tx) => activeOrderExists(tx, input));
  }

  async createChallengeAndQueue(input: QueueTrackingChallengeInput): Promise<void> {
    await this.tx(input.workspaceId, async (tx) => {
      // Serialize resends for one email on one website: an email-scoped
      // challenge has no single row to lock. The key is the keyed email hash,
      // never the address, and the lock ends with this transaction.
      await tx.execute(
        sql`select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${`tracking-challenge\n${input.workspaceId}\n${input.emailHash}`}, 0))`,
      );
      // Recheck inside the write: an email whose orders were all restricted
      // between the match and now gets no code.
      if (!(await activeOrderExists(tx, input))) return;
      const superseded = await tx
        .update(trackingChallenges)
        .set({ status: 'consumed', consumedAt: input.now })
        .where(
          and(
            eq(trackingChallenges.workspaceId, input.workspaceId),
            eq(trackingChallenges.emailHash, input.emailHash),
            eq(trackingChallenges.status, 'pending'),
          ),
        )
        .returning({ id: trackingChallenges.id });
      if (superseded.length > 0) {
        await tx
          .update(outboxJobs)
          .set({
            status: 'completed',
            completedAt: input.now,
            providerId: 'skipped:superseded',
            payload: sql`jsonb_build_object('challengeId', ${outboxJobs.payload}->>'challengeId')`,
            updatedAt: input.now,
          })
          .where(
            and(
              eq(outboxJobs.workspaceId, input.workspaceId),
              eq(outboxJobs.jobType, 'tracking_otp_email'),
              eq(outboxJobs.status, 'pending'),
              inArray(
                sql<string>`${outboxJobs.payload}->>'challengeId'`,
                superseded.map((row) => row.id),
              ),
            ),
          );
      }
      await tx.insert(trackingChallenges).values({
        id: input.challengeId,
        workspaceId: input.workspaceId,
        orderId: null,
        emailHash: input.emailHash,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
      });
      await tx.insert(outboxJobs).values({
        workspaceId: input.workspaceId,
        jobType: 'tracking_otp_email',
        payloadVersion: 2,
        dedupeKey: input.challengeId,
        payload: {
          challengeId: input.challengeId,
          toAddress: input.normalizedEmail,
          contactHash: input.contactHash,
          sealedCode: input.sealedCode,
          expiresAt: input.expiresAt.toISOString(),
        },
      });
    });
  }

  /**
   * The delivery recheck: the challenge is still pending, unexpired and under
   * the attempt cap, and the email still has an active order to track.
   */
  async pendingDelivery(input: {
    workspaceId: string;
    actorId: string;
    challengeId: string;
    normalizedEmail: string;
    now: Date;
  }): Promise<{ codeHash: string; emailHash: string } | undefined> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const [row] = await tx
          .select({
            codeHash: trackingChallenges.codeHash,
            emailHash: trackingChallenges.emailHash,
            expiresAt: trackingChallenges.expiresAt,
            attempts: trackingChallenges.attempts,
          })
          .from(trackingChallenges)
          .where(
            and(
              eq(trackingChallenges.workspaceId, input.workspaceId),
              eq(trackingChallenges.id, input.challengeId),
              isNull(trackingChallenges.orderId),
              eq(trackingChallenges.status, 'pending'),
            ),
          )
          .limit(1);
        if (
          !row ||
          row.expiresAt.getTime() <= input.now.getTime() ||
          row.attempts >= MAX_TRACKING_ATTEMPTS
        )
          return undefined;
        if (!(await activeOrderExists(tx, input))) return undefined;
        return { codeHash: row.codeHash, emailHash: row.emailHash };
      },
    );
  }

  async consume(input: {
    workspaceId: string;
    normalizedEmail: string;
    emailHash: string;
    candidateCodeHash: string;
    now: Date;
  }): Promise<ConsumeOutcome> {
    return this.tx(input.workspaceId, async (tx) => {
      const [challenge] = await tx
        .select({
          id: trackingChallenges.id,
          codeHash: trackingChallenges.codeHash,
          attempts: trackingChallenges.attempts,
          expiresAt: trackingChallenges.expiresAt,
        })
        .from(trackingChallenges)
        .where(
          and(
            eq(trackingChallenges.workspaceId, input.workspaceId),
            eq(trackingChallenges.emailHash, input.emailHash),
            isNull(trackingChallenges.orderId),
            eq(trackingChallenges.status, 'pending'),
          ),
        )
        .orderBy(desc(trackingChallenges.createdAt))
        .limit(1)
        .for('update');
      if (!challenge) return 'not_found';

      if (challenge.expiresAt.getTime() <= input.now.getTime()) {
        await markConsumed(tx, input.workspaceId, challenge.id, input.now);
        return 'expired';
      }
      if (challenge.attempts >= MAX_TRACKING_ATTEMPTS) {
        await markConsumed(tx, input.workspaceId, challenge.id, input.now);
        return 'exhausted';
      }
      if (!hashesEqual(challenge.codeHash, input.candidateCodeHash)) {
        await tx
          .update(trackingChallenges)
          .set({ attempts: challenge.attempts + 1 })
          .where(
            and(
              eq(trackingChallenges.workspaceId, input.workspaceId),
              eq(trackingChallenges.id, challenge.id),
            ),
          );
        return 'invalid';
      }
      await markConsumed(tx, input.workspaceId, challenge.id, input.now);
      // A correct code for an email whose orders were all restricted since
      // the request verifies nothing.
      return (await activeOrderExists(tx, input)) ? 'verified' : 'not_found';
    });
  }

  async listOrders(input: {
    workspaceId: string;
    normalizedEmail: string;
  }): Promise<TrackingOrderSummary[]> {
    return this.tx(input.workspaceId, async (tx) => {
      const rows = await selectOrders(tx, ownedBy(input.workspaceId, input.normalizedEmail));
      if (rows.length === 0) return [];
      const documents = await documentsFor(tx, input.workspaceId, rows);
      const pending = await tx
        .select({ orderId: orderInfoRequests.orderId, count: sql<number>`count(*)::int` })
        .from(orderInfoRequests)
        .where(
          and(
            eq(orderInfoRequests.workspaceId, input.workspaceId),
            eq(orderInfoRequests.status, 'pending'),
            inArray(
              orderInfoRequests.orderId,
              rows.map((row) => row.id),
            ),
          ),
        )
        .groupBy(orderInfoRequests.orderId);
      const pendingByOrder = new Map(pending.map((row) => [row.orderId, row.count]));
      return rows.flatMap((row) => {
        const summary = summaryOf(row);
        if (!summary) return [];
        const required = unsatisfiedDocumentTypes({
          attached: filesOf(row, documents.files),
          reviewsNewestFirst: documents.reviewsNewestFirst,
          required: summary.checklist,
        });
        return [
          {
            ...summary.fields,
            actionNeeded: needsAction({
              documentsRequired: required,
              pendingInfoRequests: pendingByOrder.get(row.id) ?? 0,
            }),
          },
        ];
      });
    });
  }

  async orderDetail(input: {
    workspaceId: string;
    normalizedEmail: string;
    reference: string;
  }): Promise<TrackingOrderDetail | undefined> {
    return this.tx(input.workspaceId, async (tx) => {
      const [row] = await selectOrders(
        tx,
        and(
          ownedBy(input.workspaceId, input.normalizedEmail),
          eq(orders.reference, input.reference),
        )!,
      );
      if (!row) return undefined;
      const summary = summaryOf(row);
      if (!summary) return undefined;

      const [contact] = await tx
        .select({
          fullName: leads.fullName,
          email: leads.email,
          phone: leads.phone,
          countryCode: leads.countryCode,
          payload: orders.payload,
        })
        .from(orders)
        .innerJoin(leads, leadJoin)
        .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, row.id)))
        .limit(1);
      const [dispatch] = await tx
        .select({ trackingReference: dispatchRecords.trackingReference })
        .from(dispatchRecords)
        .where(
          and(
            eq(dispatchRecords.workspaceId, input.workspaceId),
            eq(dispatchRecords.orderId, row.id),
          ),
        )
        .orderBy(desc(dispatchRecords.dispatchedAt))
        .limit(1);
      const amendments = await tx
        .select({ patch: orderAmendments.patch })
        .from(orderAmendments)
        .where(
          and(
            eq(orderAmendments.workspaceId, input.workspaceId),
            eq(orderAmendments.orderId, row.id),
          ),
        )
        .orderBy(orderAmendments.createdAt);
      const infoRows = await tx
        .select({
          id: orderInfoRequests.id,
          fields: orderInfoRequests.fields,
          message: orderInfoRequests.message,
          createdAt: orderInfoRequests.createdAt,
        })
        .from(orderInfoRequests)
        .where(
          and(
            eq(orderInfoRequests.workspaceId, input.workspaceId),
            eq(orderInfoRequests.orderId, row.id),
            eq(orderInfoRequests.status, 'pending'),
          ),
        )
        .orderBy(orderInfoRequests.createdAt);
      const changeRows = await tx
        .select({
          id: orderChangeRequests.id,
          status: orderChangeRequests.status,
          payload: orderChangeRequests.payload,
          createdAt: orderChangeRequests.createdAt,
        })
        .from(orderChangeRequests)
        .where(
          and(
            eq(orderChangeRequests.workspaceId, input.workspaceId),
            eq(orderChangeRequests.orderId, row.id),
          ),
        )
        .orderBy(desc(orderChangeRequests.createdAt))
        .limit(20);
      const documents = await documentsFor(tx, input.workspaceId, [row]);
      const owned = filesOf(row, documents.files);
      const documentsRequired = unsatisfiedDocumentTypes({
        attached: owned,
        reviewsNewestFirst: documents.reviewsNewestFirst,
        required: summary.checklist,
      });

      // The submitted payload is immutable; approved amendments are applied on
      // top so the customer sees their current details.
      const form = { ...(payloadFormSchema.safeParse(contact?.payload).data?.payload ?? {}) };
      for (const amendment of amendments) {
        const patch = z
          .object({ form: amendableFormPatchSchema.optional() })
          .safeParse(amendment.patch);
        Object.assign(form, patch.data?.form ?? {});
      }
      const infoRequests = infoRows.flatMap((info) => {
        const fields = infoFieldsSchema.safeParse(info.fields);
        return fields.success
          ? [
              {
                id: info.id,
                fields: fields.data,
                message: info.message,
                createdAt: info.createdAt.toISOString(),
              },
            ]
          : [];
      });

      return {
        ...summary.fields,
        actionNeeded: needsAction({
          documentsRequired,
          pendingInfoRequests: infoRequests.length,
        }),
        billingPeriod: summary.offer.billingPeriod ?? 'month',
        price: {
          recurring: {
            amountMinor: summary.offer.recurringChargeAmountMinor,
            currency: summary.currency,
          },
          total: summary.total,
          amountPayableToday: summary.amountPayableToday,
          paymentRequired: summary.paymentRequired,
        },
        trackingReference: dispatch?.trackingReference ?? null,
        customer: {
          fullName: contact?.fullName ?? null,
          email: contact?.email ?? null,
          phone: contact?.phone ?? null,
          countryCode: contact?.countryCode ?? null,
        },
        details: {
          currentCountry: form.currentCountry ?? null,
          destination: form.destination ?? null,
          arrivalDate: form.arrivalDate ?? null,
        },
        documentChecklist: [...summary.checklist],
        documentsRequired: [...documentsRequired],
        documents: customerDocuments(owned, documents.reviewsNewestFirst),
        infoRequests,
        changeRequests: changeRows.flatMap((change) => {
          const payload = changeRequestPayloadSchema.safeParse(change.payload);
          const status = orderChangeRequestStatusSchema.safeParse(change.status);
          return payload.success && status.success
            ? [
                {
                  id: change.id,
                  status: status.data,
                  fields: patchFieldKeys(payload.data.patch),
                  createdAt: change.createdAt.toISOString(),
                },
              ]
            : [];
        }),
      };
    });
  }

  async orderId(input: {
    workspaceId: string;
    normalizedEmail: string;
    reference: string;
  }): Promise<string | undefined> {
    return this.tx(input.workspaceId, async (tx) => {
      const [row] = await tx
        .select({ id: orders.id })
        .from(orders)
        .innerJoin(leads, leadJoin)
        .where(
          and(
            ownedBy(input.workspaceId, input.normalizedEmail),
            eq(orders.reference, input.reference),
          ),
        )
        .limit(1);
      return row?.id;
    });
  }

  async createCustomerChange(input: CustomerChangeInput): Promise<CustomerChangeOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const [match] = await tx
          .select({ id: orders.id })
          .from(orders)
          .innerJoin(leads, leadJoin)
          .where(
            and(
              ownedBy(input.workspaceId, input.normalizedEmail),
              eq(orders.reference, input.reference),
            ),
          )
          .limit(1);
        if (!match) return { status: 'not_found' };
        // Same lock order as deletion and staff writes: lead, then order.
        if (!(await lockCustomerLeadForOrder(tx, input.workspaceId, match.id)))
          return { status: 'not_found' };
        await tx
          .select({ id: orders.id })
          .from(orders)
          .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, match.id)))
          .for('update');

        const fields = patchFieldKeys(input.patch);
        if (input.infoRequestId) {
          const [info] = await tx
            .select({ fields: orderInfoRequests.fields })
            .from(orderInfoRequests)
            .where(
              and(
                eq(orderInfoRequests.workspaceId, input.workspaceId),
                eq(orderInfoRequests.orderId, match.id),
                eq(orderInfoRequests.id, input.infoRequestId),
                eq(orderInfoRequests.status, 'pending'),
              ),
            )
            .limit(1)
            .for('update');
          const requested = infoFieldsSchema.safeParse(info?.fields);
          if (!info || !requested.success) return { status: 'info_request_not_found' };
          if (!sameFields(fields, requested.data)) return { status: 'fields_mismatch' };
        } else {
          const [open] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(orderChangeRequests)
            .where(
              and(
                eq(orderChangeRequests.workspaceId, input.workspaceId),
                eq(orderChangeRequests.orderId, match.id),
                eq(orderChangeRequests.status, 'pending'),
                sql`${orderChangeRequests.payload}->>'origin' = 'customer'`,
              ),
            );
          if ((open?.count ?? 0) >= MAX_PENDING_CUSTOMER_CHANGES)
            return { status: 'too_many_pending' };
        }

        const [row] = await tx
          .insert(orderChangeRequests)
          .values({
            workspaceId: input.workspaceId,
            orderId: match.id,
            requestedBy: input.actorId,
            payload: changeRequestPayloadSchema.parse({
              patch: input.patch,
              ...(input.note ? { note: input.note } : {}),
              origin: 'customer',
              ...(input.infoRequestId ? { infoRequestId: input.infoRequestId } : {}),
            }),
            status: 'pending',
          })
          .returning({ id: orderChangeRequests.id, createdAt: orderChangeRequests.createdAt });
        if (!row) throw new Error('change request insert did not return a row');
        if (input.infoRequestId) {
          await tx
            .update(orderInfoRequests)
            .set({ status: 'answered', changeRequestId: row.id, resolvedAt: input.now })
            .where(
              and(
                eq(orderInfoRequests.workspaceId, input.workspaceId),
                eq(orderInfoRequests.id, input.infoRequestId),
              ),
            );
        }
        // Field names only, never the proposed values (invariant 11).
        await tx.insert(auditEvents).values({
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          actorLabel: 'website credential',
          action: 'order.change_request_created',
          entity: 'order',
          entityId: match.id,
          requestId: input.requestId,
          after: {
            changeRequestId: row.id,
            origin: 'customer',
            fields,
            ...(input.infoRequestId ? { infoRequestId: input.infoRequestId } : {}),
          },
        });
        return {
          status: 'created',
          changeRequest: {
            id: row.id,
            status: 'pending',
            fields,
            createdAt: row.createdAt.toISOString(),
          },
        };
      },
    );
  }
}

function sameFields(a: readonly AmendableFieldKey[], b: readonly AmendableFieldKey[]): boolean {
  const left = [...new Set(a)].sort();
  const right = [...new Set(b)].sort();
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

async function activeOrderExists(
  tx: TenantTransaction,
  input: { workspaceId: string; normalizedEmail: string },
): Promise<boolean> {
  const [row] = await tx
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(leads, leadJoin)
    .where(ownedBy(input.workspaceId, input.normalizedEmail))
    .limit(1);
  return row !== undefined;
}

async function markConsumed(
  tx: TenantTransaction,
  workspaceId: string,
  challengeId: string,
  now: Date,
): Promise<void> {
  await tx
    .update(trackingChallenges)
    .set({ status: 'consumed', consumedAt: now })
    .where(
      and(eq(trackingChallenges.workspaceId, workspaceId), eq(trackingChallenges.id, challengeId)),
    );
}

function selectOrders(tx: TenantTransaction, where: SQL): Promise<OrderRow[]> {
  return tx
    .select({
      id: orders.id,
      leadId: orders.leadId,
      reference: orders.reference,
      fulfilmentStatus: orders.status,
      paymentState: orders.paymentState,
      deliveryState: orders.deliveryState,
      snapshot: orders.snapshot,
      submittedAt: orders.submittedAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .innerJoin(leads, leadJoin)
    .where(where)
    .orderBy(desc(orders.submittedAt))
    .limit(MAX_TRACKED_ORDERS);
}

/** The customer-safe summary of a row, or nothing when its snapshot is unreadable. */
function summaryOf(row: OrderRow) {
  const snapshot = snapshotSchema.safeParse(row.snapshot);
  const fulfilment = trackingSummaryStates.safeParse({
    fulfilmentStatus: row.fulfilmentStatus,
    paymentState: row.paymentState,
    deliveryState: row.deliveryState,
  });
  if (!snapshot.success || !fulfilment.success) return undefined;
  const currency = snapshot.data.currency;
  return {
    offer: snapshot.data.offer,
    currency,
    total: { amountMinor: snapshot.data.total.amountMinor, currency },
    amountPayableToday: { amountMinor: snapshot.data.amountPayableToday.amountMinor, currency },
    paymentRequired: snapshot.data.paymentRequired,
    checklist: snapshot.data.documentChecklist ?? [],
    fields: {
      reference: row.reference,
      productTitle: snapshot.data.offer.productTitle,
      offerName: snapshot.data.offer.offerName,
      productType: snapshot.data.offer.productType,
      ...fulfilment.data,
      submittedAt: row.submittedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}
