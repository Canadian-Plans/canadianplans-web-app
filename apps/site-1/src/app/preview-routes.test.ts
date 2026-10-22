import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const pages = {
  '/order/pre-arrival': () => import('./(pre-arrival-order)/order/pre-arrival/page'),
  '/order/home-internet': () => import('./(internet-order)/order/home-internet/page'),
  '/track-order': () => import('./(track-order)/track-order/page'),
};

afterEach(() => {
  vi.unstubAllEnvs();
});

// Owner decision (22 Oct 2026, SEC-21): the design-preview order and tracking
// pages 404 on the production deployment and stay available everywhere else.
describe('design-preview routes', () => {
  for (const [route, load] of Object.entries(pages)) {
    it(`${route} is not found in production`, async () => {
      vi.stubEnv('VERCEL_ENV', 'production');
      const { default: Page } = await load();
      await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('NEXT_NOT_FOUND');
    });
  }

  for (const [route, load] of Object.entries(pages)) {
    it(`${route} still renders on a Vercel preview deployment`, async () => {
      vi.stubEnv('VERCEL_ENV', 'preview');
      const { default: Page } = await load();
      await expect(Page({ searchParams: Promise.resolve({}) })).resolves.toBeTruthy();
    });
  }
});
