import fs from 'node:fs';
import { writerPlan, verifyWriterScope } from './b2-writer-plan.mjs';

// Default is review-only. Credentials must be injected through a secure local
// environment, never command-line arguments or source files.
if (!process.argv.includes('--apply')) {
  console.info(JSON.stringify(writerPlan, null, 2));
} else {
  const keyId = process.env.B2_PROVISION_KEY_ID;
  const key = process.env.B2_PROVISION_KEY;
  if (!keyId || !key) throw new Error('Missing secure B2 provisioning credentials.');
  // Reserve a gitignored output before creating external resources. Never overwrite.
  const output = fs.openSync('.env.b2-writers', 'wx', 0o600);
  try {
    const authorization = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
      headers: { authorization: `Basic ${Buffer.from(`${keyId}:${key}`).toString('base64')}` },
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    if (!authorization.ok) throw new Error('B2 authorization failed.');
    const auth = await authorization.json();
    const apiUrl = auth.apiInfo?.storageApi?.apiUrl;
    const url = new URL(apiUrl);
    if (
      url.protocol !== 'https:' ||
      !url.hostname.endsWith('.backblazeb2.com') ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== '/'
    ) {
      throw new Error('Unexpected B2 API endpoint.');
    }
    for (const [index, plan] of writerPlan.entries()) {
      const response = await fetch(`${url.origin}/b2api/v4/b2_create_key`, {
        method: 'POST',
        headers: { authorization: auth.authorizationToken, 'content-type': 'application/json' },
        body: JSON.stringify({ accountId: auth.accountId, ...plan }),
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
      if (!response.ok)
        throw new Error('B2 key creation failed; review account keys before retrying.');
      const created = await response.json();
      // Persist the one-time result before validation so a failed check cannot
      // strand an unknown key. Never print secret values or response bodies.
      const prefix = index === 0 ? 'B2_ARCHIVE' : 'B2_LEDGER';
      if (
        typeof created.applicationKeyId !== 'string' ||
        typeof created.applicationKey !== 'string' ||
        /[\r\n]/.test(created.applicationKeyId + created.applicationKey)
      ) {
        throw new Error('Unexpected B2 key response; inspect account keys.');
      }
      fs.writeSync(
        output,
        `${prefix}_KEY_ID=${created.applicationKeyId}\n${prefix}_KEY=${created.applicationKey}\n`,
      );
      verifyWriterScope(created, plan);
      console.info(`${plan.keyName}: exact capabilities and bucket verified.`);
    }
    console.info('Saved keys to .env.b2-writers. Transfer to the protected backup secret store.');
  } catch {
    console.error(
      'Provisioning incomplete. Inspect account keys and the local secret file before retrying; do not use unverified keys.',
    );
    process.exitCode = 1;
  } finally {
    fs.closeSync(output);
  }
}
