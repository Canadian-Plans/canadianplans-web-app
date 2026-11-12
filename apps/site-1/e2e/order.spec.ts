import { siteConfig } from '../src/site.config';
import { SEED_PLAN_IDS } from './crm-stub/state';
import { expect, test, type Page } from './fixtures';
import {
  CUSTOMER,
  PDF_FILE,
  PNG_FILE,
  acceptTermsAndPlaceOrder,
  chooseSimPlan,
  continueFromDetails,
  continueFromDocuments,
  declineCookies,
  fillSimDetails,
  formReady,
  orderReference,
  reachSimReview,
  selectPlan,
  visit,
} from './journeys';
import { LEADS_PATH, PLANS_PATH, stub } from './stub';

/**
 * The order journeys, in a real browser against the built storefront and the
 * CRM stub (`e2e/crm-stub`): what the customer sees at each step, and what the
 * CRM's website API received for it.
 */

const { consentVersion, termsVersion, creditCheckConsentVersion } = siteConfig.legal;

/** A request body's `form.payload`; empty when it has none. */
function payloadOf(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || !('form' in body)) return {};
  const form = body.form;
  if (typeof form !== 'object' || form === null || !('payload' in form)) return {};
  const payload = form.payload;
  return typeof payload === 'object' && payload !== null ? { ...payload } : {};
}

function field(body: unknown, key: string): unknown {
  return typeof body === 'object' && body !== null ? Reflect.get(body, key) : undefined;
}

test.beforeEach(async ({ page }) => {
  await declineCookies(page);
});

