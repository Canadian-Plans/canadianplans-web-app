import assert from 'node:assert/strict';
import { test } from 'node:test';
import { affectedApps, changedFiles, readProjects } from './affected-builds.mjs';

const projects = readProjects();
const names = (changes) =>
  affectedApps(projects, changes)
    .map((app) => app.name)
    .sort();
test('admin-only changes do not build backend', () =>
  assert.deepEqual(names(['apps/admin/src/app/page.tsx']), ['admin']));
test('backend-only changes do not build admin', () =>
  assert.deepEqual(names(['apps/backend/src/app.ts']), ['backend']));
test('site-1 changes only build site-1', () =>
  assert.deepEqual(names(['apps/site-1/src/app/page.tsx']), ['site-1']));
test('shared UI builds its frontend consumers', () =>
  assert.deepEqual(names(['packages/ui/src/index.ts']), ['admin', 'site-1']));
test('shared contracts build all consumers', () =>
  assert.deepEqual(names(['packages/contracts/src/index.ts']), ['admin', 'backend', 'site-1']));
test('DB change only builds backend', () =>
  assert.deepEqual(names(['packages/db/src/index.ts']), ['backend']));
test('toolchain changes build every consumer', () =>
  assert.deepEqual(names(['packages/config/tsconfig.base.json']), ['admin', 'backend', 'site-1']));
test('root configuration builds all apps', () =>
  assert.deepEqual(names(['package.json']), ['admin', 'backend', 'site-1']));
test('documentation-only changes skip builds', () =>
  assert.deepEqual(names(['docs/API.md', 'README.md']), []));
test('missing git baseline fails safe', () =>
  assert.deepEqual(names(changedFiles('missing-ref-for-test')), ['admin', 'backend', 'site-1']));
test('no baseline builds all on first deployment', () =>
  assert.deepEqual(names(null), ['admin', 'backend', 'site-1']));
test('dependency propagation is transitive', () => {
  const graph = [
    { name: 'site', directory: 'apps/site-1', dependencies: ['client'] },
    { name: 'client', directory: 'packages/client', dependencies: ['types'] },
    { name: 'types', directory: 'packages/types', dependencies: [] },
  ];
  assert.deepEqual(
    affectedApps(graph, ['packages/types/src/index.ts']).map((app) => app.name),
    ['site'],
  );
});
