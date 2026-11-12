import AxeBuilder from '@axe-core/playwright';

import { expect, test, type Page } from './fixtures';
import {
  CUSTOMER,
  acceptTermsAndPlaceOrder,
  chooseSimPlan,
  continueFromDetails,
  continueFromDocuments,
  declineCookies,
  fillSimDetails,
  orderReference,
  visit,
} from './journeys';
import { stub } from './stub';

/**
 * REQ 10 / §16 gate 12 — automated WCAG 2.1 AA checks on the public storefront.
 *
 * Runs axe-core against the built storefront the Playwright config boots (with
 * the CRM stub, so `/order` renders a real plan list). The gate is ZERO
 * serious/critical violations on each public journey page and on every step of
 * the order form and of order tracking. Lower-impact (moderate/minor) findings
 * are reported but do not fail the gate, matching the "fix serious/critical"
 * acceptance bar.
 */
const ROUTES = ['/', '/plans', '/order', '/track'] as const;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoBlockingViolations(page: Page, where: string): Promise<void> {
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
  expect(summary, `${where}: ${JSON.stringify(summary, null, 2)}`).toEqual([]);
}

for (const route of ROUTES) {
  test(`no serious or critical axe violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expectNoBlockingViolations(page, route);
  });
}

test('each public journey page has exactly one h1 (REQ 10)', async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
  }
});

test('no serious or critical axe violations on any step of the order form', async ({ page }) => {
  await declineCookies(page);
  await visit(page, '/order?category=sim');
  await expectNoBlockingViolations(page, 'plan list');

  await chooseSimPlan(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'There is a problem' })).toBeFocused();
  await expectNoBlockingViolations(page, 'details with errors');

  await fillSimDetails(page);
  await continueFromDetails(page);
  await expectNoBlockingViolations(page, 'documents');

  await continueFromDocuments(page);
  await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
  await expectNoBlockingViolations(page, 'review');

  await acceptTermsAndPlaceOrder(page);
  await orderReference(page);
  await expectNoBlockingViolations(page, 'confirmation');
  await expect(page.locator('h1')).toHaveCount(1);
});

test('no serious or critical axe violations on any step of order tracking', async ({ page }) => {
  await declineCookies(page);
  await chooseSimPlan(page);
  await fillSimDetails(page);
  await continueFromDetails(page);
  await continueFromDocuments(page);
  await acceptTermsAndPlaceOrder(page);
  const reference = await orderReference(page);

  await visit(page, '/track');
  await page.locator('main').getByLabel('Email used on your order').fill(CUSTOMER.email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Enter your code' })).toBeVisible();
  await expectNoBlockingViolations(page, 'code step');

  const code = await stub.trackingCode(CUSTOMER.email);
  await page.getByLabel('Six-digit code').fill(code ?? '');
  await page.getByRole('button', { name: 'Show my orders' }).click();
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expectNoBlockingViolations(page, 'order list');

  await page.getByRole('button', { name: `View order ${reference}` }).click();
  await expect(
    page.getByRole('heading', { name: `Order ${reference}`, exact: true }),
  ).toBeVisible();
  await expectNoBlockingViolations(page, 'order detail');
  await expect(page.locator('h1')).toHaveCount(1);

  const personal = page.locator('[data-card="personal"]');
  const toggle = personal.locator('.cp-tracking-detail-toggle');
  if ((await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  await personal
    .getByRole('button', { name: 'Request change →' })
    .locator('visible=true')
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoBlockingViolations(page, 'change request dialog');
});
