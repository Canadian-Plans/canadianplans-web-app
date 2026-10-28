import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';
import {
  auditEvents,
  deletionIntents,
  draftGrants,
  files,
  followUpSchedules,
  leads,
  orders,
  outboxJobs,
  regionWaitlist,
  trackingChallenges,
  withTenantTx,
  type TenantTransaction,
} from '@canadian-plans/db';
import type { DeletionSubjectType, FindDeletionSubjectsResponse } from '@canadian-plans/contracts';

export interface DeleteCustomerDataInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  reason: string;
}
export interface RequestDeletionInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  subjectType: DeletionSubjectType;
  subjectId: string;
  reason: string;
}
export type DeleteCustomerDataOutcome =
  | {
      status: 'restricted';
      deletionId: string;
      subjectType: DeletionSubjectType;
      subjectId: string;
      ledgerStatus: 'pending_acknowledgement' | 'acknowledged';
      cleanupStatus: 'pending' | 'completed';
    }
  | { status: 'not_found' };
export interface DeletionStore {
  deleteCustomerData(input: DeleteCustomerDataInput): Promise<DeleteCustomerDataOutcome>;
  requestDeletion(input: RequestDeletionInput): Promise<DeleteCustomerDataOutcome>;
  findSubjects(input: {
    workspaceId: string;
    actorId: string;
    email: string;
    page?: number;
  }): Promise<Omit<FindDeletionSubjectsResponse, 'requestId'>>;
}
type DeletionDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;

/** Immediate restriction only. Personal erasure and R2 deletion wait for durable ledger acknowledgement. */
export class DatabaseDeletionStore implements DeletionStore {
  constructor(private readonly database: DeletionDatabase = { withTenantTx }) {}

  deleteCustomerData(input: DeleteCustomerDataInput): Promise<DeleteCustomerDataOutcome> {
    return this.requestDeletion({ ...input, subjectType: 'order', subjectId: input.orderId });
  }

