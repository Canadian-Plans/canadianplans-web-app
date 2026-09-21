import { z } from 'zod';

import { isoDateTimeSchema, requestIdSchema } from './common';

/**
 * Lead-to-order source report — `GET /workspaces/:id/reports/sources` (T20,
 * REQ 35). Caller: staff session with `workspace.read` (every role). Read-only,
 * workspace-scoped and derived from the already-sanitized stored attribution —
 * the report never re-reads raw request data.
 */

export const sourceReportDimensionSchema = z.enum([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'partner',
]);
export type SourceReportDimension = z.infer<typeof sourceReportDimensionSchema>;

export const sourceReportQuerySchema = z.object({
  /** Inclusive lower bound on the lead-created / order-submitted timestamp. */
  from: isoDateTimeSchema.optional(),
  /** Inclusive upper bound. */
  to: isoDateTimeSchema.optional(),
});
export type SourceReportQuery = z.infer<typeof sourceReportQuerySchema>;

/** One `(dimension, value)` bucket with its lead and order counts. */
export const sourceReportGroupSchema = z.object({
  dimension: sourceReportDimensionSchema,
  value: z.string().min(1).max(300),
  leads: z.int().nonnegative(),
  orders: z.int().nonnegative(),
});
export type SourceReportGroup = z.infer<typeof sourceReportGroupSchema>;

export const sourceReportResponseSchema = z.object({
  from: isoDateTimeSchema.nullable(),
  to: isoDateTimeSchema.nullable(),
  groups: z.array(sourceReportGroupSchema),
  totals: z.object({ leads: z.int().nonnegative(), orders: z.int().nonnegative() }),
  requestId: requestIdSchema,
});
export type SourceReportResponse = z.infer<typeof sourceReportResponseSchema>;