test.describe('pre-arrival SIM order', () => {
  test('plan, details, documents, review and confirmation; the CRM receives a sim_order', async ({
    page,
  }) => {
    // Plan: the category chooser, then the plan list.
    await visit(page, '/order');
    await page.getByRole('link', { name: 'See plans for Pre-arrival eSIM' }).click();
    await expect(page.getByText('Students arriving this term')).toBeVisible();
    await expect(page.getByText('50 GB data')).toBeVisible();
    await selectPlan(page, 'E2E Passport Plan');

    // Details: saved as a draft in the CRM.
    await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
    await fillSimDetails(page);
    await continueFromDetails(page);

    // Documents: a wrong type is refused in the browser, before anything is sent.
    const passport = page.getByLabel('Passport', { exact: true });
    const visa = page.getByLabel('Visa or permit', { exact: true });
    await passport.setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('TEST ONLY'),
    });
    await expect(page.getByText('Choose a PDF, JPG or PNG file.')).toBeVisible();
    // A file that only claims to be a PNG is refused by the CRM's signature check.
    await passport.setInputFiles({
      name: 'not-really.png',
      mimeType: 'image/png',
      buffer: Buffer.from('TEST ONLY: not an image'),
    });
    await expect(
      page.getByText('That file could not be verified as a PDF, JPG or PNG. Please re-upload.'),
    ).toBeVisible();
    // A real PDF and a real PNG go through the signed PUT and the finalize check.
    await passport.setInputFiles(PDF_FILE);
    await expect(page.getByText('Uploaded passport.pdf. Verified.')).toBeVisible();
    await visa.setInputFiles(PNG_FILE);
    await expect(page.getByText('Uploaded visa.png. Verified.')).toBeVisible();
    await continueFromDocuments(page);

    // Review: the plan's price, read from the CRM.
    await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
    await expect(page.getByText('E2E Passport Plan, per 30 days')).toBeVisible();
    await expect(page.getByText('$45.00')).toHaveCount(2);
    await expect(page.getByText(CUSTOMER.email)).toBeVisible();
    // Values read as a person writes them: a long date, and the phone with its country code.
    await expect(page.getByText('January 15, 2027', { exact: true })).toBeVisible();
    await expect(page.getByText(`${CUSTOMER.phone} (${CUSTOMER.countryCode})`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change plan' })).toBeVisible();
    // The terms are one click away from the checkbox that accepts them.
    await expect(page.getByRole('link', { name: 'terms (opens in a new tab)' })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(await stub.leads()).toMatchObject([{ leadType: 'sim_order', status: 'incomplete' }]);

    await acceptTermsAndPlaceOrder(page);
    const reference = await orderReference(page);
    expect(reference).toMatch(/^MS-\d+$/);
    await expect(
      page.getByText(`We've emailed a confirmation to ${CUSTOMER.email}.`),
    ).toBeVisible();
    // The confirmation offers the next step.
    await expect(page.getByRole('link', { name: 'Track this order' })).toHaveAttribute(
      'href',
      '/track',
    );
    await expect(page.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');

    // What the CRM received.
    const leads = await stub.leads();
    expect(leads).toHaveLength(1);
    const lead = leads[0];
    expect(lead).toMatchObject({
      leadType: 'sim_order',
      status: 'submitted',
      externalRef: reference,
      order: { planId: SEED_PLAN_IDS.simPassport, quantity: 1 },
      contact: {
        fullName: CUSTOMER.fullName,
        email: CUSTOMER.email,
        phone: CUSTOMER.phone,
        countryCode: CUSTOMER.countryCode,
      },
      form: {
        schemaVersion: 1,
        payload: {
          planId: 'e2e-passport',
          planLabel: 'E2E Passport Plan',
          delivery: 'esim',
          arrivalDate: CUSTOMER.arrivalDate,
          canadaAddress: CUSTOMER.destination,
          currentCountry: CUSTOMER.currentCountry,
        },
      },
      // The privacy version on the draft; privacy and terms on the submission.
      consentVersions: [consentVersion, `${consentVersion};${termsVersion}`],
      attribution: { landingPath: '/order' },
      files: [
        { documentType: 'passport', contentType: 'application/pdf' },
        { documentType: 'visa', contentType: 'image/png' },
      ],
    });
    expect(Object.keys(lead?.form?.payload ?? {}).sort()).toEqual([
      'arrivalDate',
      'canadaAddress',
      'currentCountry',
      'delivery',
      'planId',
      'planLabel',
    ]);

    // One draft save, one submission; each call carried its own proof, and the
    // submission an idempotency key. No request ever carried a price.
    const writes = await stub.leadWrites();
    expect(writes.map((write) => [write.method, write.status, write.botAction])).toEqual([
      ['POST', 201, 'lead-save'],
      ['PATCH', 200, 'lead-save'],
    ]);
    expect(writes[0]?.idempotencyKey).toBeNull();
    expect(field(writes[0]?.body, 'submit')).toBeUndefined();
    expect(writes[1]?.idempotencyKey).toMatch(/^order-[0-9a-f-]{36}$/);
    expect(field(writes[1]?.body, 'submit')).toBe(true);
    const requests = await stub.requests();
    expect(JSON.stringify(requests.map((request) => request.body))).not.toMatch(/price|amount/i);
    const uploads = requests.filter((request) => request.path.includes('/uploads/'));
    expect(uploads.map((upload) => [upload.botAction, upload.status])).toEqual([
      ['upload-intent', 201],
      ['upload-finalize', 422],
      ['upload-intent', 201],
      ['upload-finalize', 200],
      ['upload-intent', 201],
      ['upload-finalize', 200],
    ]);
  });

  test('a campaign link straight to a plan records its attribution on the draft', async ({
    page,
  }) => {
    // Static pages link by the plan's stable key, not its CRM id.
    await visit(
      page,
      '/order?plan=e2e-passport&utm_source=e2e-newsletter&utm_medium=email&utm_campaign=arrival&partner=MAPLE10&utm_content=someone%40example.test',
    );
    await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
    await fillSimDetails(page);
    await continueFromDetails(page);

    const leads = await stub.leads();
    expect(leads).toHaveLength(1);
    expect(leads[0]?.order?.planId).toBe(SEED_PLAN_IDS.simPassport);
    // Only allowlisted keys, and never a value that looks like an email.
    expect(leads[0]?.attribution).toEqual({
      utmSource: 'e2e-newsletter',
      utmMedium: 'email',
      utmCampaign: 'arrival',
      partnerCode: 'MAPLE10',
      landingPath: '/order',
    });
  });

  test('a reload mid-draft restores the details without exposing the draft grant', async ({
    page,
    context,
  }) => {
    await chooseSimPlan(page);
    await fillSimDetails(page);
    await continueFromDetails(page);
    const cookie = (await context.cookies()).find((entry) => entry.name === 'cp_order_draft');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe('/order');

    await visit(page, '/order');
    await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
    await expect(page.getByLabel(/^Full name/)).toHaveValue(CUSTOMER.fullName);
    await expect(page.getByLabel(/^Email/)).toHaveValue(CUSTOMER.email);
    await expect(page.getByLabel(/^Country code/)).toHaveValue(CUSTOMER.countryCode);
    await expect(page.getByLabel(/^Phone/)).toHaveValue(CUSTOMER.phone);
    await expect(page.getByLabel(/^Country you are in now/)).toHaveValue(CUSTOMER.currentCountry);
    await expect(page.getByLabel(/^Destination in Canada/)).toHaveValue(CUSTOMER.destination);
    await expect(page.getByLabel(/^Arrival date/)).toHaveValue(CUSTOMER.arrivalDate);
    await expect(page.getByText('We found your saved details and will update them.')).toBeVisible();
    expect(await page.evaluate(() => document.cookie)).not.toContain('cp_order_draft');
    expect(await page.content()).not.toContain('dg_e2e_');

    // Editing a detail updates the same draft, then the same lead becomes the order.
    await page.getByLabel(/^Destination in Canada/).fill('Vancouver');
    await continueFromDetails(page);
    await continueFromDocuments(page);
    await acceptTermsAndPlaceOrder(page);
    const reference = await orderReference(page);
    const leads = await stub.leads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ status: 'submitted', externalRef: reference });
    expect(leads[0]?.form?.payload['canadaAddress']).toBe('Vancouver');
  });

  test('changing the plan mid-draft keeps one draft and orders the new plan', async ({ page }) => {
    await chooseSimPlan(page);
    await fillSimDetails(page);
    await continueFromDetails(page);

    // Another plan type never revives the saved plan or its details.
    await visit(page, '/order?category=mobile');
    await expect(page.getByRole('heading', { name: 'Your details' })).toHaveCount(0);
    await expect(page.getByLabel(/^Full name/)).toHaveCount(0);

    // Back to the plan step from the resumed draft, then another plan. It starts
    // with an empty form: the saved details belonged to the old plan.
    await visit(page, '/order');
    await expect(page.getByLabel(/^Full name/)).toHaveValue(CUSTOMER.fullName);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    // Back returns to the plan type being ordered, not to the type chooser.
    await expect(page.getByRole('heading', { name: 'Choose a plan' })).toBeVisible();
    await expect(page.getByText('What are you looking for?')).toHaveCount(0);
    await selectPlan(page, 'E2E Simple Plan');
    await expect(page).toHaveURL(new RegExp(`plan=${SEED_PLAN_IDS.simSimple}`));
    await expect(page.getByLabel(/^Full name/)).toHaveValue('');
    await expect(page.getByText('We found your saved details and will update them.')).toHaveCount(
      0,
    );
    await fillSimDetails(page);
    // A plan with no document checklist has no Documents step: details go straight to the review.
    await continueFromDetails(page, { documents: false });
    await expect(page.getByText('E2E Simple Plan, per 30 days')).toBeVisible();
    await expect(page.getByText('$25.00')).toHaveCount(2);
    await acceptTermsAndPlaceOrder(page);
    await orderReference(page);

    const leads = await stub.leads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      status: 'submitted',
      order: { planId: SEED_PLAN_IDS.simSimple },
      form: { payload: { planId: 'e2e-simple', planLabel: 'E2E Simple Plan' } },
    });
  });

  test('field errors are listed in a focused summary and clear as fields are corrected', async ({
    page,
  }) => {
    await chooseSimPlan(page);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    const summary = page.getByRole('alert').filter({ hasText: 'There is a problem' });
    await expect(summary).toBeFocused();
    for (const message of [
      'Enter your full name.',
      'Enter a valid email address.',
      'Enter your phone number.',
      'Use the two-letter code of your country, for example IN or BD.',
      'Enter the country you are in now.',
      'Enter your destination in Canada.',
      'Enter your arrival date.',
    ]) {
      await expect(summary.getByRole('link', { name: message })).toBeVisible();
    }
    // Each message is also on its field, which is marked invalid and described by it.
    const fullName = page.getByLabel(/^Full name/);
    await expect(fullName).toHaveAttribute('aria-invalid', 'true');
    await expect(fullName).toHaveAttribute('aria-describedby', 'order-full-name-error');
    await expect(page.locator('#order-full-name-error')).toHaveText('Enter your full name.');
    await expect(summary.getByRole('link', { name: 'Enter your full name.' })).toHaveAttribute(
      'href',
      '#order-full-name',
    );

    await fullName.fill(CUSTOMER.fullName);
    await expect(fullName).toHaveAttribute('aria-invalid', 'false');
    await expect(summary.getByRole('link', { name: 'Enter your full name.' })).toHaveCount(0);
    await page.getByLabel(/^Email/).fill('not-an-email');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.locator('#order-email-error')).toHaveText('Enter a valid email address.');
    await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
    // Nothing invalid reaches the CRM.
    expect(await stub.leadWrites()).toEqual([]);
  });

  test('the order cannot be placed without accepting the terms', async ({ page }) => {
    await reachSimReview(page);
    await page.getByRole('button', { name: 'Place order' }).click();
    const summary = page.getByRole('alert').filter({ hasText: 'There is a problem' });
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Please accept the terms to place the order.');
    await expect(page.getByLabel(/^I accept the terms/)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('heading', { name: 'Order received' })).toHaveCount(0);
    expect(await stub.leads()).toMatchObject([{ status: 'incomplete' }]);
  });

  test('a price that cannot be read offers a retry, and the retry reaches the review', async ({
    page,
  }) => {
    await chooseSimPlan(page);
    await fillSimDetails(page);
    await continueFromDetails(page);
    await stub.failNext({ method: 'GET', pathPrefix: PLANS_PATH, mode: { kind: 'transport' } });
    await continueFromDocuments(page);
    await expect(
      page.getByRole('heading', { name: "We couldn't confirm the price" }),
    ).toBeVisible();
    await expect(page.getByText("We couldn't load the current price for this plan.")).toBeVisible();
    await page.getByRole('button', { name: 'Try the price again' }).click();
    await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
    await expect(page.getByText('$45.00')).toHaveCount(2);
  });

  test('"Request a callback" saves a contact message and creates no order', async ({ page }) => {
    await chooseSimPlan(page);
    await fillSimDetails(page);
    await continueFromDetails(page);
    await stub.failNext({
      method: 'GET',
      pathPrefix: PLANS_PATH,
      mode: { kind: 'error', status: 503, code: 'persistence_unavailable' },
    });
    await continueFromDocuments(page);
    await expect(
      page.getByRole('heading', { name: "We couldn't confirm the price" }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Request a callback' }).click();
    await expect(page.getByRole('heading', { name: 'Callback requested' })).toBeVisible();
    await expect(page.getByText('No order has been created.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Order received' })).toHaveCount(0);

    const leads = await stub.leads();
    expect(leads.map((lead) => [lead.leadType, lead.status])).toEqual([
      ['sim_order', 'incomplete'],
      ['contact_message', 'submitted'],
    ]);
    expect(leads[1]).toMatchObject({
      contact: { fullName: CUSTOMER.fullName, email: CUSTOMER.email },
      form: {
        payload: {
          kind: 'callback_request',
          category: 'sim',
          planId: SEED_PLAN_IDS.simPassport,
        },
      },
      order: null,
      consentVersions: [consentVersion],
    });
  });

  test('serializes document uploads and releases the inputs when verification is cancelled', async ({
    page,
  }) => {
    await chooseSimPlan(page);
    await fillSimDetails(page);
    await continueFromDetails(page);
    // Hold the external provider, without changing the UI or the Server Actions.
    await page.evaluate(() => {
      const provider: unknown = Reflect.get(window, 'turnstile');
      if (!provider || typeof provider !== 'object' || !('execute' in provider))
        throw new Error('test provider missing');
      provider.execute = () => {};
    });
    const inputs = page.locator('input[type=file]');
    await expect(inputs).toHaveCount(2);
    await inputs.first().setInputFiles(PDF_FILE);
    await expect(inputs.first()).toBeDisabled();
    await expect(inputs.last()).toBeDisabled();
    await page.getByRole('button', { name: 'Cancel verification' }).click();
    await expect(inputs.first()).toBeEnabled();
    await expect(inputs.last()).toBeEnabled();
    await expect(page.getByRole('status').filter({ hasText: /security check/i })).toBeVisible();
    expect((await stub.requests()).filter((request) => request.path.includes('/uploads/'))).toEqual(
      [],
    );
  });
});

