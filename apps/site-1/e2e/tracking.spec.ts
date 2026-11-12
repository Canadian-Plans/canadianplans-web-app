import { expect, test, type Page } from './fixtures';
import { CUSTOMER, PDF_FILE, declineCookies, formReady, placeSimOrder, visit } from './journeys';
import { stub } from './stub';

/**
 * Email-only order tracking on /track, in a real browser against the built
 * storefront and the CRM stub: the emailed code, the customer's orders, one
 * order's details, a change request for the customer's own details and a
 * passport sent through the signed upload.
 */

const EMAIL: string = CUSTOMER.email;
const TRACKING = '/api/v1/website/tracking';

async function requestCode(page: Page, email = EMAIL): Promise<void> {
  await visit(page, '/track');
  await page.locator('main').getByLabel('Email used on your order').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Enter your code' })).toBeVisible();
}

async function emailedCode(email = EMAIL): Promise<string> {
  const code = await stub.trackingCode(email);
  if (code === undefined) throw new Error('no tracking code was sent');
  return code;
}

async function signIn(page: Page): Promise<void> {
  await requestCode(page);
  await page.getByLabel('Six-digit code').fill(await emailedCode());
  await page.getByRole('button', { name: 'Show my orders' }).click();
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
  // Setting the grant cookie re-renders the page, which loads the orders once more.
  await page.waitForLoadState('networkidle');
}

async function openOrder(page: Page, reference: string): Promise<void> {
  await page.getByRole('button', { name: `View order ${reference}` }).click();
  await expect(
    page.getByRole('heading', { name: `Order ${reference}`, exact: true }),
  ).toBeVisible();
}

/** Opens a details card (collapsed on mobile) and clicks its visible change button. */
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
  await declineCookies(page);
});

test('code, order list, order details, a change request and a passport upload', async ({
  page,
  context,
}) => {
  const reference = await placeSimOrder(page);

  // 1. The email, then the six-digit code that was "emailed".
  await requestCode(page);
  await expect(page.getByText(`If we have orders for ${EMAIL}, we have sent`)).toBeVisible();
  await page.getByLabel('Six-digit code').fill(await emailedCode());
  await page.getByRole('button', { name: 'Show my orders' }).click();

  // 2. The orders placed with that email. The grant stays in an httpOnly cookie.
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(`Every order placed with ${EMAIL} on Canadian Plans.`)).toBeVisible();
  const grant = (await context.cookies()).find((entry) => entry.name === 'cp_tracking_grant');
  expect(grant?.httpOnly).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain('cp_tracking_grant');
  expect(await page.content()).not.toContain('cg_e2e_');
  const card = page.getByRole('button', { name: `View order ${reference}` });
  await expect(card).toContainText('E2E Passport Plan');
  await expect(card).toContainText('Received');
  await expect(card).toContainText('Action needed');

  // 3. One order: its status in the customer's words, its plan and its details.
  await openOrder(page, reference);
  await expect(page).toHaveURL(new RegExp(`order=${reference}`));
  await expect(page.getByTestId('tracking-status')).toHaveText(/Received/);
  await expect(page.locator('[data-card="plan"]')).toContainText('E2E Passport Plan');
  await expect(page.locator('[data-card="plan"]')).toContainText('$45.00 per 30 days');
  const personal = page.locator('[data-card="personal"]');
  await expect(personal).toContainText(CUSTOMER.fullName);
  await expect(personal).toContainText(CUSTOMER.phone);
  await expect(personal).toContainText(CUSTOMER.destination);
  await expect(personal).toContainText('15 Jan 2027');
  await expect(page.getByTestId('tracking-action')).toContainText('We need something from you');

  // 4. A change request: only the customer's own four details, never the plan or email.
  await openChange(page, 'personal');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Request a change' })).toBeVisible();
  await expect(dialog.locator('label')).toHaveText([
    'Full name',
    'Phone number',
    'Arrival date',
    'Destination in Canada',
  ]);
  await dialog.getByRole('button', { name: 'Send request →' }).click();
  await expect(dialog.getByText('Change at least one detail before sending.')).toBeVisible();
  await dialog.getByLabel('Phone number').fill('123');
  await dialog.getByRole('button', { name: 'Send request →' }).click();
  await expect(dialog.getByText('Enter a phone number with at least seven digits.')).toBeVisible();
  await dialog.getByLabel('Phone number').fill('+880 1712 000000');
  await dialog.getByLabel('Destination in Canada').fill('Vancouver');
  await dialog.getByRole('button', { name: 'Send request →' }).click();
  await expect(dialog.getByText('Request sent')).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();
  const pending = page.getByTestId('tracking-pending-change');
  await expect(pending).toContainText('Waiting for review');
  await expect(pending).toContainText('Phone number, Destination in Canada');
  // The order itself is unchanged until staff approve the request.
  await expect(personal).toContainText(CUSTOMER.destination);

  let lead = (await stub.leads())[0];
  expect(lead?.pendingChange).toMatchObject({
    fields: { phone: '+880 1712 000000', canadaAddress: 'Vancouver' },
    documents: [],
  });
  expect(Object.keys(lead?.pendingChange?.fields ?? {}).sort()).toEqual(['canadaAddress', 'phone']);
  expect(lead?.contact['phone']).toBe(CUSTOMER.phone);

  // 5. A passport: a wrong type is refused here; a PDF goes through the signed upload.
  const passportInput = page
    .getByTestId('tracking-action')
    .locator('input[type=file][data-document="passport"]');
  await passportInput.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('TEST ONLY'),
  });
  await expect(page.getByText('Choose a PDF, JPG or PNG file.').first()).toBeVisible();
  await passportInput.setInputFiles(PDF_FILE);
  await expect(page.getByTestId('tracking-document-passport')).toContainText('Sent for review');
  await expect(pending).toContainText('Documents you sent');
  await expect(pending).toContainText('Passport');
  // The visa is still asked for.
  await expect(page.getByTestId('tracking-action')).toContainText('Visa or permit');

  lead = (await stub.leads())[0];
  expect(lead?.pendingChange).toMatchObject({
    fields: { phone: '+880 1712 000000', canadaAddress: 'Vancouver' },
    documents: ['passport'],
  });
  const requests = (await stub.requests()).filter((request) => request.path.startsWith(TRACKING));
  expect(
    requests
      .filter((request) => request.method === 'POST')
      .map((request) => [request.path.replace(/[0-9a-f-]{36}/, ':id'), request.status]),
  ).toEqual([
    [`${TRACKING}/code`, 200],
    [`${TRACKING}/verify`, 200],
    [`${TRACKING}/orders/${reference}/changes`, 201],
    [`${TRACKING}/orders/${reference}/uploads/intents`, 201],
    [`${TRACKING}/orders/${reference}/uploads/:id/finalize`, 200],
  ]);
  expect(requests.map((request) => request.botAction).filter(Boolean)).toEqual([
    'tracking-request',
    'tracking-verify',
    'upload-intent',
    'upload-finalize',
  ]);

  // The session survives a reload on the open order, and signing out ends it.
  await page.reload();
  await formReady(page);
  await expect(
    page.getByRole('heading', { name: `Order ${reference}`, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '← All my orders' }).click();
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Track your order' })).toBeVisible();
  await page.reload();
  await formReady(page);
  await expect(page.getByRole('heading', { name: 'Track your order' })).toBeVisible();
});

