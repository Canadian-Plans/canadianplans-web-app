import { promises as fs } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

/**
 * A2 — Phase A gates 3 and 4 (REQUIREMENTS.md §16).
 *
 * The full customer spine — browser → lead → quote → order → admin processing —
 * plus the launch-critical negative cases, run against the REAL backend booted
 * by the e2e harness (apps/backend/tests/e2e/harness.ts): real HTTP routes,
 * real Postgres with RLS, real lead/quote/order transactions, the real staff
 * authorization store and the real outbox runner and job store. The harness's
 * bounded test seams (documented in that file) let a spec change a CMS price,
 * withdraw an offer, switch the quote-withdrawal policy and force an email
 * delivery to fail — each still through the real code path.
 *
 * The admin-processing leg is exercised against the real `/api/v1/staff` API on
 * the same backend, authenticated as one seeded, fully-privileged (owner, aal2)
 * staff actor via the harness's stub session verifier.
 *
 * Scenarios (task A2):
 *  1. Full journey + admin processing (gate 3/4 spine).
 *  2. Retry after a simulated timeout returns the same reference (gate 3).
 *  3. A forged draft grant is rejected and creates no order (gate 3).
 *  4. A CMS price change mid-checkout leaves the accepted order unchanged while
 *     new quotes move (gate 4).
 *  5. Offer withdrawal obeys each configured TEST policy, and production priced
 *     checkout stays gated while OPEN_INPUTS #14 is unresolved.
 *  6. A forced email failure leaves the order intact and the job failed and
 *     visible; the admin retry then delivers it (gate 3 durability).
 */

const HARNESS_URL = process.env['E2E_HARNESS_URL'] ?? 'http://127.0.0.1:4100';
const STAFF_BEARER = process.env['E2E_STAFF_BEARER'] ?? 'e2e-staff-session-owner-aal2';
const WORKSPACE_ID = process.env['E2E_WORKSPACE_ID'] ?? '10000000-0000-4000-8000-000000000e01';

// Harness fixture prices (apps/backend/tests/e2e/harness.ts). The passport plan
// charges a recurring fee plus a one-time activation fee; the order snapshot
// total is their sum.
const ACTIVATION_FEE_MINOR = 1_000;
const ORIGINAL_RECURRING_MINOR = 3_500;
const ORIGINAL_TOTAL_MINOR = ORIGINAL_RECURRING_MINOR + ACTIVATION_FEE_MINOR; // 4_500
const CHANGED_RECURRING_MINOR = 9_900;
const CHANGED_TOTAL_MINOR = CHANGED_RECURRING_MINOR + ACTIVATION_FEE_MINOR; // 10_900

const DRAFT_COOKIE = 'cp_order_draft';
const EVIDENCE_DIR = path.join(process.cwd(), 'e2e-evidence', 'a2');

// ---------------------------------------------------------------------------
// Harness control plane
// ---------------------------------------------------------------------------

async function control(pathAndQuery: string): Promise<unknown> {
  const response = await fetch(`${HARNESS_URL}${pathAndQuery}`, { method: 'POST' });
  expect(response.ok, `control ${pathAndQuery} failed (${response.status})`).toBe(true);
  return response.json();
}

/** Reads the failed/completed counts from a `run-outbox` summary. */
function outboxCounts(value: unknown): { failed: number; completed: number } {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('failed' in value) ||
    !('completed' in value)
  ) {
    throw new Error('unexpected outbox summary');
  }
  const { failed, completed } = value;
  if (typeof failed !== 'number' || typeof completed !== 'number') {
    throw new Error('unexpected outbox summary');
  }
  return { failed, completed };
}

interface OrderList {
  count: number;
  references: string[];
}

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

interface OrderSnapshot {
  found: boolean;
  status?: string;
  paymentState?: string;
  totalMinor?: number | null;
  amountPayableTodayMinor?: number | null;
}

function readSnapshot(value: unknown): OrderSnapshot {
  if (typeof value !== 'object' || value === null || !('found' in value)) {
    throw new Error('unexpected snapshot payload');
  }
  const found = value.found === true;
  const status = 'status' in value && typeof value.status === 'string' ? value.status : undefined;
  const paymentState =
    'paymentState' in value && typeof value.paymentState === 'string'
      ? value.paymentState
      : undefined;
  const totalMinor =
    'totalMinor' in value && typeof value.totalMinor === 'number' ? value.totalMinor : undefined;
  const amountPayableTodayMinor =
    'amountPayableTodayMinor' in value && typeof value.amountPayableTodayMinor === 'number'
      ? value.amountPayableTodayMinor
      : undefined;
  return { found, status, paymentState, totalMinor, amountPayableTodayMinor };
}

