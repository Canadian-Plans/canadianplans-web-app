import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const evidence = resolve('../../docs/EVIDENCE/audit');
const report = resolve('../../docs/AUDIT_REPORT.md');
const pages = JSON.parse(await readFile(resolve(evidence, 'final/pages.json'), 'utf8'));
const diffs = JSON.parse(await readFile(resolve(evidence, 'final/diffs/summary.json'), 'utf8'));
const scores = JSON.parse(
  await readFile(resolve(evidence, 'final-verified/lighthouse/summary.json'), 'utf8'),
);
const lines = [
  '<!-- audit-generated -->',
  '',
  '| Page / state | Pixel diff 390 / 1440 | Axe violations 390 / 1440 | Mobile performance median | Valid measured runs |',
  '| --- | --- | --- | --- | --- |',
];
for (const page of pages.filter((p) => p.width === 390)) {
  const other = pages.find((p) => p.name === page.name && p.width === 1440);
  const metric = scores.find((s) => s.name === page.name);
  const visual = [390, 1440]
    .map((width) => {
      const d = diffs.find((d) => d.name === page.name && d.width === width);
      return d ? `${d.differencePercent}%` : '—';
    })
    .join(' / ');
  lines.push(
    `| ${page.path} (${page.name}) | ${visual} | ${page.violations.length} / ${other?.violations.length ?? 'missing'} | ${metric?.median?.performance ?? 'pending'} | ${metric?.validRuns ?? 0} |`,
  );
}
lines.push(
  '',
  'Pixel diff “—” means no supplied matching whole-page reference, or a state requiring a component/cropped comparison; it is not a pass.',
  '',
  'Performance is the 90+ gate. The preview SEO score is intentionally reduced by noindex/robots; do not remove those safeguards to raise it. The real 404 is measured with Lighthouse’s `ignoreStatusCode` flag so rendering can be scored while its HTTP 404 response stays intact.',
  '',
  'Before/after medians: Home 83 → ' +
    (scores.find((s) => s.name === 'home')?.median?.performance ?? 'pending') +
    ', mobile plans 76 → ' +
    (scores.find((s) => s.name === 'mobile-plans')?.median?.performance ?? 'pending') +
    ', pre-arrival order 77 → ' +
    (scores.find((s) => s.name === 'pre-arrival-order')?.median?.performance ?? 'pending') +
    '. Home internet after the first optimizations was 88; the final measured score is ' +
    (scores.find((s) => s.name === 'home-internet')?.median?.performance ?? 'pending') +
    '.',
  '',
);
const source = (await readFile(report, 'utf8')).split('<!-- audit-generated -->')[0];
await writeFile(report, source + lines.join('\n'));
