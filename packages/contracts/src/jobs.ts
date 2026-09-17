import { z } from 'zod';

import { isoDateTimeSchema, requestIdSchema } from './common';

export const adminJobStatusSchema = z.enum(['pending', 'processing', 'failed', 'uncertain']);

export const adminJobSchema = z.object({
  id: z.uuid(),
  jobType: z.string().min(1),
  status: adminJobStatusSchema,
  attempts: z.number().int().nonnegative(),
  availableAt: isoDateTimeSchema,
  leaseExpiresAt: isoDateTimeSchema.nullable(),
  lastErrorCode: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const listWorkspaceJobsResponseSchema = z.object({
  jobs: z.array(adminJobSchema),
  canRetry: z.boolean(),
  requestId: requestIdSchema,
});

export const retryWorkspaceJobResponseSchema = z.object({
  jobId: z.uuid(),
  status: z.literal('pending'),
  requestId: requestIdSchema,
});

export type AdminJob = z.infer<typeof adminJobSchema>;
export type AdminJobStatus = z.infer<typeof adminJobStatusSchema>;
export type ListWorkspaceJobsResponse = z.infer<typeof listWorkspaceJobsResponseSchema>;
export type RetryWorkspaceJobResponse = z.infer<typeof retryWorkspaceJobResponseSchema>;
