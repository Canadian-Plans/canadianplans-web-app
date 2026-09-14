import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { backendFetch, getBackendHealth } from './backendClient';
import { getBackendConfig } from '../backend.config';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubEnv('SITE_1_BACKEND_URL', 'https://backend.example.test');
  vi.stubEnv('SITE_1_SERVICE_CREDENTIAL', 'TEST_ONLY_SERVICE_CREDENTIAL');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ ok: true, requestId: '00000000-0000-4000-8000-000000000001' })),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('server backend transport', () => {
  it('adds scoped authorization and a fresh request ID without caching or redirects', async () => {
    await backendFetch('/api/v1/health');
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://backend.example.test/api/v1/health');
    expect(options?.headers).toMatchObject({
      Authorization: 'Bearer TEST_ONLY_SERVICE_CREDENTIAL',
      'x-request-id': expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(options).toMatchObject({ cache: 'no-store', redirect: 'error' });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
  it('validates the response through the shared contract', async () => {
    expect(await getBackendHealth()).toEqual({
      ok: true,
      requestId: '00000000-0000-4000-8000-000000000001',
    });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: 'invalid' })));
    await expect(getBackendHealth()).rejects.toThrow();
  });
  it.each([
    'https://evil.test/api/v1/orders',
    '//evil.test/api/v1/orders',
    '/api/v1/../../secret',
    '/api/v1/..%2fsecret#fragment',
    '/other',
  ])('rejects an unsafe destination: %s', async (path) => {
    await expect(backendFetch(path)).rejects.toThrow('Invalid backend API path');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('fails closed when the credential is absent', async () => {
    vi.stubEnv('SITE_1_SERVICE_CREDENTIAL', '');
    await expect(backendFetch('/api/v1/health')).rejects.toThrow('configuration is missing');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    'http://public.example.test',
    'https://user:password@example.test',
    'https://example.test/path',
  ])('rejects unsafe backend configuration: %s', (url) => {
    vi.stubEnv('SITE_1_BACKEND_URL', url);
    expect(getBackendConfig).toThrow('HTTPS origin');
  });
  it('allows the local development backend', () => {
    vi.stubEnv('SITE_1_BACKEND_URL', 'http://127.0.0.1:4000');
    expect(getBackendConfig().backendUrl).toBe('http://127.0.0.1:4000');
  });
  it('does not include an upstream error body in its error', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('sensitive upstream data', {
        status: 403,
        headers: { 'x-request-id': '10000000-0000-4000-8000-000000000001' },
      }),
    );
    await expect(backendFetch('/api/v1/health')).rejects.toThrow(
      'Backend request failed (403; requestId=10000000-0000-4000-8000-000000000001).',
    );
  });
  it('does not trust an invalid backend request ID', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('sensitive upstream data', {
        status: 500,
        headers: { 'x-request-id': 'attacker-controlled-value' },
      }),
    );
    await expect(backendFetch('/api/v1/health')).rejects.toThrow(
      'Backend request failed (500; requestId=unavailable).',
    );
  });
});
