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
  reason: z.string().min(1).max(500),
});
export type DeleteCustomerDataRequest = z.infer<typeof deleteCustomerDataRequestSchema>;

/** `pending_acknowledgement` until the independent deletion ledger acknowledges. */
export const deletionLedgerStatusSchema = z.enum(['pending_acknowledgement', 'acknowledged']);
export type DeletionLedgerStatus = z.infer<typeof deletionLedgerStatusSchema>;

export const deleteCustomerDataResponseSchema = z.object({
  orderId: z.uuid(),
  deletionId: z.uuid(),
  ledgerStatus: deletionLedgerStatusSchema,
  requestId: requestIdSchema,
});
export type DeleteCustomerDataResponse = z.infer<typeof deleteCustomerDataResponseSchema>;