test('an unknown email gets the same answer and no code; a wrong code shows nothing', async ({
  page,
}) => {
  await placeSimOrder(page);

  // Existence is hidden: the same next step, but nothing is sent.
  await visit(page, '/track');
  await page.locator('main').getByLabel('Email used on your order').fill('not-an-email');
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByText('Enter the email address you used on your order.')).toBeVisible();
  await requestCode(page, 'nobody@example.test');
  expect(await stub.trackingCode('nobody@example.test')).toBeUndefined();
  await page.getByLabel('Six-digit code').fill('123456');
  await page.getByRole('button', { name: 'Show my orders' }).click();
  await expect(page.getByText(/^That code is not valid or has expired\./)).toBeVisible();

  // A wrong code for a real email never opens the orders; the right one still does.
  await requestCode(page);
  const code = await emailedCode();
  await page.getByLabel('Six-digit code').fill('12');
  await page.getByRole('button', { name: 'Show my orders' }).click();
  await expect(page.getByText('Enter the six digits from the email.')).toBeVisible();
  await page.getByLabel('Six-digit code').fill(code === '000000' ? '111111' : '000000');
  await page.getByRole('button', { name: 'Show my orders' }).click();
  await expect(page.getByText(/^That code is not valid or has expired\./)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your orders' })).toHaveCount(0);
  await page.getByLabel('Six-digit code').fill(code);
  await page.getByRole('button', { name: 'Show my orders' }).click();
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
});

test('an expired session returns to the email step and shows no order', async ({ page }) => {
  const reference = await placeSimOrder(page);
  await signIn(page);
  await stub.expireTrackingGrants();

  await page.getByRole('button', { name: `View order ${reference}` }).click();
  await expect(page.getByRole('heading', { name: 'Track your order' })).toBeVisible();
  await expect(page.getByText('For your security, please confirm your email again.')).toBeVisible();
  await expect(page.getByRole('heading', { name: `Order ${reference}` })).toHaveCount(0);

  // The same while a change request is being sent: the dialog gives way to the email step.
  await signIn(page);
  await openOrder(page, reference);
  await openChange(page, 'personal');
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Changed Name');
  await stub.expireTrackingGrants();
  await dialog.getByRole('button', { name: 'Send request →' }).click();
  await expect(page.getByRole('heading', { name: 'Track your order' })).toBeVisible();
  await expect(page.getByText('For your security, please confirm your email again.')).toBeVisible();
  expect((await stub.leads())[0]?.pendingChange).toBeNull();
});

test('an order past the stage for changes refuses the request and stops offering it', async ({
  page,
}) => {
  const reference = await placeSimOrder(page);
  await signIn(page);
  await openOrder(page, reference);

  // Staff dispatch the order while the customer still has the page open.
  await stub.setStage(reference, 'delivered');
  await openChange(page, 'personal');
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Changed Name');
  await dialog.getByRole('button', { name: 'Send request →' }).click();
  await expect(
    dialog.getByText('This order can no longer be changed here. Contact us for help.'),
  ).toBeVisible();
  expect((await stub.leads())[0]?.pendingChange).toBeNull();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  // The same for a document.
  await page
    .getByTestId('tracking-action')
    .locator('input[type=file][data-document="passport"]')
    .setInputFiles(PDF_FILE);
  await expect(
    page
      .getByText('Documents can no longer be added to this order here. Contact us for help.')
      .first(),
  ).toBeVisible();

  // Once reloaded the order shows its new status and offers no change.
  await page.reload();
  await formReady(page);
  await expect(page.getByTestId('tracking-status')).toHaveText(/On its way/);
  await expect(
    page.getByText('What we have on your order. To change something, contact us.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request change →' })).toHaveCount(0);
  await expect(page.getByTestId('tracking-action')).toHaveCount(0);
});
