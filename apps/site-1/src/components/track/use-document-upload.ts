'use client';

import { useCallback, useRef, useState } from 'react';
import { MAX_DOCUMENT_BYTES, type DocumentMediaType } from '@canadian-plans/contracts';
import { trackCopy } from '@content/track';
import type { useHumanChallenge } from '@/components/shared/human-challenge';
import { createTrackingUpload, finalizeTrackingUpload } from '@/app/(track-order)/track/actions';

const ALLOWED: Readonly<Record<string, DocumentMediaType>> = {
  'application/pdf': 'application/pdf',
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
};

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; documentType: string }
  | { status: 'done'; documentType: string }
  | { status: 'error'; documentType: string; message: string; code?: string };

/**
 * One document at a time for an existing order: the browser hashes the file,
 * asks the server for a signed PUT (credential and grant stay server-side), PUTs
 * straight to storage, then finalizes so the backend copy-verifies the bytes.
 */
export function useDocumentUpload(
  reference: string,
  human: ReturnType<typeof useHumanChallenge>,
  onUploaded: () => void,
) {
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const busy = useRef(false);

  const upload = useCallback(
    async (documentType: string, file: File | undefined): Promise<void> => {
      if (!file || busy.current) return;
      const contentType = ALLOWED[file.type];
      if (!contentType) {
        setState({ status: 'error', documentType, message: trackCopy.upload.typeError });
        return;
      }
      if (file.size <= 0 || file.size > MAX_DOCUMENT_BYTES) {
        setState({ status: 'error', documentType, message: trackCopy.upload.sizeError });
        return;
      }
      busy.current = true;
      setState({ status: 'uploading', documentType });
      try {
        const checksum = await sha256Hex(file);
        const intent = await human.run('upload-intent', (turnstileToken) =>
          createTrackingUpload({
            reference,
            documentType,
            fileName: file.name,
            contentType,
            sizeBytes: file.size,
            turnstileToken,
          }),
        );
        if (!intent.ok) {
          setState({ status: 'error', documentType, message: intent.message, code: intent.code });
          return;
        }
        const put = await fetch(intent.data.url, {
          method: intent.data.method,
          headers: intent.data.headers,
          body: file,
        });
        if (!put.ok) {
          setState({ status: 'error', documentType, message: trackCopy.upload.failed });
          return;
        }
        const finalized = await human.run('upload-finalize', (turnstileToken) =>
          finalizeTrackingUpload({
            reference,
            uploadId: intent.data.uploadId,
            checksumSha256: checksum,
            turnstileToken,
          }),
        );
        if (!finalized.ok) {
          setState({
            status: 'error',
            documentType,
            message: finalized.message,
            code: finalized.code,
          });
          return;
        }
        setState({ status: 'done', documentType });
        onUploaded();
      } catch {
        setState({ status: 'error', documentType, message: trackCopy.upload.failed });
      } finally {
        busy.current = false;
      }
    },
    [human, onUploaded, reference],
  );

  return { state, upload, busy: state.status === 'uploading' };
}
