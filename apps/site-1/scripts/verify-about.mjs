import { installAuditContext } from './audit-context.mjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(app, '../../docs/EVIDENCE/about');
await mkdir(evidence, { recursive: true });
const origin = process.env.ABOUT_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const sourceHashes = {
  '/design/legal/0-imgSearchIcon.svg':
    'e9cd855ea79cb7f899803a5f7d05ce83a302ccf5f2742761c1db6bfeb1784865',
  '/design/about/1-imgPhoneIcon.svg':
    '1acf06dfd2ce75cafa2d2be09ff1719e9354e027b0ca1adb770b434c83f69f43',
  '/design/about/0-imgIcon1.svg':
    '00e0395689924bf83597bf61f43674555165e858973eff4d2d7c4f55f544b288',
  '/design/about/0-imgIcon2.svg':
    '8036139aa4da626db55b380a370852ad7a8ba5976fabef4e7ce4234d143d4d7b',
  '/design/about/0-imgIcon3.svg':
    '75df825ff08d128de89e310227c76565c8cfe6f99698b2fffbb22560f327c6dc',
  '/design/about/0-imgIcon4.svg':
    '51f5b4053df0a543cd4a2ba24769ce7e73835c78f24082861e594df991263996',
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
    const response = await page.goto(`${origin}/about`);
    assert.equal(response.status(), 200);
    await page
      .getByRole('heading', {
        name: 'Canadian phone and internet plans, explained by humans.',
        exact: true,
      })
      .waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.addStyleTag({ content: 'nextjs-portal {visibility:hidden;}' });
    await page.screenshot({ path: resolve(evidence, `about-${width}.png`), fullPage: true });
    await page
      .locator('.cp-about-final-card')
      .screenshot({ path: resolve(evidence, `final-${width}.png`) });
    const geometry = await page
      .locator(
        '.cp-about-hero, .cp-about-story, .cp-about-benefits, .cp-about-dealer, .cp-about-final, .cp-about-final-card, .cp-footer',
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
        .include('.cp-about')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }));
    const assets = await page.locator('.cp-about img[data-figma-asset]').evaluateAll((nodes) =>
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
    results.push(row);
    console.info(JSON.stringify(row));
    if (process.env.ABOUT_BASELINE === '1') {
      await context.close();
      continue;
    }
    const expectedGeometry =
      width === 390
        ? [
            [164, 600],
            [764, 849],
            [1613, 715],
            [2328, 199],
            [2527, 502],
            [2575, 406],
            [3029, 947],
          ]
        : [
            [160, 971],
            [1131, 710],
            [1841, 525],
            [2366, 209],
            [2575, 601],
            [2575, 505],
            [3176, 439],
          ];
    for (const [index, [y, height]] of expectedGeometry.entries()) {
      assert.ok(Math.abs(geometry[index].y - y) < 0.5, JSON.stringify(geometry[index]));
      assert.ok(Math.abs(geometry[index].height - height) < 0.5, JSON.stringify(geometry[index]));
    }
    assert.deepEqual(violations, []);
    const slots = await page
      .locator('.cp-about-team-image, .cp-about-story-image')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        })),
      );
    assert.equal(slots[0].width, width === 390 ? 350 : 1200);
    assert.equal(slots[0].height, width === 390 ? 220 : 420);
    assert.ok(Math.abs(slots[1].width - (width === 390 ? 350 : 460)) < 0.55);
    assert.equal(slots[1].height, width === 390 ? 200 : 518);
    for (const circle of await page.locator('.cp-about-benefit-icon').all()) {
      const bounds = await circle.boundingBox();
      assert.equal(bounds.width, width === 390 ? 44 : 48);
      assert.equal(bounds.height, bounds.width);
    }
    await page.goto(`${origin}/about`);
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Skip to main content', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#about-main')).toBeFocused();
    if (width === 390) {
      const trigger = page.getByRole('button', { name: 'Open menu', exact: true });
      await trigger.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Find my plan', exact: true })
        .click();
    } else await page.getByRole('button', { name: 'Find my plan', exact: true }).click();
    await expect(page.locator('.cp-finder-modal')).toBeVisible();
    await expect(page.locator('.cp-finder-modal').getByRole('heading').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.cp-finder-modal')).not.toBeVisible();
    await page
      .locator('.cp-about-final-actions')
      .getByRole('link', { name: 'See plans', exact: false })
      .click();
    await expect(page).toHaveURL(`${origin}/mobile-plans`);
    await page.goto(`${origin}/about`);
    await page
      .locator('.cp-about-final-actions')
      .getByRole('link', { name: 'Talk to an advisor', exact: true })
      .click();
    await expect(page).toHaveURL(`${origin}/contact#message-us`);
    await expect(page.locator('#message-us')).toBeVisible();
    await page.goto(`${origin}/about`);
    row.interactions =
      'Keyboard skip link, mobile menu and focus return, global finder, plan and advisor destinations passed';
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
