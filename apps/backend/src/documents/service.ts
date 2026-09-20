import type {
  DocumentMediaType,
  R2DocumentStore,
  VerifyUploadRejection,
} from '@canadian-plans/adapters';
import type { DocumentParentType, FileReviewDecision } from '@canadian-plans/contracts';

import {
  CLEANUP_GRACE_SECONDS,
  DOWNLOAD_LINK_TTL_SECONDS,
  MAX_DOCUMENT_UPLOAD_BYTES,
  UPLOAD_INTENT_TTL_SECONDS,
  documentBucket,
} from './config.js';
import { candidateKey, sanitizedDownloadFilename, stagingKey } from './keys.js';
import type { DocumentRecordStore, FileRow, StaffFileRow } from './store.js';

/**
 * Resolves the commercial context a document needs: the allowed checklist types
 * for a parent record (so an off-checklist upload is refused — REQ 23) and,
 * for the admin panel, the lead a submitted order came from. `found: false`
 * means the parent is not in this workspace, which is how a foreign or unknown
 * attachment id is rejected without leaking its existence.
 */
export interface DocumentContextResolver {
  resolveChecklist(input: {
    workspaceId: string;
    actorId: string;
    recordType: DocumentParentType;
    recordId: string;
  }): Promise<{ found: false } | { found: true; allowed: readonly string[] }>;
  resolveOrderLeadId(input: {
    workspaceId: string;
    actorId: string;
    orderId: string;
  }): Promise<string | undefined>;
}

export interface CreateIntentInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  recordType: DocumentParentType;
  recordId: string;
  documentType: string;
  declaredContentType: DocumentMediaType;
  declaredSizeBytes: number;
}

export type CreateIntentOutcome =
  | {
      status: 'created';
      uploadId: string;
      url: string;
      headers: Record<string, string>;
      expiresAt: Date;
    }
  | { status: 'parent_not_found' }
  | { status: 'checklist_mismatch' }
  | { status: 'too_large' };

export interface FinalizeInput {
  workspaceId: string;
  actorId: string;
  requestId: string;
  fileId: string;
  checksumSha256: string;
  /** When set (website caller), the file must be a lead document owned by this lead. */
  ownedLeadId?: string;
}

export type FinalizeOutcome =
  | { status: 'available'; file: FileRow }
  | { status: 'rejected'; file: FileRow | null; reason: VerifyUploadRejection }
  | { status: 'in_progress' }
  | { status: 'expired' }
  | { status: 'not_found' };

export type DownloadOutcome =
  | { status: 'issued'; url: string; expiresAt: Date }
  | { status: 'not_found' }
  | { status: 'not_available' };

export interface DocumentServiceOptions {
  maxBytes?: number;
  intentTtlSeconds?: number;
  downloadTtlSeconds?: number;
  cleanupGraceSeconds?: number;
  bucket?: string;
  now?: () => Date;
}

/**
 * Orchestrates the secure upload/verify/attach/download lifecycle. All external
 * R2 work happens outside any DB transaction/row lock (invariant 7); the store's
 * conditional updates provide the concurrency and idempotency guarantees.
 */
export class DocumentService {
  private readonly maxBytes: number;
  private readonly intentTtlSeconds: number;
  private readonly downloadTtlSeconds: number;
  private readonly cleanupGraceSeconds: number;
  private readonly bucket: string;
  private readonly now: () => Date;

  constructor(
    private readonly store: DocumentRecordStore,
    private readonly r2: R2DocumentStore,
    private readonly resolver: DocumentContextResolver,
    options: DocumentServiceOptions = {},
  ) {
    this.maxBytes = options.maxBytes ?? MAX_DOCUMENT_UPLOAD_BYTES;
    this.intentTtlSeconds = options.intentTtlSeconds ?? UPLOAD_INTENT_TTL_SECONDS;
    this.downloadTtlSeconds = options.downloadTtlSeconds ?? DOWNLOAD_LINK_TTL_SECONDS;
    this.cleanupGraceSeconds = options.cleanupGraceSeconds ?? CLEANUP_GRACE_SECONDS;
    this.bucket = options.bucket ?? documentBucket();
    this.now = options.now ?? (() => new Date());
  }

  async createIntent(input: CreateIntentInput): Promise<CreateIntentOutcome> {
    if (input.declaredSizeBytes > this.maxBytes) return { status: 'too_large' };

    const checklist = await this.resolver.resolveChecklist({
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      recordType: input.recordType,
      recordId: input.recordId,
    });
    if (!checklist.found) return { status: 'parent_not_found' };
    if (!checklist.allowed.includes(input.documentType)) return { status: 'checklist_mismatch' };

    const key = stagingKey(input.workspaceId);
    const presigned = await this.r2.createUpload({
      workspaceId: input.workspaceId,
      stagingKey: key,
      declaredContentType: input.declaredContentType,
      maxBytes: this.maxBytes,
      expiresInSeconds: this.intentTtlSeconds,
    });
    const file = await this.store.createIntent({
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      requestId: input.requestId,
      recordType: input.recordType,
      recordId: input.recordId,
      documentType: input.documentType,
      bucket: this.bucket,
      stagingKey: key,
      declaredContentType: input.declaredContentType,
      declaredSizeBytes: input.declaredSizeBytes,
      expiresAt: new Date(this.now().getTime() + this.intentTtlSeconds * 1000),
    });
    return {
      status: 'created',
      uploadId: file.id,
      url: presigned.url,
      headers: presigned.headers,
      expiresAt: presigned.expiresAt,
    };
  }

