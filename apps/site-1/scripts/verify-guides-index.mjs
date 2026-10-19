import { installAuditContext } from './audit-context.mjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(app, '../../docs/EVIDENCE/guides-index');
await mkdir(evidence, { recursive: true });
const origin =
  process.env.GUIDES_INDEX_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const hashes = {
  '/design/legal/0-imgSearchIcon.svg':
    'e9cd855ea79cb7f899803a5f7d05ce83a302ccf5f2742761c1db6bfeb1784865',
  '/design/components/312-9-imgIcon.svg':
    '67020d1465b57b647dedb3b0d3d878aa84d00342844b965eba84f1e4b0cef8a8',
  '/design/guides-index/1-imgPhoneIcon.svg':
    '5ce4a5b98daaec77e2393b52de0e7f82b898e9dd485de6643f625c3ea4aad036',
  '/design/components/60-13-imgMark.svg':
    '033ec8f6ba8f6b78d035fb7362ef073c973c28ed8004b3d33bd9f34387c0ebf7',
  '/design/components/60-13-imgEllipse.svg':
    '0fdd942c88fa68ea8809ea5704b8dd27acdee8f4d7d1b6685b2a31ae6da7e0bf',
  '/design/components/364-2163-imgIcon.svg':
    '460a376b06c815353096dc552c8a9a52f5bf2432c4471c8d903cf56364df2e83',
  '/design/components/364-2163-imgIcon1.svg':
    '0f75b1bad987c3a9426c30a373abdf4b9fc5601f34c0fd39bc75cd67c98024cd',
  '/design/components/312-2-imgIcon.svg':
    '718635e95fdab861db5514a5d74c633d8b7723e26e8f046f3974fe6ffa51d55b',
  '/design/components/68-50-imgFrame.svg':
    '51c40f39354f2d490a0acfedf723d78b96df243b4a7bb7d2553b01ba7a6dcd45',
};
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const results = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: 'reduce',
    });
    await installAuditContext(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(origin + '/guides');
    assert.equal(response.status(), 200);
    await page
      .getByRole('heading', { name: 'Plain answers for your move to Canada', exact: true })
      .waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.addStyleTag({ content: 'nextjs-portal{visibility:hidden;}' });
    await page.screenshot({ path: resolve(evidence, `guides-${width}.png`), fullPage: true });
    await page
      .locator('.cp-guides-featured')
      .screenshot({ path: resolve(evidence, `featured-${width}.png`) });
    const geometry = await page
      .locator(
        '.cp-guides-hero,.cp-guides-results,.cp-guides-featured,.cp-guides-grid,.cp-guides-questions,.cp-guides-final,.cp-guides-final-card,.cp-footer',
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          class: node.className,
          y: node.getBoundingClientRect().y + globalThis.scrollY,
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        })),
      );
    const details = await page
      .locator(
        '.cp-guides-hero-inner > *,.cp-guides-featured > *,.cp-guides-card,.cp-guides-questions li',
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          class: node.className,
          text: node.textContent.slice(0, 30),
          height: node.getBoundingClientRect().height,
          width: node.getBoundingClientRect().width,
        })),
      );
    const violations = (
      await new AxeBuilder({ page })
        .include('.cp-guides-index')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }));
    const assets = await page
      .locator('.cp-guides-index img[data-figma-asset]')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.getBoundingClientRect().width > 0)
          .map((node) => ({
            src: node.getAttribute('src'),
            loaded: node.complete && node.naturalWidth > 0,
            width: node.getBoundingClientRect().width,
            height: node.getBoundingClientRect().height,
            declaredWidth: Number(node.getAttribute('width')),
            declaredHeight: Number(node.getAttribute('height')),
          })),
      );
    for (const asset of assets) {
      assert.ok(asset.loaded, asset.src);
      assert.equal(asset.width, asset.declaredWidth);
      assert.equal(asset.height, asset.declaredHeight);
      // Shared site header/footer icons (15 Oct 2026) are not page Figma exports.
      if (!(asset.src in hashes)) continue;
      const svg = await readFile(resolve(app, `public${asset.src}`), 'utf8');
      assert.equal(createHash('sha256').update(svg).digest('hex'), hashes[asset.src]);
      const root = svg.match(/<svg\b[^>]*>/u)[0];
      assert.equal(Number(root.match(/\bwidth="([\d.]+)"/u)[1]), asset.width);
      assert.equal(Number(root.match(/\bheight="([\d.]+)"/u)[1]), asset.height);
    }
    const row = { width, geometry, details, violations, assets, errors };
    results.push(row);
    console.info(JSON.stringify({ width, geometry, violations }));
    if (process.env.GUIDES_INDEX_BASELINE === '1') {
      await context.close();
      continue;
    }
    assert.deepEqual(violations, []);
    // Electric Blue alignment (15 Oct 2026): exact Figma frame geometry no longer applies;
    // sections must exist, be visible and follow each other down the page.
    assert.ok(geometry.length >= 6, JSON.stringify(geometry));
    for (const [index, box] of geometry.entries()) {
      assert.ok(box.height > 0, JSON.stringify(box));
      if (index > 0) assert.ok(box.y >= geometry[index - 1].y, JSON.stringify(box));
    }
    row.imageSlots = await page
      .locator('.cp-guides-featured-image,.cp-guides-card-image')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
          captionSize: globalThis.getComputedStyle(node.querySelector('.cp-image-caption'))
            .fontSize,
          labelSize: globalThis.getComputedStyle(node.querySelector('.cp-image-label')).fontSize,
        })),
      );
    assert.equal(row.imageSlots.length, 7);
    for (const [index, slot] of row.imageSlots.entries()) {
      assert.ok(slot.width > 0 && slot.height > 0, JSON.stringify(slot));
      assert.equal(slot.captionSize, index > 0 && width === 390 ? '12px' : '13px');
      assert.equal(slot.labelSize, '12px');
    }
    // Guide list (15 Oct 2026): the article is featured, seven real pages follow.
    const cards = page.locator('.cp-guides-grid .cp-guides-card');
    await expect(cards).toHaveCount(6);
    await page.getByRole('button', { name: 'Show more guides', exact: true }).click();
    await expect(cards).toHaveCount(7);
    await expect(cards.last()).toBeFocused();
    await expect(page.getByRole('button', { name: 'Show more guides', exact: true })).toHaveCount(
      0,
    );
    for (const href of await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href')),
    )) {
      assert.equal((await page.request.get(origin + href)).status(), 200, href);
    }
    const topics = page.getByRole('group', { name: 'Guide topics', exact: true });
    await topics.getByRole('button', { name: 'Home internet', exact: true }).click();
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Vancouver');
    await expect(page.locator('.cp-guides-featured')).toHaveCount(0);
    const search = page.getByRole('searchbox', { name: 'Search guides', exact: true });
    await search.fill('India');
    await search.press('Enter');
    await expect(cards).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'No matching guides', exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: resolve(evidence, `empty-${width}.png`), fullPage: true });
    assert.deepEqual(
      (
        await new AxeBuilder({ page })
          .include('.cp-guides-index')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
      [],
    );
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('');
    await expect(cards).toHaveCount(6);
    await search.fill('ESIM');
    await page
      .locator('.cp-guides-search')
      .getByRole('button', { name: 'Search', exact: true })
      .click();
    await expect(cards).toHaveCount(2);
    await expect(page.locator('.cp-guides-featured')).toHaveCount(1);
    await topics.getByRole('button', { name: 'Money & credit', exact: true }).click();
    await expect(cards).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await topics.getByRole('button', { name: 'Moving to Canada', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(cards).toHaveCount(2);
    await expect(page.locator('.cp-guides-featured')).toHaveCount(0);
    await topics.getByRole('button', { name: 'All guides', exact: true }).click();
    await page.locator('.cp-guides-featured').click();
    await expect(page).toHaveURL(origin + '/guides/best-sim-for-students-from-india');
    await expect(page.locator('#guide-article-schema')).toHaveCount(1);
    await page.goto(origin + '/guides');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to guides', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#guides-main')).toBeFocused();
    await page
      .locator('.cp-guides-cta')
      .getByRole('link', { name: 'Talk to an advisor ›', exact: true })
      .click();
    await expect(page).toHaveURL(origin + '/contact');
    await page.goto(origin + '/guides');
    row.overflow = [];
    for (const nextWidth of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width: nextWidth, height: 1000 });
      const overflow = await page.evaluate(() => ({
        viewport: globalThis.innerWidth,
        document: globalThis.document.documentElement.scrollWidth,
      }));
      assert.ok(overflow.document <= overflow.viewport, JSON.stringify(overflow));
      row.overflow.push(overflow);
    }
    assert.deepEqual(errors, []);
    row.interactions =
      'show more and focus, every card resolves, combined topics/search, empty/clear, keyboard filters/skip, article navigation and advisor CTA passed';
    await context.close();
  }
} finally {
  await writeFile(resolve(evidence, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
  await browser.close();
}
