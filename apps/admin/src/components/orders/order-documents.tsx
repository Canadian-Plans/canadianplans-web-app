'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StaffFile } from '@canadian-plans/contracts';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@canadian-plans/ui';

import { BackendError, createFileDownloadLink, listOrderFiles, reviewFile } from '../../lib/api';

const STATUS_LABEL: Record<StaffFile['status'], string> = {
  uploading: 'Uploading',
  verifying: 'Verifying',
  available: 'Verified',
  rejected: 'Rejected',
  deleted: 'Deleted',
};

/**
 * Admin Documents panel (T17). Lists the documents attached to an order,
 * lets staff approve/reject each one with a note, and issues a short-lived
 * download link. Downloading calls the backend, which enforces the separate
 * `document.download` permission — a denial here means the signed-in member
 * lacks it, not that the file is missing.
 */
export function OrderDocuments({
  workspaceId,
  accessToken,
  orderId,
}: {
  workspaceId: string;
  accessToken: string;
  orderId: string;
}) {
  const [files, setFiles] = useState<readonly StaffFile[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [busyId, setBusyId] = useState<string>();

  const refresh = useCallback(async () => {
    if (!accessToken || !workspaceId) return;
    try {
      const result = await listOrderFiles(accessToken, workspaceId, orderId);
      setFiles(result.files);
    } catch (error) {
      setMessage(
        error instanceof BackendError
          ? `Could not load documents (${error.code}).`
          : 'Could not load documents.',
      );
    }
  }, [accessToken, workspaceId, orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function decide(file: StaffFile, decision: 'approved' | 'rejected'): Promise<void> {
    setBusyId(file.id);
    setMessage(undefined);
    try {
      const note = notes[file.id]?.trim();
      await reviewFile(accessToken, workspaceId, file.id, {
        decision,
        ...(note ? { note } : {}),
      });
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof BackendError ? `Review failed (${error.code}).` : 'Review failed.',
      );
    } finally {
      setBusyId(undefined);
    }
  }

  async function download(file: StaffFile): Promise<void> {
    setBusyId(file.id);
    setMessage(undefined);
    try {
      const link = await createFileDownloadLink(accessToken, workspaceId, file.id);
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      if (
        error instanceof BackendError &&
        (error.code === 'download_denied' || error.status === 403)
      ) {
        setMessage('You do not have permission to download documents.');
      } else {
        setMessage(
          error instanceof BackendError ? `Download failed (${error.code}).` : 'Download failed.',
        );
      }
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2 className="text-lg">Documents</h2>
        </CardTitle>
        <CardDescription>
          Customer uploads for this order. Downloading an original requires the document-download
          permission.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {message ? (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        ) : null}
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents have been uploaded yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {files.map((file) => (
              <li key={file.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{file.documentType.replace(/_/g, ' ')}</span>
                  <Badge variant={file.status === 'available' ? 'default' : 'outline'}>
                    {STATUS_LABEL[file.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">rev {file.revision}</span>
                  {file.latestReview ? (
                    <Badge
                      variant={
                        file.latestReview.decision === 'approved' ? 'secondary' : 'destructive'
                      }
                    >
                      {file.latestReview.decision}
                    </Badge>
                  ) : null}
                </div>
                {file.rejectReason ? (
                  <p className="mt-1 text-xs text-destructive">Verification: {file.rejectReason}</p>
                ) : null}
                {file.latestReview?.note ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Note: {file.latestReview.note}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-col gap-2">
                  <Input
                    aria-label={`Review note for ${file.documentType}`}
                    placeholder="Optional note"
                    value={notes[file.id] ?? ''}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [file.id]: event.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === file.id || file.status !== 'available'}
                      onClick={() => void decide(file, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === file.id}
                      onClick={() => void decide(file, 'rejected')}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busyId === file.id || file.status !== 'available'}
                      onClick={() => void download(file)}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
