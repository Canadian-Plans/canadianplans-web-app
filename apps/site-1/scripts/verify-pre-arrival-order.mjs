import { installAuditContext } from './audit-context.mjs';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const origin =
  process.env.PREARRIVAL_ORDER_TEST_URL ?? process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const evidence = resolve('../../docs/EVIDENCE/pre-arrival-order');
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch();
const records = [];
const assetHashes = {
  '/design/components/68-50-imgFrame.svg':
    '51c40f39354f2d490a0acfedf723d78b96df243b4a7bb7d2553b01ba7a6dcd45',
  '/design/pre-arrival-order/1-imgPhone.svg':
    '4a4500ba16dd6f664cacdcfa7c6745273e851f6148f0cfc0d03e90c81cf23382',
  '/design/pre-arrival-order/4-imgPhone.svg':
    '57875aa407ecdc62553065a099607f2a49b65c9ee95e385f0c4493b6184b664e',
  '/design/pre-arrival-order/6-imgPhone.svg':
    'a395fc988d40474cd1f00af37d3a1074ba2514804c674c05a035791fc8df2d81',
  '/design/pre-arrival-order/8-imgPhone.svg':
    '57875aa407ecdc62553065a099607f2a49b65c9ee95e385f0c4493b6184b664e',
  '/design/pre-arrival-order/1-imgChevronDown.svg':
    '018978e7e8d578a5a1697dee0d85ac62221c702256f0b1b30c045d7cb045e24e',
  '/design/pre-arrival-order/4-imgChevronUp.svg':
    'f79a93209937bf991d4570f136a684a920d41e81519cf80b212c673effd30a7b',
  '/design/pre-arrival-order/2-imgErrorIcon.svg':
    '07e6733133fdd0c7bc2b9dc6547a651840fa17eea4b7560ee15ec4b231cc266e',
  '/design/pre-arrival-order/2-imgErrorIcon1.svg':
    '0ac6227f6a9688b030a7dd584db3e2ce658792b8e6fe01e193db27466a714b59',
  '/design/pre-arrival-order/5-imgLock.svg':
    '88723e6b1163fb1b17bc85464fa0cbdf2067aa13d8f19daf1f6ba2d41e279c50',
  '/design/pre-arrival-order/5-imgIcon.svg':
    '718635e95fdab861db5514a5d74c633d8b7723e26e8f046f3974fe6ffa51d55b',
};
async function inspect(page, width, state) {
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
  if (state === 'two') {
    await page
      .locator('.cp-pa-documents')
      .screenshot({ path: resolve(evidence, `documents-${width}.png`) });
    await page
      .locator('.cp-image-slot')
      .screenshot({ path: resolve(evidence, `image-${width}.png`) });
  }
  const geometry = await page
    .locator(
      '.cp-io-header,.cp-pa-stepper,.cp-pa-body,.cp-pa-form,.cp-io-desktop-summary,.cp-pa-mobile-summary,.cp-pa-documents,.cp-pa-esim,.cp-pa-recap,.cp-pa-success,.cp-pa-confirmation-body,.cp-pa-timeline,.cp-pa-cross',
    )
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => n.getBoundingClientRect().width)
        .map((n) => ({
          class: n.className,
          y: n.getBoundingClientRect().y + globalThis.scrollY,
          width: n.getBoundingClientRect().width,
          height: n.getBoundingClientRect().height,
        })),
    );
  const details = await page
    .locator('.cp-pa-fields > *,.cp-pa-documents > *,.cp-pa-summary > *')
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => n.getBoundingClientRect().width)
        .map((n) => ({
          class: n.className,
          slot: n.getAttribute('data-slot'),
          y: n.getBoundingClientRect().y + globalThis.scrollY,
          height: n.getBoundingClientRect().height,
        })),
    );
  const assets = await page.locator('img[data-figma-asset]').evaluateAll((nodes) =>
    nodes
      .filter((n) => n.getBoundingClientRect().width)
      .map((n) => ({
        src: n.getAttribute('src'),
        width: n.getBoundingClientRect().width,
        height: n.getBoundingClientRect().height,
        naturalWidth: n.naturalWidth,
        naturalHeight: n.naturalHeight,
      })),
  );
  const overflow = await page.evaluate(() => ({
    width: globalThis.document.documentElement.scrollWidth,
    viewport: globalThis.innerWidth,
  }));
  assert.equal(overflow.width, overflow.viewport, `${state} overflow`);
  for (const asset of assets) {
    const bytes = await readFile(resolve('public' + asset.src));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), assetHashes[asset.src]);
    const root = bytes.toString('utf8').match(/<svg[^>]*>/)[0];
    assert.equal(asset.width, Number(root.match(/\bwidth="([\d.]+)"/)[1]));
    assert.equal(asset.height, Number(root.match(/\bheight="([\d.]+)"/)[1]));
    assert.equal(asset.naturalWidth, asset.width);
    assert.equal(asset.naturalHeight, asset.height);
  }
  const form = geometry.find((g) => g.class.includes('cp-pa-form'));
  const expectedHeight = {
    one: width === 390 ? 1652 : 1055,
    errors: width === 390 ? 1989 : 1374,
    two: width === 390 ? 2169 : 1434,
    expanded: 1652,
  }[state];
  if (expectedHeight !== undefined)
    assert.equal(form.height, expectedHeight, `${state} source form height`);
  if (state === 'expanded')
    assert.equal(geometry.find((g) => g.class.includes('cp-pa-mobile-summary')).height, 498);
  const violations = (
    await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  ).violations;
  records.push({
    width,
    state,
    geometry,
    details,
    assets,
    overflow,
    violations: violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  });
  console.info(
    JSON.stringify({
      width,
      state,
      geometry,
      assets,
      overflow,
      violations: records.at(-1).violations,
    }),
  );
  if (process.env.PREARRIVAL_ORDER_BASELINE !== '1')
    assert.deepEqual(
      violations.map((v) => v.id),
      [],
    );
}
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await installAuditContext(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(origin + '/order/pre-arrival');
    await page.getByRole('button', { name: 'Continue to documents' }).waitFor();
    await expect(page.getByRole('button', { name: 'Continue to documents' })).toBeEnabled();
    await inspect(page, width, 'one');
    if (width === 390) {
      await page.getByRole('button', { name: /Details/ }).click();
      await inspect(page, width, 'expanded');
      await page.getByRole('button', { name: /Hide/ }).click();
    }
    if (process.env.PREARRIVAL_ORDER_BASELINE === '1') {
      await context.close();
      continue;
    }
    await page.locator('#pa-lastName').fill('Sharma');
    await page.locator('#pa-email').fill('priya@gmail');
    await page.locator('#pa-phone').fill('98765 43210');
    await page.locator('#pa-arrivalDate').fill('14 / 11 / 2099');
    await page.locator('#pa-city').selectOption('Vancouver');
    await page.getByRole('button', { name: 'Continue to documents' }).click();
    await expect(page.locator('#pa-firstName')).toBeFocused();
    await inspect(page, width, 'errors');
    await page.getByRole('link', { name: 'Email looks incomplete' }).click();
    await expect(page.locator('#pa-email')).toBeFocused();
    await page.locator('#pa-firstName').fill('Aarav');
    await page.locator('#pa-email').fill('preview@example.test');
    await page.locator('#pa-phone').fill('+880 17123 45678');
    await page.reload();
    await expect(page.locator('#pa-firstName')).toHaveValue('Aarav');
    await expect(page.locator('#pa-phone')).toHaveValue('+880 17123 45678');
    await page.getByRole('button', { name: 'Continue to documents' }).click();
    await expect(page.locator('#pa-heading')).toHaveText('Documents & eSIM');
    await inspect(page, width, 'two');
    await page.getByRole('button', { name: 'Send my order' }).click();
    await expect(page.locator('#pa-passportFile')).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel('Passport photo page', { exact: true }).setInputFiles({
      name: 'passport.png',
      mimeType: 'image/png',
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    });
    await page.getByLabel('Visa, permit or COPR', { exact: true }).setInputFiles({
      name: 'permit.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%%EOF'),
    });
    await page.locator('#pa-passportNumber').fill('TEST123');
    await page.locator('#pa-birthDate').fill('15 / 04 / 1995');
    await page.locator('#pa-phoneModel').fill('iPhone 15');
    await page.locator('#pa-terms').check();
    await page.reload();
    await expect(page.locator('#pa-heading')).toHaveText('Documents & eSIM');
    await expect(page.locator('#pa-passportNumber')).toHaveValue('TEST123');
    await expect(page.locator('#pa-passportFile')).toContainText('passport.png');
    await expect(page.locator('#pa-permitFile')).toContainText('permit.pdf');
    await expect(page.locator('#pa-terms')).toBeChecked();
    for (const w of [320, 768, 1024, 1280]) {
      await page.setViewportSize({ width: w, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
        ),
        false,
        `Step 2 overflow ${w}`,
      );
    }
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('#pa-confirmEmail').fill('wrong@example.test');
    await page.getByRole('button', { name: 'Send my order' }).click();
    await expect(page.locator('#pa-confirmEmail')).toHaveAttribute('aria-invalid', 'true');
    await page.locator('#pa-confirmEmail').fill('preview@example.test');
    await page.route('**/order/pre-arrival', (r) =>
      r.request().method() === 'POST'
        ? r.fulfill({ status: 503, body: 'Preview unavailable' })
        : r.continue(),
    );
    await page.getByRole('button', { name: 'Send my order' }).click();
    await expect(
      page.getByText('The preview could not be checked.', { exact: false }),
    ).toBeVisible();
    await page.unroute('**/order/pre-arrival');
    await expect(page.locator('#pa-passportNumber')).toHaveValue('TEST123');
    await page.getByRole('button', { name: 'Send my order' }).click();
    await expect(page.locator('#pa-heading')).toContainText('Preview ready');
    await expect(page.locator('#pa-heading')).toBeFocused();
    await inspect(page, width, 'confirmation');
    for (const w of [320, 768, 1024, 1280]) {
      await page.setViewportSize({ width: w, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
        ),
        false,
        `Confirmation overflow ${w}`,
      );
    }
    await page.setViewportSize({ width, height: 1000 });
    await page.reload();
    await expect(page.locator('#pa-heading')).toContainText('Preview ready');
    await page.getByRole('button', { name: 'Back to my details' }).click();
    await expect(page.locator('#pa-email')).toHaveValue('preview@example.test');
    for (const w of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width: w, height: 1000 });
      const overflow = await page.evaluate(
        () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
      );
      assert.equal(overflow, false, `Overflow at ${w}`);
    }
    await page.getByRole('button', { name: 'Clear saved draft' }).click();
    await page.reload();
    await expect(page.locator('#pa-firstName')).toHaveValue('');
    assert.deepEqual(errors, []);
    await context.close();
  }
  if (process.env.PREARRIVAL_ORDER_BASELINE !== '1') {
    const context = await browser.newContext();
    await installAuditContext(context);
    const page = await context.newPage();
    await page.goto(origin + '/pre-arrival-sim');
    await page
      .locator('#plans .cp-plan-card')
      .first()
      .getByRole('button', { name: 'Choose this plan' })
      .click();
    await page.getByRole('link', { name: 'Continue to step 2' }).click();
    await expect(page).toHaveURL(/order\/pre-arrival(?:\?plan=preview-fido-essential)?$/);
    await expect(page.locator('.cp-pa-summary').last()).toContainText('75 GB');
    await expect(page.locator('.cp-pa-summary').last()).toContainText('$35');
    await page.locator('#pa-firstName').fill('Retained');
    await page.getByRole('button', { name: 'Worker', exact: true }).click();
    await expect(page.locator('.cp-pa-summary').last()).toContainText('100 GB');
    await page.reload();
    await expect(page.locator('#pa-firstName')).toHaveValue('Retained');
    await expect(page.getByRole('button', { name: 'Worker', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('.cp-pa-summary').last()).toContainText('100 GB');
    await context.close();
  }
  await writeFile(resolve(evidence, 'verification.json'), JSON.stringify(records, null, 2));
} finally {
  await browser.close();
}
