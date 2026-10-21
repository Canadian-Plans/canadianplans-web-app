import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() =>
      localStorage.setItem(
        'canadian-plans.cookie-choices.v1',
        JSON.stringify({ version: 1, analytics: false, marketing: false }),
      ),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let fail = true;
    await page.route('**/*', (route) =>
      fail && route.request().method() === 'POST' && route.request().headers()['next-action']
        ? route.abort('failed')
        : route.continue(),
    );
    await page.goto(process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127');
    const form = page.locator('.cp-footer-newsletter');
    const email = form.getByLabel('Your email', { exact: true });
    await email.fill('newsletter@example.test');
    await form.getByRole('button', { name: 'Sign up', exact: true }).click();
    await expect(form.getByRole('status')).toContainText("We couldn't complete that request.");
    await expect(email).toHaveValue('newsletter@example.test');
    fail = false;
    await form.getByRole('button', { name: 'Sign up', exact: true }).click();
    await expect(form.getByRole('status')).toContainText('Nothing was sent or saved.');
    expect(errors).toEqual([]);
    console.info(`Newsletter failure and retry passed at ${width}px`);
    await context.close();
  }
} finally {
  await browser.close();
}
