import { expect, test, type Page } from './fixtures';
import { preArrivalOrderCopy as copy } from '../content/pre-arrival-order';

async function openPreview(page: Page) {
  await page.goto('/order/pre-arrival');
  await expect(page.getByRole('button', { name: 'Continue to documents' })).toBeEnabled();
  const reject = page.getByRole('button', { name: 'Reject non-essential', exact: true });
  if (await reject.isVisible()) await reject.click();
}

test('shows storage failure feedback and leaves the preview usable', async ({ page }) => {
  await page.addInitScript(() => {
    IDBDatabase.prototype.transaction = () => {
      throw new DOMException('TEST ONLY: storage unavailable', 'InvalidStateError');
    };
  });
  await openPreview(page);
  await expect(page.getByText(copy.persistence.unavailable, { exact: true })).toBeVisible();
});

test('collects expired and undated orphan files while preserving fresh records', async ({
  page,
}) => {
  await openPreview(page);
  await page.evaluate(async (dbName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const files = { passportFile: new File(['TEST ONLY'], 'passport.pdf'), permitFile: null };
      store.put(files, 'orphan-legacy');
      store.put({ ...files, savedAt: Date.now() - 2 * 86_400_000 }, 'orphan-expired');
      store.put({ ...files, savedAt: Date.now() }, 'fresh-other-tab');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, copy.persistence.fileKey);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continue to documents' })).toBeEnabled();
  const keys = await page.evaluate(async (dbName) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open(dbName, 1);
      request.onsuccess = () => resolve(request.result);
    });
    const keys = await new Promise<IDBValidKey[]>((resolve) => {
      const request = db.transaction('files', 'readonly').objectStore('files').getAllKeys();
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return keys;
  }, copy.persistence.fileKey);
  expect(keys).toEqual(['fresh-other-tab']);
});

test('restores fresh files, expires old files, and supports clearing the draft', async ({
  page,
}) => {
  await openPreview(page);
  await page.locator('#pa-firstName').fill('Preview');
  await page.locator('#pa-lastName').fill('Customer');
  await page.locator('#pa-email').fill('preview@example.test');
  await page.locator('#pa-phone').fill('+880 17123 45678');
  await page.locator('#pa-arrivalDate').fill('14 / 11 / 2099');
  await page.locator('#pa-city').selectOption('Vancouver');
  await page.getByRole('button', { name: 'Continue to documents' }).click();
  await page.getByLabel('Passport photo page', { exact: true }).setInputFiles({
    name: 'passport.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  });
  await expect
    .poll(async () =>
      page.evaluate(async (dbName) => {
        const key = sessionStorage.getItem(dbName);
        const db = await new Promise<IDBDatabase>((resolve) => {
          const request = indexedDB.open(dbName, 1);
          request.onsuccess = () => resolve(request.result);
        });
        const saved = await new Promise<boolean>((resolve) => {
          if (!key) return resolve(false);
          const request = db.transaction('files', 'readonly').objectStore('files').get(key);
          request.onsuccess = () => resolve(typeof request.result?.savedAt === 'number');
        });
        db.close();
        return saved;
      }, copy.persistence.fileKey),
    )
    .toBe(true);
  await page.reload();
  await expect(page.locator('#pa-passportFile')).toContainText('passport.png');
  await page.evaluate(async (dbName) => {
    const key = sessionStorage.getItem(dbName);
    if (!key) throw new Error('missing preview tab key');
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open(dbName, 1);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const request = store.get(key);
      request.onsuccess = () =>
        store.put({ ...request.result, savedAt: Date.now() - 2 * 86_400_000 }, key);
      tx.oncomplete = () => resolve();
    });
    db.close();
  }, copy.persistence.fileKey);
  await page.reload();
  await expect(page.locator('#pa-passportFile')).not.toContainText('passport.png');
  await page.getByRole('button', { name: 'Clear saved draft' }).click();
  // Clearing awaits IndexedDB; observe completion before testing a refresh.
  await expect(page.locator('#pa-firstName')).toHaveValue('');
  await page.reload();
  await expect(page.locator('#pa-firstName')).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
