import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { createBackendClient } from '@canadian-plans/contracts';
const origin = 'http://127.0.0.1:4200';
const base = '/w/e2e-order-journey';

test('owner creates a field, grants a member, and the member lays out, edits and saves a private view', async ({
  page,
}) => {
  test.setTimeout(120_000);
  expect((await fetch(`${origin}/__e2e__/reset`, { method: 'POST' })).ok).toBe(true);
  const client = createBackendClient({
    baseUrl: origin,
    credential: 'cplsk_e2e_order_journey_secret_0001',
  });
  const created = await client.leads.create(
    { leadType: 'sim', consentVersion: 'test', contact: { fullName: 'Synthetic Model Journey' } },
    { turnstileToken: `e2e.lead-save.${randomUUID()}` },
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/settings`);
  await page.getByRole('link', { name: 'Data model', exact: true }).click();
  await page.getByRole('button', { name: 'Add field', exact: true }).click();
  await page.getByRole('button', { name: 'Select', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Arrival priority');
  await page.getByLabel('Pre-arrival SIM', { exact: true }).check();
  await page.getByRole('button', { name: 'Add option', exact: true }).click();
  await page.getByLabel('Option 1 label').fill('Soon');
  await page.getByLabel('Option 1 colour').selectOption('blue');
  await page.getByRole('button', { name: 'Create field', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Arrival priority', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Manage data model for 20000000-0000-4000-8000-000000000e04' })
    .check();
  await expect(
    page.getByRole('checkbox', {
      name: 'Manage data model for 20000000-0000-4000-8000-000000000e04',
    }),
  ).toBeChecked();
  await expect(page.getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible();
  await page.route(`${origin}/**`, (route) =>
    route.continue({
      headers: {
        ...route.request().headers(),
        authorization: 'Bearer e2e-staff-session-member-aal2',
      },
    }),
  );
  await page.reload();
  await page.getByRole('tab', { name: 'Layout', exact: true }).click();
  await page.getByRole('button', { name: 'Add section' }).click();
  await page.getByLabel('Section 2 name').fill('Arrival');
  const sectionSelect = page.getByLabel('Section for Arrival priority', { exact: true });
  await sectionSelect.selectOption({ label: 'Arrival' });
  await page.getByRole('button', { name: 'Save layout' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Layout saved.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/lead-layout.png', fullPage: true });
  await page.goto(`${base}/leads/${created.lead.id}`);
  await expect(page.getByRole('heading', { name: 'Arrival', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Arrival priority' }).click();
  await page.getByLabel('Arrival priority', { exact: true }).selectOption({ label: 'Soon' });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Changed Arrival priority', { exact: true })).toBeVisible();
  await page.goto(`${base}/leads`);
  await page.getByRole('button', { name: 'Add filter', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Field', exact: true })
    .selectOption({ label: 'Arrival priority' });
  await page.getByLabel('Filter value').selectOption({ label: 'Soon' });
  await page.getByRole('button', { name: 'Apply filter' }).click();
  await expect(page.getByText('Synthetic Model Journey', { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/Soon|custom_|option_/);
  await page.getByRole('button', { name: 'Save view', exact: true }).click();
  await page.getByLabel('View name').fill('Arriving soon');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/\?view=[0-9a-f-]+$/);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Personal view' })).toHaveValue(/[0-9a-f-]+/);
  await expect(
    page.getByRole('button', { name: 'Remove filter Arrival priority is Soon' }),
  ).toBeVisible();
  await expect(page.getByText('Synthetic Model Journey', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/lead-personal-view.png', fullPage: true });
  expect(errors).toEqual([]);
});
