import { installAuditContext } from './audit-context.mjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(app, '../../docs/EVIDENCE/faq');
await mkdir(evidence, { recursive: true });
const origin = process.env.FAQ_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const sourceHashes = {
  '/design/legal/0-imgSearchIcon.svg':
    'e9cd855ea79cb7f899803a5f7d05ce83a302ccf5f2742761c1db6bfeb1784865',
  '/design/faq/1-imgPhoneIcon.svg':
    'a1e9f054e950610494e76c9f38d425212d42d471cd14a65ff066b9af7b3fc648',
  '/design/faq/0-imgIconSearch.svg':
    'a7a73b001d63d3ed6c3a65bf3fe4de45de78a15cf42b363508137a92664c9786',
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
const results = [];
const browser = await chromium.launch();
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
    const response = await page.goto(`${origin}/faq`);
    const sourceHtml = await response.text();
    const sourceSchema = sourceHtml.match(
      /<script[^>]*id="faq-page-schema"[^>]*>(.*?)<\/script>/su,
    )?.[1];
    assert.ok(sourceSchema, 'FAQPage must be rendered in the server HTML');
    await page.getByRole('heading', { name: 'Frequently asked questions', exact: true }).waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.addStyleTag({ content: 'nextjs-portal {visibility:hidden;}' });
    await page.screenshot({ path: resolve(evidence, `faq-${width}.png`), fullPage: true });
    await page
      .locator('#faq-eligibility')
      .screenshot({ path: resolve(evidence, `eligibility-${width}.png`) });
    const geometry = await page
      .locator(
        '.cp-faq-page-hero, .cp-faq-page-group, .cp-faq-page-final, .cp-faq-page-final-card, .cp-footer',
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          class: node.className,
          x: node.getBoundingClientRect().x,
          y: node.getBoundingClientRect().y + globalThis.scrollY,
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        })),
      );
    const violations = (
      await new AxeBuilder({ page })
        .include('.cp-faq-page')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }));
    const assets = await page.locator('.cp-faq-page img[data-figma-asset]').evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getBoundingClientRect().width > 0)
        .map((node) => ({
          src: node.getAttribute('src'),
          node: node.dataset.figmaAsset,
          loaded: node.complete && node.naturalWidth > 0,
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
          declaredWidth: Number(node.getAttribute('width')),
          declaredHeight: Number(node.getAttribute('height')),
        })),
    );
    for (const asset of assets) {
      assert.ok(asset.loaded, asset.src);
      assert.ok(
        Math.abs(asset.width - asset.declaredWidth) < 0.55 &&
          Math.abs(asset.height - asset.declaredHeight) < 0.55,
        JSON.stringify(asset),
      );
      const svg = await readFile(resolve(app, `public${asset.src}`), 'utf8');
      assert.equal(createHash('sha256').update(svg).digest('hex'), sourceHashes[asset.src]);
      const root = svg.match(/<svg\b[^>]*>/u)?.[0] ?? '';
      assert.equal(Number(root.match(/\bwidth="([\d.]+)"/u)?.[1]), asset.width);
      assert.equal(Number(root.match(/\bheight="([\d.]+)"/u)?.[1]), asset.height);
    }
    const row = { width, violations, geometry, assets, errors };
    row.imageSlots = await page.locator('.cp-faq-page-image').evaluateAll((nodes) =>
      nodes.map((node) => ({
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
      })),
    );
    assert.deepEqual(
      row.imageSlots,
      Array.from({ length: 2 }, () => ({
        width: width === 390 ? 350 : 380,
        height: width === 390 ? 200 : 240,
      })),
    );
    results.push(row);
    console.info(JSON.stringify(row));
    if (process.env.FAQ_BASELINE === '1') {
      await context.close();
      continue;
    }
    assert.deepEqual(violations, []);
    const items = page.locator('#faq-results .cp-faq-item');
    await expect(items).toHaveCount(19);
    await expect(page.locator('#faq-results details[open]')).toHaveCount(3);
    const originalSchemaText = await page.locator('#faq-page-schema').textContent();
    const schema = JSON.parse(originalSchemaText);
    assert.deepEqual(JSON.parse(sourceSchema), schema);
    assert.equal(schema['@type'], 'FAQPage');
    assert.equal(schema['@context'], 'https://schema.org');
    assert.equal(schema.mainEntity.length, 3);
    for (const item of schema.mainEntity) {
      const disclosure = items.filter({
        has: page.locator('summary').filter({ hasText: item.name }),
      });
      await expect(disclosure).toHaveCount(1);
      assert.equal(
        (await disclosure.locator('.cp-faq-answer').textContent()).trim(),
        item.acceptedAnswer.text,
      );
    }
    const second = page.locator('#faq-eligibility details').nth(1);
    await second.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(second).toHaveAttribute('open', '');
    await expect(page.locator('#faq-eligibility details').first()).not.toHaveAttribute('open', '');
    await expect(second.locator('.cp-faq-answer')).toContainText('awaiting approved content');
    await page.keyboard.press('Space');
    await expect(second).not.toHaveAttribute('open', '');
    const search = page.getByRole('searchbox', {
      name: 'Search frequently asked questions',
      exact: true,
    });
    await search.fill('no credit check');
    await expect(items).toHaveCount(1);
    await expect(items).toContainText('Canadian credit history');
    await expect(page.locator('.cp-faq-page-search-feedback')).toContainText('1 question found');
    await page.screenshot({ path: resolve(evidence, `search-${width}.png`), fullPage: true });
    assert.equal(await page.locator('#faq-page-schema').textContent(), originalSchemaText);
    await search.fill('SHIP INSERT');
    await expect(items).toHaveCount(1);
    await expect(items).toContainText('physical SIM');
    await search.fill('unmatched-preview-xyz');
    await expect(items).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'No matching questions', exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: resolve(evidence, `empty-${width}.png`), fullPage: true });
    const emptyViolations = (
      await new AxeBuilder({ page })
        .include('.cp-faq-page')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations;
    assert.deepEqual(emptyViolations, []);
    await page
      .locator('.cp-faq-page-search-feedback')
      .getByRole('button', { name: 'Clear search', exact: true })
      .click();
    await expect(items).toHaveCount(19);
    await expect(search).toBeFocused();
    for (const name of ['Eligibility', 'Plans & SIM', 'Orders & billing']) {
      await search.fill('unmatched-preview-xyz');
      const topic = page
        .getByRole('navigation', { name: 'FAQ topics', exact: true })
        .getByRole('link', { name, exact: true });
      await topic.focus();
      await page.keyboard.press('Enter');
      await expect(search).toHaveValue('');
      await expect(items).toHaveCount(19);
      const id = (await topic.getAttribute('href')).slice(1);
      await expect(page.locator(`#${id}`)).toBeFocused();
      await expect(page).toHaveURL(new RegExp(`#${id}$`, 'u'));
    }
    if (width === 390) {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Find my plan', exact: true })
        .click();
    } else await page.getByRole('button', { name: 'Find my plan', exact: true }).click();
    await expect(page.locator('.cp-finder-modal')).toBeVisible();
    await expect(page.locator('.cp-finder-modal').getByRole('heading').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.cp-finder-modal')).not.toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Browse all plans', exact: false }),
    ).toHaveAttribute('href', '/mobile-plans');
    await expect(
      page
        .locator('.cp-faq-page-final-actions')
        .getByRole('link', { name: 'Talk to an advisor', exact: true }),
    ).toHaveAttribute('href', '/contact#message-us');
    row.schema =
      'three source Q&A pairs match the visible expandable answers; server-rendered schema remains unchanged during local search';
    row.interactions =
      '19 disclosures, keyboard toggling, exclusive groups, question/answer/alias search, empty/clear, keyboard topics, global finder and CTA destinations passed';
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
    await context.close();
  }
} finally {
  await writeFile(resolve(evidence, 'verification.json'), `${JSON.stringify(results, null, 2)}\n`);
  await browser.close();
}
