import { installAuditContext } from './audit-context.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/* global document, innerWidth -- Executed in the browser through page.evaluate. */

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const evidence = path.resolve(appRoot, '../../docs/EVIDENCE/shared-components');
const baseUrl =
  process.env.COMPONENTS_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
const results = [];
const screenshotStyle = 'nextjs-portal { visibility: hidden; }';
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    await installAuditContext(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(`${baseUrl}/dev/components`, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole('heading', { name: 'Canadian Plans components', exact: true }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Document overflow at ${width}`,
    );

    const assetGeometry = await page.locator('img[data-figma-asset]').evaluateAll((images) =>
      images
        .filter((image) => image.getClientRects().length > 0)
        .map((image) => ({
          node: image.dataset.figmaAsset,
          src: image.getAttribute('src'),
          width: image.getBoundingClientRect().width,
          height: image.getBoundingClientRect().height,
          expectedWidth: Number(image.getAttribute('width')),
          expectedHeight: Number(image.getAttribute('height')),
          complete: image.complete && image.naturalWidth > 0,
        })),
    );
    for (const asset of assetGeometry) {
      assert.ok(asset.complete, `Asset not loaded: ${asset.src}`);
      assert.ok(
        Math.abs(asset.width - asset.expectedWidth) < 0.1 &&
          Math.abs(asset.height - asset.expectedHeight) < 0.1,
        `Asset geometry mismatch: ${asset.node}`,
      );
      const localPath = path.join(appRoot, 'public', asset.src);
      assert.ok((await stat(localPath)).size > 0, `Empty local asset: ${asset.src}`);
      const svgRoot = (await readFile(localPath, 'utf8')).match(/<svg\b[^>]*>/)?.[0];
      assert.ok(
        svgRoot?.includes(`width="${asset.expectedWidth}"`) &&
          svgRoot.includes(`height="${asset.expectedHeight}"`),
        `SVG root dimensions mismatch: ${asset.node}`,
      );
    }

    await page.screenshot({
      path: path.join(evidence, `components-${width}.png`),
      fullPage: true,
      style: screenshotStyle,
    });
    for (const [name, selector] of [
      ['utility', '.cp-utility'],
      ['nav', '.cp-nav'],
      ['promo', '.cp-promo'],
      ['footer', '.cp-footer'],
      ['plan', '[data-plan="test-fido-75"]'],
      ['featured-plan', '[data-plan="test-rogers-100"]'],
      ['faq', '.cp-faq-accordion'],
      ['review', '.cp-review-card'],
      ['price', '.cp-price-circle-stage'],
      ['image', '.cp-image-slot'],
      ['heading', '.cp-section-heading'],
      ['buttons', '.cp-lab-button-grid'],
      ['chips', '#chips'],
      ['breadcrumb', '.cp-breadcrumb'],
      ['sticky', '.cp-sticky-gallery'],
    ]) {
      await page
        .locator(selector)
        .first()
        .screenshot({ path: path.join(evidence, `${name}-${width}.png`), style: screenshotStyle });
    }
    const geometry = await page
      .locator(
        '[data-component], .cp-plan-card, .cp-review-card, .cp-image-slot, .cp-price-circle-stage, .cp-sticky-gallery .cp-sticky-cta',
      )
      .evaluateAll((elements) =>
        elements.map((element) => ({
          component: element.getAttribute('data-component') ?? element.className,
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
        })),
      );

    const accessibility = await new AxeBuilder({ page })
      .include('.cp-component-lab')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    assert.deepEqual(
      accessibility.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
      [],
      `Accessibility violations at ${width}`,
    );

    await page.getByRole('button', { name: 'Worker', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Worker', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Student', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.locator('[data-plan="test-rogers-100"]').getByRole('button').click();
    await expect(page.locator('[data-plan="test-rogers-100"]').getByRole('button')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const firstFaq = page.locator('.cp-faq-item').first();
    await firstFaq.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(firstFaq).not.toHaveAttribute('open');
    await page.locator('.cp-faq-item').nth(1).locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.cp-faq-item').nth(1)).toHaveAttribute('open');
    assert.equal(await page.locator('.cp-faq-item[open]').count(), 1);

    if (width === 390) {
      const menu = page.getByRole('button', { name: 'Open menu', exact: true });
      await menu.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(menu).toBeFocused();
      await menu.click();
      await page.getByRole('dialog').getByRole('button', { name: 'Find my plan' }).click();
      await expect(page.getByRole('dialog')).toContainText('Where are you right now?');
      await page.getByRole('button', { name: 'Close plan finder' }).click();
      await expect(menu).toBeFocused();
      await page.getByRole('checkbox', { name: 'Show floating mobile CTA' }).check();
      await page.locator('#sticky').scrollIntoViewIfNeeded();
      const floating = page.locator('.cp-sticky-cta[data-floating="true"]');
      await expect(floating).toHaveAttribute('data-visible', 'true');
      await page.locator('[data-plan="test-fido-75"]').getByRole('button').click();
      await page.locator('#sticky').scrollIntoViewIfNeeded();
      await expect(floating).toContainText('$35/mo');
      await expect(floating).toContainText('75 GB');
      await floating.getByRole('button').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(floating).toHaveAttribute('data-visible', 'false');
      await page.getByRole('button', { name: 'Close preview', exact: true }).click();
      await expect(floating.getByRole('button')).toBeFocused();
      await page.getByRole('checkbox', { name: 'Show floating mobile CTA' }).uncheck();
    } else {
      const search = page.getByRole('textbox', { name: 'Search plans or cities' });
      await search.fill('  ');
      await search.press('Enter');
      await expect(page.locator('#search-preview-feedback')).toHaveText(
        'Enter 2 to 80 characters.',
      );
      await search.fill('Toronto');
      await search.press('Enter');
      await expect(page.locator('#search-preview-feedback')).toHaveText(
        'Search preview complete. No live search or order was created.',
      );
    }
    assert.deepEqual(errors, [], `Browser errors at ${width}`);
    results.push({
      width,
      geometry,
      assets: assetGeometry,
      accessibility: 'no WCAG A/AA violations detected',
      interactions: 'passed',
      errors,
    });
    await context.close();
  }
  for (const width of [320, 768, 1024]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${baseUrl}/dev/components`);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Document overflow at ${width}`,
    );
    await page.close();
  }
  await writeFile(
    path.join(evidence, 'verification.json'),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  console.info(
    'PASS: 390/1440 screenshots, local SVG geometry, keyboard/menu/disclosure/selection/sticky/search interactions; no overflow at 320/390/768/1024/1440.',
  );
} finally {
  await browser.close();
}
