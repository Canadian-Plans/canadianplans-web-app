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

/**
 * Presses a plan card's button. It reads "Select plan"; the plan's name follows
 * in its accessible name, which is how a screen reader tells the cards apart.
 */
export async function selectPlan(page: Page, plan: string): Promise<void> {
  // The browser puts a space before the colon (the name is the visible text plus an sr-only span).
  const name = new RegExp(`^Select plan\\s*:\\s*${plan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  await page.getByRole('link', { name }).click();
}

export async function chooseSimPlan(page: Page, plan = 'E2E Passport Plan'): Promise<void> {
  await visit(page, '/order?category=sim');
  // Fail loudly when step 1 could not load its plans, not as a timeout on the link.
  await expect(page.getByRole('heading', { name: 'Plans are unavailable right now' })).toHaveCount(
    0,
  );
  await selectPlan(page, plan);
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
  await page.getByLabel(/^Country code/).fill(customer.countryCode);
  await page.getByLabel(/^Phone/).fill(customer.phone);
  await page.getByLabel(/^Country you are in now/).fill(customer.currentCountry);
  await page.getByLabel(/^Destination in Canada/).fill(customer.destination);
  await page.getByLabel(/^Arrival date/).fill(customer.arrivalDate);
}

/** The order form's progress list: only the steps this order has. */
function progress(page: Page) {
  return page.getByRole('list', { name: 'Order progress' });
}

/**
 * Presses Continue on the details step. A plan that asks for documents goes to
 * the Documents step; any other plan skips it, so the order goes straight to
 * the review (`documents: false`) and the step is absent from the progress list.
 */
export async function continueFromDetails(
  page: Page,
  { documents = true }: { documents?: boolean } = {},
): Promise<void> {
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  if (documents) {
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await expect(progress(page)).toContainText('Documents');
  } else {
    await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Documents' })).toHaveCount(0);
    await expect(progress(page)).not.toContainText('Documents');
  }
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