async function orderSnapshot(reference: string): Promise<OrderSnapshot> {
  const response = await fetch(
    `${HARNESS_URL}/__e2e__/order-snapshot?reference=${encodeURIComponent(reference)}`,
  );
  return readSnapshot(await response.json());
}

// ---------------------------------------------------------------------------
// Real staff API (admin-processing leg)
// ---------------------------------------------------------------------------

async function staff(pathAndQuery: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${HARNESS_URL}/api/v1/staff${pathAndQuery}`, {
    ...init,
    headers: { authorization: `Bearer ${STAFF_BEARER}`, ...init.headers },
  });
}

interface StaffOrderRow {
  id: string;
  reference: string;
  fulfilmentStatus?: string;
}

function readStaffOrders(value: unknown): StaffOrderRow[] {
  if (typeof value !== 'object' || value === null || !('orders' in value)) {
    throw new Error('unexpected staff orders payload');
  }
  const { orders: list } = value;
  if (!Array.isArray(list)) throw new Error('unexpected staff orders payload');
  const rows: StaffOrderRow[] = [];
  for (const entry of list) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('id' in entry) ||
      !('reference' in entry)
    ) {
      throw new Error('unexpected staff order row');
    }
    const { id, reference } = entry;
    if (typeof id !== 'string' || typeof reference !== 'string') {
      throw new Error('unexpected staff order row');
    }
    const fulfilmentStatus =
      'fulfilmentStatus' in entry && typeof entry.fulfilmentStatus === 'string'
        ? entry.fulfilmentStatus
        : undefined;
    rows.push({ id, reference, fulfilmentStatus });
  }
  return rows;
}

interface StaffJob {
  id: string;
  jobType: string;
  status: string;
}

function readStaffJobs(value: unknown): StaffJob[] {
  if (typeof value !== 'object' || value === null || !('jobs' in value)) {
    throw new Error('unexpected staff jobs payload');
  }
  const { jobs } = value;
  if (!Array.isArray(jobs)) throw new Error('unexpected staff jobs payload');
  const rows: StaffJob[] = [];
  for (const entry of jobs) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('id' in entry) ||
      !('jobType' in entry) ||
      !('status' in entry)
    ) {
      throw new Error('unexpected staff job row');
    }
    const { id, jobType, status } = entry;
    if (typeof id !== 'string' || typeof jobType !== 'string' || typeof status !== 'string') {
      throw new Error('unexpected staff job row');
    }
    rows.push({ id, jobType, status });
  }
  return rows;
}

async function findStaffOrder(reference: string): Promise<StaffOrderRow> {
  const response = await staff(`/workspaces/${WORKSPACE_ID}/orders?pageSize=50`);
  expect(response.ok, `staff orders list failed (${response.status})`).toBe(true);
  const rows = readStaffOrders(await response.json());
  const match = rows.find((row) => row.reference === reference);
  if (!match) throw new Error(`order ${reference} not visible to staff`);
  return match;
}

async function staffJobs(): Promise<StaffJob[]> {
  const response = await staff(`/workspaces/${WORKSPACE_ID}/jobs`);
  expect(response.ok, `staff jobs list failed (${response.status})`).toBe(true);
  return readStaffJobs(await response.json());
}

// ---------------------------------------------------------------------------
// Evidence capture (surfaced from the green run as the `a2-evidence` artifact)
// ---------------------------------------------------------------------------

async function shot(page: Page, info: TestInfo, name: string): Promise<void> {
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
  const file = path.join(EVIDENCE_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await info.attach(name, { path: file, contentType: 'image/png' });
}

async function note(info: TestInfo, name: string, body: unknown): Promise<void> {
  await info.attach(name, {
    body: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
    contentType: 'application/json',
  });
}

// ---------------------------------------------------------------------------
// Page helpers (the customer journey)
// ---------------------------------------------------------------------------

async function choosePassportPlan(page: Page): Promise<void> {
  await page.goto('/order');
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

/** Drives the browser to the review step, where a quote has been issued. */
async function reachReview(page: Page): Promise<void> {
  await choosePassportPlan(page);
  await fillDetailsAndContinue(page);
  await acknowledgeDocuments(page);
  await expect(page.getByRole('heading', { name: 'Review and confirm' })).toBeVisible();
}

async function placeOrder(page: Page): Promise<void> {
  await page.getByLabel(/I accept the terms/i).check();
  await page.getByRole('button', { name: 'Place order' }).click();
}

async function referenceText(page: Page): Promise<string> {
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  return (await page.getByTestId('order-reference').innerText()).trim();
}

test.beforeEach(async () => {
  await control('/__e2e__/reset');
});

// ---------------------------------------------------------------------------
// 1. Full journey + admin processing
// ---------------------------------------------------------------------------

test('the full journey reaches admin: browser → lead → quote → order → staff processing', async ({
  page,
}, info) => {
  const before = await orders();

  await reachReview(page);
  await placeOrder(page);
  const reference = await referenceText(page);
  await shot(page, info, '01-order-received');

  const after = await orders();
  expect(after.count).toBe(before.count + 1);
  expect(after.references).toContain(reference);

  // The snapshot froze the offer at quote time, with the terms version recorded.
  const snapshot = await orderSnapshot(reference);
  expect(snapshot.found).toBe(true);
  expect(snapshot.status).toBe('submitted');
  expect(snapshot.totalMinor).toBe(ORIGINAL_TOTAL_MINOR);

  // Admin-processing leg: the order is visible to staff on the real staff API.
  const staffOrder = await findStaffOrder(reference);
  const detail = await staff(`/workspaces/${WORKSPACE_ID}/orders/${staffOrder.id}`);
  expect(detail.ok, `order detail failed (${detail.status})`).toBe(true);
  await note(info, '01-staff-order-detail', await detail.clone().json());

  // The outbox delivers the acknowledgement + analytics jobs; nothing fails.
  const summary = outboxCounts(await control('/__e2e__/run-outbox'));
  expect(summary.failed).toBe(0);
  expect(summary.completed).toBe(2);
  const jobs = await staffJobs();
  expect(jobs.some((job) => job.status === 'failed')).toBe(false);
  await note(info, '01-outbox-summary', summary);
});

// ---------------------------------------------------------------------------
// 2. Retry after a simulated timeout returns the same reference
// ---------------------------------------------------------------------------

test('a dropped response is retried with the same key and returns one order', async ({
  page,
}, info) => {
  const before = await orders();
  // The first order POST commits upstream, then its response is dropped; the
  // action retries once with the SAME idempotency key.
  await control('/__e2e__/drop-next-orders?count=1');

  await reachReview(page);
  await placeOrder(page);
  const reference = await referenceText(page);
  await shot(page, info, '02-retry-same-reference');

  const after = await orders();
  // Exactly one order exists, and it is the reference the customer was shown.
  expect(after.count).toBe(before.count + 1);
  expect(after.references).toContain(reference);
});

// ---------------------------------------------------------------------------
// 3. A forged draft grant is rejected and creates no order
// ---------------------------------------------------------------------------

test('a forged draft grant is rejected and no order is created', async ({
  page,
  context,
}, info) => {
  const before = await orders();
  await reachReview(page);

  // Tamper the httpOnly draft cookie so the submission carries a forged grant.
  const cookies = await context.cookies();
  const draftCookie = cookies.find((cookie) => cookie.name === DRAFT_COOKIE);
  if (!draftCookie) throw new Error('draft cookie must exist by the review step');
  const parsed: unknown = JSON.parse(draftCookie.value);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('draft cookie is not an object');
  }
  const forged = { ...parsed, draftGrant: 'forged-grant-token-not-issued-by-the-backend' };
  await context.addCookies([{ ...draftCookie, value: JSON.stringify(forged) }]);

  await placeOrder(page);

  // No success screen, and the backend refused the forged grant.
  await expect(page.getByRole('heading', { name: 'Order received' })).toHaveCount(0);
  await expect(page.getByText(/saved details have expired/i).first()).toBeVisible();
  await shot(page, info, '03-forged-grant-rejected');

  const after = await orders();
  expect(after.count).toBe(before.count);
});

// ---------------------------------------------------------------------------
// 4. A CMS price change mid-checkout leaves the accepted order unchanged
// ---------------------------------------------------------------------------

test('a price change mid-checkout keeps the accepted order at its snapshot; new quotes move', async ({
  page,
  context,
}, info) => {
  // Order A: reach review (quote issued at the original price), THEN publish a
  // new CMS price, THEN place the order.
  await reachReview(page);
  await expect(page.getByText(`$${(ORIGINAL_TOTAL_MINOR / 100).toFixed(2)}`).first()).toBeVisible();
  await shot(page, info, '04a-review-original-price');

  await control(`/__e2e__/set-price?key=e2e-passport-plan&minor=${CHANGED_RECURRING_MINOR}`);
  await placeOrder(page);
  const referenceA = await referenceText(page);

  const snapshotA = await orderSnapshot(referenceA);
  expect(snapshotA.totalMinor, 'accepted order keeps its snapshot price').toBe(
    ORIGINAL_TOTAL_MINOR,
  );
  await note(info, '04-order-a-snapshot', snapshotA);

  // Order B: a brand-new journey now quotes at the changed price.
  await context.clearCookies();
  await reachReview(page);
  await expect(page.getByText(`$${(CHANGED_TOTAL_MINOR / 100).toFixed(2)}`).first()).toBeVisible();
  await shot(page, info, '04b-review-changed-price');
  await placeOrder(page);
  const referenceB = await referenceText(page);

  const snapshotB = await orderSnapshot(referenceB);
  expect(snapshotB.totalMinor, 'a new quote reflects the changed price').toBe(CHANGED_TOTAL_MINOR);
  expect(referenceB).not.toBe(referenceA);
  await note(info, '04-order-b-snapshot', snapshotB);
});

// ---------------------------------------------------------------------------
// 5. Offer withdrawal obeys each TEST policy; production checkout stays gated
// ---------------------------------------------------------------------------

test('withdrawal policy honour_until_expiry: an issued quote is still honoured', async ({
  page,
}, info) => {
  // Default policy is honour_until_expiry (reset restores it).
  const before = await orders();
  await reachReview(page);
  await control('/__e2e__/withdraw-offer?key=e2e-passport-plan');
  await placeOrder(page);

  const reference = await referenceText(page);
  await shot(page, info, '05a-honour-until-expiry-order-received');
  const after = await orders();
  expect(after.count).toBe(before.count + 1);
  expect(after.references).toContain(reference);
});

test('withdrawal policy immediate: a withdrawn offer revokes the in-flight quote, no order', async ({
  page,
}, info) => {
  await control('/__e2e__/set-withdrawal-policy?policy=immediate');
  const before = await orders();
  await reachReview(page);
  await control('/__e2e__/withdraw-offer?key=e2e-passport-plan');
  await placeOrder(page);

  // No order is created; the customer is told the plan/price is no longer valid.
  await expect(page.getByRole('heading', { name: 'Order received' })).toHaveCount(0);
  await expect(
    page
      .getByText(/no longer available|price quotation has expired|couldn.t confirm the price/i)
      .first(),
  ).toBeVisible();
  await shot(page, info, '05b-immediate-revoked-no-order');

  const after = await orders();
  expect(after.count).toBe(before.count);
});

test('production priced checkout is gated while the withdrawal policy is unresolved (OPEN_INPUTS #14)', async ({
  page,
}, info) => {
  await control('/__e2e__/set-withdrawal-policy?policy=unresolved');
  const before = await orders();

  await choosePassportPlan(page);
  await fillDetailsAndContinue(page);
  await acknowledgeDocuments(page);

  // The server refuses to price the checkout; the customer is offered a callback
  // and can never reach a priced order.
  await expect(page.getByRole('heading', { name: /couldn.t confirm the price/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request a callback' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review and confirm' })).toHaveCount(0);
  await shot(page, info, '05c-unresolved-checkout-gated');

  const after = await orders();
  expect(after.count).toBe(before.count);
});

// ---------------------------------------------------------------------------
// 6. A forced email failure leaves the order intact and the job failed
// ---------------------------------------------------------------------------

test('a failed acknowledgement email leaves the order intact and the job failed, then retryable', async ({
  page,
}, info) => {
  await reachReview(page);
  await placeOrder(page);
  const reference = await referenceText(page);
  const staffOrder = await findStaffOrder(reference);

  // Force the acknowledgement email to fail, then run the outbox.
  await control('/__e2e__/arm-email-failure');
  const failedRun = outboxCounts(await control('/__e2e__/run-outbox'));
  expect(failedRun.failed, 'the email job failed').toBe(1);
  expect(failedRun.completed, 'the analytics job still delivered').toBe(1);
  await note(info, '06-outbox-run-with-email-failure', failedRun);

  // The order is untouched by the delivery failure.
  const snapshot = await orderSnapshot(reference);
  expect(snapshot.status).toBe('submitted');
  expect(snapshot.totalMinor).toBe(ORIGINAL_TOTAL_MINOR);

  // The failed job is visible to admin and marked failed.
  const jobs = await staffJobs();
  const emailJob = jobs.find((job) => job.jobType === 'order_acknowledgement_email');
  expect(emailJob, 'the failed email job is visible to staff').toBeTruthy();
  expect(emailJob!.status).toBe('failed');
  await note(info, '06-staff-jobs-failed', jobs);

  // Admin retries it; once the fault clears, the outbox delivers it cleanly and
  // the job drops off the active list.
  const retry = await staff(`/workspaces/${WORKSPACE_ID}/jobs/${emailJob!.id}/retry`, {
    method: 'POST',
  });
  expect(retry.ok, `retry failed (${retry.status})`).toBe(true);
  await control('/__e2e__/arm-email-failure?on=false');
  const recovered = outboxCounts(await control('/__e2e__/run-outbox'));
  expect(recovered.failed).toBe(0);
  await note(info, '06-outbox-run-after-retry', recovered);

  const afterRetry = await staffJobs();
  expect(afterRetry.some((job) => job.jobType === 'order_acknowledgement_email')).toBe(false);

  // The order was intact throughout — still exactly one, still submitted.
  const finalSnapshot = await orderSnapshot(reference);
  expect(finalSnapshot.status).toBe('submitted');
  expect(staffOrder.reference).toBe(reference);
});
