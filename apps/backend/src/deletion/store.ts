import { and, eq, or, sql } from 'drizzle-orm';
import {
  auditEvents,
  deletionIntents,
  leads,
  orderAmendments,
  orderChangeRequests,
  orderNotes,
  orderReminders,
  orders,
  outboxJobs,
  withTenantTx,
} from '@canadian-plans/db';

/**
 * Customer-data deletion for an order (T21, REQ 24/34). One transaction
 * restricts every linked personal copy this branch owns, keeps the minimal
 * commercial record (`reference`, `snapshot`), writes an audit entry with no
 * deleted personal data, and commits a local deletion intent to drive the
 * external ledger.
 *
 * Seams for the parallel branches (documented, not implemented here because the
 * tables do not exist on this branch): T17 file revisions/objects and T18
 * email records / suppressions / follow-up schedules. `order_reminders` is the
 * scheduled-follow-up mechanism that does exist here and is removed.
 */

export interface DeleteCustomerDataInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  orderId: string;
  reason: string;
}

export type DeleteCustomerDataOutcome =
  { status: 'deleted'; deletionId: string } | { status: 'not_found' };

export interface DeletionStore {
  deleteCustomerData(input: DeleteCustomerDataInput): Promise<DeleteCustomerDataOutcome>;
}

type DeletionDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;
const defaultDatabase: DeletionDatabase = { withTenantTx };

export class DatabaseDeletionStore implements DeletionStore {
  constructor(private readonly database: DeletionDatabase = defaultDatabase) {}

  async deleteCustomerData(input: DeleteCustomerDataInput): Promise<DeleteCustomerDataOutcome> {
    return this.database.withTenantTx(
      { workspaceId: input.workspaceId, actorId: input.actorId },
      async (tx) => {
        const [order] = await tx
          .select({ id: orders.id, leadId: orders.leadId })
          .from(orders)
          .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, input.orderId)))
          .limit(1);
        if (!order) return { status: 'not_found' };

        const now = new Date();
        const orderScope = and(
          eq(orders.workspaceId, input.workspaceId),
          eq(orders.id, input.orderId),
        );

        // Restrict the order envelope: drop the customer form and consent. The
        // commercial snapshot and reference are the retained commercial record.
        await tx
          .update(orders)
          .set({ payload: {}, consent: null, updatedAt: now })
          .where(orderScope);

        // Restrict the lead's personal contact and form.
        await tx
          .update(leads)
          .set({
            fullName: null,
            email: null,
            phone: null,
            countryCode: null,
            payload: null,
            updatedAt: now,
          })
          .where(and(eq(leads.workspaceId, input.workspaceId), eq(leads.id, order.leadId)));

        // Remove child rows that carry personal free text or proposed personal edits.
        await tx
          .delete(orderNotes)
          .where(
            and(
              eq(orderNotes.workspaceId, input.workspaceId),
              eq(orderNotes.orderId, input.orderId),
            ),
          );
        await tx
          .delete(orderAmendments)
          .where(
            and(
              eq(orderAmendments.workspaceId, input.workspaceId),
              eq(orderAmendments.orderId, input.orderId),
            ),
          );
        await tx
          .delete(orderChangeRequests)
          .where(
            and(
              eq(orderChangeRequests.workspaceId, input.workspaceId),
              eq(orderChangeRequests.orderId, input.orderId),
            ),
          );
        // Scheduled follow-up reminders for this order stop immediately.
        await tx
          .delete(orderReminders)
          .where(
            and(
              eq(orderReminders.workspaceId, input.workspaceId),
              eq(orderReminders.orderId, input.orderId),
            ),
          );

        // Keep audit rows (who/when/action) but remove personal before/after values.
        await tx
          .update(auditEvents)
          .set({ before: null, after: null })
          .where(
            and(
              eq(auditEvents.workspaceId, input.workspaceId),
              or(
                and(eq(auditEvents.entity, 'order'), eq(auditEvents.entityId, input.orderId)),
                and(eq(auditEvents.entity, 'lead'), eq(auditEvents.entityId, order.leadId)),
              ),
            ),
          );

        // Scrub queued job payloads that reference this order or lead; the job
        // rows themselves remain for operational visibility.
        await tx
          .update(outboxJobs)
          .set({ payload: {}, updatedAt: now })
          .where(
            and(
              eq(outboxJobs.workspaceId, input.workspaceId),
              or(
                sql`${outboxJobs.payload}->>'orderId' = ${input.orderId}`,
                sql`${outboxJobs.payload}->>'leadId' = ${order.leadId}`,
              ),
            ),
          );

        // Audit the deletion. The reason is the staff reason; the deleted
        // personal data is never copied here.
        await tx.insert(auditEvents).values({
          workspaceId: input.workspaceId,
          actorId: input.actorId,
          actorLabel: 'staff',
          action: 'order.customer_data_deleted',
          entity: 'order',
          entityId: input.orderId,
          before: null,
          after: { reason: input.reason },
          requestId: input.requestId,
        });

        // Local intent (identifiers + action only). Publishing to the external
        // ledger happens after commit through the outbox.
        const [intent] = await tx
          .insert(deletionIntents)
          .values({
            workspaceId: input.workspaceId,
            action: 'delete_customer_data',
            subjectType: 'order',
            subjectId: input.orderId,
            status: 'pending',
            reason: input.reason,
            actorId: input.actorId,
          })
          .returning({ id: deletionIntents.id });
        if (!intent) throw new Error('deletion intent insert did not return a row');

        await tx.insert(outboxJobs).values({
          workspaceId: input.workspaceId,
          jobType: 'deletion_ledger_publish',
          dedupeKey: intent.id,
          payload: { deletionId: intent.id, orderId: input.orderId },
        });

        return { status: 'deleted', deletionId: intent.id };
      },
    );
  }
}
