import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validatePreviewIsolation } from './check-preview-isolation.mjs';

const fingerprint = (character) => `sha256:${character.repeat(64)}`;

function validInventory() {
  return {
    schemaVersion: 1,
    productionResourceFingerprints: [
      { kind: 'postgres', immutableIdFingerprint: fingerprint('a') },
    ],
    resources: [
      {
        id: 'preview-db',
        provider: 'supabase',
        kind: 'postgres',
        environment: 'preview',
        immutableIdFingerprint: fingerprint('b'),
      },
    ],
    credentialCatalog: [{ deployment: 'backend', name: 'DATABASE_URL', resourceKind: 'postgres' }],
    previewDeployments: [
      {
        deployment: 'backend',
        status: 'provisioned',
        credentialNames: ['DATABASE_URL'],
        emailProvider: 'fake',
        authSmtp: 'fake_sink',
      },
    ],
    previewCredentialBindings: [
      { deployment: 'backend', credentialName: 'DATABASE_URL', resourceId: 'preview-db' },
    ],
  };
}

test('accepts a preview credential mapped to a distinct immutable resource fingerprint', () => {
  assert.deepEqual(validatePreviewIsolation(validInventory()), {
    deployments: 1,
    provisionedDeployments: 1,
    credentialBindings: 1,
  });
});

test('rejects a vacuous inventory and missing required app/catalog entries', () => {
  assert.throws(
    () =>
      validatePreviewIsolation({
        ...validInventory(),
        credentialCatalog: [],
        previewDeployments: [],
      }),
    /cannot be empty/,
  );
  assert.throws(
    () => validatePreviewIsolation(validInventory(), { deployments: ['admin'] }),
    /required deployment admin/,
  );
  assert.throws(
    () =>
      validatePreviewIsolation(validInventory(), { credentialKeys: ['backend:SUPABASE_ANON_KEY'] }),
    /required credential catalog/,
  );
});

test('requires fake customer email and separately configured Auth SMTP', () => {
  for (const field of ['emailProvider', 'authSmtp']) {
    const inventory = validInventory();
    delete inventory.previewDeployments[0][field];
    assert.throws(() => validatePreviewIsolation(inventory), /independent Auth SMTP sink/);
  }
});

test('rejects a provisioned preview credential without a resource binding', () => {
  const inventory = validInventory();
  inventory.previewCredentialBindings = [];
  assert.throws(
    () => validatePreviewIsolation(inventory),
    /has no isolated preview resource binding/,
  );
});

test('rejects name-only preview resources without immutable identifiers', () => {
  const inventory = validInventory();
  delete inventory.resources[0].immutableIdFingerprint;
  assert.throws(() => validatePreviewIsolation(inventory), /provider-issued immutable ID/);
});

test('rejects a preview binding that points at a production resource', () => {
  const inventory = validInventory();
  inventory.resources[0].immutableIdFingerprint = fingerprint('a');
  assert.throws(() => validatePreviewIsolation(inventory), /matches a production resource/);
});

test('rejects raw credential values anywhere in the redacted inventory', () => {
  const inventory = validInventory();
  inventory.previewCredentialBindings[0].secret = 'must-not-be-committed';
  assert.throws(() => validatePreviewIsolation(inventory), /raw credential\/resource field/);
});

test('accepts an explicitly unprovisioned preview with no credentials', () => {
  const inventory = validInventory();
  inventory.resources = [];
  inventory.previewCredentialBindings = [];
  inventory.previewDeployments[0] = {
    deployment: 'backend',
    status: 'not_provisioned',
    credentialNames: [],
  };
  assert.equal(validatePreviewIsolation(inventory).credentialBindings, 0);
});
