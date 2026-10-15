/* global document, window, innerWidth */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installAuditContext } from './audit-context.mjs';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const evidence = path.resolve(appRoot, '../../docs/EVIDENCE/category-sim');
const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const routes = [
  {
    key: 'india',
    path: '/pre-arrival-sim/from-india',
    heading: 'Canadian SIM for Indians moving to Canada (2026)',
  },
];
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
const results = [];
const errors = [];
try {
  for (const route of routes) {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      });
      await installAuditContext(context, { eagerImages: false });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      assert.equal(
        (await page.goto(`${origin}${route.path}`, { waitUntil: 'networkidle' }))?.status(),
        200,
      );
      await page.waitForTimeout(750);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('img').evaluateAll((images) =>
        images.forEach((image) => {
          image.loading = 'eager';
        }),
      );
      await page
        .locator('img')
        .evaluateAll((images) =>
          Promise.all(images.map((image) => image.decode().catch(() => undefined))),
        );
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading);
      await expect(page.locator('#plans .cp-catsim-plan-card')).toHaveCount(3);
      await page.screenshot({
        path: path.join(evidence, `${route.key}-${width}-full.png`),
        fullPage: true,
        style: 'nextjs-portal{visibility:hidden;}',
      });
      for (const [name, selector] of [
        ['hero', '.cp-catsim-hero'],
        ['meta', '.cp-catsim-meta'],
        ['quick', '.cp-catsim-quick'],
        ['countdown', '#countdown'],
        ['plans', '#plans'],
        ['documents', '#documents'],
        ['calling-india', '#calling-india'],
        ['guide', '#guide'],
        ['reviews', '.cp-catsim-reviews'],
        ['faq', '#faq'],
        ['explore', '.cp-catsim-explore'],
        ['final', '.cp-catsim-final'],
        ['footer', '.cp-footer'],
      ]) {
        const section = page.locator(selector);
        if (await section.count())
          await section.screenshot({
            path: path.join(evidence, `${route.key}-${width}-${name}.png`),
            style: 'nextjs-portal{visibility:hidden;}',
          });
      }
      const assets = await page.locator('img[data-figma-asset]').evaluateAll((elements) =>
        elements
          .filter((element) => element.getClientRects().length > 0)
          .map((element) => ({
            src: element.getAttribute('src'),
            nodeId: element.getAttribute('data-figma-asset'),
            width: element.getBoundingClientRect().width,
            height: element.getBoundingClientRect().height,
            expectedWidth: Number(element.getAttribute('width')),
            expectedHeight: Number(element.getAttribute('height')),
            loaded: element.complete && element.naturalWidth > 0,
          })),
      );
      for (const asset of assets) {
        assert.ok(asset.loaded, `Asset failed: ${asset.src}`);
        const callsiteSize = { width: asset.expectedWidth, height: asset.expectedHeight };
        assert.ok(
          Math.abs(asset.width - callsiteSize.width) < 0.15 &&
            Math.abs(asset.height - callsiteSize.height) < 0.15,
          `Asset geometry: ${asset.src} (${asset.width}x${asset.height})`,
        );
        const svgRoot = (await readFile(path.join(appRoot, 'public', asset.src), 'utf8')).match(
          /<svg\b[^>]*>/,
        )?.[0];
        assert.ok(
          svgRoot?.includes(`width="${asset.expectedWidth}"`) &&
            svgRoot.includes(`height="${asset.expectedHeight}"`),
          `SVG intrinsic dimensions: ${asset.src}`,
        );
      }
      const sectionGeometry = await page.locator('main>section').evaluateAll((items) =>
        items.map((item) => ({
          id: item.id || item.className,
          height: item.getBoundingClientRect().height,
        })),
      );
      const chromeGeometry = await page
        .locator('.cp-catsim-breadcrumb-band, .cp-footer')
        .evaluateAll((items) =>
          items.map((item) => ({
            id: item.className,
            height: item.getBoundingClientRect().height,
          })),
        );
      const accessibility = (
        await new AxeBuilder({ page })
          .include('.cp-catsim')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      }));
      await writeFile(
        path.join(evidence, `${route.key}-${width}-audit.json`),
        `${JSON.stringify({ route: route.path, width, sectionGeometry, chromeGeometry, pageHeight: await page.evaluate(() => document.documentElement.scrollHeight), assets, accessibility, runtimeErrors: pageErrors }, null, 2)}\n`,
      );
      assert.deepEqual(accessibility, [], `${route.key} axe violations at ${width}`);
      assert.deepEqual(pageErrors, [], `${route.key} runtime errors at ${width}`);
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Horizontal overflow at ${width}`,
      );

      const plus = page.locator('[data-plan="preview-rogers-plus"]');
      const select = plus.getByRole('button');
      await select.focus();
      await page.keyboard.press('Enter');
      await expect(select).toHaveAttribute('aria-pressed', 'true');
      let handoff;
      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const sticky = page.locator('.cp-sticky-cta');
        await expect(sticky).toHaveAttribute('data-visible', 'true');
        await expect(sticky).toContainText('100 GB');
        const orderPromise = page.waitForURL(
          /\/order\/pre-arrival\?plan=preview-rogers-plus&audience=student/,
        );
        await sticky.getByRole('button').click();
        await orderPromise;
        await expect(page.locator('.cp-pa-summary').last()).toContainText('100 GB');
        await expect(page.locator('.cp-pa-summary').last()).toContainText('$40');
        await expect(page.getByRole('button', { name: 'Student', exact: true })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
        handoff = page.url();
        await page.goBack();
      } else {
        const next = page.locator('.cp-catsim-plan-next a');
        await expect(next).toBeVisible();
        await next.focus();
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/order\/pre-arrival\?plan=preview-rogers-plus&audience=student/);
        await expect(page.locator('.cp-pa-summary').last()).toContainText('100 GB');
        await expect(page.locator('.cp-pa-summary').last()).toContainText('$40');
        handoff = page.url();
        await page.goBack();
      }
      await page.locator('#faq summary').nth(1).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#faq details').nth(1)).toHaveAttribute('open', '');
      const selectedAccessibility = (
        await new AxeBuilder({ page })
          .include('.cp-catsim')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations.map((violation) => violation.id);
      assert.deepEqual(selectedAccessibility, [], `Selected-state axe violations at ${width}`);
      errors.push(...pageErrors.map((message) => ({ route: route.path, width, message })));
      results.push({
        route: route.path,
        width,
        sectionGeometry,
        assets,
        accessibility,
        selectedAccessibility,
        handoff,
        interactions: 'keyboard plan selection, plan summary handoff, and FAQ accordion passed',
        runtimeErrors: pageErrors,
      });
      await context.close();
    }
  }
  for (const width of [320, 768, 1024]) {
    for (const route of routes) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(`${origin}${route.path}`, { waitUntil: 'networkidle' });
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Horizontal overflow at ${width} for ${route.key}`,
      );
      await page.locator('[data-plan="preview-rogers-plus"] button').click();
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Selected horizontal overflow at ${width} for ${route.key}`,
      );
      await page.close();
    }
  }
  await writeFile(
    path.join(evidence, 'verification.json'),
    `${JSON.stringify({ origin, routes: routes.map((route) => route.path), results, overflowWidths: [320, 390, 768, 1024, 1440], runtimeErrors: errors }, null, 2)}\n`,
  );
} finally {
  await browser.close();
}
