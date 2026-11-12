import { createHash, randomUUID } from 'node:crypto';
import {
  createUploadIntentRequestSchema,
  createUploadIntentResponseSchema,
  finalizeUploadRequestSchema,
  finalizeUploadResponseSchema,
  type DocumentMediaType,
} from '@canadian-plans/crm-contracts';
import { z } from 'zod';

import { STORAGE_ORIGIN } from './config';
import { StubError, parseBody, reply, type Reply, type StubRequest } from './http';
import { draftForGrant } from './leads';
import { state, type StoredFile, type StoredUpload } from './state';

/**
 * Customer document uploads for a draft: `POST /website/uploads/intents`, the
 * signed PUT (`PUT /storage/:uploadId` here, standing in for R2) and
 * `POST /website/uploads/:id/finalize`, which checks the bytes as the CRM does:
 * size, SHA-256 and the file signature, never the declared type alone.
 */

const WORKSPACE_ID = '10000000-0000-4000-8000-000000000e01';
const UPLOAD_TTL_MS = 10 * 60 * 1000;

const SIGNATURES: Readonly<Record<DocumentMediaType, (bytes: Buffer) => boolean>> = {
  'application/pdf': (bytes) => bytes.subarray(0, 5).toString('latin1') === '%PDF-',
  'image/png': (bytes) => bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
  'image/jpeg': (bytes) => bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')),
  'image/webp': (bytes) =>
    bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
    bytes.subarray(8, 12).toString('latin1') === 'WEBP',
};

export function openUpload(input: Omit<StoredUpload, 'id' | 'bytes'>): {
  uploadId: string;
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
} {
  const upload: StoredUpload = { ...input, id: randomUUID(), bytes: null };
  state.uploads.set(upload.id, upload);
  return {
    uploadId: upload.id,
    url: `${STORAGE_ORIGIN}/uploads/${upload.id}`,
    method: 'PUT',
    headers: { 'content-type': upload.contentType },
    expiresAt: new Date(Date.now() + UPLOAD_TTL_MS).toISOString(),
  };
}

/** The signed PUT's target: keeps the bytes for the finalize check. */
export function storeUploadBytes(uploadId: string, bytes: Buffer): boolean {
  const upload = state.uploads.get(uploadId);
  if (!upload) return false;
  upload.bytes = bytes;
  return true;
}

/** The upload's verified file, or the CRM's refusal for bytes that do not check out. */
export function verifyUpload(uploadId: string, leadId: string, checksumSha256: string): StoredFile {
  const upload = state.uploads.get(uploadId);
  if (!upload || upload.leadId !== leadId) throw new StubError(404, 'upload_not_found');
  const bytes = upload.bytes;
  const rejected = (reason: string) =>
    new StubError(422, 'document_verification_failed', { reason });
  if (!bytes) throw rejected('object_missing');
  if (bytes.length !== upload.sizeBytes) throw rejected('size_mismatch');
  if (createHash('sha256').update(bytes).digest('hex') !== checksumSha256) {
    throw rejected('checksum_mismatch');
  }
  if (!SIGNATURES[upload.contentType](bytes)) throw rejected('signature_mismatch');
  state.uploads.delete(uploadId);
  return {
    id: upload.id,
    documentType: upload.documentType,
    contentType: upload.contentType,
    sizeBytes: bytes.length,
    checksumSha256,
    createdAt: new Date().toISOString(),
  };
}

export function uploadIdOf(raw: string): string {
  const id = z.uuid().safeParse(raw);
  if (!id.success) throw new StubError(400, 'validation_error');
  return id.data;
}

export function createUploadIntent(request: StubRequest): Reply {
  const body = parseBody(request, createUploadIntentRequestSchema);
  const lead = draftForGrant(request);
  // A customer's upload only ever attaches to the lead their grant edits.
  if (body.parentType !== 'lead' || body.parentId !== lead.id) {
    throw new StubError(401, 'draft_not_found');
  }
  const plan = state.plans.find((candidate) => candidate.id === lead.order?.planId);
  if (!plan?.requiredDocuments.includes(body.documentType)) {
    throw new StubError(409, 'checklist_mismatch');
  }
  const intent = openUpload({
    leadId: lead.id,
    documentType: body.documentType,
    contentType: body.contentType,
    sizeBytes: body.sizeBytes,
  });
  return reply(201, createUploadIntentResponseSchema, { ...intent, requestId: request.requestId });
}

export function finalizeUpload(request: StubRequest, rawUploadId: string): Reply {
  const uploadId = uploadIdOf(rawUploadId);
  const body = parseBody(request, finalizeUploadRequestSchema);
  const lead = draftForGrant(request);
  const file = verifyUpload(uploadId, lead.id, body.checksumSha256);
  lead.files.push(file);
  return reply(200, finalizeUploadResponseSchema, {
    file: {
      id: file.id,
      workspaceId: WORKSPACE_ID,
      parentType: 'lead',
      parentId: lead.id,
      documentType: file.documentType,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
      status: 'available',
      checksumSha256: file.checksumSha256,
      createdAt: file.createdAt,
    },
    requestId: request.requestId,
  });
}
