import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { format } from 'prettier';
import { installAuditContext } from './audit-context.mjs';

const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const evidence = path.resolve('../../docs/EVIDENCE/category-rogers');
const route = '/mobile-plans/rogers';
const widths = [320, 390, 768, 1024, 1440];
const report = {
  route,
  origin,
  createdAt: new Date().toISOString(),
  widths: {},
  errors: [],
  interactions: {},
  headings: [],
  assets: {},
  geometry: {},
};
const browser = await chromium.launch({ headless: true });

try {
  await mkdir(path.join(evidence, 'crops'), { recursive: true });
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await installAuditContext(context, { eagerImages: false });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.errors.push(error.message));
    const response = await page.goto(new URL(route, origin).toString(), {
      waitUntil: 'networkidle',
    });
    await page.evaluate(() => {
      for (const image of globalThis.document.images) image.loading = 'eager';
    });
    await page.waitForLoadState('networkidle');
    await page.locator('.cp-catrog-main').waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    if (response?.status() !== 200)
      throw new Error(`Rogers page returned ${response?.status()} at ${width}px`);
    const dimensions = await page
      .locator('body')
      .evaluate((body) => ({ scrollWidth: body.scrollWidth, clientWidth: body.clientWidth }));
    report.widths[width] = dimensions;
    if (dimensions.scrollWidth > dimensions.clientWidth)
      report.errors.push(`Horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`);

    if (width === 390 || width === 1440) {
      const sourceGeometry =
        width === 390
          ? {
              '.cp-catrog-spec': [350, null],
              '.cp-catrog-quick': [350, null],
              '.cp-catrog-guide .cp-image-slot': [350, 200],
              '.cp-catrog-faq .cp-image-slot': [350, 180],
              '.cp-catrog-final .cp-image-slot': [294, 180],
            }
          : {
              '.cp-catrog-spec': [460, null],
              '.cp-catrog-quick': [1200, null],
              '.cp-catrog-guide .cp-image-slot': [764, 300],
              '.cp-catrog-faq .cp-image-slot': [380, 240],
              '.cp-catrog-final .cp-image-slot': [560, 260],
            };
      report.geometry[width] = await page
        .locator('.cp-catrog-main section, .cp-catrog-faq, .cp-catrog-explore, .cp-footer')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              section: node.className,
              y: rect.y + globalThis.scrollY,
              width: rect.width,
              height: rect.height,
            };
          }),
        );
      for (const [selector, [expectedWidth, expectedHeight]] of Object.entries(sourceGeometry)) {
        const rect = await page.locator(selector).first().boundingBox();
        if (
          !rect ||
          Math.abs(rect.width - expectedWidth) > 0.2 ||
          (expectedHeight !== null && Math.abs(rect.height - expectedHeight) > 0.2)
        )
          report.errors.push(
            `Figma geometry mismatch at ${width}: ${selector} ${JSON.stringify(rect)}`,
          );
      }
      const headingWeights = await page
        .locator('.cp-catrog-main h2')
        .evaluateAll((nodes) => nodes.map((node) => globalThis.getComputedStyle(node).fontWeight));
      if (headingWeights.some((weight) => weight !== '700'))
        report.errors.push(`Rogers headings lost their Figma weight at ${width}`);
      if ((await page.locator('.cp-catrog-meter > span').count()) !== 25)
        report.errors.push(`Rogers scorecard lost its five-segment ratings at ${width}`);
      const suffix = String(width);
      await page.screenshot({ path: path.join(evidence, `rogers-${suffix}.png`), fullPage: true });
      for (const [name, selector] of [
        ['hero', '.cp-catrog-hero'],
        ['meta', '.cp-catrog-byline'],
        ['quick', '.cp-catrog-quick'],
        ['glance', '#glance'],
        ['plans', '#plans'],
        ['pros', '#pros'],
        ['comparison', '#comparison'],
        ['switch', '#switch'],
        ['guide', '.cp-catrog-guide'],
        ['reviews', '.cp-catrog-reviews'],
        ['faq', '#faq'],
        ['explore', '.cp-catrog-explore'],
        ['cta', '.cp-catrog-final'],
        ['footer', '.cp-footer'],
      ]) {
        const section = page.locator(selector).first();
        if (await section.count())
          await section.screenshot({
            path: path.join(evidence, 'crops', `rogers-${suffix}-${name}.png`),
          });
      }
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      report[`axe${suffix}`] = axe.violations.map(({ id, impact, description, nodes }) => ({
        id,
        impact,
        description,
        nodes: nodes.map(({ target, html, failureSummary }) => ({ target, html, failureSummary })),
      }));
      if (axe.violations.length)
        report.errors.push(`Axe found ${axe.violations.length} violations at ${width}px`);
    }

    if (width === 1440) {
      report.headings = await page
        .locator('h1,h2,h3')
        .evaluateAll((nodes) =>
          nodes.map((node) => ({ level: node.tagName, text: node.textContent?.trim() ?? '' })),
        );
    }
    if (width === 390 || width === 1440) {
      report.assets[width] = await page
        .locator(
          '.cp-catrog-byline-avatar img, .cp-catrog-review-person img, .cp-catrog-plan-card li img, .cp-catrog-plan-table img',
        )
        .evaluateAll((images) =>
          images
            .map((image) => {
              const rect = image.getBoundingClientRect();
              return {
                src: image.getAttribute('src'),
                intrinsicWidth: image.naturalWidth || image.width,
                intrinsicHeight: image.naturalHeight || image.height,
                renderedWidth: rect.width,
                renderedHeight: rect.height,
                visible: rect.width > 0 && rect.height > 0,
              };
            })
            .filter((image) => image.visible),
        );
    }
    if (width === 390) {
      await page.getByRole('button', { name: 'Data' }).click();
      report.interactions.sort = await page.locator('.cp-catrog-plan-card h3').allTextContents();
      const choose = page.getByRole('button', { name: 'Choose plan' }).first();
      await choose.focus();
      await page.keyboard.press('Enter');
      report.interactions.choose = await page
        .locator('.cp-catrog-selected[role="status"]')
        .innerText();
      await page.locator('.cp-catrog-selected button').click();
      report.interactions.selectionFocusRestored = await choose.evaluate(
        (element) => element === globalThis.document.activeElement,
      );
      if (!report.interactions.selectionFocusRestored)
        report.errors.push('Closing the plan preview did not return focus to its plan button');
      const accordion = page
        .locator('.cp-catrog-faq summary')
        .filter({ hasText: 'Can I keep my number when I switch to Rogers' });
      await accordion.focus();
      await page.keyboard.press('Enter');
      report.interactions.accordionExpanded = await accordion.evaluate(
        (node) =>
          node.parentElement?.tagName === 'DETAILS' && node.parentElement.hasAttribute('open'),
      );
      const advisor = page.locator('.cp-catrog-advisor-button').first();
      await advisor.focus();
      await page.keyboard.press('Enter');
      report.interactions.advisorDialog = await page.getByRole('dialog').innerText();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      report.interactions.focusRestored = await advisor.evaluate(
        (element) => element === globalThis.document.activeElement,
      );
      if (await page.getByRole('dialog').count())
        report.errors.push('Advisor preview dialog did not close on Escape');
    }
    await page.close();
    await context.close();
  }
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
} finally {
  await browser.close();
}

await writeFile(
  path.join(evidence, 'verification.json'),
  await format(JSON.stringify(report), { parser: 'json' }),
);
process.stdout.write(
  `${JSON.stringify({ widths: report.widths, interactions: report.interactions, axe: { 390: report.axe390, 1440: report.axe1440 }, errors: report.errors }, null, 2)}\n`,
);
if (report.errors.length) process.exitCode = 1;
