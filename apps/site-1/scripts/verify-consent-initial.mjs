import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const folder = resolve('../../docs/EVIDENCE/audit/final/consent-initial');
await mkdir(folder, { recursive: true });
const records = [];
try {
  for (const stored of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    if (stored)
      await context.addInitScript(() =>
        globalThis.localStorage.setItem(
          'canadian-plans.cookie-choices.v1',
          JSON.stringify({ version: 1, analytics: false, marketing: false }),
        ),
      );
    // The preference decision must work before the application's JavaScript downloads.
    await context.route('**/_next/static/chunks/*.js', (route) => route.abort());
    const page = await context.newPage();
    const response = await page.goto(
      (process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3147') + '/privacy',
    );
    assert.ok((await response.text()).includes('cookie-banner-title'));
    if (stored) await expect(page.locator('.cp-cookie-banner')).toBeHidden();
    else await expect(page.locator('.cp-cookie-banner')).toBeVisible();
    assert.equal(await page.locator('script[data-website-id]').count(), 0);
    records.push({
      stored,
      visible: await page.locator('.cp-cookie-banner').isVisible(),
      applicationScriptsBlocked: true,
    });
    await page.screenshot({ path: resolve(folder, `${stored ? 'returning' : 'new'}-390.png`) });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(resolve(folder, 'results.json'), JSON.stringify(records, null, 2));
}
