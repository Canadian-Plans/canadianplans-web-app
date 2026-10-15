import { installAuditContext } from './audit-context.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
/* global document,innerWidth -- Browser evaluations. */
const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = path.resolve(root, '../../docs/EVIDENCE/plan-finder');
const origin = process.env.FINDER_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
const results = [];
const shotStyle = 'nextjs-portal{visibility:hidden;}';
async function audit(page) {
  return (
    await new AxeBuilder({ page })
      .include('.cp-finder-modal')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
  ).violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }));
}
async function assets(page) {
  const rows = await page.locator('.cp-finder-modal img[data-figma-asset]').evaluateAll((es) =>
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
async function openFinder(page, width) {
  if (width < 1280) {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page
      .locator('.cp-mobile-menu')
      .getByRole('button', { name: 'Find my plan', exact: true })
      .click();
  } else
    await page
      .locator('.cp-nav-desktop-actions')
      .getByRole('button', { name: 'Find my plan', exact: true })
      .click();
  await expect(page.locator('.cp-finder-modal')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Hi! Let’s find your perfect plan.');
}
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 1040 },
      reducedMotion: 'reduce',
    });
    await installAuditContext(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await openFinder(page, width);
    const dialog = page.getByRole('dialog');
    const states = [];
    async function capture(name) {
      const violations = await audit(page);
      console.info(JSON.stringify({ width, name, violations }));
      await page.screenshot({
        path: path.join(evidence, `${name}-${width}.png`),
        style: shotStyle,
      });
      const dimensions = await page.locator('.cp-finder-modal').boundingBox();
      const assetRows = await assets(page);
      states.push({ name, violations, dimensions, assetRows });
      assert.ok(
        dimensions.x >= -1 &&
          dimensions.y >= -1 &&
          dimensions.x + dimensions.width <= width + 1 &&
          dimensions.y + dimensions.height <= (width === 390 ? 844 : 1040) + 1,
        `Modal outside viewport ${width}/${name}`,
      );
      assert.deepEqual(violations, []);
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Overflow ${width}/${name}`,
      );
    }
    await capture('location');
    await expect(
      dialog.getByRole('radio', { name: 'I’m moving to or visiting Canada', exact: true }),
    ).toBeChecked();
    await dialog.getByRole('button', { name: 'Continue →', exact: true }).click();
    await expect(dialog).toContainText('Step 1 of 2');
    await capture('arrival-kind');
    await dialog.getByRole('button', { name: 'Continue →', exact: true }).click();
    await expect(dialog).toContainText('Step 2 of 2');
    await capture('stay');
    await dialog.getByRole('button', { name: 'See my matches →', exact: true }).click();
    await expect(dialog).toContainText('Rogers · 100 GB');
    await expect(dialog).toContainText('$40/mo');
    await capture('result');
    await dialog.getByRole('button', { name: 'Plan details', exact: true }).first().click();
    await expect(dialog).toContainText('Plan details preview');
    await dialog.getByRole('button', { name: 'Back to matches' }).click();
    await dialog.getByRole('button', { name: 'Get this plan →', exact: true }).click();
    await expect(dialog).toContainText('No order, payment');
    await dialog.getByRole('button', { name: 'Back to matches' }).click();
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(
      dialog.getByRole('radio', { name: '6 months or more', exact: true }),
    ).toBeChecked();
    await dialog.getByRole('radio', { name: '1 to 6 months', exact: true }).check();
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await dialog.getByRole('radio', { name: 'Worker', exact: true }).check();
    await dialog.getByRole('button', { name: 'Continue →', exact: true }).click();
    await expect(
      dialog.getByRole('radio', { name: '6 months or more', exact: true }),
    ).toBeChecked();
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await dialog.getByRole('radio', { name: 'I already live in Canada', exact: true }).check();
    await dialog.getByRole('button', { name: 'Continue →', exact: true }).click();
    await expect(dialog).toContainText('Step 1 of 4');
    await capture('need');
    await dialog.getByRole('button', { name: 'Continue →', exact: true }).click();
    await expect(dialog).toContainText('Step 2 of 4');
    await capture('province');
    await dialog.getByRole('radio', { name: 'Ontario', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(
      dialog.getByRole('radio', { name: 'British Columbia', exact: true }),
    ).toBeChecked();
    await dialog.getByRole('button', { name: 'Continue →', exact: true }).click();
    await expect(dialog).toContainText('Step 3 of 4');
    await capture('provider');
    await dialog.getByRole('radio', { name: 'None / other', exact: true }).check();
    await expect(dialog.getByRole('radio', { name: 'None / other', exact: true })).toBeChecked();
    await dialog.getByRole('button', { name: 'Continue →', exact: true }).click();
    await expect(dialog).toContainText('Step 4 of 4');
    await capture('priority');
    await dialog.getByRole('radio', { name: 'Lowest price', exact: true }).check();
    await dialog.getByRole('button', { name: 'See my matches →', exact: true }).click();
    await expect(dialog).toContainText('Chatr · 20 GB');
    await expect(dialog).toContainText('British Columbia');
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog
      .getByRole('radio', { name: 'I’m moving to or visiting Canada', exact: true })
      .check();
    await dialog.getByRole('button', { name: 'Continue →', exact: true }).click();
    await dialog.getByRole('button', { name: 'Continue →', exact: true }).click();
    await dialog.getByRole('button', { name: 'See my matches →', exact: true }).click();
    await expect(dialog).not.toContainText('British Columbia');
    await expect(dialog).toContainText('Student');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    if (width === 390)
      await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
    else
      await expect(
        page
          .locator('.cp-nav-desktop-actions')
          .getByRole('button', { name: 'Find my plan', exact: true }),
      ).toBeFocused();
    await openFinder(page, width);
    await expect(page.locator('.cp-finder-modal')).toHaveAttribute('data-step', 'location');
    await dialog.getByRole('button', { name: 'Close plan finder', exact: true }).click();
    assert.deepEqual(errors, []);
    results.push({ width, states, interactions: 'passed', pageErrors: errors });
    await context.close();
  }
  for (const route of [
    '/pre-arrival-sim',
    '/home-internet',
    '/mobile-plans',
    '/dev/components',
    '/plans',
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1040 },
      reducedMotion: 'reduce',
    });
    await installAuditContext(context);
    const page = await context.newPage();
    await page.goto(origin + route, { waitUntil: 'networkidle' });
    await page
      .getByRole('banner')
      .getByRole('button', { name: 'Find my plan', exact: true })
      .click();
    await expect(page.locator('.cp-finder-modal')).toHaveAttribute('data-step', 'location');
    await page.keyboard.press('Escape');
    await expect(page.locator('.cp-finder-modal')).toHaveCount(0);
    await context.close();
  }
  for (const width of [320, 768, 1024, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      reducedMotion: 'reduce',
    });
    await installAuditContext(context);
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: 'networkidle' });
    await openFinder(page, width);
    await expect(page.locator('.cp-finder-modal')).toBeVisible();
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Overflow ${width}`,
    );
    const dialog = page.getByRole('dialog');
    for (let step = 0; step < 3; step++) {
      await dialog
        .getByRole('button', { name: step === 2 ? 'See my matches →' : 'Continue →', exact: true })
        .click();
      const box = await page.locator('.cp-finder-modal').boundingBox();
      assert.ok(
        box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= 845,
        `Result bounds ${width}/${step}`,
      );
      assert.ok(
        await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth),
        `Modal content overflow ${width}/${step}`,
      );
    }
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.getByRole('radio', { name: 'I already live in Canada', exact: true }).check();
    await dialog.getByRole('button', { name: 'Continue →', exact: true }).click();
    for (let step = 0; step < 4; step++) {
      await dialog
        .getByRole('button', { name: step === 3 ? 'See my matches →' : 'Continue →', exact: true })
        .click();
      assert.ok(
        await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth),
        `Resident overflow ${width}/${step}`,
      );
    }
    await context.close();
  }
  await writeFile(
    path.join(evidence, 'verification.json'),
    JSON.stringify(
      {
        results,
        globalRoutes: [
          '/',
          '/pre-arrival-sim',
          '/home-internet',
          '/mobile-plans',
          '/dev/components',
          '/plans',
        ],
        overflowWidths: [320, 390, 768, 1024, 1280, 1440],
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
