import { z } from 'zod';

import { isoDateTimeSchema, requestIdSchema } from './common';
import {
  documentChecklistKeySchema,
  documentMediaTypeSchema,
  documentParentTypeSchema,
} from './domain';

/**
 * Stored document metadata and short-lived download links —
 * `POST /files/:id/download-link`. Caller: an actor with document permission
 * on the parent record (customer grant, partner, or staff). Files are private
 * and served only via signed URLs after a permission check (invariant 8). No
 * handler here; A3 implements R2 access.
 */

/** A verified file's lifecycle. `available` is reached only after signature + checksum checks pass. */
export const fileStatusSchema = z.enum(['quarantined', 'available', 'rejected', 'tombstoned']);
export type FileStatus = z.infer<typeof fileStatusSchema>;

/** Non-secret metadata for one stored object. The object key itself never leaves the backend. */
export const fileSummarySchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  parentType: documentParentTypeSchema,
  parentId: z.uuid(),
  documentType: documentChecklistKeySchema,
  contentType: documentMediaTypeSchema,
  sizeBytes: z.int().nonnegative(),
  status: fileStatusSchema,
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/, 'lower-case hex SHA-256'),
  createdAt: isoDateTimeSchema,
});
export type FileSummary = z.infer<typeof fileSummarySchema>;

/**
 * A short-lived signed GET URL, treated as a bearer capability with a short
 * expiry (invariant 8). Served with attachment disposition and nosniff.
 */
export const createDownloadLinkResponseSchema = z.object({
  url: z.url(),
  expiresAt: isoDateTimeSchema,
  requestId: requestIdSchema,
});
export type CreateDownloadLinkResponse = z.infer<typeof createDownloadLinkResponseSchema>;
