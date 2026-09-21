/**
 * External deletion/suppression ledger (IMPLEMENTATION_PLAN §13). It lives
 * outside any single application-database snapshot so a restore of an older
 * backup can replay later deletions before the system reopens. Events carry
 * identifiers and an action only — never the deleted personal data.
 *
 * Phase A ships the port, a verified in-memory implementation for tests and a
 * remote HTTP seam. The real Backblaze B2 target (with S3 SigV4 signing and
 * write-only credentials) is provisioned by T4R; until it is configured the
 * backend must fail closed, never silently use the in-memory ledger.
 */

export const deletionActions = ['delete_customer_data'] as const;
export type DeletionAction = (typeof deletionActions)[number];

export interface DeletionLedgerEvent {
  /** Stable logical operation id. A retry republishes the same id (idempotent). */
  eventId: string;
  workspaceId: string;
  action: DeletionAction;
  subjectType: 'order';
  subjectId: string;
  /** ISO-8601 UTC timestamp. */
  occurredAt: string;
}

export interface DeletionLedgerAcknowledgement {
  acknowledgementId: string;
}

export interface DeletionLedger {
  publish(event: DeletionLedgerEvent): Promise<DeletionLedgerAcknowledgement>;
}

/**
 * Append-only, idempotent ledger for tests and non-production environments.
 * `available: false` simulates an unreachable ledger so callers can prove they
 * fail closed; it never pretends a publication succeeded.
 */
export class InMemoryDeletionLedger implements DeletionLedger {
  readonly published: DeletionLedgerEvent[] = [];
  private readonly acknowledgements = new Map<string, string>();

  constructor(private readonly available = true) {}

  async publish(event: DeletionLedgerEvent): Promise<DeletionLedgerAcknowledgement> {
    if (!this.available) throw new Error('deletion_ledger_unavailable');
    const existing = this.acknowledgements.get(event.eventId);
    if (existing) return { acknowledgementId: existing };
    const acknowledgementId = `in-memory-ledger:${event.eventId}`;
    this.acknowledgements.set(event.eventId, acknowledgementId);
    this.published.push(structuredClone(event));
    return { acknowledgementId };
  }

  has(eventId: string): boolean {
    return this.acknowledgements.has(eventId);
  }
}

export interface HttpDeletionLedgerOptions {
  /** Write endpoint of the dedicated ledger bucket (Backblaze B2). */
  readonly endpoint: string;
  /** Write-only credential; it cannot delete or read back other events. */
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}

/**
 * Remote ledger publisher seam. The object key is the logical event id, so a
 * retry overwrites the same key rather than appending a duplicate. The provider
 * is B2/S3-compatible; SigV4 signing and write-only key restrictions are added
 * when the T4R ledger is provisioned.
 */
export class HttpDeletionLedger implements DeletionLedger {
  private readonly doFetch: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: HttpDeletionLedgerOptions) {
    this.doFetch = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async publish(event: DeletionLedgerEvent): Promise<DeletionLedgerAcknowledgement> {
    const url = `${this.options.endpoint.replace(/\/+$/, '')}/events/${encodeURIComponent(event.eventId)}.json`;
    const response = await this.doFetch(url, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${this.options.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(event),
      redirect: 'error',
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`deletion_ledger_http_${response.status}`);
    return { acknowledgementId: `ledger:${event.eventId}` };
  }
}

/** Resolves the ledger from the environment, or `undefined` so callers fail closed. */
export function createDeletionLedgerFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DeletionLedger | undefined {
  const endpoint = env.DELETION_LEDGER_ENDPOINT?.trim();
  const token = env.DELETION_LEDGER_TOKEN?.trim();
  if (!endpoint || !token) return undefined;
  return new HttpDeletionLedger({ endpoint, token });
}
