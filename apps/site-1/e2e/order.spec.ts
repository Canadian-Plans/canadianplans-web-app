import { expect, test, type Page } from '@playwright/test';

/**
 * T13 order-journey end-to-end tests.
 *
 * They run against the real backend app booted by the e2e harness with a
 * disposable Postgres, a stub published-catalogue provider and an admitting
 * bot check (see `apps/backend/tests/e2e/harness.ts`). The harness also fronts
 * the app with a proxy so a test can drop the response of an already-committed
 * order — the "connection dropped after the save" case REQ 18 requires.
 */

const HARNESS_URL = process.env['E2E_HARNESS_URL'] ?? 'http://127.0.0.1:4100';

async function control(path: string): Promise<void> {
  const response = await fetch(`${HARNESS_URL}${path}`, { method: 'POST' });
  expect(response.ok).toBe(true);
}

interface OrderList {
  count: number;
  references: string[];
}

/** Reads the harness's order list without an unchecked cast. */
function readOrderList(value: unknown): OrderList {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('count' in value) ||
    !('references' in value)
  ) {
    throw new Error('unexpected orders payload');
  }
  const { count, references } = value;
  if (typeof count !== 'number' || !Array.isArray(references)) {
    throw new Error('unexpected orders payload');
  }
  const list: string[] = [];
  for (const reference of references) {
    if (typeof reference !== 'string') throw new Error('unexpected order reference');
    list.push(reference);
  }
  return { count, references: list };
}

async function orders(): Promise<OrderList> {
  const response = await fetch(`${HARNESS_URL}/__e2e__/orders`);
  expect(response.ok).toBe(true);
  return readOrderList(await response.json());
}

test.beforeEach(async () => {
  await control('/__e2e__/reset');
});

async function choosePassportPlan(page: Page): Promise<void> {
  await page.goto('/order');
  await page.getByRole('link', { name: /Select .*E2E Passport Plan/ }).click();
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
}

async function fillDetailsAndContinue(page: Page): Promise<void> {
  await page.getByLabel(/Full name/i).fill('Test Customer');
  await page.getByLabel(/^Email/i).fill('customer@example.test');
  await page.getByLabel(/^Code/i).fill('BD');
  await page.getByLabel(/^Phone/i).fill('1712345678');
  await page.getByLabel(/Country you are in now/i).fill('Bangladesh');
  await page.getByLabel(/Destination in Canada/i).fill('Toronto');
  await page.getByLabel(/Arrival date/i).fill('2026-10-01');
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function acknowledgeDocuments(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
  await page.getByLabel(/I have read the document checklist/i).check();
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function acceptTermsAndPlaceOrder(page: Page): Promise<void> {
  await page.getByLabel(/I accept the terms/i).check();
  await page.getByRole('button', { name: 'Place order' }).click();
}

async function referenceText(page: Page): Promise<string> {
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  return (await page.getByTestId('order-reference').innerText()).trim();
}

test('orders a plan end to end and shows the server reference', async ({ page }) => {
  const before = await orders();

  await choosePassportPlan(page);
  await fillDetailsAndContinue(page);
  await acknowledgeDocuments(page);
  await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
  await acceptTermsAndPlaceOrder(page);

  const reference = await referenceText(page);
  expect(reference.length).toBeGreaterThan(0);

  const after = await orders();
  expect(after.count).toBe(before.count + 1);
  expect(after.references).toContain(reference);
});

test('a dropped response is retried with the same key and returns the same reference', async ({
  page,
}) => {
  const before = await orders();
  // The first order POST commits, then its response is dropped. The action
  // retries once with the SAME idempotency key.
  await control('/__e2e__/drop-next-orders?count=1');

  await choosePassportPlan(page);
  await fillDetailsAndContinue(page);
  await acknowledgeDocuments(page);
  await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
  await acceptTermsAndPlaceOrder(page);

  const reference = await referenceText(page);
  const after = await orders();
  // Exactly one order exists and it is the reference the customer was shown.
  expect(after.count).toBe(before.count + 1);
  expect(after.references).toContain(reference);
});

test('a retryable failure never shows success, and the deliberate retry returns the same reference', async ({
  page,
}) => {
  const before = await orders();
  // Both attempts inside the action lose their response, so the action must
  // report "not saved" rather than a success screen.
  await control('/__e2e__/drop-next-orders?count=2');

  await choosePassportPlan(page);
  await fillDetailsAndContinue(page);
  await acknowledgeDocuments(page);
  await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
  await acceptTermsAndPlaceOrder(page);

  await expect(page.getByText('Your order was not saved. Please try again.').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Order received' })).not.toBeVisible();

  await page.getByRole('button', { name: 'Try again' }).click();
  const reference = await referenceText(page);
  const after = await orders();
  expect(after.count).toBe(before.count + 1);
  expect(after.references).toContain(reference);
});

test('a quote failure offers a callback and creates no order', async ({ page }) => {
  await control('/__e2e__/fail-next-quotes');

  await choosePassportPlan(page);
  await fillDetailsAndContinue(page);
  await acknowledgeDocuments(page);

  await expect(page.getByRole('heading', { name: /confirm the price/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Order received' })).not.toBeVisible();

  const before = await orders();
  await page.getByRole('button', { name: 'Request a callback' }).click();
  await expect(page.getByRole('heading', { name: 'Callback requested' })).toBeVisible();

  const after = await orders();
  expect(after.count).toBe(before.count);
});
