import { createDatabaseClient } from '@canadian-plans/db';
import { z } from 'zod';

import { loadMachineRegistry } from '../machines/registry.js';
import { loadQuoteWithdrawalPolicy } from './policy.js';
import { CatalogueService, providerResolverFromRegistry } from './service.js';
import { DatabaseCatalogueStore } from './store.js';

const argumentsSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('process-event'), workspaceId: z.uuid(), eventId: z.uuid() }),
  z.object({ action: z.literal('reconcile'), workspaceId: z.uuid() }),
]);

async function main(): Promise<void> {
  const [action, workspaceId, eventId] = process.argv.slice(2);
  const args = argumentsSchema.parse(
    action === 'process-event' ? { action, workspaceId, eventId } : { action, workspaceId },
  );
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const sslMode = process.env.DATABASE_SSL_MODE ?? 'require';
  if (sslMode !== 'require' && sslMode !== 'disable') {
    throw new Error('DATABASE_SSL_MODE must be require or disable');
  }
  const database = createDatabaseClient({
    connectionString,
    ssl: sslMode === 'require' ? 'require' : false,
    maxConnections: 1,
  });
  try {
    const registry = loadMachineRegistry();
    const service = new CatalogueService(
      new DatabaseCatalogueStore(database),
      providerResolverFromRegistry(registry),
      loadQuoteWithdrawalPolicy(),
    );
    if (args.action === 'process-event') {
      await service.processEvent(args.workspaceId, args.eventId);
    } else {
      await service.reconcile(args.workspaceId);
    }
  } finally {
    await database.close();
  }
}

void main().catch((error: unknown) => {
  const code = error instanceof z.ZodError ? 'invalid_arguments' : 'catalogue_job_failed';
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
});
