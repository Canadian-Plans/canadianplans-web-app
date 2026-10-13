import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { routes } from './audit-pages.mjs';

const phase = process.env.AUDIT_PHASE ?? 'final-verified';
const summary = JSON.parse(
  await readFile(resolve(`../../docs/EVIDENCE/audit/${phase}/lighthouse/summary.json`), 'utf8'),
);
const failed = routes.flatMap(([name]) => {
  const result = summary.find((entry) => entry.name === name);
  return !result ||
    result.validRuns !== 5 ||
    typeof result.median?.performance !== 'number' ||
    result.median.performance < 90
    ? [
        `${name}: ${result?.median?.performance ?? 'missing'} (${result?.validRuns ?? 0} valid runs)`,
      ]
    : [];
});
assert.equal(failed.length, 0, `Mobile 90+ gate failed:\n${failed.join('\n')}`);
console.info(`Mobile 90+ gate passed for all ${routes.length} cases with five measured runs each.`);