  async requestDeletion(input: RequestDeletionInput): Promise<DeleteCustomerDataOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        let subjectType = input.subjectType;
        let subjectId = input.subjectId;
        let leadId: string | undefined;
        let orderId: string | undefined;
        if (subjectType === 'region_waitlist') {
          const [row] = await tx
            .select({ id: regionWaitlist.id })
            .from(regionWaitlist)
            .where(
              and(
                eq(regionWaitlist.workspaceId, input.workspaceId),
                eq(regionWaitlist.id, subjectId),
              ),
            )
            .limit(1)
            .for('update');
          if (!row) {
            const [existing] = await tx
              .select()
              .from(deletionIntents)
              .where(
                and(
                  eq(deletionIntents.workspaceId, input.workspaceId),
                  eq(deletionIntents.subjectType, subjectType),
                  eq(deletionIntents.subjectId, subjectId),
                ),
              )
              .orderBy(asc(deletionIntents.createdAt))
              .limit(1);
            return existing
              ? {
                  status: 'restricted',
                  deletionId: existing.id,
                  subjectType,
                  subjectId,
                  ledgerStatus: existing.ledgerAckId ? 'acknowledged' : 'pending_acknowledgement',
                  cleanupStatus: existing.completedAt ? 'completed' : 'pending',
                }
              : { status: 'not_found' };
          }
        } else {
          if (subjectType === 'order') {
            const [order] = await tx
              .select({ leadId: orders.leadId })
              .from(orders)
              .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, subjectId)))
              .limit(1);
            if (!order) return { status: 'not_found' };
            leadId = order.leadId;
          } else leadId = subjectId;
          // Same lead-first locking order as draft submission: no order can be
          // created between a lead-only request and its restriction marker.
          const [lead] = await tx
            .select({ id: leads.id })
            .from(leads)
            .where(and(eq(leads.workspaceId, input.workspaceId), eq(leads.id, leadId)))
            .limit(1)
            .for('update');
          if (!lead) return { status: 'not_found' };
          const [order] = await tx
            .select({ id: orders.id })
            .from(orders)
            .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.leadId, leadId)))
            .limit(1)
            .for('update');
          if (order) {
            orderId = order.id;
            subjectType = 'order';
            subjectId = order.id;
          } else if (subjectType === 'order') return { status: 'not_found' };
        }
        await restrictSubject(tx, {
          workspaceId: input.workspaceId,
          subjectType,
          subjectId,
          leadId,
          orderId,
        });
        const [existing] = await tx
          .select()
          .from(deletionIntents)
          .where(
            and(
              eq(deletionIntents.workspaceId, input.workspaceId),
              eq(deletionIntents.subjectType, subjectType),
              eq(deletionIntents.subjectId, subjectId),
            ),
          )
          .orderBy(asc(deletionIntents.createdAt))
          .limit(1);
        if (existing)
          return {
            status: 'restricted',
            deletionId: existing.id,
            subjectType,
            subjectId,
            ledgerStatus: existing.ledgerAckId ? 'acknowledged' : 'pending_acknowledgement',
            cleanupStatus: existing.completedAt ? 'completed' : 'pending',
          };
        const [intent] = await tx
          .insert(deletionIntents)
          .values({
            workspaceId: input.workspaceId,
            action: 'delete_customer_data',
            subjectType,
            subjectId,
            relatedLeadId: leadId,
            status: 'pending',
            reason: input.reason,
            actorId: input.actorId,
          })
          .returning({ id: deletionIntents.id });
        if (!intent) throw new Error('deletion_intent_not_created');
        await tx.insert(outboxJobs).values({
          workspaceId: input.workspaceId,
          jobType: 'deletion_ledger_publish',
          dedupeKey: intent.id,
          payload: { deletionId: intent.id },
        });
        await tx.insert(auditEvents).values({
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          actorLabel: 'staff',
          action: 'customer_data.restricted',
          entity: subjectType,
          entityId: subjectId,
          after: { reason: input.reason, deletionId: intent.id },
          requestId: input.requestId,
        });
        return {
          status: 'restricted',
          deletionId: intent.id,
          subjectType,
          subjectId,
          ledgerStatus: 'pending_acknowledgement',
          cleanupStatus: 'pending',
        };
      },
    );
  }

  async findSubjects(input: {
    workspaceId: string;
    actorId: string;
    email: string;
    page?: number;
  }): Promise<Omit<FindDeletionSubjectsResponse, 'requestId'>> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const normalized = input.email.trim().toLowerCase();
        const page = input.page ?? 1;
        const offset = (page - 1) * 100;
        const drafts = await tx
          .select({
            id: leads.id,
            orderId: orders.id,
            reference: orders.reference,
            createdAt: leads.createdAt,
          })
          .from(leads)
          .leftJoin(
            orders,
            and(eq(orders.workspaceId, leads.workspaceId), eq(orders.leadId, leads.id)),
          )
          .where(
            and(
              eq(leads.workspaceId, input.workspaceId),
              sql`lower(${leads.email}) = ${normalized}`,
            ),
          )
          .orderBy(asc(leads.id))
          .offset(offset)
          .limit(101);
        const waitlist = await tx
          .select({ id: regionWaitlist.id, createdAt: regionWaitlist.createdAt })
          .from(regionWaitlist)
          .where(
            and(
              eq(regionWaitlist.workspaceId, input.workspaceId),
              sql`lower(${regionWaitlist.email}) = ${normalized}`,
            ),
          )
          .orderBy(asc(regionWaitlist.id))
          .offset(offset)
          .limit(101);
        return {
          page,
          hasMore: drafts.length > 100 || waitlist.length > 100,
          subjects: [
            ...drafts.slice(0, 100).map((row) => ({
              subjectType: row.orderId ? ('order' as const) : ('lead' as const),
              subjectId: row.orderId ?? row.id,
              reference: row.reference,
              createdAt: row.createdAt.toISOString(),
            })),
            ...waitlist.slice(0, 100).map((row) => ({
              subjectType: 'region_waitlist' as const,
              subjectId: row.id,
              reference: null,
              createdAt: row.createdAt.toISOString(),
            })),
          ],
        };
      },
    );
  }
}

export interface DeletionScope {
  workspaceId: string;
  subjectType: DeletionSubjectType;
  subjectId: string;
  leadId: string | undefined;
  orderId: string | undefined;
}

