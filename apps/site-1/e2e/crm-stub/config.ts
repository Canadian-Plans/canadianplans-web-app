/**
 * The addresses and the synthetic site key the browser suites, the Playwright
 * configuration and the stub share. Nothing here is a real secret: the key is only ever accepted by the
 * stub in this directory.
 */
function port(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 && value < 65_536 ? value : fallback;
}

/** Override either port (`E2E_STUB_PORT`, `E2E_SITE_PORT`) when another process holds it. */
export const STUB_PORT = port('E2E_STUB_PORT', 4100);
export const SITE_PORT = port('E2E_SITE_PORT', 3101);
export const SITE_URL = `http://127.0.0.1:${SITE_PORT}`;
export const STUB_URL = `http://127.0.0.1:${STUB_PORT}`;
export const DEFAULT_SITE_KEY = 'cpsk_e2e_storefront_site_key_0001';
/**
 * Signed upload URLs must be https (the storefront's CSP allows nothing else),
 * so the stub hands out URLs on this origin and the Playwright fixture forwards
 * each browser PUT to the stub's `PUT /storage/:uploadId`.
 */
export const STORAGE_ORIGIN = 'https://storage.e2e.test';
/** The site key the stub accepts and the storefront's server sends. */
export const SITE_KEY = process.env['E2E_SITE_KEY'] ?? DEFAULT_SITE_KEY;
