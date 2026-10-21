import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  dispatchRecords,
  leads,
  orders,
  outboxJobs,
  trackingChallenges,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import { z } from 'zod';

import { hashesEqual } from './secrets.js';
import { findUnsatisfiedDocuments } from '../orders/document-prerequisite.js';
import { customerSubjectActive, lockCustomerLeadForOrder } from '../deletion/restriction.js';

/**
 * Tracking persistence (T22). Every read/write runs inside the workspace's RLS
 * tenant context. `consume` locks the pending challenge so two concurrent
 * verifications can only ever consume it once.
 */

export const MAX_TRACKING_ATTEMPTS = 5;

export type ConsumeOutcome = 'verified' | 'invalid' | 'expired' | 'exhausted' | 'not_found';

export interface TrackingStatusView {
  reference: string;
  fulfilmentStatus: string;
  paymentState: string;
  deliveryState: string;
  trackingReference: string | null;
  documentsRequired: string[];
  updatedAt: Date;
}

export interface QueueTrackingChallengeInput {
  workspaceId: string;
  orderId: string;
  challengeId: string;
  normalizedEmail: string;
  emailHash: string;
  codeHash: string;
  expiresAt: Date;
  now: Date;
  sealedCode: string;
  contactHash: string;
}

export interface TrackingStore {
  createChallengeAndQueue(input: QueueTrackingChallengeInput): Promise<void>;
  matchOrder(input: {
    workspaceId: string;
    reference: string;
    normalizedEmail: string;
  }): Promise<{ orderId: string } | undefined>;
  invalidatePending(input: {
    workspaceId: string;
    orderId: string;
    emailHash: string;
  }): Promise<void>;
  createChallenge(input: {
    workspaceId: string;
    orderId: string;
    emailHash: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<{ challengeId: string }>;
  consume(input: {
    workspaceId: string;
    orderId: string;
    emailHash: string;
    candidateCodeHash: string;
    now: Date;
  }): Promise<ConsumeOutcome>;
  status(input: { workspaceId: string; orderId: string }): Promise<TrackingStatusView | undefined>;
}

type TrackingDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: TrackingDatabase = { withTenantTx };

const snapshotSchema = z.object({ documentChecklist: z.array(z.string()).optional() });

export class DatabaseTrackingStore implements TrackingStore {
  constructor(private readonly database: TrackingDatabase = defaultDatabase) {}

  async matchOrder(input: {
    workspaceId: string;
    reference: string;
    normalizedEmail: string;
  }): Promise<{ orderId: string } | undefined> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.workspaceId },
      async (tx) => {
        const [row] = await tx
          .select({ id: orders.id })
          .from(orders)
          .innerJoin(
            leads,
            and(eq(leads.workspaceId, orders.workspaceId), eq(leads.id, orders.leadId)),
          )
          .where(
            and(
              eq(orders.workspaceId, input.workspaceId),
              isNull(orders.customerDataRestrictedAt),
              eq(orders.reference, input.reference),
              sql`lower(${leads.email}) = ${input.normalizedEmail}`,
            ),
          )
          .limit(1);
        return row ? { orderId: row.id } : undefined;
      },
    );
  }

  async createChallengeAndQueue(input: QueueTrackingChallengeInput): Promise<void> {
    await this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.workspaceId },
      async (tx) => {
        // Serialize resends for one order and recheck the contact after matching.
        if (!(await lockCustomerLeadForOrder(tx, input.workspaceId, input.orderId))) return;
        await tx
          .select({ id: orders.id })
          .from(orders)
          .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, input.orderId)))
          .for('update');
        const [order] = await tx
          .select({ reference: orders.reference, email: leads.email })
          .from(orders)
          .innerJoin(
            leads,
            and(eq(leads.workspaceId, orders.workspaceId), eq(leads.id, orders.leadId)),
          )
          .where(
            and(
              eq(orders.workspaceId, input.workspaceId),
              isNull(orders.customerDataRestrictedAt),
              eq(orders.id, input.orderId),
            ),
          );
        if (!order || order.email?.trim().toLowerCase() !== input.normalizedEmail) return;
        await tx
          .update(trackingChallenges)
          .set({ status: 'consumed', consumedAt: input.now })
          .where(
            and(
              eq(trackingChallenges.workspaceId, input.workspaceId),
              eq(trackingChallenges.orderId, input.orderId),
              eq(trackingChallenges.emailHash, input.emailHash),
              eq(trackingChallenges.status, 'pending'),
            ),
          );
        await tx
          .update(outboxJobs)
          .set({
            status: 'completed',
            completedAt: input.now,
            providerId: 'skipped:superseded',
            payload: { orderId: input.orderId },
            updatedAt: input.now,
          })
          .where(
            and(
              eq(outboxJobs.workspaceId, input.workspaceId),
              eq(outboxJobs.jobType, 'tracking_otp_email'),
              eq(outboxJobs.status, 'pending'),
              sql`${outboxJobs.payload}->>'orderId' = ${input.orderId}`,
            ),
          );
        await tx.insert(trackingChallenges).values({
          id: input.challengeId,
          workspaceId: input.workspaceId,
          orderId: input.orderId,
          emailHash: input.emailHash,
          codeHash: input.codeHash,
          expiresAt: input.expiresAt,
        });
        await tx.insert(outboxJobs).values({
          workspaceId: input.workspaceId,
          jobType: 'tracking_otp_email',
          dedupeKey: input.challengeId,
          payload: {
            orderId: input.orderId,
            challengeId: input.challengeId,
            reference: order.reference,
            toAddress: input.normalizedEmail,
            contactHash: input.contactHash,
            sealedCode: input.sealedCode,
            expiresAt: input.expiresAt.toISOString(),
          },
        });
      },
    );
  }

  async pendingDelivery(input: {
    workspaceId: string;
    actorId: string;
    orderId: string;
    challengeId: string;
    now: Date;
  }): Promise<
    | {
        codeHash: string;
        email: string;
        reference: string;
      }
    | undefined
  > {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const [row] = await tx
          .select({
            codeHash: trackingChallenges.codeHash,
            email: leads.email,
            reference: orders.reference,
            expiresAt: trackingChallenges.expiresAt,
            attempts: trackingChallenges.attempts,
          })
          .from(trackingChallenges)
          .innerJoin(
            orders,
            and(
              eq(orders.workspaceId, trackingChallenges.workspaceId),
              eq(orders.id, trackingChallenges.orderId),
            ),
          )
          .innerJoin(
            leads,
            and(eq(leads.workspaceId, orders.workspaceId), eq(leads.id, orders.leadId)),
          )
          .where(
            and(
              eq(trackingChallenges.workspaceId, input.workspaceId),
              eq(trackingChallenges.orderId, input.orderId),
              eq(trackingChallenges.id, input.challengeId),
              isNull(orders.customerDataRestrictedAt),
              isNull(leads.customerDataRestrictedAt),
              eq(trackingChallenges.status, 'pending'),
            ),
          )
          .limit(1);
        if (
          !row?.email ||
          row.expiresAt.getTime() <= input.now.getTime() ||
          row.attempts >= MAX_TRACKING_ATTEMPTS
        )
          return undefined;
        return {
          codeHash: row.codeHash,
          email: row.email.trim().toLowerCase(),
          reference: row.reference,
        };
      },
    );
  }

  async invalidatePending(input: {
    workspaceId: string;
    orderId: string;
    emailHash: string;
  }): Promise<void> {
    await this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.workspaceId },
      async (tx) => {
        await tx
          .update(trackingChallenges)
          .set({ status: 'consumed', consumedAt: new Date() })
          .where(
            and(
              eq(trackingChallenges.workspaceId, input.workspaceId),
              eq(trackingChallenges.orderId, input.orderId),
              eq(trackingChallenges.emailHash, input.emailHash),
              eq(trackingChallenges.status, 'pending'),
            ),
          );
      },
    );
  }

  async createChallenge(input: {
    workspaceId: string;
    orderId: string;
    emailHash: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<{ challengeId: string }> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.workspaceId },
      async (tx) => {
        if (!(await customerSubjectActive(tx, input.workspaceId, { orderId: input.orderId })))
          throw new Error('tracking_challenge_inactive');
        const [row] = await tx
          .insert(trackingChallenges)
          .values({
            workspaceId: input.workspaceId,
            orderId: input.orderId,
            emailHash: input.emailHash,
            codeHash: input.codeHash,
            expiresAt: input.expiresAt,
          })
          .returning({ id: trackingChallenges.id });
        if (!row) throw new Error('tracking challenge insert did not return a row');
        return { challengeId: row.id };
      },
    );
  }

  async consume(input: {
    workspaceId: string;
    orderId: string;
    emailHash: string;
    candidateCodeHash: string;
    now: Date;
  }): Promise<ConsumeOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.workspaceId },
      async (tx) => {
        if (!(await customerSubjectActive(tx, input.workspaceId, { orderId: input.orderId })))
          return 'not_found';
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
              eq(trackingChallenges.orderId, input.orderId),
              eq(trackingChallenges.emailHash, input.emailHash),
              eq(trackingChallenges.status, 'pending'),
            ),
          )
          .orderBy(desc(trackingChallenges.createdAt))
          .limit(1)
          .for('update');
        if (!challenge) return 'not_found';

        if (challenge.expiresAt.getTime() <= input.now.getTime()) {
          await this.markConsumed(tx, input.workspaceId, challenge.id, input.now);
          return 'expired';
        }
        if (challenge.attempts >= MAX_TRACKING_ATTEMPTS) {
          await this.markConsumed(tx, input.workspaceId, challenge.id, input.now);
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
        await this.markConsumed(tx, input.workspaceId, challenge.id, input.now);
        return 'verified';
      },
    );
  }

  private async markConsumed(
    tx: TenantTransaction,
    workspaceId: string,
    challengeId: string,
    now: Date,
  ): Promise<void> {
    await tx
      .update(trackingChallenges)
      .set({ status: 'consumed', consumedAt: now })
      .where(
        and(
          eq(trackingChallenges.workspaceId, workspaceId),
          eq(trackingChallenges.id, challengeId),
        ),
      );
  }

  async status(input: {
    workspaceId: string;
    orderId: string;
  }): Promise<TrackingStatusView | undefined> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.workspaceId },
      async (tx) => {
        const [order] = await tx
          .select({
            reference: orders.reference,
            fulfilmentStatus: orders.status,
            paymentState: orders.paymentState,
            deliveryState: orders.deliveryState,
            snapshot: orders.snapshot,
            updatedAt: orders.updatedAt,
          })
          .from(orders)
          .where(
            and(
              eq(orders.workspaceId, input.workspaceId),
              isNull(orders.customerDataRestrictedAt),
              eq(orders.id, input.orderId),
            ),
          )
          .limit(1);
        if (!order) return undefined;

        const [dispatch] = await tx
          .select({ trackingReference: dispatchRecords.trackingReference })
          .from(dispatchRecords)
          .where(
            and(
              eq(dispatchRecords.workspaceId, input.workspaceId),
              eq(dispatchRecords.orderId, input.orderId),
            ),
          )
          .orderBy(desc(dispatchRecords.dispatchedAt))
          .limit(1);

        const checklist = snapshotSchema.safeParse(order.snapshot ?? {}).data?.documentChecklist;
        const outstanding = await findUnsatisfiedDocuments(tx, {
          workspaceId: input.workspaceId,
          orderId: input.orderId,
          required: checklist ?? [],
        });

        return {
          reference: order.reference,
          fulfilmentStatus: order.fulfilmentStatus,
          paymentState: order.paymentState,
          deliveryState: order.deliveryState,
          trackingReference: dispatch?.trackingReference ?? null,
          documentsRequired: [...outstanding],
          updatedAt: order.updatedAt,
        };
      },
    );
  }
}
