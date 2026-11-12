import { SITE_KEY, STUB_URL } from './crm-stub/config';
import { expect, test } from './fixtures';
import { declineCookies, placeSimOrder } from './journeys';
import { PLANS_PATH } from './stub';

/**
 * The site key stays on the storefront's server. `scripts/verify-client-bundle.mjs`
 * runs this with a synthetic key it has also searched the built assets for.
 */
test('the CRM answers only the site key, and no response hands that key to the browser', async ({
  page,
}) => {
  const anonymous = await fetch(`${STUB_URL}${PLANS_PATH}`);
  expect(anonymous.status).toBe(401);
  expect(await anonymous.json()).toMatchObject({ error: { code: 'missing_credential' } });
  const wrongKey = await fetch(`${STUB_URL}${PLANS_PATH}`, {
    headers: { authorization: 'Bearer cpsk_e2e_some_other_key' },
  });
  expect(wrongKey.status).toBe(401);
  expect(await wrongKey.json()).toMatchObject({ error: { code: 'invalid_credential' } });

  // A whole order journey works only because the server sent the key; nothing
  // the browser received on the way may contain it.
  const seen: string[] = [];
  page.on('response', (response) => {
    void response
      .text()
      .then((text) => seen.push(text))
      .catch(() => undefined);
  });
  await declineCookies(page);
  await placeSimOrder(page);
  await page.waitForLoadState('networkidle');
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.some((text) => text.includes(SITE_KEY))).toBe(false);
  expect(await page.content()).not.toContain(SITE_KEY);
});
