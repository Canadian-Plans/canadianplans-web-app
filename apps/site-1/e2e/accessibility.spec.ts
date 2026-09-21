import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * REQ 10 / §16 gate 12 — automated WCAG 2.1 AA checks on the public storefront.
 *
 * Runs axe-core against the built storefront the Playwright config boots (with
 * the backend harness, so `/order` renders its real offer list). The gate is
 * ZERO serious/critical violations on each public journey page. Lower-impact
 * (moderate/minor) findings are reported but do not fail the gate, matching the
 * "fix serious/critical" acceptance bar.
 */
const ROUTES = ['/', '/plans', '/order', '/track'] as const;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

for (const route of ROUTES) {
  test(`no serious or critical axe violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const blocking = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    const summary = blocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => node.target),
    }));
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });
}

test('each public journey page has exactly one h1 (REQ 10)', async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
  }
});