export async function restrictSubject(tx: TenantTransaction, scope: DeletionScope): Promise<void> {
  const now = new Date();
  if (scope.leadId) {
    await tx
      .update(leads)
      .set({ customerDataRestrictedAt: now })
      .where(
        and(
          eq(leads.workspaceId, scope.workspaceId),
          eq(leads.id, scope.leadId),
          isNull(leads.customerDataRestrictedAt),
        ),
      );
    await tx
      .update(draftGrants)
      .set({ revokedAt: now })
      .where(
        and(
          eq(draftGrants.workspaceId, scope.workspaceId),
          eq(draftGrants.leadId, scope.leadId),
          isNull(draftGrants.revokedAt),
        ),
      );
    // Staff may have typed this customer's details into a personal lead view
    // filter. The definer function strips free-text filter values from every
    // view in the workspace (other actors' included) and keeps the views.
    await tx.execute(sql`select app.scrub_lead_view_filters(${scope.workspaceId})`);
  }
  if (scope.orderId) {
    await tx
      .update(orders)
      .set({ customerDataRestrictedAt: now })
      .where(
        and(
          eq(orders.workspaceId, scope.workspaceId),
          eq(orders.id, scope.orderId),
          isNull(orders.customerDataRestrictedAt),
        ),
      );
    await tx
      .update(trackingChallenges)
      .set({ status: 'consumed', consumedAt: now })
      .where(
        and(
          eq(trackingChallenges.workspaceId, scope.workspaceId),
          eq(trackingChallenges.orderId, scope.orderId),
          eq(trackingChallenges.status, 'pending'),
        ),
      );
  }
  if (scope.subjectType === 'region_waitlist') {
    await tx
      .update(regionWaitlist)
      .set({ customerDataRestrictedAt: now })
      .where(
        and(
          eq(regionWaitlist.workspaceId, scope.workspaceId),
          eq(regionWaitlist.id, scope.subjectId),
          isNull(regionWaitlist.customerDataRestrictedAt),
        ),
      );
  }
  const parent = or(
    scope.leadId ? and(eq(files.recordType, 'lead'), eq(files.recordId, scope.leadId)) : undefined,
    scope.orderId
      ? and(eq(files.recordType, 'order'), eq(files.recordId, scope.orderId))
      : undefined,
  );
  if (parent)
    await tx
      .update(files)
      .set({ status: 'deleted', deletedAt: now, updatedAt: now })
      .where(and(eq(files.workspaceId, scope.workspaceId), parent, isNull(files.deletedAt)));
  const linked = or(
    scope.leadId ? eq(followUpSchedules.leadId, scope.leadId) : undefined,
    scope.orderId ? eq(followUpSchedules.orderId, scope.orderId) : undefined,
  );
  if (linked)
    await tx
      .update(followUpSchedules)
      .set({ status: 'cancelled', cancelledReason: 'customer_deletion', updatedAt: now })
      .where(
        and(
          eq(followUpSchedules.workspaceId, scope.workspaceId),
          linked,
          eq(followUpSchedules.status, 'scheduled'),
        ),
      );
  const jobs = or(
    scope.leadId ? sql`${outboxJobs.payload}->>'leadId' = ${scope.leadId}` : undefined,
    scope.orderId ? sql`${outboxJobs.payload}->>'orderId' = ${scope.orderId}` : undefined,
  );
  if (jobs)
    await tx
      .update(outboxJobs)
      .set({
        status: 'completed',
        completedAt: now,
        leaseOwnerId: null,
        leaseExpiresAt: null,
        lockedAt: null,
        lastErrorCode: 'customer_data_restricted',
        providerId: 'skipped:customer_deletion',
        updatedAt: now,
      })
      .where(
        and(
          eq(outboxJobs.workspaceId, scope.workspaceId),
          jobs,
          sql`${outboxJobs.jobType} not in ('deletion_ledger_publish', 'customer_data_cleanup', 'deletion_object_cleanup', 'suppression_ledger_publish')`,
          sql`${outboxJobs.status} in ('pending', 'processing', 'failed', 'uncertain')`,
        ),
      );
}
