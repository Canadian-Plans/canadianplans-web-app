import { expect, test, type Page } from './fixtures';

/**
 * Email-only order tracking, end to end (owner request, 25 Oct 2026).
 *
 * Runs against the real backend app in the e2e harness: the customer places an
 * order, signs in to /track with only their email and an emailed code, sees
 * their orders, uploads a missing document through the real signed-upload +
 * signature-verified finalize pipeline (harness-hosted fake storage), asks for
 * a change, and answers a staff request for details. The staff leg uses the
 * real /api/v1/staff API to prove each item lands in admin's panels.
 */

const HARNESS_URL = process.env['E2E_HARNESS_URL'] ?? 'http://127.0.0.1:4100';
const STAFF_BEARER = process.env['E2E_STAFF_BEARER'] ?? 'e2e-staff-session-owner-aal2';
const WORKSPACE_ID = process.env['E2E_WORKSPACE_ID'] ?? '10000000-0000-4000-8000-000000000e01';
const EMAIL = 'customer@example.test';

async function control(path: string): Promise<void> {
  const response = await fetch(`${HARNESS_URL}${path}`, { method: 'POST' });
  expect(response.ok).toBe(true);
}

async function emailedCode(email: string): Promise<Response> {
  return fetch(`${HARNESS_URL}/__e2e__/tracking-code`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

async function readCode(email: string): Promise<string> {
  const response = await emailedCode(email);
  expect(response.status).toBe(200);
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('code' in body) || typeof body.code !== 'string')
    throw new Error('synthetic tracking code missing');
  return body.code;
}

async function staff(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${HARNESS_URL}/api/v1/staff/workspaces/${WORKSPACE_ID}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${STAFF_BEARER}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  expect(response.ok, `${init.method ?? 'GET'} ${path} -> ${response.status}`).toBe(true);
  return response.json();
}

/** Narrow an unknown JSON value to a record without an unchecked cast. */
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('expected an object');
  return Object.fromEntries(Object.entries(value));
}

function list(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error('expected an array');
  return value.map(record);
}

async function staffOrderId(reference: string): Promise<string> {
  const orders = list(record(await staff('/orders?pageSize=50')).orders);
  const id = orders.find((order) => order['reference'] === reference)?.['id'];
  if (typeof id !== 'string') throw new Error(`order ${reference} not visible to staff`);
  return id;
}

async function staffOrder(orderId: string): Promise<Record<string, unknown>> {
  return record(record(await staff(`/orders/${orderId}`)).order);
}

async function placeOrder(page: Page): Promise<string> {
  await page.goto('/order');
  const rejectCookies = page.getByRole('button', { name: 'Reject non-essential', exact: true });
  if (await rejectCookies.isVisible()) await rejectCookies.click();
  await page.getByRole('link', { name: /Select .*E2E Passport Plan/ }).click();
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await page.getByLabel(/Full name/i).fill('Test Customer');
  await page.getByLabel(/^Email/i).fill(EMAIL);
  await page.getByLabel(/^Code/i).fill('BD');
  await page.getByLabel(/^Phone/i).fill('1712345678');
  await page.getByLabel(/Country you are in now/i).fill('Bangladesh');
  await page.getByLabel(/Destination in Canada/i).fill('Toronto');
  await page.getByLabel(/Arrival date/i).fill('2026-10-01');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
  await page.getByLabel(/I have read the document checklist/i).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel(/I accept the terms/i).check();
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  return (await page.getByTestId('order-reference').innerText()).trim();
}

async function signIn(page: Page, email = EMAIL): Promise<void> {
  await page.goto('/track');
  await page.locator('main').getByLabel('Email used on your order').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Enter your code' })).toBeVisible();
  await control('/__e2e__/run-outbox');
}

/** Opens a details card on mobile (collapsed) and clicks its visible change button. */
async function openChange(page: Page, card: string): Promise<void> {
  const section = page.locator(`[data-card="${card}"]`);
  const toggle = section.locator('.cp-tracking-detail-toggle');
  if (await toggle.isVisible()) {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  }
  await section
    .getByRole('button', { name: 'Request change →' })
    .locator('visible=true')
    .first()
    .click();
}

test.beforeEach(async ({ page }) => {
  await control('/__e2e__/reset');
  // The harness's fake storage hands out https upload URLs (the site's CSP
  // allows only https); forward each direct browser PUT to the harness.
  await page.route('https://storage.e2e.test/**', async (route) => {
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'PUT',
      'access-control-allow-headers': 'content-type',
    };
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const key = new URL(request.url()).pathname.slice(1);
    const forwarded = await fetch(`${HARNESS_URL}/__e2e__/r2/${key}`, {
      method: 'PUT',
      body: new Uint8Array(request.postDataBuffer() ?? Buffer.alloc(0)),
    });
    await route.fulfill({ status: forwarded.ok ? 200 : 502, headers: cors });
  });
});

