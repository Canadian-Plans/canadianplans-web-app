import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const routes = [
  { name: 'login', url: '/login', title: 'Staff sign in' },
  { name: 'denied', url: '/denied', title: 'Access denied' },
  ...['orders', 'leads', 'partners', 'documents', 'settings'].map((section) => ({
    name: section,
    url: `/w/site-1/${section}`,
    title: section[0]?.toUpperCase() + section.slice(1),
  })),
];

for (const route of routes) {
  test(`${route.name}: renders, has a usable skip link, and fits the viewport`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const response = await page.goto(route.url);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.title);
    await expect(page.getByRole('main')).toHaveCount(1);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
    if (process.env['CAPTURE_SCREENSHOTS'] === '1') {
      const directory = path.resolve('../../docs/EVIDENCE/T2-screenshots');
      await mkdir(directory, { recursive: true });
      await page.screenshot({
        path: path.join(directory, `${route.name}-${testInfo.project.name}.png`),
        fullPage: true,
      });
    }
  });
}

test('keyboard sidebar navigation and mobile dismissal', async ({ page }, testInfo) => {
  await page.goto('/w/site-1/orders');
  const mobile = testInfo.project.name === 'mobile';
  if (mobile) {
    await page.getByRole('button', { name: 'Toggle Sidebar' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
  }
  const orders = page.getByRole('link', { name: 'Orders', exact: true });
  await orders.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Leads', exact: true })).toBeFocused();
  const outline = await page
    .getByRole('link', { name: 'Leads', exact: true })
    .evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/w/site-1/leads');
  if (mobile) await expect(page.getByRole('dialog')).toHaveCount(0);
  else
    await expect(page.getByRole('link', { name: 'Leads', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
});

test('workspace switcher works with keyboard and retains section', async ({ page }) => {
  await page.goto('/w/site-1/documents');
  await page.getByRole('button', { name: 'Switch workspace' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.getByRole('menuitem', { name: 'Site 1 — SIM' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Site 2 — Mobile Internet' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/w/site-2/documents');
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText('Site 2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('sidebar toggle and Escape restore a usable shell', async ({ page }, testInfo) => {
  await page.goto('/w/site-1/orders');
  const trigger = page.getByRole('button', { name: 'Toggle Sidebar' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  if (testInfo.project.name === 'mobile') {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      );
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  } else {
    await expect(page.locator('[data-state="collapsed"][data-slot="sidebar"]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Orders', exact: true })).toBeVisible();
  }
});

test('login is inert and denied page leads back to login', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Password', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
  await page.goto('/denied');
  await page.getByRole('link', { name: 'Back to sign in' }).click();
  await expect(page).toHaveURL('/login');
});

test('unknown route returns 404', async ({ page }) => {
  const response = await page.goto('/route-does-not-exist');
  expect(response?.status()).toBe(404);
});