test.describe('internet order', () => {
  async function chooseInternetPlan(page: Page): Promise<void> {
    await visit(page, '/order');
    await page.getByRole('link', { name: 'See plans for Internet and TV' }).click();
    await page.getByLabel('Your province').selectOption({ label: 'Alberta' });
    await page.getByRole('button', { name: 'Show plans' }).click();
    await expect(page).toHaveURL(/province=AB/);
    await formReady(page);
    await selectPlan(page, 'E2E Internet 1 Gig');
    await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
    await formReady(page);
  }

  test('province, plan, details and review; nothing reaches the CRM before the one submit', async ({
    page,
  }) => {
    await chooseInternetPlan(page);
    // The province chosen in the picker is kept; only served provinces are offered.
    await expect(page.locator('#order-province')).toHaveValue('AB');
    await expect(page.locator('#order-province option')).toHaveText([
      'Choose your province',
      'Alberta',
      'British Columbia',
    ]);
    await page.getByLabel(/^Full name/).fill('Internet Customer');
    await page.getByLabel(/^Email/).fill('internet@example.test');
    await page.getByLabel(/^Phone/).fill('403 555 0123');
    await page.getByLabel(/^Date of birth/).fill('1990-05-15');
    await page.getByLabel(/^Street address/).fill('123 Main Street');
    await page.getByLabel(/^Apartment or unit/).fill('4B');
    await page.getByLabel(/^City/).fill('Calgary');

    // A postal code of another province would price the wrong plan.
    await page.getByLabel(/^Postal code/).fill('M5V 2T6');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.locator('#order-postal-code-error')).toHaveText(
      'That postal code is not in the province you chose.',
    );
    await page.getByLabel(/^Postal code/).fill('t2p1j9');
    // An order sent whole has no draft to attach a document to, so it has no Documents step.
    await continueFromDetails(page, { documents: false });
    await expect(page.getByText('E2E Internet 1 Gig, per month')).toBeVisible();
    await expect(page.getByText('$85.00')).toHaveCount(2);
    await expect(page.getByText('4B – 123 Main Street, Calgary, t2p1j9')).toBeVisible();

    // Up to here the CRM was only asked for its plans.
    expect(await stub.leadWrites()).toEqual([]);
    expect(await stub.leads()).toEqual([]);

    await acceptTermsAndPlaceOrder(page);
    const reference = await orderReference(page);

    const writes = await stub.leadWrites();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      method: 'POST',
      path: LEADS_PATH,
      status: 201,
      botAction: 'lead-save',
      body: { leadType: 'internet', submit: true, order: { planId: SEED_PLAN_IDS.internet } },
    });
    expect(writes[0]?.idempotencyKey).toMatch(/^order-[0-9a-f-]{36}$/);
    expect(Object.keys(payloadOf(writes[0]?.body)).sort()).toEqual([
      'aptUnit',
      'city',
      'consent',
      'consentedAt',
      'dateOfBirth',
      'planId',
      'planLabel',
      'postalCode',
      'streetAddress',
    ]);

    const leads = await stub.leads();
    expect(leads).toHaveLength(1);
    // The CRM gives an internet order no number, so the reference is the order's id.
    expect(leads[0]).toMatchObject({
      id: reference,
      leadType: 'internet',
      status: 'submitted',
      externalRef: null,
      contact: {
        fullName: 'Internet Customer',
        email: 'internet@example.test',
        phone: '403 555 0123',
        countryCode: 'CA',
      },
      form: {
        payload: {
          planId: 'e2e-internet-1g',
          planLabel: 'E2E Internet 1 Gig',
          postalCode: 'T2P 1J9',
          dateOfBirth: '1990-05-15',
          consent: true,
        },
      },
      consentVersions: [`${consentVersion};${termsVersion}`],
      attribution: { landingPath: '/order' },
    });
  });

  test('a province with no plans offers the wish list, saved as a contact message', async ({
    page,
  }) => {
    await visit(page, '/order?province=NS');
    await expect(
      page.getByText("We don't sell internet or TV in that province yet."),
    ).toBeVisible();
    const wishList = page.getByRole('form', { name: /Tell me when plans are available/ });
    await expect(wishList).toContainText('Nova Scotia');

    await wishList.getByLabel(/^Email/).fill('not-an-email');
    await wishList.getByRole('button', { name: 'Add me to the list' }).click();
    await expect(wishList.getByText('Enter a valid email address.')).toBeVisible();
    expect(await stub.leadWrites()).toEqual([]);

    await wishList.getByLabel(/^Email/).fill('wishlist@example.test');
    await wishList.getByRole('button', { name: 'Add me to the list' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Thank you.' })).toBeVisible();

    const leads = await stub.leads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      leadType: 'contact_message',
      status: 'submitted',
      contact: { email: 'wishlist@example.test' },
      form: { payload: { kind: 'region_waitlist', interest: 'internet', province: 'NS' } },
      order: null,
      consentVersions: [siteConfig.legal.waitlistConsentVersion],
    });
    expect((await stub.leadWrites())[0]?.botAction).toBe('lead-save');
  });
});

