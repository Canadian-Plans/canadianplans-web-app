import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertAuditRecords } from './audit-records.mjs';

const page = {
  name: 'home',
  width: 390,
  status: 200,
  h1Count: 1,
  overflow: false,
  errors: [],
  violations: [],
  headingJumps: [],
  brokenAnchors: [],
  images: [{ loaded: true }],
  figmaAssets: [{ width: 36, height: 36, expectedWidth: 36, expectedHeight: 36 }],
};
test('passes healthy pages and the intentional 404 screen', () => {
  assert.doesNotThrow(() => assertAuditRecords([page, { ...page, name: '404', status: 404 }]));
});
test('fails failed captures and empty runs', () => {
  assert.throws(() => assertAuditRecords([]));
  assert.throws(() => assertAuditRecords([{ ...page, failure: 'Navigation timed out' }]));
  assert.throws(() => assertAuditRecords([{ ...page, violations: undefined }]));
});
for (const [name, change] of [
  ['HTTP error', { status: 500 }],
  ['duplicate heading', { h1Count: 2 }],
  ['overflow', { overflow: true }],
  ['runtime error', { errors: ['Hydration failed'] }],
  ['axe violation', { violations: [{ id: 'color-contrast' }] }],
  ['heading jump', { headingJumps: [{ level: 4 }] }],
  ['broken anchor', { brokenAnchors: ['#missing'] }],
  ['unloaded image', { images: [{ loaded: false }] }],
  [
    'stretched asset',
    { figmaAssets: [{ width: 72, height: 36, expectedWidth: 36, expectedHeight: 36 }] },
  ],
])
  test(`fails on ${name}`, () => assert.throws(() => assertAuditRecords([{ ...page, ...change }])));
