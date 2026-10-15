import { installAuditContext } from './audit-context.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
/* global document, innerWidth -- Browser evaluation callbacks. */
const appRoot = fileURLToPath(new URL('../', import.meta.url));
const evidence = path.resolve(appRoot, '../../docs/EVIDENCE/home');
const origin = process.env.HOME_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
const results = [];
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
    assert.equal((await page.goto(origin, { waitUntil: 'networkidle' }))?.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('h1')).toContainText('Canadian SIM');
    await page.screenshot({
      path: path.join(evidence, `home-${width}.png`),
      fullPage: true,
      style: 'nextjs-portal { visibility:hidden; }',
    });
    for (const [name, selector] of [
      ['hero', '.cp-home-hero'],
      ['categories', '.cp-home-categories'],
      ['plans', '.cp-home-plans'],
      ['esim', '.cp-home-esim'],
      ['how', '.cp-home-how'],
      ['journey', '#journey'],
      ['internet', '#internet'],
      ['benefits', '.cp-home-benefits'],
      ['reviews', '.cp-home-reviews'],
      ['faq', '#faq'],
      ['final', '.cp-home-final'],
    ])
      await page.locator(selector).screenshot({
        path: path.join(evidence, `${name}-${width}.png`),
        style: 'nextjs-portal { visibility:hidden; }',
      });
    const geometry = await page.locator('main>section').evaluateAll((elements) =>
      elements.map((e) => ({
        section: e.id || e.className,
        height: e.getBoundingClientRect().height,
        width: e.getBoundingClientRect().width,
      })),
    );
    const assets = await page.locator('img[data-figma-asset]').evaluateAll((elements) =>
      elements
        .filter((e) => e.getClientRects().length > 0)
        .map((e) => ({
          src: e.getAttribute('src'),
          width: e.getBoundingClientRect().width,
          height: e.getBoundingClientRect().height,
          expectedWidth: Number(e.getAttribute('width')),
          expectedHeight: Number(e.getAttribute('height')),
          loaded: e.complete && e.naturalWidth > 0,
        })),
    );
    for (const asset of assets) {
      assert.ok(asset.loaded);
      assert.ok(
        Math.abs(asset.width - asset.expectedWidth) < 0.15 &&
          Math.abs(asset.height - asset.expectedHeight) < 0.15,
        `Asset dimensions: ${asset.src}`,
      );
      const svg = (await readFile(path.join(appRoot, 'public', asset.src), 'utf8')).match(
        /<svg\b[^>]*>/,
      )?.[0];
      assert.ok(
        svg?.includes(`width="${asset.expectedWidth}"`) &&
          svg.includes(`height="${asset.expectedHeight}"`),
      );
    }
    const audit = await new AxeBuilder({ page })
      .include('.cp-home')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const accessibility = audit.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    }));
    console.info(JSON.stringify({ width, geometry, accessibility }, null, 2));
    assert.deepEqual(accessibility, [], `Home accessibility violations at ${width}`);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Overflow ${width}`,
    );
    const initial = page.getByRole('tab', { name: 'Pre-arrival SIM', exact: true });
    await initial.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Home Internet', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('tabpanel')).toContainText('later launch');
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Mobile', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('Home');
    await expect(initial).toHaveAttribute('aria-selected', 'true');
    await page
      .locator('#plan-panel-arrival [data-plan="test-fido-75"]')
      .getByRole('button')
      .click();
    await expect(
      page.locator('#plan-panel-arrival [data-plan="test-fido-75"]').getByRole('button'),
    ).toHaveAttribute('aria-pressed', 'true');
    if (width === 390) {
      const rail = page.getByRole('region', { name: 'Newcomer journey', exact: true });
      await rail.focus();
      await page.keyboard.press('ArrowRight');
      await expect(
        page.getByRole('button', { name: 'Show journey step 2', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: 'Show journey step 4', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Show journey step 4', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      const menu = page.getByRole('button', { name: 'Open menu' });
      await menu.click();
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
      const contactIcon = page.getByRole('button', { name: 'WhatsApp us', exact: true }).first();
      await contactIcon.click();
      await expect(page.getByRole('dialog')).toContainText(
        'No message or callback request has been sent.',
      );
      await page.keyboard.press('Escape');
      await expect(contactIcon).toBeFocused();
      const reviews = page.getByRole('region', { name: 'Newcomer reviews', exact: true });
      await reviews.focus();
      await page.keyboard.press('ArrowRight');
      await expect(
        page.getByRole('button', { name: 'Show review 2', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
    } else {
      const firstCard = page.locator('.cp-home-journey-card').first();
      await expect(firstCard).toContainText('Order your eSIM');
      await page.getByRole('button', { name: 'Next journey step' }).click();
      await expect(firstCard).toContainText('Land & switch on');
      await page.getByRole('button', { name: 'Previous journey step' }).click();
      await expect(firstCard).toContainText('Order your eSIM');
    }
    const faq = page.locator('#faq .cp-faq-item');
    await faq.first().locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(faq.first()).not.toHaveAttribute('open');
    await faq.nth(1).locator('summary').click();
    await expect(faq.nth(1)).toHaveAttribute('open');
    assert.equal(await page.locator('#faq .cp-faq-item[open]').count(), 1);
    const postal = page.getByRole('textbox', { name: 'Postal code' });
    await postal.fill('12345');
    await page.getByRole('button', { name: 'Check availability', exact: true }).click();
    await expect(page.locator('#postal-preview-result')).toContainText(
      'valid Canadian postal code',
    );
    await expect(postal).toHaveValue('12345');
    await postal.fill('v3t 1z2');
    await page.getByRole('button', { name: 'Check availability', exact: true }).click();
    await expect(page.locator('#postal-preview-result')).toContainText(
      'availability has not been checked',
    );
    await expect(postal).toHaveValue('v3t 1z2');
    const contact = page.getByRole('button', { name: 'Check my phone', exact: true });
    await contact.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(contact).toBeFocused();
    assert.deepEqual(errors, []);
    results.push({ width, geometry, assets, accessibility, interactions: 'passed' });
    await context.close();
  }
  for (const width of [320, 768, 1024, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(origin);
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: innerWidth,
      elements: Array.from(document.querySelectorAll('*'))
        .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 12)
        .map((e) => ({
          tag: e.tagName,
          class: e.className,
          right: e.getBoundingClientRect().right,
        })),
    }));
    console.info(JSON.stringify({ width, documentWidth: overflow.document }));
    assert.ok(overflow.document <= width);
    await page.close();
  }
  await writeFile(
    path.join(evidence, 'verification.json'),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  console.info(
    'PASS: Home responsive screenshots, assets, tabs, journey, FAQ, postal preview, keyboard/menu/dialog and overflow.',
  );
} finally {
  await browser.close();
}
