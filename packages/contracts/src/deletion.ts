import { z } from 'zod';

import { requestIdSchema } from './common';

/**
 * Customer-data deletion — `POST /staff/workspaces/:id/orders/:orderId/deletion`
 * (T21, REQ 24/34). Caller: staff session holding the `deletion` permission,
 * which maps to the privileged `record.delete` action (verified `aal2` for
 * Owner/Finance). The response reports the local deletion intent; the durable
 * ledger acknowledgement happens after commit through the outbox.
 */

export const deleteCustomerDataRequestSchema = z.object({
  /** Staff reason for the deletion. Must not contain the customer's personal data. */
  reason: z.string().trim().min(1).max(500),
});
export type DeleteCustomerDataRequest = z.infer<typeof deleteCustomerDataRequestSchema>;

/** `pending_acknowledgement` until the independent deletion ledger acknowledges. */
export const deletionLedgerStatusSchema = z.enum(['pending_acknowledgement', 'acknowledged']);
export type DeletionLedgerStatus = z.infer<typeof deletionLedgerStatusSchema>;

export const deleteCustomerDataResponseSchema = z.object({
  orderId: z.uuid(),
  deletionId: z.uuid(),
  ledgerStatus: deletionLedgerStatusSchema,
  cleanupStatus: z.enum(['pending', 'completed']).optional(),
  requestId: requestIdSchema,
});
export type DeleteCustomerDataResponse = z.infer<typeof deleteCustomerDataResponseSchema>;

export const deletionSubjectTypeSchema = z.enum(['order', 'lead', 'region_waitlist']);
export type DeletionSubjectType = z.infer<typeof deletionSubjectTypeSchema>;
export const deletionCleanupStatusSchema = z.enum(['pending', 'completed']);
export const requestSubjectDeletionResponseSchema = z.object({
  subjectType: deletionSubjectTypeSchema,
  subjectId: z.uuid(),
  deletionId: z.uuid(),
  ledgerStatus: deletionLedgerStatusSchema,
  cleanupStatus: deletionCleanupStatusSchema,
  requestId: requestIdSchema,
});
export type RequestSubjectDeletionResponse = z.infer<typeof requestSubjectDeletionResponseSchema>;
export const findDeletionSubjectsRequestSchema = z.object({
  email: z.email().max(254),
  page: z.number().int().min(1).max(10000).default(1),
});
export type FindDeletionSubjectsRequest = z.input<typeof findDeletionSubjectsRequestSchema>;
export const findDeletionSubjectsResponseSchema = z.object({
  page: z.number().int().positive(),
  hasMore: z.boolean(),
  subjects: z.array(
    z.object({
      subjectType: deletionSubjectTypeSchema,
      subjectId: z.uuid(),
      reference: z.string().nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
  requestId: requestIdSchema,
});
export type FindDeletionSubjectsResponse = z.infer<typeof findDeletionSubjectsResponseSchema>;
