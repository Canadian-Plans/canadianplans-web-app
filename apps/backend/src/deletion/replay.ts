import { and, eq } from 'drizzle-orm';
import {
  deletionIntents,
  emailSuppressions,
  leads,
  orders,
  withTenantTx,
} from '@canadian-plans/db';
import { ledgerEventSchema } from '@canadian-plans/jobs/restore';
import { z } from 'zod';
import { DatabaseCustomerCleanup, enqueueCustomerCleanup } from './cleanup.js';
import { restrictSubject } from './store.js';

const RESTORE_ACTOR = '00000000-0000-4000-8000-0000000000d2';
type ReplayDatabase = Pick<import('@canadian-plans/db').DatabaseClient, 'withTenantTx'>;

/** Bind only to the isolated restore target, as reconcileLedger's validated
 * callback. No publisher/provider call or job dispatch occurs here. The restore
 * CLI remains closed until its independently authenticated reader is wired. */
export function createDatabaseLedgerReplay(
  database: ReplayDatabase = { withTenantTx },
): (input: unknown) => Promise<void> {
  return async (input) => {
    const event = ledgerEventSchema.parse(input);
    const workspaceId = z.uuid().parse(event.workspaceId);
    const eventId = z.uuid().parse(event.eventId);
    if (event.action === 'suppress_contact') {
      await database.withTenantTx({ workspaceId, actorId: RESTORE_ACTOR }, async (tx) => {
        await tx
          .insert(emailSuppressions)
          .values({
            workspaceId,
            contactHash: event.subjectId,
            reason: event.reason,
            sourceEventId: eventId,
          })
          .onConflictDoNothing();
      });
      return;
    }
    const subjectId = z.uuid().parse(event.subjectId);
    let leadId = event.subjectType === 'lead' ? subjectId : event.relatedLeadId;
    if (event.subjectType === 'region_waitlist' && event.relatedLeadId)
      throw new Error('deletion_scope_mismatch');
    if (event.subjectType === 'lead' && event.relatedLeadId && event.relatedLeadId !== subjectId)
      throw new Error('deletion_scope_mismatch');
    await database.withTenantTx({ workspaceId, actorId: RESTORE_ACTOR }, async (tx) => {
      if (event.subjectType === 'order') {
        const [order] = await tx
          .select({ leadId: orders.leadId })
          .from(orders)
          .where(and(eq(orders.workspaceId, workspaceId), eq(orders.id, subjectId)))
          .limit(1);
        if (leadId && order && order.leadId !== leadId) throw new Error('deletion_scope_mismatch');
        leadId ??= order?.leadId;
        // An older backup may predate the order while still containing its
        // draft and documents. New events carry that explicit lead scope.
        if (!leadId) throw new Error('deletion_scope_unresolved');
      }
      if (leadId)
        await tx
          .select({ id: leads.id })
          .from(leads)
          .where(and(eq(leads.workspaceId, workspaceId), eq(leads.id, leadId)))
          .for('update');
      if (event.subjectType === 'lead') {
        const [converted] = await tx
          .select({ id: orders.id })
          .from(orders)
          .where(and(eq(orders.workspaceId, workspaceId), eq(orders.leadId, subjectId)))
          .limit(1);
        if (converted) throw new Error('deletion_scope_mismatch');
      }
      await restrictSubject(tx, {
        workspaceId,
        subjectType: event.subjectType,
        subjectId,
        leadId,
        orderId: event.subjectType === 'order' ? subjectId : undefined,
      });
      const [existing] = await tx
        .select()
        .from(deletionIntents)
        .where(and(eq(deletionIntents.workspaceId, workspaceId), eq(deletionIntents.id, eventId)))
        .limit(1)
        .for('update');
      if (
        existing &&
        (existing.subjectType !== event.subjectType ||
          existing.subjectId !== subjectId ||
          (existing.relatedLeadId && existing.relatedLeadId !== leadId))
      )
        throw new Error('deletion_scope_mismatch');
      if (!existing)
        await tx.insert(deletionIntents).values({
          id: eventId,
          workspaceId,
          action: 'delete_customer_data',
          subjectType: event.subjectType,
          subjectId,
          relatedLeadId: leadId,
          actorId: RESTORE_ACTOR,
          status: 'acknowledged',
          ledgerAckId: `restore:${event.versionId}`,
          acknowledgedAt: new Date(),
          createdAt: new Date(event.occurredAt),
        });
      else
        await tx
          .update(deletionIntents)
          .set({
            status: 'acknowledged',
            relatedLeadId: leadId,
            ledgerAckId: existing.ledgerAckId ?? `restore:${event.versionId}`,
            acknowledgedAt: existing.acknowledgedAt ?? new Date(),
            lastErrorCode: null,
          })
          .where(
            and(eq(deletionIntents.workspaceId, workspaceId), eq(deletionIntents.id, eventId)),
          );
      await enqueueCustomerCleanup(tx, workspaceId, eventId);
    });
    // Erase restored personal records before the reconciliation callback returns.
    // Private-object work remains durable and access stays restricted throughout.
    await new DatabaseCustomerCleanup(database).run({
      workspaceId,
      actorId: RESTORE_ACTOR,
      deletionId: eventId,
    });
  };
}
