import { chromium } from '@playwright/test';
import { installAuditContext } from './audit-context.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const folder = resolve('../../docs/EVIDENCE/audit/final/focus');
await mkdir(folder, { recursive: true });
const browser = await chromium.launch();
const records = [];
function luminance(rgb) {
  const values = rgb
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map((v) => Number(v) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
    });
    await installAuditContext(context);
    const page = await context.newPage();
    for (const [name, path, selector] of [
      ['home-hero', '/', '.cp-home-hero-card .cp-button'],
      ['home-final', '/', '.cp-home-final .cp-button'],
      ['arrival-hero', '/pre-arrival-sim', '.cp-arrival-hero-card .cp-button'],
      ['internet-address', '/home-internet', '.cp-internet-address-card input'],
      ['footer', '/', '.cp-footer a'],
    ]) {
      await page.goto((process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3143') + path);
      await page.evaluate(() => globalThis.document.fonts.ready);
      await page.keyboard.press('Tab');
      const control = page.locator(selector).first();
      await control.focus();
      await control.scrollIntoViewIfNeeded();
      const colors = await control.evaluate((n) => {
        const style = globalThis.getComputedStyle(n);
        let parent = n.parentElement,
          background = '';
        while (parent) {
          const color = globalThis.getComputedStyle(parent).backgroundColor;
          if (color !== 'rgba(0, 0, 0, 0)') {
            background = color;
            break;
          }
          parent = parent.parentElement;
        }
        return {
          outline: style.outlineColor,
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          background,
        };
      });
      const a = luminance(colors.outline),
        b = luminance(colors.background);
      const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      assert.ok(contrast >= 3, `${name}: ${contrast}`);
      assert.notEqual(colors.outlineStyle, 'none');
      records.push({ name, width, ...colors, contrast });
      await page.screenshot({ path: resolve(folder, `${name}-${width}.png`) });
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(resolve(folder, 'results.json'), JSON.stringify(records, null, 2));
}
