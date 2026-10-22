import { preArrivalOrderCopy as copy } from '@content/pre-arrival-order';
/**
 * Browser-only, tab-scoped blobs; never an upload or a server credential.
 * Expired and undated legacy copies are collected whenever storage opens,
 * including copies orphaned by a closed tab. No background deletion is promised
 * while this origin is inactive. This is a preview cache, not server retention.
 */
const dbName = copy.persistence.fileKey;
const restoreWindowMs = 24 * 60 * 60 * 1_000;
type PreviewFiles = { passportFile: File | null; permitFile: File | null };
const empty: PreviewFiles = { passportFile: null, permitFile: null };
function purgeExpiredFiles(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    const tx = db.transaction('files', 'readwrite');
    const cursorRequest = tx.objectStore('files').openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      const value: unknown = cursor.value;
      const savedAt =
        typeof value === 'object' && value !== null && 'savedAt' in value
          ? value.savedAt
          : undefined;
      if (
        typeof savedAt !== 'number' ||
        !Number.isFinite(savedAt) ||
        savedAt > now ||
        now - savedAt >= restoreWindowMs
      )
        cursor.delete();
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => {
      reject(new Error('Preview storage unavailable'));
    };
  });
}
function openFiles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => {
      const db = request.result;
      void purgeExpiredFiles(db).then(
        () => resolve(db),
        (error: unknown) => {
          db.close();
          reject(error);
        },
      );
    };
    request.onerror = () => reject(new Error('Preview storage unavailable'));
  });
}
export function fileTabKey(): string {
  const key = sessionStorage.getItem(dbName);
  if (key) return key;
  const created = crypto.randomUUID();
  sessionStorage.setItem(dbName, created);
  return created;
}
export async function readPreviewFiles(): Promise<PreviewFiles> {
  const db = await openFiles();
  try {
    return await new Promise((resolve, reject) => {
      const store = db.transaction('files', 'readonly').objectStore('files');
      const r = store.get(fileTabKey());
      r.onsuccess = () => {
        const v: unknown = r.result;
        if (typeof v === 'object' && v !== null && 'passportFile' in v && 'permitFile' in v)
          resolve({
            passportFile: v.passportFile instanceof File ? v.passportFile : null,
            permitFile: v.permitFile instanceof File ? v.permitFile : null,
          });
        else resolve(empty);
      };
      r.onerror = () => reject(new Error('Preview storage unavailable'));
    });
  } finally {
    db.close();
  }
}
export async function writePreviewFiles(files: PreviewFiles | null): Promise<void> {
  const db = await openFiles();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      if (files) store.put({ ...files, savedAt: Date.now() }, fileTabKey());
      else store.delete(fileTabKey());
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Preview storage unavailable'));
      tx.onabort = () => reject(new Error('Preview storage unavailable'));
    });
  } finally {
    db.close();
  }
}
