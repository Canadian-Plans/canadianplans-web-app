import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { installAuditContext } from './audit-context.mjs';

const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const phase = process.env.AUDIT_PHASE ?? 'review-baseline';
const directory = resolve('../../docs/EVIDENCE/audit', phase);
const routes = [
  '/pre-arrival-sim/students',
  '/pre-arrival-sim/from-india',
  '/home-internet/vancouver',
  '/home-internet/ontario',
];
const browser = await chromium.launch();
const results = [];
try {
  for (const route of routes) {
    const runs = [];
    for (let run = 0; run < 6; run++) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await installAuditContext(context, { eagerImages: false });
      const page = await context.newPage();
      await page.coverage.startJSCoverage();
      const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      const htmlBytes = (await response.body()).length;
      const coverage = await page.coverage.stopJSCoverage();
      const scripts = coverage.filter(
        (entry) => entry.url.startsWith(origin + '/_next/') && typeof entry.source === 'string',
      );
      const resources = await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .filter((entry) => entry.name.includes('/_next/') && entry.name.endsWith('.js'))
          .map((entry) => ({ url: entry.name, decodedBytes: entry.decodedBodySize })),
      );
      runs.push({
        htmlBytes,
        scriptBytes: scripts.reduce((sum, entry) => sum + Buffer.byteLength(entry.source), 0),
        executedFunctions: scripts.reduce(
          (sum, entry) => sum + entry.functions.filter((fn) => fn.ranges[0]?.count > 0).length,
          0,
        ),
        resources,
      });
      await context.close();
    }
    const median = (key) =>
      runs
        .slice(1)
        .map((run) => run[key])
        .sort((a, b) => a - b)[2];
    results.push({
      route,
      measuredRuns: 5,
      median: {
        htmlBytes: median('htmlBytes'),
        scriptBytes: median('scriptBytes'),
        executedFunctions: median('executedFunctions'),
      },
      runs,
    });
    console.info(route, results.at(-1).median);
  }
} finally {
  await browser.close();
}
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, 'payload.json'), JSON.stringify(results, null, 2));
