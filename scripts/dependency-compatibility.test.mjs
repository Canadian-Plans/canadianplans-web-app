import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// Exercise the real pinned consumer of the scoped compatibility override.
const siteRequire = createRequire(new URL('../apps/site-1/package.json', import.meta.url));
const sanityRequire = createRequire(siteRequire.resolve('sanity'));
const cliRequire = createRequire(sanityRequire.resolve('@sanity/cli'));
const typeidEntry = cliRequire.resolve('typeid-js');
const typeidRequire = createRequire(typeidEntry);

for (const format of ['cjs', 'esm']) {
  test(`Sanity CLI type IDs preserve UUIDv7 generation and roundtrips (${format})`, async () => {
    const api =
      format === 'cjs'
        ? cliRequire('typeid-js')
        : // Offline package probe: this is the pinned typeid-js ESM entry, never application/DB code.
          // eslint-disable-next-line canadian-plans/data-boundary
          await import(pathToFileURL(typeidEntry.replace(/\.js$/, '.mjs')).href);
    const before = Date.now();
    const ids = Array.from({ length: 1000 }, () => api.typeid('test'));
    assert.equal(new Set(ids.map((id) => id.toString())).size, ids.length);
    for (const id of ids) {
      assert.equal(id.toUUID()[14], '7');
      assert.equal(api.TypeID.fromUUID('test', id.toUUID()).toString(), id.toString());
      assert.equal(api.TypeID.fromString(id.toString()).toString(), id.toString());
      assert.equal(id.toUUIDBytes().byteLength, 16);
      const timestamp = Number.parseInt(id.toUUID().replaceAll('-', '').slice(0, 12), 16);
      assert.ok(timestamp >= before && timestamp <= Date.now());
    }
    assert.throws(() => api.TypeID.fromString(`test_8${'0'.repeat(25)}`));
    assert.throws(() => api.TypeID.fromString('test_invalid'));
  });
}

test('the scoped UUID replacement rejects undersized v3/v5 buffers', () => {
  const uuid = typeidRequire('uuid');
  for (const factory of [uuid.v3, uuid.v5]) {
    assert.throws(() => factory('test', factory.DNS, new Uint8Array(1)), RangeError);
  }
});
