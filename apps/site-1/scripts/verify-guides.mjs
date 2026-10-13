import { installAuditContext } from './audit-context.mjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(app, '../../docs/EVIDENCE/guides');
await mkdir(evidence, { recursive: true });
const origin = process.env.GUIDE_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const route = '/guides/best-sim-for-students-from-india';
const sourceHashes = {
  '/design/legal/0-imgSearchIcon.svg':
    'e9cd855ea79cb7f899803a5f7d05ce83a302ccf5f2742761c1db6bfeb1784865',
  '/design/guides/0-imgEllipse1.svg':
    '0e2ddcf111384c68bdef0310165da8f2f2be2ad180b75e26da231eb0d886d52b',
  '/design/guides/0-imgEllipse2.svg':
    '2aa2eb2a8ce136dc20f7940677376217af8cd19473ddf3acaf85914c472f72bc',
  '/design/guides/1-imgPhoneIcon.svg':
    'd327c948548c221e457bf9e73ce757dd0bc01becbe7d7b9395d598939fcfa9d2',
  '/design/guides/1-imgIconList.svg':
    'f8f0013a18abf903d69e0440961ebbfc0ec1f2197bed26da9b52c73969406f26',
  '/design/guides/1-imgChevronDown.svg':
    '37cead1999d16b33542f3ee68e23b8dc749705720f15840a0e6bb22456538623',
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
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: 'reduce',
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    await installAuditContext(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(origin + route);
    assert.equal(response.status(), 200);
    const html = await response.text();
    await page
      .getByRole('heading', { name: 'Best SIM for students from India (2026)', exact: true })
      .waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.addStyleTag({ content: 'nextjs-portal{visibility:hidden;}' });
    await page.screenshot({ path: resolve(evidence, `guide-${width}.png`), fullPage: true });
    await page
      .locator('.cp-guide-article')
      .screenshot({ path: resolve(evidence, `article-${width}.png`) });
    const geometry = await page
      .locator(
        '.cp-guide-header,.cp-guide-body,.cp-guide-related,.cp-guide-final,.cp-guide-final-card,.cp-footer',
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          class: node.className,
          y: node.getBoundingClientRect().y + globalThis.scrollY,
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        })),
      );
    const blocks = await page.locator('.cp-guide-article > *').evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getBoundingClientRect().height > 0)
        .map((node) => ({
          class: node.className,
          text: node.textContent.slice(0, 35),
          y: node.getBoundingClientRect().y + globalThis.scrollY,
          height: node.getBoundingClientRect().height,
        })),
    );
    const violations = (
      await new AxeBuilder({ page })
        .include('.cp-guide')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }));
    const assets = await page.locator('.cp-guide img[data-figma-asset]').evaluateAll((nodes) =>
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
      const svg = await readFile(resolve(app, `public${asset.src}`), 'utf8');
      assert.equal(createHash('sha256').update(svg).digest('hex'), sourceHashes[asset.src]);
      const root = svg.match(/<svg\b[^>]*>/u)[0];
      assert.equal(Number(root.match(/\bwidth="([\d.]+)"/u)[1]), asset.width);
      assert.equal(Number(root.match(/\bheight="([\d.]+)"/u)[1]), asset.height);
    }
    const details = await page
      .locator(
        '.cp-guide-header-inner > *, .cp-guide-quick p, .cp-guide-faq details, .cp-guide-faq summary, .cp-guide-faq .cp-faq-answer, .cp-guide-related-card',
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          class: node.className,
          text: node.textContent.slice(0, 20),
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
          font: globalThis.getComputedStyle(node).fontSize,
          line: globalThis.getComputedStyle(node).lineHeight,
        })),
      );
    const row = { width, geometry, blocks, violations, assets, errors, details };
    results.push(row);
    console.info(JSON.stringify({ width, geometry, violations }));
    if (process.env.GUIDE_BASELINE === '1') {
      await context.close();
      continue;
    }
    const expected =
      width === 390
        ? [
            [164, 551],
            [715, 4762],
            [5477, 627],
            [6104, 610],
            [6152, 514],
            [6714, 947],
          ]
        : [
            [160, 941],
            [1101, 3053],
            [4154, 547],
            [4701, 641],
            [4701, 545],
            [5342, 439],
          ];
    for (const [index, [y, height]] of expected.entries()) {
      assert.ok(Math.abs(geometry[index].y - y) < 0.5, JSON.stringify(geometry[index]));
      assert.ok(Math.abs(geometry[index].height - height) < 0.5, JSON.stringify(geometry[index]));
    }
    assert.deepEqual(violations, []);
    const slots = await page.locator('.cp-guide .cp-image-slot').evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getBoundingClientRect().width > 0)
        .map((node) => ({
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        })),
    );
    const expectedSlots =
      width === 390
        ? [
            [350, 196],
            [310, 180],
            [310, 180],
            [104, 104],
            [104, 104],
            [104, 104],
          ]
        : [
            [1200, 440],
            [272, 170],
            [272, 170],
            [386.6667, 160],
            [386.6667, 160],
            [386.6667, 160],
          ];
    assert.equal(slots.length, expectedSlots.length);
    for (const [index, [slotWidth, slotHeight]] of expectedSlots.entries()) {
      assert.ok(Math.abs(slots[index].width - slotWidth) < 0.5, JSON.stringify(slots[index]));
      assert.equal(slots[index].height, slotHeight);
    }
    row.imageSlots = slots;
    row.imageTypography = await page.locator('.cp-guide .cp-image-slot').evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getBoundingClientRect().width > 0)
        .map((node) => ({
          class: node.className,
          labelSize: globalThis.getComputedStyle(node.querySelector('.cp-image-label')).fontSize,
          captionSize: globalThis.getComputedStyle(node.querySelector('.cp-image-caption'))
            .fontSize,
        })),
    );
    for (const image of row.imageTypography) {
      assert.equal(image.labelSize, '12px');
      assert.equal(
        image.captionSize,
        width === 390 && image.class.includes('cp-guide-related-image') ? '12px' : '13px',
      );
    }
    const schema = JSON.parse(await page.locator('#guide-article-schema').textContent());
    assert.equal(schema['@type'], 'Article');
    assert.equal(schema.url, await page.locator('link[rel="canonical"]').getAttribute('href'));
    assert.equal(schema.headline, await page.locator('#guide-title').textContent());
    assert.equal(schema.author.name, 'Ananya R.');
    assert.equal(
      schema.dateModified,
      await page.locator('.cp-guide-date time').getAttribute('datetime'),
    );
    assert.ok(
      html.includes('<script id="guide-article-schema" type="application/ld+json">'),
      'server-rendered Article schema',
    );
    assert.equal(await page.locator('.cp-guide-article .cp-faq-item').count(), 6);
    const question = page.locator('.cp-guide-faq details').nth(1);
    await question.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(question).toHaveAttribute('open', '');
    await expect(question).toContainText('awaiting approved content');
    await expect(page.locator('.cp-guide-faq details').first()).not.toHaveAttribute('open', '');
    const toc =
      width === 390
        ? page.locator('.cp-guide-mobile-contents')
        : page.locator('.cp-guide-desktop-contents');
    for (const id of ['needs', 'compare', 'esim', 'order', 'guide-faq', 'quick-answer']) {
      if (width === 390) {
        await toc.getByRole('button').click();
        await expect(toc.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
      }
      const link = toc.locator(`a[href="#${id}"]`);
      await link.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`#${id}$`, 'u'));
      await expect(page.locator(`#${id}`)).toBeFocused();
      if (width === 390)
        await expect(toc.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    }
    const helpful = page.locator('.cp-guide-helpful');
    await helpful.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(helpful.getByRole('button', { name: 'Yes', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await helpful.getByRole('button', { name: 'No', exact: true }).click();
    await expect(helpful.getByRole('button', { name: 'No', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(helpful.getByRole('button', { name: 'Yes', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const share =
      width === 390 ? page.locator('.cp-guide-mobile-share') : page.locator('.cp-guide-aside');
    await share.getByRole('button', { name: 'Copy link', exact: true }).click();
    await expect(share.getByRole('button', { name: 'Link copied', exact: true })).toBeVisible();
    assert.equal(
      await page.evaluate(() => globalThis.navigator.clipboard.readText()),
      origin + route,
    );
    await expect(share.getByRole('link', { name: 'WhatsApp', exact: true })).toHaveAttribute(
      'href',
      `https://wa.me/?text=${encodeURIComponent(origin + route)}`,
    );
    await page.goto(origin + route);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to article', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#guide-main')).toBeFocused();
    if (width === 390) {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Find my plan', exact: true })
        .click();
    } else await page.getByRole('button', { name: 'Find my plan', exact: true }).click();
    await expect(page.locator('.cp-mobile-menu')).toHaveCount(0);
    await expect(page.locator('.cp-finder-modal').getByRole('heading').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.cp-finder-modal')).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: width === 390 ? 'Open menu' : 'Find my plan', exact: true }),
    ).toBeFocused();
    await page
      .locator('.cp-guide-final-actions')
      .getByRole('link', { name: 'See student plans', exact: false })
      .click();
    await expect(page).toHaveURL(origin + '/pre-arrival-sim#plans');
    await page.goto(origin + route);
    await page
      .locator('.cp-guide-final-actions')
      .getByRole('link', { name: 'Talk to an advisor', exact: true })
      .click();
    await expect(page).toHaveURL(origin + '/contact#message-us');
    await page.goto(origin + route);
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
    const missing = await page.goto(origin + '/guides/does-not-exist');
    assert.equal(missing.status(), 404);
    row.interactions =
      'contents keyboard/focus, six FAQs, local helpful state, clipboard, WhatsApp intent, global finder, CTA routes and unknown-slug 404 passed';
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await writeFile(resolve(evidence, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
  await browser.close();
}
