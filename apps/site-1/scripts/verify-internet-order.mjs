import { installAuditContext } from './audit-context.mjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(app, '../../docs/EVIDENCE/internet-order');
await mkdir(evidence, { recursive: true });
const origin =
  process.env.INTERNET_ORDER_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const hashes = {
  '/design/components/68-50-imgFrame.svg':
    '51c40f39354f2d490a0acfedf723d78b96df243b4a7bb7d2553b01ba7a6dcd45',
  '/design/internet-order/0-imgLock.svg':
    '07da15c541b75667e13e0dcbb7b6d16164f407def71d373f2a8f8910bb84f6f0',
  '/design/internet-order/1-imgPhone.svg':
    '0de15b3f9996e9a7609f98fd93e61723ee990801c9472697631f79afc7f4db20',
  '/design/internet-order/1-imgChevronDown.svg':
    '018978e7e8d578a5a1697dee0d85ac62221c702256f0b1b30c045d7cb045e24e',
};
const browser = await chromium.launch();
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
    const businessRequests = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (request) => {
      if (request.url().includes('/api/')) businessRequests.push(new URL(request.url()).pathname);
    });
    const response = await page.goto(origin + '/order/home-internet');
    assert.equal(response.status(), 200);
    await page.getByRole('heading', { name: 'Get connected', exact: true }).waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.addStyleTag({ content: 'nextjs-portal{visibility:hidden;}' });
    await page.screenshot({ path: resolve(evidence, `form-${width}.png`), fullPage: true });
    const geometry = await page
      .locator(
        '.cp-io-header,.cp-io-body,.cp-io-form,.cp-io-desktop-summary,.cp-io-mobile-summary,.cp-io-recap',
      )
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.getBoundingClientRect().width > 0)
          .map((node) => ({
            class: node.className,
            y: node.getBoundingClientRect().y + globalThis.scrollY,
            width: node.getBoundingClientRect().width,
            height: node.getBoundingClientRect().height,
          })),
      );
    const details = await page.locator('.cp-io-form > *,.cp-io-summary > *').evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getBoundingClientRect().width > 0)
        .map((node) => ({
          class: node.className,
          text: node.textContent.slice(0, 30),
          height: node.getBoundingClientRect().height,
        })),
    );
    const violations = (
      await new AxeBuilder({ page })
        .include('.cp-internet-order')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }));
    const assets = await page
      .locator('.cp-internet-order img[data-figma-asset]')
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
      assert.ok(asset.loaded);
      assert.equal(asset.width, asset.declaredWidth);
      assert.equal(asset.height, asset.declaredHeight);
      const svg = await readFile(resolve(app, `public${asset.src}`), 'utf8');
      assert.equal(createHash('sha256').update(svg).digest('hex'), hashes[asset.src]);
      const root = svg.match(/<svg\b[^>]*>/u)[0];
      assert.equal(Number(root.match(/\bwidth="([\d.]+)"/u)[1]), asset.width);
      assert.equal(Number(root.match(/\bheight="([\d.]+)"/u)[1]), asset.height);
    }
    const row = { width, geometry, details, violations, assets, errors };
    results.push(row);
    console.info(JSON.stringify({ width, geometry, violations }));
    if (process.env.INTERNET_ORDER_BASELINE === '1') {
      await context.close();
      continue;
    }
    assert.deepEqual(violations, []);
    const expected =
      width === 390
        ? [
            [0, 390, 77],
            [77, 350, 2530],
            [93, 350, 70],
            [179, 350, 2388],
            [2045, 310, 342],
          ]
        : [
            [0, 1440, 77],
            [77, 1200, 1552],
            [125, 768, 1408],
            [125, 400, 629],
          ];
    for (const [index, [y, itemWidth, height]] of expected.entries()) {
      assert.equal(geometry[index].y, y);
      assert.equal(geometry[index].width, itemWidth);
      assert.equal(geometry[index].height, height);
    }
    if (width === 390) {
      const summary = page.locator('.cp-io-mobile-summary');
      await summary.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(summary).toHaveAttribute('open', '');
      await expect(summary.getByRole('heading', { name: 'Your plan', exact: true })).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(summary).not.toHaveAttribute('open', '');
    }
    await page.getByRole('button', { name: 'Send my details', exact: false }).click();
    await expect(page.locator('#io-firstName')).toBeFocused();
    await expect(page.locator('#io-firstName')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#io-terms')).toHaveAttribute('aria-invalid', 'true');
    await page.screenshot({ path: resolve(evidence, `invalid-${width}.png`), fullPage: true });
    const now = new Date();
    const tomorrow = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );
    const date = `${String(tomorrow.getUTCDate()).padStart(2, '0')} / ${String(tomorrow.getUTCMonth() + 1).padStart(2, '0')} / ${tomorrow.getUTCFullYear()}`;
    const values = {
      firstName: 'Preview',
      lastName: 'Tester',
      email: 'preview@example.test',
      phone: '+880 1712 345678',
      birthDate: '15 / 06 / 1995',
      street: '123 Preview Street, Unit 2',
      city: 'Surrey',
      postalCode: 'V3T 1Z2',
      installDate: date,
    };
    for (const [field, value] of Object.entries(values))
      await page.locator(`#io-${field}`).fill(value);
    await page.locator('#io-province').selectOption('BC');
    await page.locator('#io-callTime').selectOption('afternoon');
    await page.locator('#io-contactConsent').uncheck();
    await page.locator('#io-terms').check();
    await page.getByRole('button', { name: 'Send my details', exact: false }).click();
    await expect(page.locator('#io-contactConsent')).toBeFocused();
    await expect(page.locator('#io-firstName')).toHaveValue('Preview');
    await page.locator('#io-contactConsent').check();
    await page.route('**/order/home-internet', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 503, body: 'Preview unavailable' })
        : route.continue(),
    );
    await page.getByRole('button', { name: 'Send my details', exact: false }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'The preview could not be completed' }),
    ).toBeVisible();
    await expect(page.locator('#io-email')).toHaveValue('preview@example.test');
    await page.unroute('**/order/home-internet');
    await page.getByRole('button', { name: 'Send my details', exact: false }).click();
    await expect(
      page.getByRole('heading', { name: 'Preview completed', exact: true }),
    ).toBeFocused();
    await expect(page.locator('.cp-order-preview-confirmation')).toContainText(
      'No order was created',
    );
    await expect(page.locator('[data-testid="order-reference"]')).toHaveCount(0);
    await page.screenshot({ path: resolve(evidence, `confirmation-${width}.png`), fullPage: true });
    assert.deepEqual(
      (
        await new AxeBuilder({ page })
          .include('.cp-internet-order')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
      [],
    );
    await page.getByRole('button', { name: 'Back to form', exact: true }).click();
    await expect(page.locator('#io-firstName')).toBeFocused();
    await expect(page.locator('#io-email')).toHaveValue('preview@example.test');
    await expect(page.locator('#io-terms')).toBeChecked();
    row.overflow = [];
    for (const nextWidth of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width: nextWidth, height: 1000 });
      const overflow = await page.evaluate(() => ({
        viewport: globalThis.innerWidth,
        document: globalThis.document.documentElement.scrollWidth,
      }));
      if (overflow.document > overflow.viewport)
        console.info(
          await page.locator('.cp-internet-order *').evaluateAll((nodes) =>
            nodes
              .filter((node) => node.getBoundingClientRect().right > globalThis.innerWidth)
              .map((node) => ({
                class: node.className,
                right: node.getBoundingClientRect().right,
                width: node.getBoundingClientRect().width,
              })),
          ),
        );
      assert.ok(overflow.document <= overflow.viewport, JSON.stringify(overflow));
      row.overflow.push(overflow);
    }
    assert.deepEqual(businessRequests, []);
    assert.deepEqual(errors, []);
    row.interactions =
      'native summary, required fields/consents and focus, retained input after action failure, preview confirmation, back/edit, no business API requests and overflow passed';
    await context.close();
  }
} finally {
  await writeFile(resolve(evidence, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
  await browser.close();
}
