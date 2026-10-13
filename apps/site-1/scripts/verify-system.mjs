import { installAuditContext } from './audit-context.mjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const evidence = resolve('../../docs/EVIDENCE/system');
const key = 'canadian-plans.cookie-choices.v1';
const off = { version: 1, analytics: false, marketing: false };
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
const records = [];
try {
  const assets = JSON.parse(await readFile(resolve(evidence, 'assets.json'), 'utf8'));
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
      viewport: { width, height: width === 390 ? 844 : 900 },
    });
    await installAuditContext(context, { seedConsent: false });

    await context.addInitScript(({ key, off }) => localStorage.setItem(key, JSON.stringify(off)), {
      key,
      off,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const [name, path] of [
      ['404', '/missing-preview-page'],
      ['search', '/search'],
      ['accessibility', '/accessibility'],
    ]) {
      const response = await page.goto(origin + path);
      if (name === '404') assert.equal(response.status(), 404);
      await page.evaluate(() => globalThis.document.fonts.ready);
      await page
        .locator('img[data-figma-asset]')
        .evaluateAll((images) =>
          Promise.all(
            images.filter((img) => img.getBoundingClientRect().width).map((img) => img.decode()),
          ),
        );
      await page.addStyleTag({ content: 'nextjs-portal{visibility:hidden;}' });
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
      await page.screenshot({ path: resolve(evidence, `${name}-${width}.png`), fullPage: true });
      const geometry = await page
        .locator(
          'main,.cp-system-accessibility-hero,.cp-system-accessibility-body,.cp-system-result,.cp-system-featured,.cp-system-report,.cp-footer',
        )
        .evaluateAll((nodes) =>
          nodes.map((n) => {
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
      const violations = (
        await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      ).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }));
      const overflow = await page.evaluate(
        () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
      );
      records.push({ name, width, geometry, assets: visibleAssets, violations, overflow });
      assert.equal(overflow, false);
      if (process.env.SYSTEM_BASELINE !== '1') assert.deepEqual(violations, []);
    }
    await page.goto(origin + '/search');
    await page.getByRole('button', { name: 'Guides (2)', exact: true }).click();
    await expect(page.locator('.cp-system-result')).toHaveCount(2);
    await expect(page.locator('.cp-system-featured')).toHaveCount(0);
    await page.getByRole('button', { name: 'Cities (1)', exact: true }).click();
    await expect(page.locator('.cp-system-result')).toHaveCount(1);
    await page.locator('.cp-system-search-form input').fill('Vancouver');
    await page.locator('.cp-system-search-form button').click();
    await expect(page).toHaveURL(/q=Vancouver/);
    await expect(page.locator('.cp-system-result')).toHaveCount(1);
    await page.locator('.cp-system-search-form input').fill('no matching xyz');
    await page.locator('.cp-system-search-form button').click();
    await expect(page.getByText('No matching results', { exact: true })).toBeVisible();
    const before = page.url();
    await page.locator('.cp-system-search-form input').fill('person@example.com');
    await page.locator('.cp-system-search-form button').click();
    await expect(page.locator('.cp-system-search-form input')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    assert.equal(page.url(), before);
    let releaseFailure = () => {};
    const holdFailure = new Promise((resolve) => {
      releaseFailure = resolve;
    });
    const transportFailure = async (route) => {
      if (route.request().method() === 'POST') await holdFailure;
      if (route.request().method() === 'POST')
        await route.fulfill({
          status: 503,
          contentType: 'text/plain',
          body: 'Preview transport unavailable',
        });
      else await route.continue();
    };
    await page.route('**/search?**', transportFailure);
    await page.locator('.cp-system-search-form input').fill('eSIM');
    await page.locator('.cp-system-search-form button').click();
    await expect(page.locator('.cp-system-search-form button')).toBeDisabled();
    await expect(page.locator('.cp-system-search-form .cp-search-feedback')).toHaveText(
      'Searching preview…',
    );
    releaseFailure();
    await expect(page.locator('.cp-system-search-form .cp-search-feedback')).toHaveText(
      'The preview could not be searched. Please try again.',
    );
    await expect(page.locator('.cp-system-search-form input')).toHaveValue('eSIM');
    await page.unroute('**/search?**', transportFailure);
    await page.locator('.cp-system-search-form button').click();
    await expect(page).toHaveURL(/q=eSIM/);
    await page.goto(origin + '/privacy');
    await page.locator('#legal-cookie-settings').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#legal-cookie-settings')).toBeFocused();
    assert.deepEqual(errors, []);
    await context.close();
    const fresh = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
    });
    const cookie = await fresh.newPage();
    await cookie.goto(origin + '/accessibility');
    await expect(cookie.locator('.cp-cookie-banner')).toBeVisible();
    await cookie.evaluate(() => globalThis.document.fonts.ready);
    await cookie.addStyleTag({ content: 'nextjs-portal{visibility:hidden;}' });
    assert.equal(await cookie.evaluate((k) => localStorage.getItem(k), key), null);
    assert.equal(await cookie.locator('script#umami').count(), 0);
    await cookie.screenshot({ path: resolve(evidence, `cookie-banner-${width}.png`) });
    records.push({
      name: 'banner',
      width,
      box: await cookie.locator('.cp-cookie-banner').boundingBox(),
      violations: (
        await new AxeBuilder({ page: cookie }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      ).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    });
    await cookie
      .getByRole('button', { name: 'Choose settings', exact: true })
      .filter({ visible: true })
      .click();
    await expect(cookie.getByRole('switch', { name: 'Essential', exact: true })).toBeDisabled();
    for (const name of ['Analytics', 'Marketing'])
      await expect(cookie.getByRole('switch', { name, exact: true })).toHaveAttribute(
        'aria-checked',
        'false',
      );
    await cookie.screenshot({ path: resolve(evidence, `cookie-settings-${width}.png`) });
    for (let step = 0; step < 10; step++) {
      await cookie.keyboard.press('Tab');
      assert.equal(
        await cookie.evaluate(() =>
          Boolean(globalThis.document.activeElement?.closest('[role="dialog"]')),
        ),
        true,
      );
    }
    records.push({
      name: 'settings',
      width,
      box: await cookie.getByRole('dialog').boundingBox(),
      violations: (
        await new AxeBuilder({ page: cookie }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      ).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    });
    await cookie.getByRole('switch', { name: 'Analytics', exact: true }).click();
    await cookie.keyboard.press('Escape');
    await expect(
      cookie
        .getByRole('button', { name: 'Choose settings', exact: true })
        .filter({ visible: true }),
    ).toBeFocused();
    assert.equal(await cookie.evaluate((k) => localStorage.getItem(k), key), null);
    await cookie
      .getByRole('button', { name: 'Choose settings', exact: true })
      .filter({ visible: true })
      .click();
    await expect(cookie.getByRole('switch', { name: 'Analytics', exact: true })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await cookie.getByRole('switch', { name: 'Analytics', exact: true }).click();
    await cookie.getByRole('button', { name: 'Save my choices', exact: true }).click();
    assert.deepEqual(await cookie.evaluate((k) => JSON.parse(localStorage.getItem(k)), key), {
      ...off,
      analytics: true,
    });
    await cookie.reload();
    await expect(cookie.locator('.cp-cookie-banner')).toHaveCount(0);
    await cookie
      .locator('.cp-footer')
      .getByRole('button', { name: 'Cookie settings', exact: true })
      .click();
    await expect(cookie.getByRole('switch', { name: 'Analytics', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await cookie.getByRole('button', { name: 'Reject non-essential', exact: true }).click();
    assert.deepEqual(await cookie.evaluate((k) => JSON.parse(localStorage.getItem(k)), key), off);
    await cookie.evaluate((k) => {
      localStorage.removeItem(k);
      globalThis.dispatchEvent(new globalThis.StorageEvent('storage', { key: k }));
    }, key);
    await expect(cookie.locator('.cp-cookie-banner')).toBeVisible();
    await cookie.getByRole('button', { name: 'Accept all', exact: true }).click();
    assert.deepEqual(await cookie.evaluate((k) => JSON.parse(localStorage.getItem(k)), key), {
      version: 1,
      analytics: true,
      marketing: true,
    });
    const other = await fresh.newPage();
    await other.goto(origin + '/search');
    await other
      .locator('.cp-footer')
      .getByRole('button', { name: 'Cookie settings', exact: true })
      .click();
    await other.getByRole('button', { name: 'Reject non-essential', exact: true }).click();
    await cookie
      .locator('.cp-footer')
      .getByRole('button', { name: 'Cookie settings', exact: true })
      .click();
    await expect(cookie.getByRole('switch', { name: 'Analytics', exact: true })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(cookie.getByRole('switch', { name: 'Marketing', exact: true })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await cookie.keyboard.press('Escape');
    await other.close();
    await fresh.close();
  }
  for (const width of [320, 768, 1024]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    await installAuditContext(context, { seedConsent: false });

    const page = await context.newPage();
    for (const path of ['/missing-preview-page', '/search', '/accessibility']) {
      await page.goto(origin + path);
      assert.equal(
        await page.evaluate(
          () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
        ),
        false,
        `${path} ${width}`,
      );
      await page
        .getByRole('button', { name: 'Choose settings', exact: true })
        .filter({ visible: true })
        .click();
      assert.equal(
        await page.evaluate(
          () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
        ),
        false,
      );
      await page.keyboard.press('Escape');
    }
    await context.close();
  }
  for (const record of records) assert.deepEqual(record.violations, []);
  const zoom = await browser.newContext({
    viewport: { width: 720, height: 450 },
    deviceScaleFactor: 2,
  });
  const zoomPage = await zoom.newPage();
  for (const path of ['/missing-preview-page', '/search', '/accessibility']) {
    await zoomPage.goto(origin + path);
    assert.equal(
      await zoomPage.evaluate(
        () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
      ),
      false,
    );
    await zoomPage.keyboard.press('Tab');
    await expect(zoomPage.locator('.cp-system-skip')).toBeFocused();
    await zoomPage.keyboard.press('Enter');
    await expect(zoomPage.locator('#main-content')).toBeFocused();
  }
  await zoom.close();
} finally {
  await writeFile(resolve(evidence, 'verification.json'), JSON.stringify(records, null, 2));
  await browser.close();
}
console.info(
  'System pages, responsive overflow, search, consent persistence and keyboard checks passed.',
);
