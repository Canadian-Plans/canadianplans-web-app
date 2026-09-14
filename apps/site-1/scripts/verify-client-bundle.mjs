import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
  existsSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const pnpm = process.env.npm_execpath;
assert.ok(pnpm, 'Run through pnpm run test:security.');
const sentinel = `TEST_ONLY_SITE_CREDENTIAL_${randomUUID()}`;
const baseEnv = {
  ...process.env,
  SITE_1_SERVICE_CREDENTIAL: sentinel,
  SITE_1_BACKEND_URL: 'https://backend.example.test',
  NEXT_PUBLIC_SANITY_PROJECT_ID: '',
  NEXT_PUBLIC_SANITY_DATASET: '',
};
function run(args, env) {
  const result = spawnSync(process.execPath, [pnpm, ...args], { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `Failed: pnpm ${args.join(' ')}`);
}
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
function scan() {
  const assets = files(path.join(root, '.next/static'));
  const rendered = files(path.join(root, '.next/server/app')).filter((file) =>
    /\.(html|rsc|body|txt)$/.test(file),
  );
  assert.ok(
    assets.some((file) => file.endsWith('.js')),
    'No browser JavaScript was produced.',
  );
  assert.ok(
    rendered.some((file) => file.endsWith('.html')),
    'No rendered pages were produced.',
  );
  for (const file of [...assets, ...rendered]) {
    assert.ok(
      !readFileSync(file).includes(Buffer.from(sentinel)),
      `Credential exposed in ${path.relative(root, file)}`,
    );
  }
  console.info(
    `PASS: synthetic credential absent from ${assets.length} browser assets and ${rendered.length} rendered payloads.`,
  );
}
// Prove Next rejects importing server configuration into a browser component.
// The temporary source is removed even when the check fails; never overwrite a file.
const probeDirectory = path.join(root, 'src/app/boundary-probe-test');
assert.ok(!existsSync(probeDirectory), 'Boundary probe directory already exists.');
mkdirSync(probeDirectory);
const probeFile = path.join(probeDirectory, 'page.tsx');
try {
  writeFileSync(
    probeFile,
    "'use client';\nimport { getBackendConfig } from '../../backend.config';\nexport default function Probe() { return <p>{getBackendConfig().serviceCredential}</p>; }\n",
  );
  const result = spawnSync(process.execPath, [pnpm, 'run', 'build'], {
    cwd: root,
    env: baseEnv,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  assert.notEqual(result.status, 0, 'A client import of backend.config must fail to build.');
  assert.match(result.stdout + result.stderr, /server-only/);
  console.info(
    'PASS: deliberate client import of backend.config fails the Next.js server-only boundary.',
  );
} finally {
  unlinkSync(probeFile);
  rmdirSync(probeDirectory);
}

// Two real production builds prove compile-time NEXT_PUBLIC behavior, not a mocked toggle.
for (const enabled of [true, false]) {
  const env = {
    ...baseEnv,
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: enabled ? 'https://analytics.example.test/script.js' : '',
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: enabled ? 'test-website' : '',
    TEST_UMAMI_ENABLED: enabled ? '1' : '0',
  };
  run(['run', 'build'], env);
  scan();
  run(['exec', 'playwright', 'test'], env);
}
console.info('PASS: credential scan and desktop/mobile journeys with Umami enabled and disabled.');
