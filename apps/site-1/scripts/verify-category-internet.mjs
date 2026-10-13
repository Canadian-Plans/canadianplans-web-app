/* global document */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { installAuditContext } from './audit-context.mjs';

const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const evidence = path.resolve('../../docs/EVIDENCE/category-internet');
const routes = ['/home-internet/vancouver', '/home-internet/ontario'];
const viewports = [320, 390, 768, 1024, 1440];
const report = {
  origin,
  createdAt: new Date().toISOString(),
  pages: {},
  orderHandoff: {},
  errors: [],
};
const browser = await chromium.launch({ headless: true });

try {
  for (const route of routes) {
    const slug = route.split('/').at(-1);
    report.pages[slug] = { route, widths: {}, form: {}, headings: [], assets: [] };
    for (const width of viewports) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await installAuditContext(context, { eagerImages: false });
      const page = await context.newPage();
      page.on('pageerror', (error) => report.errors.push(`${route}: ${error.message}`));
      const response = await page.goto(new URL(route, origin).toString(), {
        waitUntil: 'networkidle',
      });
      if (response?.status() !== 200) throw new Error(`${route} returned ${response?.status()}`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map((image) => {
            image.loading = 'eager';
            return image.decode().catch(() => {});
          }),
        );
      });
      const dimensions = await page
        .locator('body')
        .evaluate((body) => ({ scrollWidth: body.scrollWidth, clientWidth: body.clientWidth }));
      report.pages[slug].widths[width] = dimensions;
      if (dimensions.scrollWidth > dimensions.clientWidth)
        report.errors.push(`${route} overflows at ${width}px: ${JSON.stringify(dimensions)}`);
      if (width === 390 || width === 1440) {
        report.pages[slug].widths[width].sections = await page
          .locator('main > section')
          .evaluateAll((sections) =>
            sections.map((section) => ({
              name: section.id || section.className,
              height: section.getBoundingClientRect().height,
            })),
          );
        await page.screenshot({
          path: path.join(evidence, `${slug}-${width}.png`),
          fullPage: true,
          style: 'nextjs-portal{visibility:hidden;}',
        });
        for (const [name, selector] of [
          ['hero', '.cp-catnet-hero'],
          ['meta', '.cp-catnet-meta'],
          ['stats', '#local-stats'],
          ['coverage', '#coverage'],
          ['tips', '.cp-catnet-tips-section'],
          ['plans', '#plans'],
          ['steps', '.cp-catnet-steps-section'],
          ['guide', '#guide'],
          ['reviews', '.cp-catnet-reviews-section'],
          ['faq', '#faq'],
          ['explore', '.cp-catnet-explore-section'],
          ['final', '.cp-catnet-final'],
          ['footer', '.cp-footer'],
        ]) {
          const section = page.locator(selector).first();
          if (await section.count())
            await section.screenshot({
              path: path.join(evidence, 'crops', `${slug}-${width}-${name}.png`),
              style: 'nextjs-portal{visibility:hidden;}',
            });
        }
      }
      if (width === 390 || width === 1440) {
        const assets = await page.locator('img[data-figma-asset]').evaluateAll((images) =>
          images
            .filter((image) => image.getBoundingClientRect().width > 0)
            .map((image) => ({
              src: image.getAttribute('src'),
              width: image.getBoundingClientRect().width,
              height: image.getBoundingClientRect().height,
              expectedWidth: Number(image.getAttribute('width')),
              expectedHeight: Number(image.getAttribute('height')),
              loaded: image.complete && image.naturalWidth > 0,
            })),
        );
        await writeFile(
          path.join(evidence, `assets-${slug}-${width}.json`),
          `${JSON.stringify(assets, null, 2)}\n`,
        );
        for (const asset of assets) {
          assert.ok(asset.loaded, `Unloaded asset: ${asset.src}`);
          assert.ok(
            Math.abs(asset.width - asset.expectedWidth) < 0.15 &&
              Math.abs(asset.height - asset.expectedHeight) < 0.15,
            `Asset geometry: ${asset.src} actual=${asset.width}x${asset.height}, expected=${asset.expectedWidth}x${asset.expectedHeight}`,
          );
          const url = new URL(asset.src, origin);
          const localPath = url.searchParams.get('url') ?? url.pathname;
          const bytes = await readFile(path.resolve('public', `.${localPath}`));
          assert.ok(bytes.length > 0, `Empty local asset: ${localPath}`);
        }
        report.pages[slug].assets.push(...assets);
      }
      if (width === 390 || width === 1440) {
        report.pages[slug].headings = await page
          .locator('h1,h2,h3')
          .evaluateAll((nodes) =>
            nodes.map((node) => ({ level: node.tagName, text: node.textContent?.trim() ?? '' })),
          );
        report.pages[slug].assets = await page.locator('.cp-catnet-map img').evaluateAll((images) =>
          images.map((image) => {
            const rect = image.getBoundingClientRect();
            return {
              src: image.getAttribute('src'),
              intrinsicWidth: image.naturalWidth || image.width,
              intrinsicHeight: image.naturalHeight || image.height,
              renderedWidth: rect.width,
              renderedHeight: rect.height,
              visible: rect.width > 0 && rect.height > 0,
            };
          }),
        );
        const axe = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        report.pages[slug].axe = {
          violations: axe.violations.map(({ id, impact, description, nodes }) => ({
            id,
            impact,
            description,
            count: nodes.length,
          })),
        };
      }
      if (width === 390) {
        const input = page.locator('#address-check input');
        await input.fill('bad');
        await page.getByRole('button', { name: 'Check availability', exact: true }).click();
        await page.waitForFunction(() =>
          document
            .querySelector('#address-check [role="alert"]')
            ?.textContent?.includes('Preview only'),
        );
        report.pages[slug].form.invalid = {
          message: await page.locator('#address-check [role="alert"]').innerText(),
          focused: await input.evaluate((node) => node === document.activeElement),
        };
        await input.fill(slug === 'vancouver' ? 'V6B 1A1' : 'M4B 1B3');
        await page.getByRole('button', { name: 'Check availability', exact: true }).click();
        await page.waitForFunction(() =>
          document
            .querySelector('#address-check [role="status"]')
            ?.textContent?.includes('Preview only'),
        );
        report.pages[slug].form.available = await page
          .locator('#address-check [role="status"]')
          .innerText();
        await input.fill(slug === 'vancouver' ? 'V6T 1Z4' : 'N8W 1A1');
        await page.getByRole('button', { name: 'Check availability', exact: true }).click();
        await page.waitForFunction(() =>
          document
            .querySelector('#address-check [role="status"]')
            ?.textContent?.includes('Preview only'),
        );
        report.pages[slug].form.unavailable = await page
          .locator('#address-check [role="status"]')
          .innerText();
        await page.keyboard.press('Tab');
        report.pages[slug].keyboardFocus = await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          visible: Boolean(document.activeElement?.getBoundingClientRect().width),
        }));
      }
      await page.close();
    }
  }

  const orderContext = await browser.newContext();
  const orderPage = await orderContext.newPage();
  const response = await orderPage.goto(
    new URL('/order/home-internet?plan=preview-internet-150', origin).toString(),
    { waitUntil: 'networkidle' },
  );
  report.orderHandoff = {
    status: response?.status(),
    title: await orderPage.title(),
    selected: (await orderPage.locator('body').innerText()).includes('150 Mbps'),
  };
  await orderContext.close();
} finally {
  await browser.close();
}

await mkdir(evidence, { recursive: true });
await writeFile(path.join(evidence, 'verification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.info(
  JSON.stringify(
    {
      pages: Object.fromEntries(
        Object.entries(report.pages).map(([key, value]) => [
          key,
          { widths: value.widths, form: value.form, axe: value.axe },
        ]),
      ),
      orderHandoff: report.orderHandoff,
      errors: report.errors,
    },
    null,
    2,
  ),
);
if (report.errors.length) process.exitCode = 1;
