import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { collectPageMetrics } from './audit-page-metrics.mjs';
import { assertAuditRecords } from './audit-records.mjs';

test('the browser collector produces a complete record and detects stretched assets', () => {
  let width = 36;
  const image = {
    getBoundingClientRect: () => ({ width, height: 36 }),
    getAttribute: (name) => ({ width: '36', height: '36', src: '/icon.svg', alt: '' })[name],
    hasAttribute: () => false,
    naturalWidth: 36,
  };
  const heading = {
    tagName: 'H1',
    textContent: 'Example',
    getBoundingClientRect: () => ({ width: 100, height: 20 }),
  };
  const document = {
    title: 'Example',
    images: [image],
    documentElement: { scrollWidth: 390 },
    querySelector: () => null,
    querySelectorAll: (selector) =>
      selector === 'h1,h2,h3,h4,h5,h6'
        ? [heading]
        : selector === 'img[data-figma-asset]'
          ? [image]
          : [],
  };
  const collect = () =>
    runInNewContext(`(${collectPageMetrics.toString()})()`, {
      document,
      getComputedStyle: () => ({ visibility: 'visible' }),
      innerWidth: 390,
      scrollY: 0,
    });
  const record = () => ({
    name: 'home',
    width: 390,
    status: 200,
    errors: [],
    violations: [],
    ...collect(),
  });
  assert.equal(record().figmaAssets.length, 1);
  assert.doesNotThrow(() => assertAuditRecords([record()]));
  width = 72;
  assert.throws(() => assertAuditRecords([record()]), /Figma asset geometry changed/);
});