test('a customer tracks every order by email, uploads, asks for a change and answers staff', async ({
  page,
}) => {
  const reference = await placeOrder(page);

  // 1. Email only, then the emailed six-digit code.
  await signIn(page);
  await page.getByLabel('Six-digit code').fill(await readCode(EMAIL));
  await page.getByRole('button', { name: 'Show my orders' }).click();

  // 2. Every order of this email on this website.
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
  await page.getByRole('button', { name: `View order ${reference}` }).click();

  // 3. The order's details.
  await expect(
    page.getByRole('heading', { name: `Order ${reference}`, exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('tracking-status')).toHaveText(/Received/);
  await expect(page.getByTestId('tracking-action')).toBeVisible();

  // 5. Upload a missing document through the signed, signature-verified pipeline.
  await page
    .getByTestId('tracking-action')
    .locator('input[type=file][data-document="passport"]')
    .setInputFiles({
      name: 'passport.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\nTEST ONLY synthetic passport\n'),
    });
  await expect(page.getByTestId('tracking-document-passport')).toContainText('Received', {
    timeout: 15_000,
  });

  // 4. Ask for a change to the customer's details.
  await openChange(page, 'personal');
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Phone number', { exact: true }).click();
  await dialog.getByLabel(/^New value: Phone number/).fill('+880 1712 000000');
  await dialog.getByRole('button', { name: 'Send request →' }).click();
  await expect(dialog.getByText('Request sent')).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.cp-track-changes')).toContainText('Phone number');
  await expect(page.locator('.cp-track-changes')).toContainText('Waiting for review');

  // Staff see both: the change request (from the customer) and the document.
  const orderId = await staffOrderId(reference);
  const afterChange = await staffOrder(orderId);
  expect(list(afterChange['changeRequests'])).toEqual([
    expect.objectContaining({
      origin: 'customer',
      status: 'pending',
      patch: { contact: { phone: '+880 1712 000000' } },
    }),
  ]);
  const files = list(record(await staff(`/orders/${orderId}/files`)).files);
  expect(files).toEqual(
    expect.arrayContaining([expect.objectContaining({ documentType: 'passport' })]),
  );

  // 6. Staff ask for missing details; the customer fills them in.
  await staff(`/orders/${orderId}/info-requests`, {
    method: 'POST',
    body: JSON.stringify({ fields: ['form.arrivalDate'], message: 'Your flight moved?' }),
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: `Order ${reference}`, exact: true }),
  ).toBeVisible();
  const info = page.getByRole('form', { name: 'Details we need' });
  await expect(info).toContainText('Your flight moved?');
  await info.getByRole('button', { name: 'Send details' }).click();
  await expect(info.getByText('Fill in this detail.')).toBeVisible();
  await info.getByLabel('Arrival date').fill('2026-10-03');
  await info.getByRole('button', { name: 'Send details' }).click();
  await expect(page.getByText('Thank you. Our team will review your details.')).toBeVisible();

  const answered = await staffOrder(orderId);
  const infoRequests = list(answered['infoRequests']);
  expect(infoRequests).toEqual([expect.objectContaining({ status: 'answered' })]);
  expect(list(answered['changeRequests'])).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        origin: 'customer',
        infoRequestId: infoRequests[0]?.['id'],
        patch: { form: { arrivalDate: '2026-10-03' } },
      }),
    ]),
  );

  // The grant survives a reload of the list, and signing out ends it.
  await page.getByRole('button', { name: '← All my orders' }).click();
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Track your order' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Track your order' })).toBeVisible();
});

test('an unknown email gets the same answer and no code; a wrong code shows nothing', async ({
  page,
}) => {
  await placeOrder(page);

  // Existence is hidden: the same next step, but no email is sent.
  await signIn(page, 'nobody@example.test');
  expect((await emailedCode('nobody@example.test')).status).toBe(404);

  // A wrong code for a real email never opens the orders.
  await signIn(page);
  const code = await readCode(EMAIL);
  await page.getByLabel('Six-digit code').fill(code === '000000' ? '111111' : '000000');
  await page.getByRole('button', { name: 'Show my orders' }).click();
  await expect(page.getByText(/That code is not valid or has expired/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your orders' })).toHaveCount(0);
});
