import { z } from 'zod';

import { SEED_PLAN_IDS } from './crm-stub/state';
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
  reachSimReview,
  visit,
} from './journeys';
import { LEADS_PATH, stub } from './stub';

/**
 * Order integrity: however a submission goes wrong, the customer ends with
 * exactly one order or none, at the CRM's own price, and is never shown a
 * success that did not happen. Each case drives the real storefront and reads
 * back what the CRM stub received.
 */

const RETRY_MESSAGE = 'We could not confirm your order. Try again to check the same submission.';
const submitted = (leads: Awaited<ReturnType<typeof stub.leads>>) =>
  leads.filter((lead) => lead.status === 'submitted');

async function fillInternetOrderToReview(page: Page): Promise<void> {
  await visit(page, `/order?plan=${SEED_PLAN_IDS.internet}&province=AB`);
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await page.getByLabel(/^Full name/).fill('Internet Customer');
  await page.getByLabel(/^Email/).fill('internet@example.test');
  await page.getByLabel(/^Phone/).fill('403 555 0123');
  await page.getByLabel(/^Date of birth/).fill('1990-05-15');
  await page.getByLabel(/^Street address/).fill('123 Main Street');
  await page.getByLabel(/^City/).fill('Calgary');
  await page.getByLabel(/^Postal code/).fill('T2P 1J9');
  await continueFromDetails(page);
  await continueFromDocuments(page);
  await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await declineCookies(page);
});

test.describe('a submission the storefront cannot confirm', () => {
  test('a lost answer is retried under the same key and gives one SIM order', async ({ page }) => {
    await reachSimReview(page);
    // The CRM saves the order, then the connection drops before its answer.
    await stub.failNext({
      method: 'PATCH',
      pathPrefix: LEADS_PATH,
      mode: { kind: 'drop_response' },
    });
    await acceptTermsAndPlaceOrder(page);
    const reference = await orderReference(page);

    const submits = (await stub.leadWrites()).filter((write) => write.method === 'PATCH');
    expect(submits.map((write) => write.status)).toEqual([0, 200]);
    expect(submits[0]?.idempotencyKey).toMatch(/^order-/);
    expect(submits[1]?.idempotencyKey).toBe(submits[0]?.idempotencyKey);
    // The same body both times, so the CRM answers with the order it already made.
    expect(submits[1]?.body).toEqual(submits[0]?.body);
    const leads = await stub.leads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ status: 'submitted', externalRef: reference });
  });

  for (const [name, mode] of [
    ['never arrived', { kind: 'transport' }],
    ['was saved but its answer was lost', { kind: 'drop_response' }],
  ] as const) {
    test(`an internet submission that ${name} is retried under the same key: one order`, async ({
      page,
    }) => {
      await fillInternetOrderToReview(page);
      await stub.failNext({ method: 'POST', pathPrefix: LEADS_PATH, mode });
      await acceptTermsAndPlaceOrder(page);
      const reference = await orderReference(page);

      const writes = await stub.leadWrites();
      expect(writes.map((write) => [write.method, write.status])).toEqual([
        ['POST', 0],
        ['POST', 201],
      ]);
      expect(writes[0]?.idempotencyKey).toMatch(/^order-/);
      expect(writes[1]?.idempotencyKey).toBe(writes[0]?.idempotencyKey);
      // `consentedAt` is kept from the first attempt, so the retry is the same body.
      expect(writes[1]?.body).toEqual(writes[0]?.body);
      const leads = await stub.leads();
      expect(leads).toHaveLength(1);
      expect(leads[0]).toMatchObject({ id: reference, leadType: 'internet', status: 'submitted' });
    });
  }

  test('two lost answers never show success; "Try again" finds the same order', async ({
    page,
  }) => {
    await reachSimReview(page);
    await stub.failNext({
      method: 'PATCH',
      pathPrefix: LEADS_PATH,
      mode: { kind: 'drop_response' },
      times: 2,
    });
    await acceptTermsAndPlaceOrder(page);

    await expect(page.getByText(RETRY_MESSAGE).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Order received' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Try again' }).click();
    const reference = await orderReference(page);

    const submits = (await stub.leadWrites()).filter((write) => write.method === 'PATCH');
    expect(submits.map((write) => write.status)).toEqual([0, 0, 200]);
    expect(new Set(submits.map((write) => write.idempotencyKey)).size).toBe(1);
    const leads = await stub.leads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ status: 'submitted', externalRef: reference });
  });

  test('a changed submission under a used key is a conflict: the order stands, no second one', async ({
    page,
  }) => {
    // A draft resumed on a later visit, so the page has no plan in its address.
    await chooseSimPlan(page);
    await fillSimDetails(page);
    await continueFromDetails(page);
    await visit(page, '/order');
    await continueFromDetails(page);
    await continueFromDocuments(page);
    await stub.failNext({
      method: 'PATCH',
      pathPrefix: LEADS_PATH,
      mode: { kind: 'drop_response' },
      times: 2,
    });
    await acceptTermsAndPlaceOrder(page);
    await expect(page.getByText(RETRY_MESSAGE).first()).toBeVisible();

    // The plan is renamed in the CRM, so the next attempt's form differs.
    const plans = await stub.plans();
    await stub.setPlans(
      plans.map((plan) =>
        plan.id === SEED_PLAN_IDS.simPassport ? { ...plan, name: 'E2E Passport Plan Plus' } : plan,
      ),
    );
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(
      page.getByText(/^We already received an order for these details\./).first(),
    ).toBeVisible();
    // Retrying with this key can only conflict again, so no retry is offered.
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Order received' })).toHaveCount(0);

    const submits = (await stub.leadWrites()).filter((write) => write.method === 'PATCH');
    expect(submits.at(-1)?.status).toBe(409);
    const leads = await stub.leads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      status: 'submitted',
      form: { payload: { planLabel: 'E2E Passport Plan' } },
    });
  });

  test('a 503 on submit says the order was not saved; the deliberate retry places it once', async ({
    page,
  }) => {
    await reachSimReview(page);
    await stub.failNext({
      method: 'PATCH',
      pathPrefix: LEADS_PATH,
      mode: { kind: 'error', status: 503, code: 'persistence_unavailable' },
    });
    await acceptTermsAndPlaceOrder(page);
    await expect(
      page.getByText('Your order was not saved. Please try again.').first(),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Order received' })).toHaveCount(0);
    expect(submitted(await stub.leads())).toEqual([]);

    await page.getByRole('button', { name: 'Try again' }).click();
    const reference = await orderReference(page);
    const leads = await stub.leads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ status: 'submitted', externalRef: reference });
  });
});

