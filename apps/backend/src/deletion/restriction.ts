import { and, eq } from 'drizzle-orm';
import { leads, orders, type TenantTransaction } from '@canadian-plans/db';

/** Acquire the lead before an order write, matching deletion's lock order. */
export async function lockCustomerLeadForOrder(
  tx: TenantTransaction,
  workspaceId: string,
  orderId: string,
): Promise<boolean> {
  const [order] = await tx
    .select({ leadId: orders.leadId })
    .from(orders)
    .where(and(eq(orders.workspaceId, workspaceId), eq(orders.id, orderId)))
    .limit(1);
  if (!order) return false;
  const [lead] = await tx
    .select({ restrictedAt: leads.customerDataRestrictedAt })
    .from(leads)
    .where(and(eq(leads.workspaceId, workspaceId), eq(leads.id, order.leadId)))
    .limit(1)
    .for('share');
  return lead !== undefined && lead.restrictedAt === null;
}

/** Send admission uses the same lead-first lock order as deletion/submission.
 * Locks end with this short transaction, before any provider call. */
export async function customerSubjectActive(
  tx: TenantTransaction,
  workspaceId: string,
  subject: { leadId?: string; orderId?: string },
): Promise<boolean> {
  let leadId = subject.leadId;
  if (subject.orderId) {
    const [order] = await tx
      .select({ leadId: orders.leadId })
      .from(orders)
      .where(and(eq(orders.workspaceId, workspaceId), eq(orders.id, subject.orderId)))
      .limit(1);
    if (!order || (leadId && order.leadId !== leadId)) return false;
    leadId = order.leadId;
  }
  if (leadId) {
    const [lead] = await tx
      .select({ restrictedAt: leads.customerDataRestrictedAt })
      .from(leads)
      .where(and(eq(leads.workspaceId, workspaceId), eq(leads.id, leadId)))
      .limit(1)
      .for('share');
    if (!lead || lead.restrictedAt) return false;
  }
  if (subject.orderId) {
    const [order] = await tx
      .select({ restrictedAt: orders.customerDataRestrictedAt })
      .from(orders)
      .where(and(eq(orders.workspaceId, workspaceId), eq(orders.id, subject.orderId)))
      .limit(1)
      .for('share');
    if (!order || order.restrictedAt) return false;
  }
  return true;
}
