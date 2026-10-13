import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { routes } from './audit-pages.mjs';
const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3138';
const phase = process.env.AUDIT_PHASE ?? 'baseline';
const filter = process.env.AUDIT_ROUTES?.split(',');
const selected = routes.filter(([name]) => !filter || filter.includes(name));
const folder = resolve(`../../docs/EVIDENCE/audit/${phase}/lighthouse`);
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ args: ['--remote-debugging-port=9223'] });
let records = [];
try {
  records = JSON.parse(await readFile(resolve(folder, 'summary.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
try {
  for (const [name, path] of selected) {
    const runs = [];
    for (let i = 0; i < 6; i++) {
      try {
        const result = await lighthouse(origin + path, {
          port: 9223,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          formFactor: 'mobile',
          ignoreStatusCode: name === '404',
          throttlingMethod: 'simulate',
        });
        const lhr = result.lhr;
        const run = {
          index: i,
          scores: Object.fromEntries(
            Object.entries(lhr.categories).map(([key, value]) => [
              key,
              Math.round(value.score * 100),
            ]),
          ),
          errors: lhr.runtimeError,
          metrics: Object.fromEntries(
            [
              'first-contentful-paint',
              'largest-contentful-paint',
              'total-blocking-time',
              'cumulative-layout-shift',
              'speed-index',
            ].map((key) => [key, lhr.audits[key]?.numericValue]),
          ),
          failures: Object.values(lhr.audits)
            .filter((a) => a.score !== null && a.score < 1)
            .map((a) => ({
              id: a.id,
              title: a.title,
              displayValue: a.displayValue,
              details: a.details,
            })),
        };
        runs.push(run);
        if (i === 1) await writeFile(resolve(folder, `${name}.json`), JSON.stringify(lhr, null, 2));
        console.info(phase, name, i, JSON.stringify(run.scores));
      } catch (e) {
        runs.push({ index: i, failure: e.message });
        console.info(name, i, e.message);
      }
      await writeFile(resolve(folder, `${name}-runs.json`), JSON.stringify(runs, null, 2));
    }
    const valid = runs.slice(1).filter((r) => r.scores && !r.errors);
    const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    records = records.filter((record) => record.name !== name);
    records.push({
      name,
      path,
      runs: runs.length,
      validRuns: valid.length,
      median: valid.length
        ? Object.fromEntries(
            Object.keys(valid[0].scores).map((key) => [
              key,
              median(valid.map((r) => r.scores[key])),
            ]),
          )
        : null,
    });
    await writeFile(resolve(folder, 'summary.json'), JSON.stringify(records, null, 2));
  }
} finally {
  await browser.close();
}
