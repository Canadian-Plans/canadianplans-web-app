import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installAuditContext } from './audit-context.mjs';
/* global document, innerWidth -- Browser evaluations. */

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const evidence = path.resolve(appRoot, '../../docs/EVIDENCE/category-airport-compare');
const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const routes = [
  {
    route: '/pre-arrival-sim/toronto-pearson',
    name: 'airport',
    h1: 'Landing at Pearson?',
    sections: [
      ['hero', '.cp-catac-airport-hero'],
      ['quick', '.cp-catac-airport-quick'],
      ['plans', '#plans'],
      ['steps', '#how-it-works'],
      ['documents', '#documents'],
      ['guide', '#arrival-guide'],
      ['reviews', '.cp-catac-airport-reviews'],
      ['faq', '#faq'],
      ['explore', '.cp-catac-airport-explore'],
      ['final', '.cp-catac-airport-final'],
    ],
  },
  {
    route: '/compare/rogers-vs-fido',
    name: 'compare',
    h1: 'Rogers vs Fido:',
    sections: [
      ['breadcrumb', '.cp-catac-compare-breadcrumb'],
      ['hero', '.cp-catac-compare-hero'],
      ['quick', '.cp-catac-compare-quick'],
      ['scorecard', '.cp-catac-compare-scorecard'],
      ['plans', '#plans'],
      ['recommendations', '#recommendations'],
      ['three-carriers', '.cp-catac-compare-three'],
      ['switching', '#switching'],
      ['guide', '.cp-catac-compare-guide'],
      ['reviews', '.cp-catac-compare-reviews'],
      ['faq', '#faq'],
      ['explore', '.cp-catac-compare-explore'],
      ['final', '.cp-catac-compare-final'],
    ],
  },
];
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const item of routes) {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      });
      await installAuditContext(context, { eagerImages: false });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(`${origin}${item.route}`, { waitUntil: 'networkidle' });
      assert.equal(response?.status(), 200, `${item.route} ${width}`);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('img').evaluateAll(async (images) => {
        for (const image of images) image.loading = 'eager';
        await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
      });
      await expect(page.getByRole('heading', { level: 1 })).toContainText(item.h1);
      await page.screenshot({
        path: path.join(evidence, `browser-${item.name}-${width}.png`),
        fullPage: true,
        style: 'nextjs-portal{visibility:hidden;}',
      });
      for (const [section, selector] of item.sections) {
        const target = page.locator(selector);
        if (await target.isVisible()) {
          await target.screenshot({
            path: path.join(evidence, `${item.name}-${section}-${width}.png`),
            style: 'nextjs-portal{visibility:hidden;}',
          });
        }
      }
      const overflow = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      assert.ok(
        overflow.document <= overflow.viewport,
        `${item.route} overflows at ${width}: ${JSON.stringify(overflow)}`,
      );
      const audit = await new AxeBuilder({ page })
        .include('main')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const accessibility = audit.violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      }));
      assert.deepEqual(accessibility, [], `${item.route} axe violations`);
      const assets = await page.locator('img[data-figma-asset]').evaluateAll((images) =>
        images
          .filter((image) => image.getClientRects().length > 0)
          .map((image) => ({
            src: image.getAttribute('src'),
            width: image.getBoundingClientRect().width,
            height: image.getBoundingClientRect().height,
            expectedWidth: Number(image.getAttribute('width')),
            expectedHeight: Number(image.getAttribute('height')),
            loaded: image.complete && image.naturalWidth > 0,
          })),
      );
      for (const asset of assets) {
        assert.ok(asset.loaded, `Not loaded: ${asset.src}`);
        assert.ok(
          Math.abs(asset.width - asset.expectedWidth) < 0.15 &&
            Math.abs(asset.height - asset.expectedHeight) < 0.15,
          `Geometry mismatch: ${JSON.stringify(asset)}`,
        );
        const filename = path.join(appRoot, 'public', asset.src.replace(/^\//, ''));
        const svg = await readFile(filename, 'utf8');
        assert.ok(
          svg.match(/<svg\b[^>]*>/)?.[0].includes(`width="${asset.expectedWidth}"`) &&
            svg.match(/<svg\b[^>]*>/)?.[0].includes(`height="${asset.expectedHeight}"`),
          `Intrinsic dimensions: ${asset.src}`,
        );
      }
      if (item.name === 'airport') {
        await expect(page.locator('#faq details[open]')).toHaveCount(2);
        await page.locator('#faq summary').nth(2).focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#faq details[open]')).toHaveCount(3);
        await page.keyboard.press('Enter');
        const plan = page.getByRole('radio', { name: /Rogers · Plus/ });
        await plan.focus();
        await page.keyboard.press('Space');
        await expect(plan).toBeChecked();
        const continueLink = page.locator('.cp-catac-airport-plan-continue a');
        await expect(continueLink).toBeVisible();
        await continueLink.evaluate((link) => link.focus());
        const checkoutNavigation = page.waitForURL(
          /\/order\/pre-arrival\?plan=preview-rogers-plus&audience=student/,
          { waitUntil: 'domcontentloaded' },
        );
        await page.keyboard.press('Enter');
        await checkoutNavigation;
        await expect(page.locator('.cp-pa-summary').last()).toContainText('100 GB');
        await page.goBack();
        const faq = page.locator('#faq details').first();
        await faq.locator('summary').focus();
        await page.keyboard.press('Enter');
        await expect(faq).not.toHaveAttribute('open', '');
      } else {
        const sort = page.getByRole('group', { name: 'Sort by' });
        await sort.getByRole('button', { name: 'Data' }).click();
        await expect(sort.getByRole('button', { name: 'Data' })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
        await expect(page.locator('.cp-catac-compare-plan').first()).toContainText(
          'Rogers prepaid',
        );
        const fido = page.getByRole('link', { name: 'See Fido plans' });
        await fido.focus();
        await expect(fido).toHaveAttribute('href', '/mobile-plans#mobile-plans');
        const region = page.getByRole('region', {
          name: 'Rogers and Fido plan feature comparison',
        });
        if (width >= 768) {
          await region.focus();
          await expect(region).toBeFocused();
        } else {
          await expect(region).not.toBeVisible();
          await expect(page.locator('.cp-catac-compare-scorecard')).toBeVisible();
        }
        const faq = page.locator('#faq details').first();
        await faq.locator('summary').focus();
        await page.keyboard.press('Enter');
        await expect(faq).not.toHaveAttribute('open', '');
      }
      assert.deepEqual(errors, [], `${item.route} runtime errors`);
      results.push({
        route: item.route,
        width,
        overflow,
        sections: item.sections.map(([name]) => name),
        assets,
        accessibility,
        keyboardAndInteraction: 'passed',
        consoleErrors: errors,
      });
      await context.close();
    }
    for (const width of [320, 768, 1024]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(`${origin}${item.route}`, { waitUntil: 'networkidle' });
      const measured = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      assert.ok(
        measured.document <= measured.viewport,
        `${item.route} overflows at ${width}: ${JSON.stringify(measured)}`,
      );
      results.push({ route: item.route, width, overflow: measured });
      await page.close();
    }
  }
  await writeFile(
    path.join(evidence, 'verification.json'),
    JSON.stringify({ origin, date: new Date().toISOString(), routes: results }, null, 2) + '\n',
  );
} finally {
  await browser.close();
}
