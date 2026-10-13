import assert from 'node:assert/strict';

/** Fail the audit command on broken pages instead of only writing a report. */
export function assertAuditRecords(records) {
  assert.ok(records.length, 'No page audit records were produced.');
  const failures = [];
  for (const record of records) {
    const label = `${record.name} at ${record.width}px`;
    const problem = (condition, message) => {
      if (condition) failures.push(`${label}: ${message}`);
    };
    problem(
      !['errors', 'violations', 'headingJumps', 'images', 'figmaAssets'].every((key) =>
        Array.isArray(record[key]),
      ),
      'Incomplete audit results',
    );
    problem(Boolean(record.failure), record.failure);
    problem(record.status !== (record.name === '404' ? 404 : 200), `HTTP ${record.status}`);
    problem(record.h1Count !== 1, `Expected one H1, got ${record.h1Count}`);
    problem(record.overflow, 'Horizontal document overflow');
    problem(record.errors?.length, 'Browser runtime errors');
    problem(record.violations?.length, 'Accessibility violations');
    problem(record.headingJumps?.length, 'Skipped heading levels');
    problem(record.brokenAnchors?.length, 'Anchor destinations do not exist');
    problem(
      record.images?.some((image) => !image.loaded),
      'Images did not load',
    );
    problem(
      record.figmaAssets?.some(
        (asset) =>
          Math.abs(asset.width - asset.expectedWidth) > 0.2 ||
          Math.abs(asset.height - asset.expectedHeight) > 0.2,
      ),
      'Figma asset geometry changed',
    );
  }
  assert.equal(failures.length, 0, `Page audit failed:\n${failures.join('\n')}`);
}
