import { test as base } from '@playwright/test';

import { STORAGE_ORIGIN, STUB_URL } from './crm-stub/config';
import { stub } from './stub';

export { expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Fake only the external provider script and the object storage host. The real
 * UI, Server Actions, transport and app routing all still execute, against the
 * CRM stub (`e2e/crm-stub`), which starts every test empty.
 */
export const test = base.extend<{
  turnstileProvider: void;
  turnstileFailures: number;
  crmStub: void;
}>({
  turnstileFailures: [0, { option: true }],
  crmStub: [
    async ({ page }, use) => {
      await stub.reset();
      // Signed upload URLs are https (the site's CSP allows nothing else); each
      // direct browser PUT is forwarded to the stub's storage endpoint.
      await page.route(`${STORAGE_ORIGIN}/**`, async (route) => {
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
        const forwarded = await fetch(`${STUB_URL}/storage${new URL(request.url()).pathname}`, {
          method: 'PUT',
          body: new Uint8Array(request.postDataBuffer() ?? Buffer.alloc(0)),
        });
        await route.fulfill({ status: forwarded.ok ? 200 : 502, headers: cors });
      });
      await use();
    },
    { auto: true },
  ],
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
