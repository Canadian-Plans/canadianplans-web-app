import { expect, type Page } from './fixtures';

/** Steps the order and tracking suites share. All data is synthetic. */

export const CUSTOMER = {
  fullName: 'Test Customer',
  email: 'customer@example.test',
  countryCode: 'BD',
  phone: '1712345678',
  currentCountry: 'Bangladesh',
  destination: 'Toronto',
  arrivalDate: '2027-01-15',
} as const;

export const PDF_FILE = {
  name: 'passport.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.7\n% TEST ONLY synthetic document\n'),
};

/** A real one-pixel PNG. */
export const PNG_FILE = {
  name: 'visa.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
};

/** Answers the cookie banner before the page loads, so it never covers a control. */
export async function declineCookies(page: Page): Promise<void> {
  await page.addInitScript(() =>
    localStorage.setItem(
      'canadian-plans.cookie-choices.v1',
      JSON.stringify({ version: 1, analytics: false, marketing: false }),
    ),
  );
}

/**
 * Waits until React has hydrated the page's form. Text typed into a field, or a
 * button pressed, before that is lost, which is a race only a test can win.
 */
export async function formReady(page: Page): Promise<void> {
  await expect(async () => {
    const hydrated = await page
      .getByTestId('human-challenge')
      .first()
      .evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactFiber$')));
    expect(hydrated).toBe(true);
  }).toPass();
}

/** Opens an order or tracking page and waits for its form to be usable. */
export async function visit(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await formReady(page);
}

export async function chooseSimPlan(page: Page, plan = 'E2E Passport Plan'): Promise<void> {
  await visit(page, '/order?category=sim');
  // Fail loudly when step 1 could not load its plans, not as a timeout on the link.
  await expect(page.getByRole('heading', { name: 'Plans are unavailable right now' })).toHaveCount(
    0,
  );
  await page.getByRole('link', { name: `Select ${plan}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await formReady(page);
}

export async function fillSimDetails(
  page: Page,
  overrides: Partial<Record<keyof typeof CUSTOMER, string>> = {},
): Promise<void> {
  const customer = { ...CUSTOMER, ...overrides };
  await page.getByLabel(/^Full name/).fill(customer.fullName);
  await page.getByLabel(/^Email/).fill(customer.email);
  await page.getByLabel(/^Code/).fill(customer.countryCode);
  await page.getByLabel(/^Phone/).fill(customer.phone);
  await page.getByLabel(/^Country you are in now/).fill(customer.currentCountry);
  await page.getByLabel(/^Destination in Canada/).fill(customer.destination);
  await page.getByLabel(/^Arrival date/).fill(customer.arrivalDate);
}

export async function continueFromDetails(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
}

/** Leaves the documents step for the review step, acknowledging a checklist when there is one. */
export async function continueFromDocuments(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
  const acknowledge = page.getByLabel('I have read the document checklist.');
  if (await acknowledge.isVisible()) await acknowledge.check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

export async function reachSimReview(page: Page, plan?: string): Promise<void> {
  await chooseSimPlan(page, plan);
  await fillSimDetails(page);
  await continueFromDetails(page);
  await continueFromDocuments(page);
  await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
}

export async function acceptTermsAndPlaceOrder(page: Page): Promise<void> {
  await page.getByLabel(/^I accept the terms/).check();
  await page.getByRole('button', { name: 'Place order' }).click();
}

/** The reference on the confirmation step: the only place an order number is shown. */
export async function orderReference(page: Page): Promise<string> {
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  return (await page.getByTestId('order-reference').innerText()).trim();
}

export async function placeSimOrder(page: Page, plan?: string): Promise<string> {
  await reachSimReview(page, plan);
  await acceptTermsAndPlaceOrder(page);
  return orderReference(page);
}
