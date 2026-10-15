import { installAuditContext } from './audit-context.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
/* global document, innerWidth -- Browser evaluations. */
const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = path.resolve(root, '../../docs/EVIDENCE/mobile-plans');
const origin =
  process.env.MOBILE_PLANS_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
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
      .filter((e) => e.getClientRects().length)
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
    const svg = (await readFile(path.join(root, 'public', row.src), 'utf8')).match(
      /<svg\b[^>]*>/,
    )?.[0];
    assert.ok(
      svg?.includes(`width="${row.expectedWidth}"`) &&
        svg.includes(`height="${row.expectedHeight}"`),
    );
  }
  return rows;
}
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      reducedMotion: 'reduce',
    });
    await installAuditContext(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    assert.equal(
      (await page.goto(`${origin}/mobile-plans`, { waitUntil: 'networkidle' }))?.status(),
      200,
    );
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Compare Rogers, Fido & Chatr phone plans.',
    );
    await page.screenshot({
      path: path.join(evidence, `page-${width}.png`),
      fullPage: true,
      style: shotStyle,
    });
    for (const [name, selector] of [
      ['hero', '.cp-mobile-hero'],
      ['plans', '#mobile-plans'],
      ['comparison', '#brand-comparison'],
      ['payment', '.cp-mobile-payment'],
      ['switching', '#switching'],
      ['reviews', '.cp-mobile-reviews'],
      ['faq', '#faq'],
      ['final', '.cp-mobile-final'],
    ])
      await page
        .locator(selector)
        .screenshot({ path: path.join(evidence, `${name}-${width}.png`), style: shotStyle });
    const assetRows = await assets(page, '.cp-mobile-plans');
    const violations = await audit(page, '.cp-mobile-plans');
    console.info(JSON.stringify({ width, violations }));
    assert.deepEqual(violations, []);
    const list = page.locator('#mobile-plans');
    const cards = list.locator('.cp-plan-card');
    await expect(cards).toHaveCount(4);
    const useSheet = width === 390;
    async function filters() {
      if (useSheet) {
        await list.getByRole('button', { name: /^Filters/ }).click();
        return page.getByRole('dialog', { name: 'Filters', exact: true });
      }
      return list.locator('.cp-mobile-desktop-filters');
    }
    async function closeSheet(count) {
      if (useSheet)
        await page
          .getByRole('dialog', { name: 'Filters', exact: true })
          .getByRole('button', {
            name: `Show ${count} ${count === 1 ? 'plan' : 'plans'}`,
            exact: true,
          })
          .click();
    }
    let controls = await filters();
    if (useSheet) {
      await expect
        .poll(async () => {
          const box = await page.locator('.cp-mobile-filter-sheet').boundingBox();
          return Math.round(box.y + box.height);
        })
        .toBe(844);
      await page.screenshot({
        path: path.join(evidence, 'filters-sheet-390.png'),
        style: shotStyle,
      });
      await assets(page, '.cp-mobile-filter-sheet');
      assert.deepEqual(await audit(page, '.cp-mobile-filter-sheet'), []);
    }
    await controls
      .getByRole('group', { name: 'Brand', exact: true })
      .getByRole('button', { name: 'Rogers', exact: true })
      .click();
    await closeSheet(2);
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText('100 GB');
    controls = await filters();
    await controls
      .getByRole('group', { name: useSheet ? 'Pay type' : 'Pay', exact: true })
      .getByRole('button', { name: 'Prepaid', exact: true })
      .click();
    await closeSheet(0);
    await expect(cards).toHaveCount(0);
    await expect(list).toContainText('No preview plans match these filters.');
    await list
      .locator('.cp-mobile-empty')
      .getByRole('button', { name: 'Clear all', exact: true })
      .click();
    await expect(cards).toHaveCount(4);
    controls = await filters();
    await controls
      .getByRole('group', { name: 'Data', exact: true })
      .getByRole('button', { name: '20–60 GB', exact: true })
      .click();
    await closeSheet(2);
    await expect(cards).toHaveCount(2);
    if (useSheet) {
      await list.getByRole('button', { name: 'Remove 20–60 GB', exact: true }).click();
      await expect(cards).toHaveCount(4);
      await list.getByLabel('Sort', { exact: true }).selectOption('price-high');
      await expect(cards.first()).toContainText('150 GB');
      await list.getByLabel('Sort', { exact: true }).selectOption('price-low');
      await expect(cards.first()).toContainText('20 GB');
      await list.getByLabel('Sort', { exact: true }).selectOption('data-high');
      await expect(cards.first()).toContainText('150 GB');
    } else {
      controls = await filters();
      await controls
        .getByRole('group', { name: 'Data', exact: true })
        .getByRole('button', { name: 'Any', exact: true })
        .click();
    }
    controls = await filters();
    await controls.getByRole('switch', { name: 'Bring my own phone', exact: true }).click();
    await expect(controls.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    await closeSheet(4);
    await expect(cards).toHaveCount(4);
    if (useSheet) {
      controls = await filters();
      await controls.getByRole('button', { name: 'Clear all', exact: true }).click();
      await expect(controls.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
      await page.keyboard.press('Escape');
      await expect(list.getByRole('button', { name: /^Filters/ })).toBeFocused();
    }
    await list.getByRole('button', { name: 'Choose 100 GB', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Rogers · 100 GB · $55/mo');
    await page.keyboard.press('Escape');
    await expect(list.getByRole('button', { name: 'Choose 100 GB', exact: true })).toBeFocused();
    await expect(page.locator('#faq details[open]')).toHaveCount(1);
    await page.locator('#faq summary').nth(1).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#faq details').nth(1)).toHaveAttribute('open', '');
    await page.getByRole('link', { name: 'Chatr plans →', exact: true }).click();
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText('20 GB');
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Overflow ${width}`,
    );
    assert.deepEqual(errors, []);
    results.push({ width, assetRows, violations, interactions: 'passed', pageErrors: errors });
    await context.close();
  }
  for (const width of [320, 768, 1024, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.goto(`${origin}/mobile-plans`, { waitUntil: 'networkidle' });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Overflow ${width}`,
    );
    if (width < 1280) {
      await page
        .locator('#mobile-plans')
        .getByRole('button', { name: /^Filters/ })
        .click();
      await expect(page.getByRole('dialog')).toBeVisible();
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Sheet overflow ${width}`,
      );
    }
    await page.close();
  }
  await writeFile(
    path.join(evidence, 'verification.json'),
    JSON.stringify(
      { route: '/mobile-plans', results, overflowWidths: [320, 390, 768, 1024, 1280, 1440] },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