  async finalize(input: FinalizeInput): Promise<FinalizeOutcome> {
    // Website callers may only finalize their own lead's document. The record id
    // is immutable, so this pre-check is safe before the atomic claim and stops
    // one draft touching another draft's file within the same workspace.
    if (input.ownedLeadId !== undefined) {
      const owned = await this.store.getFile({
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        fileId: input.fileId,
      });
      if (!owned || owned.recordType !== 'lead' || owned.recordId !== input.ownedLeadId) {
        return { status: 'not_found' };
      }
    }
    const candidate = candidateKey(input.workspaceId);
    const claim = await this.store.claimForVerification({
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      fileId: input.fileId,
      candidateKey: candidate,
      now: this.now(),
    });
    if (claim.status === 'not_found') return { status: 'not_found' };
    if (claim.status === 'expired') return { status: 'expired' };
    if (claim.status === 'in_progress') return { status: 'in_progress' };
    if (claim.status === 'already_available') return { status: 'available', file: claim.file };
    if (claim.status === 'already_rejected') {
      return {
        status: 'rejected',
        file: claim.file,
        reason: rejectionFromReason(claim.file.rejectReason),
      };
    }

    // Claimed: copy staging → candidate and verify the CANDIDATE only.
    const verified = await this.r2.verifyUpload({
      workspaceId: input.workspaceId,
      stagingKey: claim.file.stagingKey,
      candidateKey: candidate,
      expectedChecksumSha256: input.checksumSha256,
      maxBytes: this.maxBytes,
    });

    if (verified.status === 'rejected') {
      await this.store.markRejected({
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        requestId: input.requestId,
        fileId: input.fileId,
        candidateKey: candidate,
        reason: verified.reason,
      });
      return { status: 'rejected', file: null, reason: verified.reason };
    }

    // Attach the exact verified candidate object (never the mutable staging one).
    const attached = await this.store.attachVerified({
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      requestId: input.requestId,
      fileId: input.fileId,
      candidateKey: candidate,
      objectKey: verified.candidateKey,
      detectedMime: verified.detectedMediaType,
      sizeBytes: verified.sizeBytes,
      checksumSha256: verified.checksumSha256,
    });
    if (attached.status === 'lost') {
      // Another finalize won the race; return that consistent outcome.
      const current = await this.store.getFile({
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        fileId: input.fileId,
      });
      if (current?.status === 'available') return { status: 'available', file: current };
      if (current?.status === 'rejected') {
        return { status: 'rejected', file: current, reason: rejectionFromReason(current.rejectReason) };
      }
      return { status: 'in_progress' };
    }
    return { status: 'available', file: attached.file };
  }

  async issueDownload(input: {
    workspaceId: string;
    actorId: string;
    fileId: string;
    /** When set (website caller), the file must be a lead document owned by this lead. */
    ownedLeadId?: string;
  }): Promise<DownloadOutcome> {
    const file = await this.store.getFile(input);
    if (!file) return { status: 'not_found' };
    if (input.ownedLeadId !== undefined) {
      if (file.recordType !== 'lead' || file.recordId !== input.ownedLeadId) {
        return { status: 'not_found' };
      }
    }
    if (file.status !== 'available' || !file.objectKey || !file.detectedMime) {
      return { status: 'not_available' };
    }
    const link = await this.r2.issueDownload({
      workspaceId: input.workspaceId,
      objectKey: file.objectKey,
      fileName: sanitizedDownloadFilename(file.documentType, file.id, file.detectedMime),
      contentType: file.detectedMime,
      expiresInSeconds: this.downloadTtlSeconds,
    });
    return { status: 'issued', url: link.url, expiresAt: link.expiresAt };
  }

  async listForOrder(input: {
    workspaceId: string;
    actorId: string;
    orderId: string;
  }): Promise<{ status: 'found'; files: StaffFileRow[] } | { status: 'not_found' }> {
    const leadId = await this.resolver.resolveOrderLeadId(input);
    if (!leadId) return { status: 'not_found' };
    const [orderFiles, leadFiles] = await Promise.all([
      this.store.listFilesForRecord({
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        recordType: 'order',
        recordId: input.orderId,
      }),
      this.store.listFilesForRecord({
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        recordType: 'lead',
        recordId: leadId,
      }),
    ]);
    return { status: 'found', files: [...leadFiles, ...orderFiles] };
  }

  async review(input: {
    workspaceId: string;
    actorId: string;
    requestId: string;
    fileId: string;
    decision: FileReviewDecision;
    note?: string;
  }): Promise<{ status: 'recorded'; file: StaffFileRow } | { status: 'not_found' }> {
    return this.store.recordReview(input);
  }

  async remove(input: {
    workspaceId: string;
    actorId: string;
    requestId: string;
    fileId: string;
  }): Promise<{ status: 'tombstoned'; file: FileRow } | { status: 'not_found' }> {
    return this.store.tombstone(input);
  }

  async runCleanup(input: {
    workspaceId: string;
    actorId: string;
  }): Promise<{ expiredIntents: number; cleanedObjects: string[] }> {
    return this.store.cleanupExpired({
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      now: this.now(),
      graceSeconds: this.cleanupGraceSeconds,
    });
  }
}

function rejectionFromReason(reason: string | null): VerifyUploadRejection {
  switch (reason) {
    case 'too_large':
    case 'unsupported_signature':
    case 'checksum_mismatch':
    case 'staging_missing':
      return reason;
    default:
      return 'unsupported_signature';
  }
}
