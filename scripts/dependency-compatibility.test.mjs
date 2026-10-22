import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

// Exercise the real pinned consumers of the two scoped compatibility overrides.
const siteRequire = createRequire(new URL('../apps/site-1/package.json', import.meta.url));
const sanityRequire = createRequire(siteRequire.resolve('sanity'));
const cliRequire = createRequire(sanityRequire.resolve('@sanity/cli'));
const typeidEntry = cliRequire.resolve('typeid-js');
const typeidRequire = createRequire(typeidEntry);
const kitRequire = createRequire(new URL('../packages/db/package.json', import.meta.url));
const loaderRequire = createRequire(
  createRequire(kitRequire.resolve('drizzle-kit')).resolve('@esbuild-kit/esm-loader'),
);
const coreEntry = loaderRequire.resolve('@esbuild-kit/core-utils');
const core = loaderRequire('@esbuild-kit/core-utils');

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

test('Drizzle legacy loader preserves TypeScript transforms, source maps and imports', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'cp-loader-compat-'));
  try {
    const esbuildRequire = createRequire(coreEntry);
    assert.equal(esbuildRequire('esbuild/package.json').version, '0.25.12');
    for (const extension of ['ts', 'cts', 'mts']) {
      const sourcePath = join(directory, `source.${extension}`);
      const source = `export const format = '${extension}'; export const answer: number = 42; export async function load() { return (await import('node:path')).basename('/one/two'); }`;
      const cjs = core.transformSync(source, sourcePath);
      const module = { exports: {} };
      new Function('module', 'exports', 'require', cjs.code)(
        module,
        module.exports,
        createRequire(import.meta.url),
      );
      assert.equal(module.exports.answer, 42);
      assert.equal(await module.exports.load(), 'two');
      assert.ok(cjs.map.sources.some((value) => value.endsWith(`source.${extension}`)));
      const esm = await core.transform(
        `${source} export const where = import.meta.url;`,
        sourcePath,
      );
      const outputPath = join(directory, `output-${extension}.mjs`);
      writeFileSync(outputPath, esm.code);
      // Offline transform probe: output contains only the literal fixture above and node:path.
      // eslint-disable-next-line canadian-plans/data-boundary
      const loaded = await import(pathToFileURL(outputPath).href);
      assert.equal(loaded.answer, 42);
      assert.equal(await loaded.load(), 'two');
      assert.equal(loaded.where, pathToFileURL(outputPath).href);
      assert.ok(esm.map.sources.some((value) => value.endsWith(`source.${extension}`)));
      if (extension !== 'cts') {
        const meta = core.transformSync('export const where = import.meta.url;', sourcePath);
        const target = { exports: {} };
        new Function('module', 'exports', 'require', meta.code)(
          target,
          target.exports,
          createRequire(import.meta.url),
        );
        assert.equal(target.exports.where, pathToFileURL(sourcePath).href);
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
