import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { type TenantTransaction, fileReviewEvents, files, orders } from '@canadian-plans/db';
import { documentChecklistKeySchema } from '@canadian-plans/contracts';
import { z } from 'zod';

/**
 * The document prerequisite for the fulfilment transitions (OPEN_INPUTS #15).
 *
 * "Required" is per plan/product: the offer's `documentChecklist`, frozen into
 * the order snapshot at submission, so a later catalogue edit never changes
 * what an in-flight order requires. Payment state is deliberately **not** a
 * prerequisite — the owner receives payment both before and after fulfilment
 * depending on the customer.
 *
 * A document type counts as satisfied only when some attached file of that
 * type (`files.status = 'available'`) has a latest staff review decision of
 * `approved`. Byte verification and review are independent: an attached but
 * never-reviewed file does not satisfy the prerequisite, and neither does one
 * whose most recent decision was `rejected`.
 */

/** Transitions that require the order's checklist to be satisfied. */
const gatedTransitions: ReadonlySet<string> = new Set([
  'ready_for_delivery',
  'dispatched',
  'activated',
]);

export function requiresDocumentPrerequisite(toStatus: string): boolean {
  return gatedTransitions.has(toStatus);
}

const snapshotSchema = z.object({
  documentChecklist: z.array(documentChecklistKeySchema).optional(),
});

/**
 * The document types this order requires, read from its frozen snapshot. An
 * absent or unparseable checklist yields none rather than throwing: an order
 * whose snapshot predates the field simply has no document prerequisite.
 */
export function requiredDocumentsFrom(snapshot: unknown): readonly string[] {
  return snapshotSchema.safeParse(snapshot ?? {}).data?.documentChecklist ?? [];
}

export interface AttachedFile {
  id: string;
  documentType: string;
}
export interface ReviewRow {
  fileId: string;
  decision: string;
}

/**
 * Reduces attached files plus their review history to the required document
 * types still outstanding. Pure, so the rules live here rather than in SQL:
 *
 * - `reviewsNewestFirst` must be ordered newest first; only a file's most
 *   recent decision counts, so a rejected-then-reapproved file is satisfied.
 * - A type is satisfied if **any** attached file of that type is approved,
 *   which is what makes a re-upload after a rejection work.
 * - An attached but never-reviewed file satisfies nothing.
 */
export function unsatisfiedDocumentTypes(input: {
  attached: readonly AttachedFile[];
  reviewsNewestFirst: readonly ReviewRow[];
  required: readonly string[];
}): readonly string[] {
  const latestDecision = new Map<string, string>();
  for (const review of input.reviewsNewestFirst) {
    if (!latestDecision.has(review.fileId)) latestDecision.set(review.fileId, review.decision);
  }
  const approvedTypes = new Set(
    input.attached
      .filter((file) => latestDecision.get(file.id) === 'approved')
      .map((file) => file.documentType),
  );
  return input.required.filter((documentType) => !approvedTypes.has(documentType));
}

/**
 * The required document types that are **not** satisfied for this order, in
 * checklist order. Empty means the prerequisite is met.
 */
export async function findUnsatisfiedDocuments(
  tx: TenantTransaction,
  input: { workspaceId: string; orderId: string; required: readonly string[] },
): Promise<readonly string[]> {
  if (input.required.length === 0) return [];

  const [order] = await tx
    .select({ leadId: orders.leadId })
    .from(orders)
    .where(and(eq(orders.workspaceId, input.workspaceId), eq(orders.id, input.orderId)))
    .limit(1);
  if (!order) return [...input.required];

  const attached = await tx
    .select({ id: files.id, documentType: files.documentType })
    .from(files)
    .where(
      and(
        eq(files.workspaceId, input.workspaceId),
        or(
          and(eq(files.recordType, 'order'), eq(files.recordId, input.orderId)),
          and(eq(files.recordType, 'lead'), eq(files.recordId, order.leadId)),
        ),
        eq(files.status, 'available'),
      ),
    );
  if (attached.length === 0) return [...input.required];

  const reviews = await tx
    .select({ fileId: fileReviewEvents.fileId, decision: fileReviewEvents.decision })
    .from(fileReviewEvents)
    .where(
      and(
        eq(fileReviewEvents.workspaceId, input.workspaceId),
        inArray(
          fileReviewEvents.fileId,
          attached.map((file) => file.id),
        ),
      ),
    )
    .orderBy(desc(fileReviewEvents.createdAt));

  return unsatisfiedDocumentTypes({
    attached,
    reviewsNewestFirst: reviews,
    required: input.required,
  });
}
