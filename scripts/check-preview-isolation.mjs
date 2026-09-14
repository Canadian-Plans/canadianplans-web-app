import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sha256Fingerprint = /^sha256:[0-9a-f]{64}$/;
const allowedStatuses = new Set(['not_provisioned', 'provisioned']);
const forbiddenKey = /^(secret|token|password|connectionString|url|endpoint)$/i;

function fail(message) {
  throw new Error(`Preview isolation inventory: ${message}`);
}

export function validatePreviewIsolation(inventory) {
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) {
    fail('root must be an object');
  }
  if (inventory.schemaVersion !== 1) fail('schemaVersion must be 1');
  const pending = [{ path: 'root', value: inventory }];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || !current.value || typeof current.value !== 'object') continue;
    for (const [key, value] of Object.entries(current.value)) {
      const fieldPath = `${current.path}.${key}`;
      if (forbiddenKey.test(key)) fail(`raw credential/resource field ${fieldPath} is forbidden`);
      if (value && typeof value === 'object') pending.push({ path: fieldPath, value });
    }
  }

  const catalog = Array.isArray(inventory.credentialCatalog)
    ? inventory.credentialCatalog
    : fail('credentialCatalog must be an array');
  const deployments = Array.isArray(inventory.previewDeployments)
    ? inventory.previewDeployments
    : fail('previewDeployments must be an array');
  const resources = Array.isArray(inventory.resources)
    ? inventory.resources
    : fail('resources must be an array');
  const bindings = Array.isArray(inventory.previewCredentialBindings)
    ? inventory.previewCredentialBindings
    : fail('previewCredentialBindings must be an array');
  const productionEntries = Array.isArray(inventory.productionResourceFingerprints)
    ? inventory.productionResourceFingerprints
    : fail('productionResourceFingerprints must be an array');
  const production = new Set();
  const productionKinds = new Set();

  const catalogKeys = new Set();
  for (const entry of catalog) {
    if (!entry?.deployment || !entry?.name || !entry?.resourceKind) {
      fail('each credential catalog entry needs deployment, name and resourceKind');
    }
    const key = `${entry.deployment}:${entry.name}`;
    if (catalogKeys.has(key)) fail(`duplicate credential catalog entry ${key}`);
    catalogKeys.add(key);
  }

  for (const entry of productionEntries) {
    if (!entry?.kind || !sha256Fingerprint.test(entry?.immutableIdFingerprint ?? '')) {
      fail('production resource fingerprints must be redacted SHA-256 values');
    }
    production.add(entry.immutableIdFingerprint);
    productionKinds.add(entry.kind);
  }

  const resourceById = new Map();
  for (const resource of resources) {
    if (!resource?.id || !resource?.provider || !resource?.kind) {
      fail('each preview resource needs id, provider and kind');
    }
    if (!sha256Fingerprint.test(resource.immutableIdFingerprint ?? '')) {
      fail(`${resource.id} needs a SHA-256 fingerprint of a provider-issued immutable ID`);
    }
    if (resource.environment !== 'preview' && resource.environment !== 'non_production') {
      fail(`${resource.id} is not marked preview/non_production`);
    }
    if (production.has(resource.immutableIdFingerprint)) {
      fail(`${resource.id} matches a production resource fingerprint`);
    }
    if (resourceById.has(resource.id)) fail(`duplicate resource id ${resource.id}`);
    resourceById.set(resource.id, resource);
  }

  const bindingKeys = new Set();
  for (const binding of bindings) {
    const key = `${binding?.deployment}:${binding?.credentialName}`;
    if (!catalogKeys.has(key)) fail(`binding ${key} is absent from the credential catalog`);
    if (bindingKeys.has(key)) fail(`duplicate preview credential binding ${key}`);
    const resource = resourceById.get(binding.resourceId);
    if (!resource) fail(`binding ${key} references an unknown resource`);
    const catalogEntry = catalog.find(
      (entry) => entry.deployment === binding.deployment && entry.name === binding.credentialName,
    );
    if (catalogEntry.resourceKind !== resource.kind) {
      fail(`binding ${key} targets ${resource.kind}, expected ${catalogEntry.resourceKind}`);
    }
    bindingKeys.add(key);
  }

  const deploymentNames = new Set();
  for (const deployment of deployments) {
    if (!deployment?.deployment || !allowedStatuses.has(deployment.status)) {
      fail('each preview deployment needs a name and valid status');
    }
    if (deploymentNames.has(deployment.deployment)) {
      fail(`duplicate preview deployment ${deployment.deployment}`);
    }
    deploymentNames.add(deployment.deployment);
    if (!Array.isArray(deployment.credentialNames)) {
      fail(`${deployment.deployment} credentialNames must be an array`);
    }
    if (deployment.status === 'not_provisioned' && deployment.credentialNames.length > 0) {
      fail(`${deployment.deployment} cannot inventory credentials while not provisioned`);
    }
    for (const credentialName of deployment.credentialNames) {
      const key = `${deployment.deployment}:${credentialName}`;
      if (!catalogKeys.has(key)) fail(`${key} is absent from the credential catalog`);
      if (!bindingKeys.has(key)) fail(`${key} has no isolated preview resource binding`);
    }
  }

  for (const key of bindingKeys) {
    const [deployment, credentialName] = key.split(':');
    const target = deployments.find((entry) => entry.deployment === deployment);
    if (
      !target ||
      target.status !== 'provisioned' ||
      !target.credentialNames.includes(credentialName)
    ) {
      fail(`binding ${key} is not declared by a provisioned preview deployment`);
    }
  }

  if (bindings.length > 0) {
    for (const resource of resources) {
      if (!productionKinds.has(resource.kind)) {
        fail(`${resource.id} has no same-kind production fingerprint for comparison`);
      }
    }
  }

  return {
    deployments: deployments.length,
    provisionedDeployments: deployments.filter((entry) => entry.status === 'provisioned').length,
    credentialBindings: bindings.length,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const inventoryPath = path.resolve('docs/DEPLOYMENT_INVENTORY.json');
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const result = validatePreviewIsolation(inventory);
  console.info(
    `Preview isolation inventory valid: ${result.provisionedDeployments}/${result.deployments} deployments provisioned, ${result.credentialBindings} credential bindings.`,
  );
}
