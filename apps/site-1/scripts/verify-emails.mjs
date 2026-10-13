import { installAuditContext } from './audit-context.mjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { resolveEmailTokens } from './email-token-source.mjs';
import ts from 'typescript';
const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const evidence = resolve('../../docs/EVIDENCE/emails');
await mkdir(evidence, { recursive: true });
const generated = await readFile('src/emails/tokens.generated.ts', 'utf8');
const fresh = resolveEmailTokens(
  await readFile('../../packages/ui/src/styles/canadian-plans.css', 'utf8'),
);
const ast = ts.createSourceFile(
  'tokens.ts',
  generated,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const properties = {};
function visit(node) {
  if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
    if (ts.isNumericLiteral(node.initializer))
      properties[node.name.text] = Number(node.initializer.text);
    if (ts.isStringLiteral(node.initializer)) properties[node.name.text] = node.initializer.text;
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.deepEqual(properties, fresh, 'Regenerate email tokens from the central stylesheet');
const sourceSvg = resolve('public/design/components/312-2-imgIcon.svg');
const hash = createHash('sha256')
  .update(await readFile(sourceSvg))
  .digest('hex');
assert.equal(hash, '718635e95fdab861db5514a5d74c633d8b7723e26e8f046f3974fe6ffa51d55b');
const ids = ['order-received', 'esim-ready', 'install-booked'];
const browser = await chromium.launch();
const records = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await installAuditContext(context);
    await context.addInitScript(() =>
      localStorage.setItem(
        'canadian-plans.cookie-choices.v1',
        JSON.stringify({ version: 1, analytics: false, marketing: false }),
      ),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const id of ids) {
      await page.goto(`${origin}/dev/emails?template=${id}`);
      await page.evaluate(() => globalThis.document.fonts.ready);
      await expect(page.locator('iframe')).toHaveAttribute('data-preview-ready', 'true');
      const frame = page.frames().find((frame) => frame.url() === 'about:srcdoc');
      assert.ok(frame);
      await frame.waitForSelector('h1');
      await frame.evaluate(() => globalThis.document.fonts.ready);
      await frame
        .locator('img')
        .evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
      await expect
        .poll(async () => (await page.locator('iframe').boundingBox()).height)
        .toBeGreaterThan(500);
      await page.addStyleTag({ content: 'nextjs-portal{visibility:hidden;}' });
      await page.screenshot({ path: resolve(evidence, `${id}-page-${width}.png`), fullPage: true });
      await page.locator('iframe').screenshot({ path: resolve(evidence, `${id}-${width}.png`) });
      const geometry = await frame.locator('body,[data-email-section],h1,a').evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = node.getBoundingClientRect();
          return {
            tag: node.tagName,
            section: node.getAttribute('data-email-section'),
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          };
        }),
      );
      if (width === 1440) {
        assert.equal(geometry.find((item) => item.section === 'card').width, 600);
        assert.equal(geometry.find((item) => item.section === 'image').height, 170);
      }
      const image = await frame.locator('img').evaluate((node) => ({
        src: node.src,
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
        naturalWidth: node.naturalWidth,
        naturalHeight: node.naturalHeight,
      }));
      assert.equal(image.width, 32);
      assert.equal(image.height, 32);
      assert.equal(image.naturalWidth, 32);
      assert.equal(image.naturalHeight, 32);
      const overflow = await frame.evaluate(
        () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
      );
      assert.equal(overflow, false, `${id} ${width}`);
      assert.equal(
        await page.evaluate(
          () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
        ),
        false,
      );
      const violations = (
        await new AxeBuilder({ page })
          .exclude('iframe')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) }));
      assert.deepEqual(violations, []);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      for (const heading of ['Rendered HTML', 'Plain text']) {
        await page.getByText(heading, { exact: true }).click();
        await expect(page.locator('details[open] pre').last()).toBeVisible();
      }
      const html = await page.locator('details').first().locator('pre').innerText();
      assert.ok(
        !/<(?:script|style)\b|class=|var\(--|display:(?:flex|grid)|figma\.com/iu.test(html),
      );
      await writeFile(resolve(evidence, `${id}.html`), html);
      const standalone = await context.newPage();
      await standalone.setContent(html);
      const emailViolations = (
        await new AxeBuilder({ page: standalone })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) }));
      assert.deepEqual(emailViolations, []);
      await standalone.close();
      await writeFile(
        resolve(evidence, `${id}.txt`),
        await page.locator('details').last().locator('pre').innerText(),
      );
      records.push({ id, width, geometry, image, violations, emailViolations, overflow });
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  const narrow = await browser.newPage({ viewport: { width: 320, height: 844 } });
  await narrow.goto(origin + '/dev/emails?template=install-booked');
  await expect(narrow.getByRole('heading', { name: 'Transactional email previews' })).toBeVisible();
  await expect(narrow.locator('iframe')).toHaveAttribute('data-preview-ready', 'true');
  const frame = narrow.frames().find((f) => f.url() === 'about:srcdoc');
  await frame.waitForSelector('h1');
  assert.equal(
    await frame.evaluate(
      () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
    ),
    false,
  );
  await narrow.goto(origin + '/dev/emails?template=unknown');
  await expect(
    narrow.getByRole('status').filter({ hasText: 'Unknown email template' }),
  ).toBeVisible();
} finally {
  await writeFile(
    resolve(evidence, 'verification.json'),
    JSON.stringify(
      { asset: { src: '/design/components/312-2-imgIcon.svg', hash }, records },
      null,
      2,
    ),
  );
  await browser.close();
}
console.info(
  'Email HTML, plain text, asset geometry, responsive previews and accessibility checks passed.',
);
