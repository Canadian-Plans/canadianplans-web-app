import { expect, test } from './fixtures';

const pages = [
  ['/', 'Canadian SIM card and phone plans for newcomers, ready before you arrive.'],
  ['/plans', 'Plans'],
  ['/plans/test-plan', 'Plan details'],
  ['/order', 'Order a plan'],
  ['/track', 'Track your order'],
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Service'],
  ['/studio', 'Canadian Plans Studio'],
  ['/studio/structure', 'Canadian Plans Studio'],
];
for (const [path, heading] of pages) {
  if (!path || !heading) throw new Error('Missing route fixture');
  test(`renders ${path} without exposing server credentials`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('https://analytics.example.test/script.js', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: 'document.documentElement.dataset.umamiLoaded = "true";',
      }),
    );
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    const credential = process.env['SITE_1_SERVICE_CREDENTIAL'];
    if (credential) {
      expect(await response?.text()).not.toContain(credential);
      expect(await page.content()).not.toContain(credential);
    }
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (path.startsWith('/studio')) {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('script#umami')).toHaveCount(0);
      await expect(page.getByText('Sanity project connection is pending T9.')).toBeVisible();
    }
  });
}

test('keyboard skip link and navigation work', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'canadian-plans.cookie-choices.v1',
      JSON.stringify({ version: 1, analytics: false, marketing: false }),
    ),
  );
  await page.route('https://analytics.example.test/script.js', (route) =>
    route.fulfill({ body: '' }),
  );
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  if (test.info().project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Mobile Plans', exact: true }).click();
  } else {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Mobile Plans', exact: true })
      .focus();
    await page.keyboard.press('Enter');
  }
  await expect(page).toHaveURL(/\/mobile-plans$/);
});

test('Umami loads only with complete public configuration', async ({ page }) => {
  let loads = 0;
  await page.route('https://analytics.example.test/script.js', (route) => {
    loads += 1;
    return route.fulfill({
      contentType: 'application/javascript',
      body: 'document.documentElement.dataset.umamiLoaded = "true";',
    });
  });
  await page.goto('/');
  await expect(page.locator('script#umami')).toHaveCount(0);
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  if (process.env['TEST_UMAMI_ENABLED'] === '1') {
    await expect(page.locator('html')).toHaveAttribute('data-umami-loaded', 'true');
    await expect(page.locator('script#umami')).toHaveAttribute('data-website-id', 'test-website');
    await expect(page.locator('script#umami')).toHaveAttribute('data-auto-track', 'false');
    expect(loads).toBe(1);
  } else {
    await expect(page.locator('script#umami')).toHaveCount(0);
    expect(loads).toBe(0);
  }
});