test.describe('a plan that changes in the CRM mid-checkout', () => {
  test('the review shows the price the CRM has now; the browser never names one', async ({
    page,
  }) => {
    await chooseSimPlan(page);
    await expect(page.getByText('We found your saved details')).toHaveCount(0);
    await fillSimDetails(page);
    await continueFromDetails(page);
    const plans = await stub.plans();
    await stub.setPlans(
      plans.map((plan) =>
        plan.id === SEED_PLAN_IDS.simPassport ? { ...plan, priceMinor: 5500 } : plan,
      ),
    );
    await continueFromDocuments(page);
    await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
    await expect(page.getByText('$55.00')).toHaveCount(2);
    await expect(page.getByText('$45.00')).toHaveCount(0);
    await acceptTermsAndPlaceOrder(page);
    await orderReference(page);
    const bodies = JSON.stringify((await stub.requests()).map((request) => request.body));
    expect(bodies).not.toMatch(/price|amount|4500|5500/i);
  });

  test('a plan withdrawn before the review is reported there; no order is placed', async ({
    page,
  }) => {
    await chooseSimPlan(page);
    await fillSimDetails(page);
    await continueFromDetails(page);
    await stub.setPlans(
      (await stub.plans()).filter((plan) => plan.id !== SEED_PLAN_IDS.simPassport),
    );
    await continueFromDocuments(page);
    await expect(
      page
        .getByText('That plan is no longer available. Choose another plan or request a callback.')
        .first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Place order' })).toHaveCount(0);
    expect(submitted(await stub.leads())).toEqual([]);
  });

  test('a plan withdrawn before submit is refused; the draft stays a draft', async ({ page }) => {
    await reachSimReview(page);
    await stub.setPlans(
      (await stub.plans()).filter((plan) => plan.id !== SEED_PLAN_IDS.simPassport),
    );
    await acceptTermsAndPlaceOrder(page);
    await expect(page.getByText('That plan is no longer available.').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Order received' })).toHaveCount(0);
    expect(await stub.leads()).toMatchObject([{ leadType: 'sim_order', status: 'incomplete' }]);
    // The storefront checked the plan list itself and sent no submission.
    expect((await stub.leadWrites()).filter((write) => write.method === 'PATCH')).toEqual([]);
  });

  test('an internet plan withdrawn before submit is refused and nothing is sent', async ({
    page,
  }) => {
    await fillInternetOrderToReview(page);
    await stub.setPlans((await stub.plans()).filter((plan) => plan.id !== SEED_PLAN_IDS.internet));
    await acceptTermsAndPlaceOrder(page);
    await expect(
      page
        .getByText(
          "That plan isn't sold in the province you chose. Choose another plan or province.",
        )
        .first(),
    ).toBeVisible();
    expect(await stub.leadWrites()).toEqual([]);
  });
});

test.describe('a draft that can no longer be edited', () => {
  for (const [name, invalidate] of [
    ['expired', () => stub.expireDraftGrants()],
    ['unknown to the CRM', () => stub.reset()],
  ] as const) {
    test(`a draft that is ${name} prefills nothing and a fresh one is started`, async ({
      page,
    }) => {
      await chooseSimPlan(page);
      await fillSimDetails(page);
      await continueFromDetails(page);
      const firstLeads = await stub.leads();
      await invalidate();

      // The saved details are not shown again, and no plan is revived.
      await visit(page, '/order');
      await expect(page.getByRole('heading', { name: 'Choose a plan' })).toBeVisible();
      await expect(page.getByLabel(/^Full name/)).toHaveCount(0);
      await expect(page.getByText(CUSTOMER.email)).toHaveCount(0);

      // Ordering again starts a new draft instead of dead-ending on the old cookie.
      await chooseSimPlan(page);
      await expect(page.getByLabel(/^Full name/)).toHaveValue('');
      await fillSimDetails(page, { fullName: 'Second Attempt' });
      await continueFromDetails(page);
      await continueFromDocuments(page);
      await acceptTermsAndPlaceOrder(page);
      const reference = await orderReference(page);

      const leads = await stub.leads();
      const order = leads.find((lead) => lead.externalRef === reference);
      expect(order).toMatchObject({ status: 'submitted', contact: { fullName: 'Second Attempt' } });
      expect(order?.id).not.toBe(firstLeads[0]?.id);
      expect(submitted(leads)).toHaveLength(1);
      // The refused save is what started the fresh draft.
      const writes = await stub.leadWrites();
      expect(writes.map((write) => [write.method, write.status])).toEqual(
        expect.arrayContaining([
          ['PATCH', 401],
          ['POST', 201],
        ]),
      );
    });
  }

  test('a second purchase after an order starts a fresh draft, key and order number', async ({
    page,
  }) => {
    await chooseSimPlan(page);
    const planUrl = page.url();
    await fillSimDetails(page);
    await continueFromDetails(page);
    await continueFromDocuments(page);
    await acceptTermsAndPlaceOrder(page);
    const first = await orderReference(page);

    await visit(page, planUrl);
    await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
    // The order's details are not shown again once it is placed.
    await expect(page.getByLabel(/^Full name/)).toHaveValue('');
    await fillSimDetails(page);
    await continueFromDetails(page);
    await continueFromDocuments(page);
    await acceptTermsAndPlaceOrder(page);
    const second = await orderReference(page);
    expect(second).not.toBe(first);

    const leads = await stub.leads();
    expect(leads.map((lead) => [lead.status, lead.externalRef])).toEqual([
      ['submitted', first],
      ['submitted', second],
    ]);
    const keys = (await stub.leadWrites())
      .filter((write) => write.method === 'PATCH' && write.status === 200)
      .map((write) => write.idempotencyKey);
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  test('a forged draft grant reads nothing and edits nothing of the lead it names', async ({
    page,
    context,
  }) => {
    await chooseSimPlan(page);
    await fillSimDetails(page, { fullName: 'Original Customer' });
    await continueFromDetails(page);
    const cookie = (await context.cookies()).find((entry) => entry.name === 'cp_order_draft');
    if (!cookie) throw new Error('draft cookie missing');
    const draft = z
      .looseObject({ leadId: z.string(), draftGrant: z.string() })
      .parse(JSON.parse(decodeURIComponent(cookie.value)));
    await context.clearCookies({ name: 'cp_order_draft' });
    await context.addCookies([
      {
        ...cookie,
        value: encodeURIComponent(JSON.stringify({ ...draft, draftGrant: 'dg_e2e_forged-grant' })),
      },
    ]);

    await visit(page, '/order');
    await expect(page.getByLabel(/^Full name/)).toHaveCount(0);
    expect(await page.content()).not.toContain('Original Customer');

    await chooseSimPlan(page);
    await fillSimDetails(page, { fullName: 'Someone Else' });
    await continueFromDetails(page);
    const leads = await stub.leads();
    expect(leads).toHaveLength(2);
    expect(leads[0]).toMatchObject({
      id: draft.leadId,
      status: 'incomplete',
      contact: { fullName: 'Original Customer' },
    });
    expect(leads[1]?.contact['fullName']).toBe('Someone Else');
  });
});
