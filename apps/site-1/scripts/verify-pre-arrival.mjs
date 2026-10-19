import { installAuditContext } from './audit-context.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
/* global document, innerWidth -- Browser evaluations. */
const appRoot = fileURLToPath(new URL('../', import.meta.url));
const evidence = path.resolve(appRoot, '../../docs/EVIDENCE/pre-arrival');
const origin = process.env.ARRIVAL_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const results = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    await installAuditContext(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    assert.equal(
      (await page.goto(`${origin}/pre-arrival-sim`, { waitUntil: 'networkidle' }))?.status(),
      200,
    );
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Canadian SIM card & eSIM');
    await expect(page.locator('.cp-arrival-selection')).toHaveCount(0);
    await expect(page.locator('.cp-arrival-plans .cp-plan-card')).toHaveCount(3);
    await page.screenshot({
      path: path.join(evidence, `page-${width}.png`),
      fullPage: true,
      style: 'nextjs-portal{visibility:hidden;}',
    });
    for (const [name, selector] of [
      ['hero', '.cp-arrival-hero'],
      ['quick', '.cp-arrival-quick'],
      ['plans', '#plans'],
      ['why', '.cp-arrival-why'],
      ['comparison', '#compare'],
      ['how', '#how-it-works'],
      ['requirements', '#requirements'],
      ['reviews', '.cp-arrival-reviews'],
      ['faq', '#faq'],
      ['final', '.cp-arrival-final'],
    ])
      await page.locator(selector).screenshot({
        path: path.join(evidence, `${name}-${width}.png`),
        style: 'nextjs-portal{visibility:hidden;}',
      });
    const geometry = await page
      .locator('main>section')
      .evaluateAll((es) =>
        es.map((e) => ({ section: e.id || e.className, height: e.getBoundingClientRect().height })),
      );
    const assets = await page.locator('img[data-figma-asset]').evaluateAll((es) =>
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
    for (const asset of assets) {
      assert.ok(asset.loaded);
      assert.ok(
        Math.abs(asset.width - asset.expectedWidth) < 0.15 &&
          Math.abs(asset.height - asset.expectedHeight) < 0.15,
        `Asset ${asset.src}`,
      );
      const root = (await readFile(path.join(appRoot, 'public', asset.src), 'utf8')).match(
        /<svg\b[^>]*>/,
      )?.[0];
      assert.ok(
        root?.includes(`width="${asset.expectedWidth}"`) &&
          root.includes(`height="${asset.expectedHeight}"`),
      );
    }
    const audit = await new AxeBuilder({ page })
      .include('.cp-arrival')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const accessibility = audit.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    }));
    console.info(JSON.stringify({ width, geometry, accessibility }, null, 2));
    // Record screenshots first so a visual defect remains inspectable if any gate fails.
    await writeFile(
      path.join(evidence, `audit-${width}.json`),
      JSON.stringify({ width, geometry, assets, accessibility }, null, 2) + '\n',
    );
    assert.deepEqual(accessibility, []);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Overflow ${width}`,
    );
    const plus = page.locator('[data-plan="preview-rogers-plus"]');
    await plus.getByRole('button').focus();
    await page.keyboard.press('Enter');
    await expect(plus.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    const sticky = page.locator('.cp-arrival-selection');
    await expect(sticky).toContainText('Rogers Plus · 100 GB');
    await expect(sticky).toContainText('$40/mo');
    await expect(sticky.getByRole('link')).toHaveText('Continue to step 2 →');
    await sticky.screenshot({
      path: path.join(evidence, `selection-${width}.png`),
      style: 'nextjs-portal{visibility:hidden;}',
    });
    await sticky.getByRole('link').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(
      /\/order\/pre-arrival(?:\?plan=preview-rogers-plus&audience=student)?$/,
    );
    await expect(page.locator('.cp-pa-summary').last()).toContainText('100 GB');
    await page.goBack();
    await plus.getByRole('button').click();
    await page.getByRole('button', { name: 'Worker', exact: true }).click();
    await expect(page.locator('.cp-arrival-plans .cp-plan-card')).toHaveCount(2);
    await expect(sticky).toContainText('Rogers Plus');
    await page.getByRole('button', { name: 'Visitor', exact: true }).click();
    await expect(page.locator('.cp-arrival-plans .cp-plan-card')).toHaveCount(1);
    await expect(sticky).toHaveCount(0);
    await page.locator('[data-plan="preview-fido-essential"]').getByRole('button').click();
    await expect(page.locator('.cp-arrival-selection')).toContainText('$35/mo');
    await page.getByRole('button', { name: 'Student', exact: true }).click();
    await expect(page.locator('.cp-arrival-plans .cp-plan-card')).toHaveCount(3);
    await expect(page.locator('[data-plan="preview-fido-essential"] button')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await plus.getByRole('button').click();
    await expect(page.locator('[data-plan="preview-fido-essential"] button')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.locator('#faq summary').nth(1).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#faq details').nth(1)).toHaveAttribute('open', '');
    await expect(page.locator('#faq details').first()).not.toHaveAttribute('open', '');
    const selectedAudit = await new AxeBuilder({ page })
      .include('.cp-arrival')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    assert.deepEqual(
      selectedAudit.violations.map((v) => v.id),
      [],
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      geometry,
      assets,
      accessibility,
      interactions: 'passed',
      consoleErrors: errors,
    });
    await context.close();
  }
  for (const width of [320, 768, 1024, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${origin}/pre-arrival-sim`, { waitUntil: 'networkidle' });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Overflow ${width}`,
    );
    await page.locator('[data-plan="preview-rogers-plus"] button').click();
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Selected overflow ${width}`,
    );
    await page.close();
  }
  await writeFile(
    path.join(evidence, 'verification.json'),
    JSON.stringify(
      { route: '/pre-arrival-sim', results, overflowWidths: [320, 390, 768, 1024, 1280, 1440] },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
