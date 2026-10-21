import { installAuditContext } from './audit-context.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
/* global document, innerWidth -- Browser evaluations. */
const appRoot = fileURLToPath(new URL('../', import.meta.url));
const evidence = path.resolve(appRoot, '../../docs/EVIDENCE/home-internet');
const origin = process.env.INTERNET_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const results = [];
const shotStyle = 'nextjs-portal{visibility:hidden;}';
async function audit(page, selector) {
  return (
    await new AxeBuilder({ page })
      .include(selector)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
  ).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }));
}
async function assets(page, selector) {
  const rows = await page.locator(`${selector} img[data-figma-asset]`).evaluateAll((es) =>
    es
      .filter((e) => e.getClientRects().length > 0)
      .map((e) => ({
        src: e.getAttribute('src'),
        width: e.getBoundingClientRect().width,
        height: e.getBoundingClientRect().height,
        expectedWidth: Number(e.getAttribute('width')),
        expectedHeight: Number(e.getAttribute('height')),
        loaded: e.complete && e.naturalWidth > 0,
      })),
  );
  for (const row of rows) {
    assert.ok(row.loaded, row.src);
    assert.ok(
      Math.abs(row.width - row.expectedWidth) < 0.15 &&
        Math.abs(row.height - row.expectedHeight) < 0.15,
      `Asset geometry ${row.src}`,
    );
    const root = (await readFile(path.join(appRoot, 'public', row.src), 'utf8')).match(
      /<svg\b[^>]*>/,
    )?.[0];
    assert.ok(
      root?.includes(`width="${row.expectedWidth}"`) &&
        root.includes(`height="${row.expectedHeight}"`),
    );
  }
  return rows;
}
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      }),
      page = await context.newPage();
    await installAuditContext(context);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    assert.equal(
      (await page.goto(`${origin}/home-internet`, { waitUntil: 'networkidle' }))?.status(),
      200,
    );
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Fast home internet from move-in day.',
    );
    await page.screenshot({
      path: path.join(evidence, `page-${width}.png`),
      fullPage: true,
      style: shotStyle,
    });
    for (const [name, selector] of [
      ['hero', '.cp-internet-hero'],
      ['finder', '#speed-finder'],
      ['plans', '#internet-plans'],
      ['comparison', '#compare'],
      ['tv', '.cp-internet-tv'],
      ['equipment', '#installation'],
      ['coverage', '#coverage'],
      ['reviews', '.cp-internet-reviews'],
      ['faq', '#faq'],
      ['final', '.cp-internet-final'],
    ])
      await page
        .locator(selector)
        .screenshot({ path: path.join(evidence, `${name}-${width}.png`), style: shotStyle });
    const geometry = await page
      .locator('main>section')
      .evaluateAll((es) =>
        es.map((e) => ({ section: e.id || e.className, height: e.getBoundingClientRect().height })),
      );
    const initialAssets = await assets(page, '.cp-internet');
    const initialAudit = await audit(page, '.cp-internet');
    console.info(JSON.stringify({ width, geometry, initialAudit }, null, 2));
    await writeFile(
      path.join(evidence, `initial-${width}.json`),
      JSON.stringify({ geometry, initialAudit, initialAssets }, null, 2) + '\n',
    );
    assert.deepEqual(initialAudit, []);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Overflow ${width}`,
    );
    const mainForm = page.locator('#address-check');
    await mainForm.getByLabel('Postal code', { exact: true }).fill('V3T 1Z');
    await mainForm.getByRole('button', { name: 'Check availability', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('That postal code looks incomplete');
    await expect(dialog.getByLabel('Postal code', { exact: true })).toHaveValue('V3T 1Z');
    await expect(dialog.getByLabel('Postal code', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await dialog.screenshot({
      path: path.join(evidence, `invalid-${width}.png`),
      style: shotStyle,
    });
    assert.deepEqual(await audit(page, '.cp-internet-result-dialog'), []);
    await assets(page, '.cp-internet-result-dialog');
    await dialog.getByLabel('Postal code', { exact: true }).fill('V3T 1Z2');
    await dialog.getByRole('button', { name: 'Check availability', exact: true }).click();
    await expect(dialog).toContainText('Great news, internet is available here!');
    await expect(dialog.getByRole('radio')).toHaveCount(4);
    await expect(
      dialog.getByRole('radio', { name: /Up to 500 Mbps.*POPULAR.*\$75/ }),
    ).toBeChecked();
    await dialog.screenshot({
      path: path.join(evidence, `available-${width}.png`),
      style: shotStyle,
    });
    const resultAssets = await assets(page, '.cp-internet-result-dialog');
    assert.deepEqual(await audit(page, '.cp-internet-result-dialog'), []);
    await dialog.getByRole('radio').nth(2).focus();
    await page.keyboard.press('ArrowUp');
    await expect(dialog.getByRole('button', { name: 'Continue with 1 Gbps →' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Continue with 1 Gbps →' }).click();
    await expect(dialog).toContainText('Internet plan preview');
    await expect(dialog).toContainText('$90/mo');
    await dialog.getByRole('button', { name: 'Back to address results' }).click();
    await dialog.getByLabel('Postal code', { exact: true }).fill('T0L 1A0');
    await dialog.getByRole('button', { name: 'Check availability', exact: true }).click();
    await expect(dialog).toContainText('We can’t install at this address yet');
    await dialog.screenshot({
      path: path.join(evidence, `unavailable-${width}.png`),
      style: shotStyle,
    });
    await assets(page, '.cp-internet-result-dialog');
    assert.deepEqual(await audit(page, '.cp-internet-result-dialog'), []);
    await dialog.getByRole('button', { name: 'Join the waitlist', exact: true }).click();
    await expect(dialog).toContainText('No email or notification request has been saved.');
    await dialog.getByRole('button', { name: 'Back to address results' }).click();
    await dialog.getByLabel('Postal code', { exact: true }).fill('K1A 0B1');
    await dialog.getByRole('button', { name: 'Check availability', exact: true }).click();
    await expect(dialog).toContainText('No mock result is configured');
    await expect(dialog.getByRole('button', { name: 'Try again' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(mainForm.getByLabel('Postal code', { exact: true })).toHaveValue('K1A 0B1');
    await expect(mainForm.getByRole('button')).toBeFocused();
    await mainForm.getByLabel('Postal code', { exact: true }).fill('V3T 1Z2');
    await mainForm.getByLabel('Move-in date (optional)').fill('31/02/2026');
    await mainForm.getByRole('button').click();
    await expect(dialog).toContainText('Enter a valid move-in date');
    const correction = dialog.getByLabel('Move-in date (optional)');
    await correction.fill('');
    await correction.pressSequentially('15 / 10 / 2026');
    await expect(correction).toBeFocused();
    await expect(correction).toHaveValue('15 / 10 / 2026');
    await dialog.getByRole('button', { name: 'Check availability', exact: true }).click();
    await expect(dialog).toContainText('Great news, internet is available here!');
    await page.keyboard.press('Escape');
    await expect(mainForm.getByLabel('Move-in date (optional)')).toHaveValue('15 / 10 / 2026');
    const finder = page.locator('#speed-finder');
    await finder.getByRole('button', { name: 'Just me', exact: true }).click();
    await finder.getByRole('button', { name: 'Browsing & email', exact: true }).click();
    await expect(finder.getByRole('heading', { level: 3 })).toHaveText('150 Mbps');
    await finder.getByRole('button', { name: '4 or more', exact: true }).click();
    await finder.getByRole('button', { name: 'Gaming & 4K', exact: true }).click();
    await expect(finder.getByRole('heading', { level: 3 })).toHaveText('1.5 Gbps');
    await finder.getByRole('button', { name: 'Yes, add TV', exact: true }).click();
    await expect(finder).toContainText('TV is a future-service preview');
    await expect(page.locator('#faq details[open]')).toHaveCount(2);
    await page.locator('#faq summary').nth(2).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#faq details').nth(2)).toHaveAttribute('open', '');
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Interaction overflow ${width}`,
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      geometry,
      initialAssets,
      resultAssets,
      initialAudit,
      interactions: 'passed',
      consoleErrors: errors,
    });
    await context.close();
  }
  for (const width of [320, 768, 1024, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${origin}/home-internet`, { waitUntil: 'networkidle' });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Overflow ${width}`,
    );
    await page.locator('#address-check').getByLabel('Postal code', { exact: true }).fill('V3T 1Z2');
    await page.locator('#address-check').getByRole('button').click();
    await expect(page.getByRole('dialog')).toContainText('Great news');
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Dialog overflow ${width}`,
    );
    await page.close();
  }
  const failurePage = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await failurePage.goto(`${origin}/home-internet`, { waitUntil: 'networkidle' });
  let releaseLookup;
  const lookupGate = new Promise((resolve) => {
    releaseLookup = resolve;
  });
  const failLookup = async (route) => {
    if (!route.request().headers()['next-action']) return route.continue();
    await lookupGate;
    await route.abort('failed');
  };
  await failurePage.route('**/home-internet', failLookup);
  const failureForm = failurePage.locator('#address-check');
  await failureForm.getByLabel('Postal code', { exact: true }).fill('V3T 1Z2');
  await failureForm.getByRole('button').click();
  const failureDialog = failurePage.getByRole('dialog');
  await expect(failureDialog).toContainText('Checking');
  await expect(failureDialog.getByLabel('Postal code', { exact: true })).toBeDisabled();
  releaseLookup();
  await expect(failureDialog).toContainText('We couldn’t check your address');
  await expect(failureDialog.getByLabel('Postal code', { exact: true })).toHaveValue('V3T 1Z2');
  await failurePage.unroute('**/home-internet', failLookup);
  await failureDialog.getByRole('button', { name: 'Try again' }).click();
  await expect(failureDialog).toContainText('Great news');
  await failurePage.keyboard.press('Escape');
  let releaseCancelled;
  const cancelledGate = new Promise((resolve) => {
    releaseCancelled = resolve;
  });
  const delayLookup = async (route) => {
    if (!route.request().headers()['next-action']) return route.continue();
    await cancelledGate;
    await route.continue();
  };
  await failurePage.route('**/home-internet', delayLookup);
  await failureForm.getByRole('button').click();
  await expect(failureDialog).toContainText('Checking');
  await failurePage.keyboard.press('Escape');
  releaseCancelled();
  await expect(failureForm.getByRole('button')).toBeEnabled();
  await expect(failureDialog).toHaveCount(0);
  await expect(failureForm.getByLabel('Postal code', { exact: true })).toHaveValue('V3T 1Z2');
  await failurePage.close();
  await writeFile(
    path.join(evidence, 'verification.json'),
    JSON.stringify(
      {
        route: '/home-internet',
        results,
        overflowWidths: [320, 390, 768, 1024, 1280, 1440],
        loadingFailureRetryAndCancellation: 'passed',
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