test.describe('mobile order', () => {
  test('plan, details and review; nothing reaches the CRM before the one submit', async ({
    page,
  }) => {
    await visit(page, '/order');
    await page
      .getByRole('link', { name: 'See plans for Mobile plans, bring your own phone' })
      .click();
    await selectPlan(page, 'E2E Mobile 50 GB');
    await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();

    // The answers with no default must be given.
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const summary = page.getByRole('alert').filter({ hasText: 'There is a problem' });
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Choose whether to keep your number.');
    await expect(summary).toContainText('Choose an eSIM or a physical SIM.');
    await expect(summary).toContainText('Please confirm we can use your ID for the credit check.');

    await page.getByLabel(/^How many lines/).fill('2');
    await page.getByLabel(/^Full name/).fill('Mobile Test Customer');
    await page.getByLabel(/^Email/).fill('mobile@example.test');
    await page.getByLabel(/^Phone/).fill('416 555 0123');
    await page.getByLabel(/^Current provider/).selectOption('Rogers');
    await page.getByLabel('Yes, keep my number').check();
    await page.getByLabel(/^eSIM \(digital/).check();
    await page.getByLabel(/^Street address/).fill('200 King Street West');
    await page.getByLabel(/^City/).fill('Toronto');
    await page.getByLabel(/^Postal code/).fill('M5V 2T6');
    await page.getByLabel(/^I agree that my ID can be used/).check();
    // A mobile order has no Documents step: the details go straight to the review.
    await continueFromDetails(page, { documents: false });
    await expect(page.getByText('E2E Mobile 50 GB, per month')).toBeVisible();
    await expect(page.getByText('$40.00')).toHaveCount(2);

    expect(await stub.leadWrites()).toEqual([]);
    await acceptTermsAndPlaceOrder(page);
    const reference = await orderReference(page);

    const writes = await stub.leadWrites();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      method: 'POST',
      path: LEADS_PATH,
      status: 201,
      body: { leadType: 'mobility', submit: true, order: { planId: SEED_PLAN_IDS.mobile } },
    });
    expect(writes[0]?.idempotencyKey).toMatch(/^order-[0-9a-f-]{36}$/);

    const leads = await stub.leads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      id: reference,
      leadType: 'mobility',
      status: 'submitted',
      contact: { fullName: 'Mobile Test Customer', email: 'mobile@example.test' },
      form: {
        payload: {
          planId: 'e2e-mobile-50',
          planLabel: 'E2E Mobile 50 GB',
          firstName: 'Mobile',
          lastName: 'Test Customer',
          lineCount: 2,
          keepNumber: true,
          simType: 'esim',
          currentProvider: 'Rogers',
          streetAddress: '200 King Street West',
          city: 'Toronto',
          postalCode: 'M5V 2T6',
        },
      },
      // Privacy, terms and the credit-check consent, as one recorded value.
      consentVersions: [`${consentVersion};${termsVersion};${creditCheckConsentVersion}`],
    });
  });
});

