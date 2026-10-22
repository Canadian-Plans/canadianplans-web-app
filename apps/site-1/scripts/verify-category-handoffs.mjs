import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { installAuditContext } from './audit-context.mjs';

const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const directory = resolve('../../docs/EVIDENCE/category-review');
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const records = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await installAuditContext(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const [query, speed, amount] of [
      ['', '1 Gbps', '$80'],
      ['?plan=internet-bc-500', '500 Mbps', '$70'],
      ['?plan=internet-sk-2000', '2 Gbps', '$60'],
      ['?plan=internet-mb-500', '500 Mbps', '$90'],
      ['?plan=unknown&price=0', '1 Gbps', '$80'],
      ['?plan=internet-bc-500&plan=internet-sk-2000', '1 Gbps', '$80'],
    ]) {
      assert.equal((await page.goto(`${origin}/order/home-internet${query}`))?.status(), 200);
      if (width === 390) await page.locator('.cp-io-mobile-summary').locator('summary').click();
      const summary = page.locator(
        width === 390 ? '.cp-io-mobile-summary' : '.cp-io-desktop-summary',
      );
      await expect(summary.getByRole('heading', { level: 3 })).toHaveText(speed);
      await expect(summary.locator('.cp-io-plan strong')).toHaveText(amount);
      await expect(page.locator('.cp-io-recap')).toContainText(speed);
      await expect(page.locator('.cp-io-recap')).toContainText(`${amount}/mo + tax`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      records.push({ width, query, speed, amount, status: 'passed' });
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  await writeFile(
    resolve(directory, 'internet-handoffs.json'),
    `${JSON.stringify(records, null, 2)}\n`,
  );
  console.info(`${records.length} internet preview checkout handoffs passed.`);
} finally {
  await browser.close();
}
