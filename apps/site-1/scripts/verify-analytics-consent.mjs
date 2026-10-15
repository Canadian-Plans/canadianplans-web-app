import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
// eslint-disable-next-line canadian-plans/data-boundary -- External Vite test tool resolved through Vitest, with no business-data import.
const { build } = await import(
  pathToFileURL(require.resolve('vite', { paths: [require.resolve('vitest')] })).href
);
const output = await mkdtemp(resolve(tmpdir(), 'cp-consent-browser-'));
const evidence = resolve('../../docs/EVIDENCE/system');
await mkdir(output, { recursive: true });
await build({
  configFile: false,
  root: resolve('.'),
  publicDir: false,
  logLevel: 'error',
  plugins: [
    {
      name: 'omit-fixture-styles',
      enforce: 'pre',
      resolveId(id) {
        if (id.endsWith('.css')) return '\0fixture-style';
      },
      load(id) {
        if (id === '\0fixture-style') return '';
      },
    },
  ],
  resolve: {
    alias: {
      'next/script': resolve('scripts/fixtures/next-script.tsx'),
      'next/navigation': resolve('scripts/fixtures/next-navigation.ts'),
      '@content': resolve('content'),
      '@': resolve('src'),
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL': '"https://analytics.example.invalid/script.js"',
    'process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID': '"TEST_ONLY_ANALYTICS_ID"',
  },
  esbuild: { jsx: 'automatic' },
  build: {
    outDir: output,
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: resolve('scripts/fixtures/consent-browser.tsx'),
      name: 'ConsentFixture',
      formats: ['iife'],
      fileName: () => 'fixture.js',
    },
  },
});
const html = resolve(output, 'index.html');
await writeFile(
  html,
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Consent boundary verification</title></head><body><div id="root"></div><script src="fixture.js"></script></body></html>',
);
const browser = await chromium.launch();
const results = [];
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(html).href);
  await expect(page.getByRole('button', { name: 'Accept all', exact: true })).toBeVisible();
  await expect(page.locator('#umami')).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose settings', exact: true }).first().click();
  await page.getByRole('switch', { name: 'Marketing', exact: true }).click();
  await page.getByRole('button', { name: 'Save my choices', exact: true }).click();
  await expect(page.locator('#umami')).toHaveCount(0);
  results.push('marketing-only choice does not load analytics');
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Marketing', exact: true }).click();
  await page.getByRole('switch', { name: 'Analytics', exact: true }).click();
  await page.getByRole('button', { name: 'Save my choices', exact: true }).click();
  await expect(page.locator('#umami')).toHaveCount(1);
  for (const name of ['exclude-search', 'exclude-hash', 'do-not-track'])
    await expect(page.locator('#umami')).toHaveAttribute('data-' + name, 'true');
  await expect(page.locator('#umami')).toHaveAttribute('data-auto-track', 'false');
  await expect.poll(() => page.evaluate(() => globalThis.analyticsEvents?.length ?? 0)).toBe(1);
  await page.evaluate(() => globalThis.selectFixturePlan());
  assert.equal(await page.evaluate(() => globalThis.analyticsEvents.length), 2);
  results.push('analytics opt-in loads the configured script and enables pageview/plan selection');
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await page.getByRole('button', { name: 'Reject non-essential', exact: true }).click();
  await expect(page.locator('#umami')).toHaveCount(0);
  await page.evaluate(() => {
    globalThis.navigateFixture('/order');
    globalThis.selectFixturePlan();
  });
  assert.equal(await page.evaluate(() => globalThis.analyticsEvents.length), 2);
  results.push('withdrawal stops pageviews and events even with a loaded tracker global');
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Analytics', exact: true }).click();
  await page.getByRole('button', { name: 'Save my choices', exact: true }).click();
  await expect.poll(() => page.evaluate(() => globalThis.analyticsEvents.length)).toBe(3);
  results.push('re-opt-in resumes once on the current route');
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    resolve(evidence, 'analytics-verification.json'),
    JSON.stringify(
      {
        results,
        externalBoundary:
          'Next Script / Next pathname lifecycle substituted; real consent provider, Analytics and event helper',
        productionBuild:
          'next build passed with a configured fake analytics URL; no provider contacted',
      },
      null,
      2,
    ),
  );
  await browser.close();
}
console.info('Configured analytics consent browser fixture passed.');