test.describe('when the CRM cannot be reached', () => {
  for (const [name, mode] of [
    ['is unreachable', { kind: 'transport' }],
    ['answers 503', { kind: 'error', status: 503, code: 'persistence_unavailable' }],
  ] as const) {
    test(`the plan list says plans are unavailable when the CRM ${name}`, async ({ page }) => {
      await stub.failNext({ method: 'GET', pathPrefix: PLANS_PATH, mode });
      const response = await page.goto('/order');
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole('heading', { name: 'Plans are unavailable right now' }),
      ).toBeVisible();
      await expect(page.getByText('No order has been created.')).toBeVisible();
      await expect(page.getByRole('link', { name: /^Select plan/ })).toHaveCount(0);
      // The way forward, in the page itself: try again, or reach us.
      const main = page.getByRole('main');
      await expect(main.getByRole('link', { name: 'Try again' })).toHaveAttribute('href', '/order');
      await expect(main.getByRole('link', { name: 'Contact us' })).toHaveAttribute(
        'href',
        '/contact',
      );

      await page.reload();
      await expect(page.getByRole('heading', { name: 'Choose a plan' })).toBeVisible();
    });
  }
});

test.describe('security check and connection problems', () => {
  test.describe('a failed security check', () => {
    test.use({ turnstileFailures: 1 });
    test('keeps the details and obtains a fresh proof on the next try', async ({ page }) => {
      await chooseSimPlan(page);
      await fillSimDetails(page);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect(
        page.getByText('We could not complete the security check. Please try again.'),
      ).toBeVisible();
      expect(await stub.leadWrites()).toEqual([]);
      await expect(page.getByLabel(/^Full name/)).toHaveValue(CUSTOMER.fullName);
      await continueFromDetails(page);
      expect(await stub.leads()).toHaveLength(1);
    });
  });

  test('an unreachable server action is a connection problem, not a failed check', async ({
    page,
  }) => {
    await chooseSimPlan(page);
    let dropped = false;
    await page.route('**/order**', async (route) => {
      // Server Actions POST to the page with a `next-action` header.
      if (
        !dropped &&
        route.request().method() === 'POST' &&
        route.request().headers()['next-action']
      ) {
        dropped = true;
        await route.abort('connectionreset');
        return;
      }
      await route.continue();
    });
    await fillSimDetails(page);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(
      page.getByText("We couldn't reach our servers. Check your connection and try again."),
    ).toBeVisible();
    await expect(page.getByText(/could not complete the security check/i)).toHaveCount(0);
    await expect(page.getByLabel(/^Full name/)).toHaveValue(CUSTOMER.fullName);
    await continueFromDetails(page);
  });
});
