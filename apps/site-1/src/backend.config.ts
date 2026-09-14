import 'server-only';

/** Read lazily: placeholder pages can build without a service credential. */
export function getBackendConfig() {
  const backendUrl = process.env['SITE_1_BACKEND_URL']?.trim();
  const serviceCredential = process.env['SITE_1_SERVICE_CREDENTIAL']?.trim();
  if (!backendUrl || !serviceCredential) {
    throw new Error('Site backend configuration is missing.');
  }
  const url = new URL(backendUrl);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error('Site backend URL must be an HTTPS origin (HTTP allowed for localhost).');
  }
  return { backendUrl: url.origin, serviceCredential };
}
