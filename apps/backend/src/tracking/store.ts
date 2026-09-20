import { and, desc, eq, sql } from 'drizzle-orm';
import {
  dispatchRecords,
  leads,
  orders,
  trackingChallenges,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import { z } from 'zod';

import { hashesEqual } from './secrets.js';

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

export interface TrackingStore {
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
              eq(orders.reference, input.reference),
              sql`lower(${leads.email}) = ${input.normalizedEmail}`,
            ),
          )
          .limit(1);
        return row ? { orderId: row.id } : undefined;
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
          .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, input.orderId)))
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

        // T17 seam: subtract files already available once document tables exist.
        const checklist = snapshotSchema.safeParse(order.snapshot ?? {}).data?.documentChecklist;

        return {
          reference: order.reference,
          fulfilmentStatus: order.fulfilmentStatus,
          paymentState: order.paymentState,
          deliveryState: order.deliveryState,
          trackingReference: dispatch?.trackingReference ?? null,
          documentsRequired: [...(checklist ?? [])],
          updatedAt: order.updatedAt,
        };
      },
    );
  }
}
