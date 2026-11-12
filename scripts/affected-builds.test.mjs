import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { affectedApps, changedFiles, readProjects } from './affected-builds.mjs';

const script = fileURLToPath(new URL('./affected-builds.mjs', import.meta.url));
const vercelExit = (env) =>
  spawnSync(process.execPath, [script, '--vercel', 'site-1'], {
    env: { ...process.env, VERCEL_GIT_PREVIOUS_SHA: 'HEAD', ...env },
    encoding: 'utf8',
  }).status;
test('Vercel redeploy of the same commit is skipped by default', () =>
  assert.equal(vercelExit({ VERCEL_FORCE_BUILD: '' }), 0));
test('VERCEL_FORCE_BUILD=1 builds the same commit again', () =>
  assert.equal(vercelExit({ VERCEL_FORCE_BUILD: '1' }), 1));

const projects = readProjects();
const names = (changes) =>
  affectedApps(projects, changes)
    .map((app) => app.name)
    .sort();
test('site-1 changes build site-1', () =>
  assert.deepEqual(names(['apps/site-1/src/app/page.tsx']), ['site-1']));
test('shared UI builds site-1', () =>
  assert.deepEqual(names(['packages/ui/src/index.ts']), ['site-1']));
test('shared contracts build site-1', () =>
  assert.deepEqual(names(['packages/contracts/src/index.ts']), ['site-1']));
test('toolchain changes build site-1', () =>
  assert.deepEqual(names(['packages/config/tsconfig.base.json']), ['site-1']));
test('root configuration builds all apps', () =>
  assert.deepEqual(names(['package.json']), ['site-1']));
test('a removed workspace directory fails safe and builds all apps', () =>
  assert.deepEqual(names(['apps/backend/src/app.ts']), ['site-1']));
test('documentation-only changes skip builds', () =>
  assert.deepEqual(names(['docs/API.md', 'README.md']), []));
test('missing git baseline fails safe', () =>
  assert.deepEqual(names(changedFiles('missing-ref-for-test')), ['site-1']));
test('no baseline builds all on first deployment', () => assert.deepEqual(names(null), ['site-1']));
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
