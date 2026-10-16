import { installAuditContext } from './audit-context.mjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(app, '../../docs/EVIDENCE/contact');
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const results = [];
const sourceHashes = {
  '/design/legal/0-imgSearchIcon.svg':
    'e9cd855ea79cb7f899803a5f7d05ce83a302ccf5f2742761c1db6bfeb1784865',
  '/design/contact/1-imgPhoneIcon.svg':
    'f007adae315d2a62f2ae84ee3e2aade2d47bb79d9ff8076fc5221a29f77956c1',
  '/design/contact/0-imgIconShieldCheck.svg':
    '3486077a34567ea9655d390d434069d7ac52e242b90bf3e10f27bace6f9a0365',
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
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: 'reduce',
    });
    await installAuditContext(context);
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.goto(`${process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127'}/contact`);
    await page.getByRole('heading', { name: 'Talk to a real person' }).waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.addStyleTag({ content: 'nextjs-portal {visibility:hidden;}' });
    await page.screenshot({ path: resolve(evidence, `contact-${width}.png`), fullPage: true });
    await page
      .locator('.cp-contact-message-area')
      .screenshot({ path: resolve(evidence, `message-${width}.png`) });
    const violations = (
      await new AxeBuilder({ page })
        .include('.cp-contact')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }));
    const geometry = await page
      .locator(
        '.cp-contact-hero, .cp-contact-options, .cp-contact-track-office, .cp-contact-message-area, .cp-contact-office, .cp-contact-message, .cp-footer',
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
    const assets = await page.locator('.cp-contact img[data-figma-asset]').evaluateAll((nodes) =>
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
      // Shared site header/footer icons (15 Oct 2026) are not contact-page Figma exports.
      if (!(asset.src in sourceHashes)) continue;
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
    const row = { width, violations, geometry, assets, consoleErrors };
    results.push(row);
    console.info(JSON.stringify(row));
    if (process.env.CONTACT_BASELINE === '1') {
      await context.close();
      continue;
    }
    assert.deepEqual(violations, []);
    const message = page.locator('#message-us');
    const tracking = page.locator('#track-order');
    await message.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.locator('#contact-name')).toBeFocused();
    await expect(page.locator('#contact-topic')).toHaveAttribute('aria-invalid', 'true');
    await expect(message.locator('[role="alert"]')).toHaveCount(4);
    await message.screenshot({ path: resolve(evidence, `validation-${width}.png`) });
    await page.locator('#contact-name').fill('Preview visitor');
    await page.locator('#contact-email').fill('visitor@example.com');
    await page.locator('#contact-phone').fill('phone');
    await page.locator('#contact-message').fill('Please explain the plan options.');
    await page.locator('#contact-topic').focus();
    await page.keyboard.press('Enter');
    await page.getByRole('option', { name: 'General question', exact: true }).focus();
    await page.keyboard.press('Enter');
    await message.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.locator('#contact-phone')).toBeFocused();
    await expect(page.locator('#contact-phone-error')).toBeVisible();
    await page.locator('#contact-phone').fill('+1 (604) 555-0100');
    await message.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(message.getByRole('status')).toContainText('No message was sent');
    await expect(page.locator('#contact-name')).toHaveValue('Preview visitor');
    await expect(page.locator('#contact-message')).toHaveValue('Please explain the plan options.');
    await message.screenshot({ path: resolve(evidence, `preview-result-${width}.png`) });
    if (width === 390) {
      // Hold the real action transport to exercise pending / duplicate-submit behavior.
      let release;
      const gate = new Promise((resolveGate) => {
        release = resolveGate;
      });
      let requests = 0;
      await page.route('**/contact*', async (route) => {
        if (!route.request().headers()['next-action']) {
          await route.continue();
          return;
        }
        requests += 1;
        await gate;
        await route.continue();
      });
      await message.getByRole('button', { name: 'Send message', exact: true }).click();
      await expect(
        message.getByRole('button', { name: 'Sending preview…', exact: true }),
      ).toBeDisabled();
      await expect(page.locator('#contact-name')).toBeDisabled();
      assert.equal(requests, 1);
      await message.evaluate((node) =>
        node.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
      );
      assert.equal(requests, 1);
      release();
      await expect(message.getByRole('status')).toContainText('No message was sent');
      await page.unroute('**/contact*');
      // Fail transport, then retry through the real server action with the same retained draft.
      await page.route('**/contact*', async (route) => {
        if (route.request().headers()['next-action']) await route.abort('failed');
        else await route.continue();
      });
      await message.getByRole('button', { name: 'Send message', exact: true }).click();
      await expect(message.getByRole('status')).toContainText('please try again');
      await expect(page.locator('#contact-message')).toHaveValue(
        'Please explain the plan options.',
      );
      await page.unroute('**/contact*');
      await message.getByRole('button', { name: 'Send message', exact: true }).click();
      await expect(message.getByRole('status')).toContainText('No message was sent');
    }
    await page.getByRole('button', { name: 'Change my install date', exact: true }).click();
    await expect(page.locator('#contact-message')).toBeFocused();
    await expect(page.locator('#contact-topic')).toContainText('Home internet / installation');
    await page.getByRole('button', { name: 'Update my documents', exact: true }).click();
    await expect(page.locator('#contact-topic')).toContainText('Documents');
    await page.getByRole('button', { name: 'Is this call really from you?', exact: true }).click();
    await expect(page.locator('#contact-topic')).toContainText('Verify a call');
    await page.getByRole('button', { name: 'Send an email', exact: true }).click();
    await expect(page.locator('#contact-name')).toBeFocused();
    await page.getByRole('link', { name: 'Where is my SIM?', exact: true }).click();
    await expect(page).toHaveURL(/#track-order$/u);
    await tracking.getByRole('button', { name: 'Track order  →', exact: true }).click();
    await expect(page.locator('#contact-track-order')).toBeFocused();
    await expect(tracking.locator('[role="alert"]')).toHaveCount(2);
    await page.locator('#contact-track-order').fill('CP-2026-10482');
    await page.locator('#contact-track-email').fill('visitor@example.com');
    await tracking.getByRole('button', { name: 'Track order  →', exact: true }).click();
    await expect(tracking.getByRole('status')).toContainText('No live order lookup was performed');
    await expect(page.locator('#contact-track-order')).toHaveValue('CP-2026-10482');
    if (width === 390) {
      let releaseTracking;
      const trackingGate = new Promise((resolveGate) => {
        releaseTracking = resolveGate;
      });
      let requests = 0;
      await page.route('**/contact*', async (route) => {
        if (!route.request().headers()['next-action']) {
          await route.continue();
          return;
        }
        requests += 1;
        await trackingGate;
        await route.abort('failed');
      });
      await tracking.getByRole('button', { name: 'Track order  →', exact: true }).click();
      await expect(tracking.getByRole('button', { name: 'Checking…', exact: true })).toBeDisabled();
      await expect(page.locator('#contact-track-email')).toBeDisabled();
      await tracking.evaluate((node) =>
        node.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
      );
      assert.equal(requests, 1);
      releaseTracking();
      await expect(tracking.getByRole('status')).toContainText('please try again');
      await expect(page.locator('#contact-track-email')).toHaveValue('visitor@example.com');
      await page.unroute('**/contact*');
      await tracking.getByRole('button', { name: 'Track order  →', exact: true }).click();
      await expect(tracking.getByRole('status')).toContainText(
        'No live order lookup was performed',
      );
    }
    for (const name of ['Chat on WhatsApp', 'Call now', 'Get directions →']) {
      const trigger = page.getByRole('button', { name, exact: true });
      await trigger.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Contact preview', exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveCSS('opacity', '1');
      if (name === 'Chat on WhatsApp')
        await dialog.screenshot({ path: resolve(evidence, `contact-preview-${width}.png`) });
      const dialogViolations = (
        await new AxeBuilder({ page })
          .include('.cp-contact-preview')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations;
      assert.deepEqual(dialogViolations, []);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    }
    if (width === 390) {
      // Site header (15 Oct 2026): the chat button jumps to the contact options; the
      // WhatsApp option there opens the preview dialog.
      await page.getByRole('button', { name: 'WhatsApp us', exact: true }).click();
      await expect(page).toHaveURL(/#contact-options$/u);
      await page.getByRole('button', { name: 'Chat on WhatsApp', exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: 'Contact preview', exact: true }),
      ).toContainText('verified business number');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Find my plan', exact: true })
        .click();
    } else await page.getByRole('button', { name: 'Find my plan', exact: true }).click();
    await expect(page.locator('.cp-finder-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    // Form drafts stay local; no personal data appears in a navigation URL.
    assert.ok(!page.url().includes('visitor') && !page.url().includes('CP-2026'));
    row.interactions =
      'validation, retained drafts, preview submissions, topic shortcuts, keyboard dialogs, global finder passed';
    row.transport =
      width === 390
        ? 'Both forms: pending, duplicate guard, failed action transport, retained draft and real retry passed'
        : 'normal preview transport passed';
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
    assert.deepEqual(consoleErrors, []);
    await context.close();
  }
} finally {
  await writeFile(resolve(evidence, 'verification.json'), `${JSON.stringify(results, null, 2)}\n`);
  await browser.close();
}
