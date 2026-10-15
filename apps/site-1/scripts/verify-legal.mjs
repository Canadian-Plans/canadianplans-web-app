import { installAuditContext } from './audit-context.mjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const origin = process.env.LEGAL_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const evidence = resolve('../../docs/EVIDENCE/legal');
await mkdir(evidence, { recursive: true });
const assets = JSON.parse(await readFile(resolve(evidence, 'assets.json'), 'utf8'));
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const records = [];
try {
  for (const asset of assets)
    assert.equal(
      createHash('sha256')
        .update(await readFile(resolve('public', asset.src.slice(1))))
        .digest('hex'),
      asset.hash,
      asset.src,
    );
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await installAuditContext(context);
    await context.addInitScript(() =>
      localStorage.setItem(
        'canadian-plans.cookie-choices.v1',
        JSON.stringify({ version: 1, analytics: false, marketing: false }),
      ),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.name));
    for (const slug of ['privacy', 'terms']) {
      await page.goto(origin + '/' + slug);
      await page.evaluate(() => globalThis.document.fonts.ready);
      await page
        .locator('img[data-figma-asset]')
        .evaluateAll((images) =>
          Promise.all(
            images.filter((img) => img.getBoundingClientRect().width).map((img) => img.decode()),
          ),
        );
      await page.addStyleTag({ content: 'nextjs-portal{visibility:hidden;}' });
      await page.screenshot({ path: resolve(evidence, `${slug}-${width}.png`), fullPage: true });
      const geometry = await page
        .locator(
          '.cp-legal-header,.cp-legal-body,.cp-legal-contents,.cp-legal-short,.cp-legal-section,.cp-legal-contact,.cp-footer',
        )
        .evaluateAll((nodes) =>
          nodes.map((n) => {
            const r = n.getBoundingClientRect();
            return {
              class: n.className,
              id: n.id,
              x: r.x,
              y: r.y + globalThis.scrollY,
              width: r.width,
              height: r.height,
            };
          }),
        );
      const visibleAssets = await page.locator('img[data-figma-asset]').evaluateAll((images) =>
        images
          .filter((img) => img.getBoundingClientRect().width)
          .map((img) => ({
            src: img.getAttribute('src'),
            width: img.getBoundingClientRect().width,
            height: img.getBoundingClientRect().height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          })),
      );
      for (const asset of visibleAssets) {
        assert.ok(asset.naturalWidth > 0 && asset.naturalHeight > 0, asset.src);
        const source = assets.find((item) => item.src === asset.src);
        if (source)
          assert.ok(
            Math.abs(asset.width / asset.height - source.width / source.height) < 0.02,
            asset.src,
          );
      }
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const violations = results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      }));
      const overflow = await page.evaluate(
        () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
      );
      records.push({ slug, width, geometry, assets: visibleAssets, violations, overflow });
      assert.equal(overflow, false);
      if (process.env.LEGAL_BASELINE !== '1') assert.deepEqual(violations, []);
      await expect(page.getByTestId('legal-placeholder')).toContainText('not approved');
      await expect(page.getByTestId('legal-version')).toContainText('Version 0');
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      const sectionLinks = page.locator('.cp-legal-contents nav a');
      if (width === 390) {
        assert.equal(await sectionLinks.filter({ visible: true }).count(), 4);
        await page.getByRole('button', { name: /Show all/ }).click();
        await expect(page.locator('.cp-legal-contents-toggle')).toHaveAttribute(
          'aria-expanded',
          'true',
        );
        assert.equal(
          await sectionLinks.filter({ visible: true }).count(),
          slug === 'privacy' ? 11 : 13,
        );
        await page.screenshot({
          path: resolve(evidence, `${slug}-contents-expanded-${width}.png`),
          fullPage: true,
        });
      }
      const last = sectionLinks.last();
      const target = await last.getAttribute('href');
      await last.click();
      await expect(page.locator(target)).toBeFocused();
      await expect(last).toHaveAttribute('aria-current', 'location');
      await page.locator('#legal-cookie-settings').click();
      await expect(page.getByRole('switch', { name: 'Analytics', exact: true })).toHaveAttribute(
        'aria-checked',
        'false',
      );
      await page.keyboard.press('Escape');
      await expect(page.locator('#legal-cookie-settings')).toBeFocused();
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  if (process.env.LEGAL_BASELINE !== '1') {
    const context = await browser.newContext();
    await installAuditContext(context);
    const page = await context.newPage();
    for (const width of [320, 768, 1024, 1280])
      for (const slug of ['privacy', 'terms']) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(origin + '/' + slug);
        assert.equal(
          await page.evaluate(
            () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
          ),
          false,
          `${slug} ${width}`,
        );
      }
    await page.goto(origin + '/privacy');
    await page
      .locator('.cp-legal-tabs')
      .getByRole('link', { name: 'Terms of Service', exact: true })
      .click();
    await expect(page).toHaveURL(origin + '/terms');
    await expect(
      page.locator('.cp-legal-tabs').getByRole('link', { name: 'Terms of Service', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await context.close();
  }
  await writeFile(resolve(evidence, 'verification.json'), JSON.stringify(records, null, 2));
} finally {
  await browser.close();
}
