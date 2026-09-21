'use client';

import { useId, useState } from 'react';

import { createDocumentIntent, finalizeDocument } from './actions';
import type { DocumentContentType } from './types';

const ALLOWED: Record<string, DocumentContentType> = {
  'application/pdf': 'application/pdf',
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
};
const MAX_BYTES = 10 * 1024 * 1024;

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'uploaded'; fileName: string }
  | { status: 'error'; message: string };

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface DocumentUploadsProps {
  documentKeys: readonly string[];
  labelFor: (key: string) => string;
  /** Called with the set of checklist keys that now have an attached document. */
  onUploadedChange?: (uploaded: readonly string[]) => void;
}

/**
 * T17 direct-to-R2 uploads for the order form's Documents step. For each
 * checklist item the browser: computes the file's SHA-256, asks the server for
 * a signed PUT (server action, service credential + draft grant stay on the
 * server), PUTs the bytes straight to R2, then finalizes so the backend can
 * copy-verify-attach. The service credential and object keys never reach the
 * browser.
 */
export function DocumentUploads({
  documentKeys,
  labelFor,
  onUploadedChange,
}: DocumentUploadsProps) {
  const baseId = useId();
  const [states, setStates] = useState<Record<string, UploadState>>({});

  function update(key: string, next: UploadState, uploaded?: Set<string>): void {
    setStates((current) => {
      const merged = { ...current, [key]: next };
      if (onUploadedChange) {
        const done =
          uploaded ??
          new Set(
            Object.entries(merged)
              .filter(([, s]) => s.status === 'uploaded')
              .map(([k]) => k),
          );
        onUploadedChange([...done]);
      }
      return merged;
    });
  }

  async function handleFile(key: string, file: File | undefined): Promise<void> {
    if (!file) return;
    const contentType = ALLOWED[file.type];
    if (!contentType) {
      update(key, { status: 'error', message: 'Choose a PDF, JPG or PNG file.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      update(key, { status: 'error', message: 'That file is larger than the 10 MB limit.' });
      return;
    }
    update(key, { status: 'uploading' });
    try {
      const checksum = await sha256Hex(file);
      const intent = await createDocumentIntent({
        documentType: key,
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
      });
      if (!intent.ok) {
        update(key, { status: 'error', message: intent.message });
        return;
      }
      const put = await fetch(intent.url, {
        method: intent.method,
        headers: intent.headers,
        body: file,
      });
      if (!put.ok) {
        update(key, { status: 'error', message: 'The upload did not complete. Please try again.' });
        return;
      }
      const finalized = await finalizeDocument({
        uploadId: intent.uploadId,
        checksumSha256: checksum,
      });
      if (!finalized.ok) {
        update(key, { status: 'error', message: finalized.message });
        return;
      }
      update(key, { status: 'uploaded', fileName: file.name });
    } catch {
      update(key, {
        status: 'error',
        message: 'The upload could not be completed. Please try again.',
      });
    }
  }

  return (
    <ul className="space-y-4">
      {documentKeys.map((key) => {
        const state = states[key] ?? { status: 'idle' };
        const inputId = `${baseId}-${key}`;
        return (
          <li key={key} className="space-y-1">
            <label htmlFor={inputId} className="font-medium">
              {labelFor(key)}
            </label>
            <input
              id={inputId}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              disabled={state.status === 'uploading'}
              onChange={(event) => void handleFile(key, event.target.files?.[0])}
              className="block w-full text-sm"
              aria-describedby={`${inputId}-status`}
            />
            <p id={`${inputId}-status`} className="text-sm text-muted-foreground" role="status">
              {state.status === 'idle' ? 'PDF, JPG or PNG, up to 10 MB.' : null}
              {state.status === 'uploading' ? 'Uploading and verifying…' : null}
              {state.status === 'uploaded' ? `Uploaded ${state.fileName}. Verified.` : null}
              {state.status === 'error' ? state.message : null}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
