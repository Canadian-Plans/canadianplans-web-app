import { test as base } from '@playwright/test';
export { expect, type Page, type TestInfo } from '@playwright/test';

/** Fake only the external provider script. The real UI, Server Actions,
 * transport, app routing and one-use backend admission all still execute.
 */
export const test = base.extend<{ turnstileProvider: void; turnstileFailures: number }>({
  turnstileFailures: [0, { option: true }],
  turnstileProvider: [
    async ({ page, turnstileFailures }, use) => {
      await page.route('https://challenges.cloudflare.com/**', async (route) => {
        if (!new URL(route.request().url()).pathname.endsWith('/api.js')) {
          await route.fulfill({
            contentType: 'text/html',
            body: '<html lang="en"><title>Verification</title></html>',
          });
          return;
        }
        await route.fulfill({
          contentType: 'application/javascript',
          body: `
        window.turnstile = (() => {
          const widgets = new Map();
          let failures = ${turnstileFailures};
          return {
            render(container, options) {
              const id = crypto.randomUUID();
              const frame = document.createElement('iframe');
              frame.title = 'Security verification'; frame.src = 'https://challenges.cloudflare.com/turnstile/v0/e2e';
              frame.width = '150'; frame.height = '40'; container.append(frame);
              widgets.set(id, { container, options }); return id;
            },
            execute(id) {
              const widget = widgets.get(id);
              setTimeout(() => { if (failures > 0) { failures--; widget?.options['error-callback'](); } else widget?.options.callback('e2e.' + widget.options.action + '.' + crypto.randomUUID()); }, 0);
            },
            remove(id) { const widget = widgets.get(id); widget?.container.replaceChildren(); widgets.delete(id); }
          };
        })();
      `,
        });
      });
      await use();
    },
    { auto: true },
  ],
});
