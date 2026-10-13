import { installAuditContext } from './audit-context.mjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const origin =
  process.env.TRACK_ORDER_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const evidence = resolve('../../docs/EVIDENCE/track-order');
const states = [
  'lookup',
  'esim-sent',
  'action-needed',
  'request-change',
  'not-found',
  'too-many-tries',
  'code-expired',
];
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
const records = [];
const assets = JSON.parse(await readFile(resolve(evidence, 'assets.json'), 'utf8'));
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
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 1089 : 1100 },
    });
    await installAuditContext(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.name));
    for (const state of states) {
      await page.goto(`${origin}/track-order?state=${state}`);
      await page.evaluate(() => globalThis.document.fonts.ready);
      await page
        .locator('img[data-figma-asset]')
        .evaluateAll((images) =>
          Promise.all(
            images.filter((img) => img.getBoundingClientRect().width).map((img) => img.decode()),
          ),
        );
      await page.addStyleTag({ content: 'nextjs-portal{visibility:hidden;}' });
      await page.evaluate(() => globalThis.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: resolve(evidence, `${state}-${width}.png`), fullPage: true });
      const special = page.locator(
        state === 'request-change' ? '.cp-tracking-change-dialog' : '.cp-tracking-error-card',
      );
      if (await special.count())
        await special.screenshot({ path: resolve(evidence, `${state}-card-${width}.png`) });
      const geometry = await page
        .locator(
          '.cp-tracking-lookup-hero,.cp-tracking-lookup-card,.cp-tracking-meanings,.cp-tracking-help-wrap,.cp-tracking-order-header,.cp-tracking-install-wrap,.cp-tracking-install,.cp-tracking-action-wrap,.cp-tracking-action,.cp-tracking-progress-wrap,.cp-tracking-progress,.cp-tracking-result-body,.cp-tracking-updates,.cp-tracking-advisor,.cp-tracking-details,.cp-tracking-details-grid,.cp-tracking-detail,.cp-tracking-error-card,.cp-tracking-change-dialog,.cp-tracking-change-header,.cp-tracking-change-form,.cp-footer',
        )
        .evaluateAll((nodes) =>
          nodes
            .filter((n) => n.getBoundingClientRect().width)
            .map((n) => {
              const r = n.getBoundingClientRect();
              return {
                class: n.className,
                x: r.x,
                y: r.y + globalThis.scrollY,
                width: r.width,
                height: r.height,
              };
            }),
        );
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const violations = axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      }));
      const overflow = await page.evaluate(
        () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
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
      records.push({ state, width, geometry, violations, overflow, assets: visibleAssets });
      assert.equal(overflow, false, `${state} ${width} overflow`);
      if (process.env.TRACK_ORDER_BASELINE !== '1')
        assert.deepEqual(violations, [], `${state} ${width} accessibility`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  if (process.env.TRACK_ORDER_BASELINE !== '1') {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await installAuditContext(context);
    const page = await context.newPage();
    await page.goto(origin + '/track-order');
    // Verify controlled input updates before testing keyboard/error focus after hydration.
    await page.locator('#tracking-order-number').fill('CP-2026-10482');
    await expect(page.locator('#tracking-order-number')).toHaveAttribute('value', 'CP-2026-10482');
    await page.locator('#tracking-order-number').fill('');
    await page.getByRole('button', { name: 'Track my order →', exact: true }).click();
    await expect(page.locator('#tracking-order-number')).toBeFocused();
    await expect(page.locator('#tracking-contact')).toHaveAttribute('aria-invalid', 'true');
    await page.locator('#tracking-order-number').fill('CP-2026-10482');
    await page.locator('#tracking-contact').fill('aarav@example.com');
    await page.route('**/track-order*', (r) =>
      r.request().method() === 'POST'
        ? r.fulfill({ status: 503, body: 'Preview unavailable' })
        : r.continue(),
    );
    await page.getByRole('button', { name: 'Track my order →', exact: true }).click();
    await expect(page.locator('.cp-tracking-inline-error')).toContainText(
      'Your input is still here',
    );
    await expect(page.locator('#tracking-order-number')).toHaveValue('CP-2026-10482');
    await expect(page.locator('#tracking-contact')).toHaveValue('aarav@example.com');
    await page.unroute('**/track-order*');
    await page.getByRole('button', { name: 'Track my order →', exact: true }).click();
    await expect(page).toHaveURL(/state=esim-sent$/);
    await expect(page.locator('#tracking-title')).toBeFocused();
    await page.getByRole('button', { name: 'Resend my QR code', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /\S/ })).toContainText(
      'No email was sent',
    );
    const toggle = page.locator('[data-card="arrival"] .cp-tracking-detail-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    const trigger = page.locator('[data-card="arrival"] .cp-tracking-detail-change');
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Send request →', exact: true }).click();
    await expect(page.locator('#tracking-new-value')).toBeFocused();
    await page.locator('#tracking-new-value').fill('updated@example.com');
    await page.locator('#tracking-change-note').fill('Preview note');
    await page.route('**/track-order*', (r) =>
      r.request().method() === 'POST'
        ? r.fulfill({ status: 503, body: 'Preview unavailable' })
        : r.continue(),
    );
    await dialog.getByRole('button', { name: 'Send request →', exact: true }).click();
    await expect(dialog.locator('.cp-tracking-inline-error')).toContainText(
      'Your input is still here',
    );
    await expect(page.locator('#tracking-new-value')).toHaveValue('updated@example.com');
    await expect(page.locator('#tracking-change-note')).toHaveValue('Preview note');
    await page.unroute('**/track-order*');
    await dialog.getByRole('button', { name: 'Send request →', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'No order details were changed' }),
    ).toContainText('No order details were changed');
    await page.getByRole('button', { name: 'Back to request', exact: true }).click();
    await expect(page.locator('#tracking-new-value')).toHaveValue('updated@example.com');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await page.goto(origin + '/track-order?state=action-needed');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'preview.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('preview'),
    });
    await expect(page.locator('.cp-tracking-feedback[role="alert"]')).toContainText('Choose a JPG');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'preview.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-preview'),
    });
    await expect(
      page.getByRole('status').filter({ hasText: 'Nothing was uploaded' }),
    ).toContainText('Nothing was uploaded');
    await expect(page.locator('.cp-tracking-status')).toContainText('Action needed');
    await page.goto(origin + '/track-order?state=not-found');
    await page.locator('#tracking-order-number').fill('CP-2026-10482');
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page).toHaveURL(/state=esim-sent$/);
    await page.getByRole('button', { name: '← Track another order', exact: true }).click();
    await page.locator('#tracking-order-number').fill('CP-2026-99999');
    await page.getByRole('button', { name: 'Track my order →', exact: true }).click();
    await expect(page).toHaveURL(/state=not-found$/);
    await expect(page.locator('#tracking-order-number')).toHaveValue('CP-2026-99999');
    await page.goto(origin + '/track-order?state=code-expired');
    await page.getByRole('button', { name: 'Send a new code', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'No code or email was sent' }),
    ).toContainText('No code or email was sent');
    for (const width of [320, 768, 1024, 1280, 1440])
      for (const state of states) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`${origin}/track-order?state=${state}`);
        assert.equal(
          await page.evaluate(
            () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
          ),
          false,
          `${state} overflow ${width}`,
        );
      }
    await context.close();
  }
  await writeFile(resolve(evidence, 'verification.json'), JSON.stringify(records, null, 2));
} finally {
  await browser.close();
}
