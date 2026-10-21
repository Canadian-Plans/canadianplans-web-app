import { expect, test, type Page } from './fixtures';

/**
 * T13 order-journey end-to-end tests.
 *
 * They run against the real backend app booted by the e2e harness with a
 * disposable Postgres, a stub published-catalogue provider and a stateful one-use
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
  const rejectCookies = page.getByRole('button', { name: 'Reject non-essential', exact: true });
  if (await rejectCookies.isVisible()) await rejectCookies.click();
  // Fail loudly and specifically when step 1 could not load its offers at all:
  // otherwise this only shows up as an opaque 30s timeout on the plan link.
  await expect(page.getByRole('heading', { name: 'Plans are unavailable right now' })).toHaveCount(
    0,
  );
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

test('serializes document uploads and releases all inputs after verification is cancelled', async ({
  page,
}) => {
  await choosePassportPlan(page);
  await fillDetailsAndContinue(page);
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
  // Hold the external provider, without changing the UI or Server Actions.
  await page.evaluate(() => {
    const provider: unknown = Reflect.get(window, 'turnstile');
    if (!provider || typeof provider !== 'object' || !('execute' in provider))
      throw new Error('test provider missing');
    provider.execute = () => {};
  });
  const inputs = page.locator('input[type=file]');
  await expect(inputs).toHaveCount(2);
  await inputs.first().setInputFiles({
    name: 'identity.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\nTEST ONLY'),
  });
  await expect(inputs.first()).toBeDisabled();
  await expect(inputs.last()).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel verification' }).click();
  await expect(inputs.first()).toBeEnabled();
  await expect(inputs.last()).toBeEnabled();
  await expect(page.getByRole('status').filter({ hasText: /security check/i })).toBeVisible();
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
  // Both attempts lose their response. Each obtains a fresh proof while the
  // business key stays stable, and the page offers a deliberate retry.
  await control('/__e2e__/drop-next-orders?count=2');

  await choosePassportPlan(page);
  await fillDetailsAndContinue(page);
  await acknowledgeDocuments(page);
  await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
  await acceptTermsAndPlaceOrder(page);

  await expect(
    page
      .getByText('We could not confirm your order. Try again to check the same submission.')
      .first(),
  ).toBeVisible();
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

test('tracks a submitted order using a queued code and a separate verification proof', async ({
  page,
}) => {
  await choosePassportPlan(page);
  await fillDetailsAndContinue(page);
  await acknowledgeDocuments(page);
  await acceptTermsAndPlaceOrder(page);
  const reference = await referenceText(page);
  await page.goto('/track');
  await page
    .locator('main')
    .getByLabel(/^Order reference/)
    .fill(reference);
  await page
    .locator('main')
    .getByLabel(/^Email/)
    .fill('customer@example.test');
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Enter your code' })).toBeVisible();
  await control('/__e2e__/run-outbox');
  const response = await fetch(
    `${HARNESS_URL}/__e2e__/tracking-code?reference=${encodeURIComponent(reference)}`,
  );
  expect(response.status).toBe(200);
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('code' in body) || typeof body.code !== 'string')
    throw new Error('synthetic tracking code missing');
  await page.getByLabel('Six-digit code').fill(body.code);
  await page.getByRole('button', { name: 'View my order' }).click();
  await expect(
    page.getByRole('heading', { name: `Order ${reference}`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId('tracking-status').filter({ hasText: 'Order received' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: `Order ${reference}`, exact: true }),
  ).toBeVisible();
});

test('starts a second purchase with fresh proofs and a new order key after the first draft is submitted', async ({
  page,
}) => {
  await choosePassportPlan(page);
  const planUrl = page.url();
  await fillDetailsAndContinue(page);
  await acknowledgeDocuments(page);
  await acceptTermsAndPlaceOrder(page);
  const first = await referenceText(page);
  await page.goto(planUrl);
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await fillDetailsAndContinue(page);
  await acknowledgeDocuments(page);
  await acceptTermsAndPlaceOrder(page);
  expect(await referenceText(page)).not.toBe(first);
  expect((await orders()).count).toBe(2);
});

test('joins the province wish list using its own action proof', async ({ page }) => {
  await control('/__e2e__/add-internet-fixture');
  await page.goto('/order?category=internet&province=NS');
  const rejectCookies = page.getByRole('button', { name: 'Reject non-essential', exact: true });
  if (await rejectCookies.isVisible()) await rejectCookies.click();
  await page
    .locator('main')
    .getByLabel(/^Email/)
    .fill('wishlist@example.test');
  await page.getByRole('button', { name: 'Add me to the list' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Thank you.' })).toBeVisible();
});

test.describe('challenge failure recovery', () => {
  test.use({ turnstileFailures: 1 });
  test('retains details and obtains a fresh proof after provider failure', async ({ page }) => {
    await choosePassportPlan(page);
    await fillDetailsAndContinue(page);
    await expect(
      page.getByText('We could not complete the security check. Please try again.'),
    ).toBeVisible();
    await expect(page.getByLabel(/Full name/i)).toHaveValue('Test Customer');
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
  });
});
