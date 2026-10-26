import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { createBackendClient } from '@canadian-plans/contracts';

/**
 * CQ-01: the admin order screens against the real backend harness (real
 * routes, Postgres with RLS, authorization store and order transitions). Run
 * with `pnpm --filter admin test:e2e:orders`; see playwright.orders.config.ts.
 */
const HARNESS_URL = 'http://127.0.0.1:4200';
const SERVICE_CREDENTIAL =
  process.env['E2E_SERVICE_CREDENTIAL'] ?? 'cplsk_e2e_order_journey_secret_0001';
const WORKSPACE_SLUG = 'e2e-order-journey';

/** The harness admits one-use proofs of the form e2e.<action>.<uuid>. */
const proof = (action: string) => ({ turnstileToken: `e2e.${action}.${randomUUID()}` });

/** Places one real order through the public API, as the storefront does. */
async function placeOrder(): Promise<{ id: string; reference: string }> {
  const client = createBackendClient({ baseUrl: HARNESS_URL, credential: SERVICE_CREDENTIAL });
  const { offers } = await client.offers.list();
  const offer = offers.find((candidate) => candidate.commercial.productKey === 'e2e-simple-plan');
  if (!offer) throw new Error('the harness simple plan is missing');
  const form = {
    schemaVersion: 1,
    payload: { documents: { required: [], acknowledged: true } },
  };
  const created = await client.leads.create(
    {
      contact: { fullName: 'Synthetic Admin Journey', email: 'admin-journey@example.test' },
      form,
      productId: offer.productId,
      consentVersion: 'e2e-consent-1',
    },
    proof('lead-save'),
  );
  const draftGrant = created.draftGrant.token;
  const { quote } = await client.quotes.create(
    { leadId: created.lead.id, productId: offer.productId },
    { draftGrant, ...proof('quote-create') },
  );
  const { order } = await client.orders.submit(
    {
      quoteId: quote.id,
      termsVersion: quote.termsVersion,
      form,
      consent: { termsVersion: quote.termsVersion, marketingOptIn: false },
    },
    { draftGrant, idempotencyKey: `order-${randomUUID()}`, ...proof('order-submit') },
  );
  return { id: order.id, reference: order.reference };
}

/** The fulfilment badge right after the order heading, not any matching text. */
function statusBadge(page: Page, reference: string) {
  return page
    .getByRole('heading', { level: 1, name: reference })
    .locator('xpath=following-sibling::*[1]');
}

async function openOrder(page: Page, reference: string): Promise<void> {
  await page.goto(`/w/${WORKSPACE_SLUG}/orders`);
  await page.getByRole('link', { name: reference }).click();
  await expect(page.getByRole('heading', { level: 1, name: reference })).toBeVisible();
}

test.beforeEach(async () => {
  const response = await fetch(`${HARNESS_URL}/__e2e__/reset`, { method: 'POST' });
  expect(response.ok).toBe(true);
});

test('lists a new order, opens it and moves it to in progress', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const order = await placeOrder();

  await page.goto(`/w/${WORKSPACE_SLUG}/orders`);
  await expect(page.getByRole('link', { name: order.reference })).toBeVisible();
  await page.getByRole('link', { name: order.reference }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${WORKSPACE_SLUG}/orders/${order.id}$`));
  await expect(page.getByRole('heading', { level: 1, name: order.reference })).toBeVisible();
  await expect(statusBadge(page, order.reference)).toHaveText('submitted');

  await page.getByRole('button', { name: 'Move to In progress' }).click();
  await expect(statusBadge(page, order.reference)).toHaveText('in_progress');
  await expect(page.getByRole('button', { name: 'Move to In progress' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a stale tab is told the order changed and can reload it', async ({ page, context }) => {
  const order = await placeOrder();
  await openOrder(page, order.reference);
  const stale = await context.newPage();
  await openOrder(stale, order.reference);

  await page.getByRole('button', { name: 'Move to In progress' }).click();
  await expect(statusBadge(page, order.reference)).toHaveText('in_progress');

  // The second tab still holds the old version; the backend must refuse it.
  await stale.getByRole('button', { name: 'Move to In progress' }).click();
  // Other alerts can exist on the page (Next's route announcer, for one), so
  // pick the conflict alert by its reload action.
  const reload = stale.getByRole('alert').getByRole('button', { name: 'Reload order' });
  await expect(reload).toBeVisible();
  await reload.click();
  await expect(statusBadge(stale, order.reference)).toHaveText('in_progress');
  await expect(reload).toHaveCount(0);
});
