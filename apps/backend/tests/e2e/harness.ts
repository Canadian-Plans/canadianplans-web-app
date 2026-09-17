/**
 * T13 end-to-end harness (site-1 order journey).
 *
 * Runs the REAL backend application (`createApp`) against a disposable
 * Postgres, with exactly three test seams that cannot exist in production:
 *
 *  1. A stub published-catalogue provider, so the journey does not need a live
 *     Sanity project. It implements the same `SanityCatalogue` interface the
 *     real adapter does, and can be armed to fail, to exercise the
 *     quote-failure path through the real quote service.
 *  2. An admitting bot check, because the production verifier deliberately
 *     rejects Cloudflare's public test secrets and there is no legitimate
 *     token to obtain here.
 *  3. Raised website rate-limit thresholds. The limiter itself is the real
 *     DB-backed one and still runs on every request; only the numbers move.
 *     The whole Playwright suite shares one client IP (127.0.0.1) behind the
 *     proxy below, so the production 120-requests-per-minute IP bucket is
 *     spent by the suite's own traffic — a later test then gets a 429 on
 *     `GET /api/v1/website/offers`, the order page renders "Plans are
 *     unavailable right now", and the spec times out waiting for a plan
 *     link. That is an artifact of co-located test traffic, not a defect the
 *     journey should assert, and it made the suite flaky.
 *
 * Everything else is the real thing: real HTTP routes, real service
 * credentials and scopes, real Postgres with RLS, real lead/quote/order
 * transactions, real idempotency and reference generation.
 *
 * A tiny HTTP proxy fronts the app so a test can drop the response of an
 * already-committed `POST /api/v1/orders` ("connection dropped after the save")
 * and prove the retry returns the same reference.
 *
 * This module is never imported by the deployed handler: tsup bundles only
 * `src/vercelHandler.ts` and `src/server.ts`.
 */
import http from 'node:http';
import { createApp } from '../../src/app.js';
import { CatalogueService } from '../../src/catalogue/service.js';
import { DatabaseCatalogueStore } from '../../src/catalogue/store.js';
import { DatabaseLeadStore } from '../../src/leads/store.js';
import { OrderService } from '../../src/orders/service.js';
import { DatabaseOrderStore } from '../../src/orders/store.js';
import type { WebsiteRouteDependencies } from '../../src/routes/website.js';
import { hashServiceSecret } from '../../src/website/credential.js';
import type { PublishedOffer } from '@canadian-plans/contracts';
import { commercialOfferSchema } from '@canadian-plans/contracts';
import type { SanityCatalogue, SiteRevalidator } from '@canadian-plans/adapters';
import postgres from 'postgres';
import { applyMigrations } from '@canadian-plans/db/migrations';
import { setTestRuntimePassword } from '@canadian-plans/db/test-helpers';
import { rateLimitHit, resolveWebsiteCredential } from '@canadian-plans/db';

const INTERNAL_PORT = Number(process.env['E2E_BACKEND_PORT'] ?? 4101);
const PUBLIC_PORT = Number(process.env['E2E_HARNESS_PORT'] ?? 4100);
const WORKSPACE_ID = process.env['E2E_WORKSPACE_ID'] ?? '10000000-0000-4000-8000-000000000e01';
const ACTOR_ID = process.env['E2E_ACTOR_ID'] ?? '20000000-0000-4000-8000-000000000e02';
const SERVICE_SECRET =
  process.env['E2E_SERVICE_CREDENTIAL'] ?? 'cplsk_e2e_order_journey_secret_0001';
const ADMIN_URL = process.env['TEST_MIGRATION_DATABASE_URL'];
const DEFAULT_POLICY = 'honour_until_expiry';

if (!ADMIN_URL) {
  process.stderr.write('TEST_MIGRATION_DATABASE_URL is required for the e2e harness.\n');
  process.exit(1);
}

function offer(
  productKey: string,
  documentId: string,
  offerName: string,
  recurringChargeAmountMinor: number,
  amountPayableTodayMinor: number,
  documentChecklist: string[],
): PublishedOffer {
  return {
    documentId,
    revisionId: `${documentId}-r1`,
    commercial: commercialOfferSchema.parse({
      productKey,
      productTitle: '[TEST] E2E SIM plan',
      productType: 'sim',
      offerName,
      currency: 'CAD',
      recurringChargeAmountMinor,
      oneTimeFees: [{ label: 'Activation fee (TEST)', amountMinor: 1000 }],
      amountPayableTodayMinor,
      paymentRequired: false,
      documentChecklist,
      eligibility: 'TEST FIXTURE — illustrative only.',
      availability: 'TEST FIXTURE — illustrative only.',
      billingParty: 'Canadian Plans (TEST)',
      contractTerms: [{ _type: 'block', children: [] }],
      termsVersion: 'e2e-terms-1',
      specs: { carrier: 'Rogers (TEST)', dataAllowance: '10 GB' },
    }),
  };
}

/** Same interface as the real Sanity adapter; armable to fail for quote tests. */
class StubCatalogue implements SanityCatalogue {
  constructor(private readonly offers: readonly PublishedOffer[]) {}
  private failing = false;

  armFailure(): void {
    this.failing = true;
  }

  disarm(): void {
    this.failing = false;
  }

  private guard(): void {
    if (this.failing) throw new Error('sanity_unavailable');
  }

  async fetchPublishedByDocumentId(documentId: string) {
    this.guard();
    return this.offers.find((candidate) => candidate.documentId === documentId);
  }

  async fetchPublishedByProductKey(productKey: string) {
    this.guard();
    return this.offers.find((candidate) => candidate.commercial.productKey === productKey);
  }

  async listPublished() {
    return [...this.offers];
  }
}

const revalidator: SiteRevalidator = { revalidate: async () => undefined };

const catalogue = new StubCatalogue([
  offer('e2e-passport-plan', 'e2e-document-passport', '[TEST] E2E Passport Plan', 3_500, 4_500, [
    'passport',
  ]),
  offer('e2e-simple-plan', 'e2e-document-simple', '[TEST] E2E Simple Plan', 5_000, 6_000, ['none']),
]);

const catalogueService = new CatalogueService(
  new DatabaseCatalogueStore(),
  () => ({ account: 'e2e-catalogue-account', catalogue, revalidator }),
  DEFAULT_POLICY,
);

/**
 * Seam 3 (see the module comment): the real limiter, thresholds raised so the
 * suite cannot rate-limit itself from its single shared client IP. Still
 * finite, so a genuine runaway loop in a journey is caught rather than hidden.
 */
const E2E_RATE_LIMITS = {
  ipWindowSeconds: 60,
  ipMaxCount: 20_000,
  credentialWindowSeconds: 60,
  credentialMaxCount: 20_000,
};

const website: WebsiteRouteDependencies = {
  auth: {
    resolveCredential: resolveWebsiteCredential,
    rateLimit: rateLimitHit,
    botCheck: async () => true,
    limits: E2E_RATE_LIMITS,
  },
  leads: { store: new DatabaseLeadStore() },
  quotes: { service: catalogueService },
  orders: { service: new OrderService(new DatabaseOrderStore(), DEFAULT_POLICY) },
  // The website-scoped published-offer read the order form's step 1 uses.
  catalogue: { store: new DatabaseCatalogueStore() },
};

async function seed(admin: ReturnType<typeof postgres>): Promise<void> {
  await admin`
    insert into app.workspaces (id, slug, name)
    values (${WORKSPACE_ID}, 'e2e-order-journey', 'E2E Order Journey')
    on conflict (id) do nothing
  `;
  await admin`
    truncate table
      app.orders, app.quotes, app.leads, app.draft_grants, app.idempotency_keys,
      app.catalogue_sync_events, app.catalogue_sync_leases, app.catalogue_sync_state,
      app.products, app.offer_versions, app.product_availability,
      app.audit_events, app.outbox_jobs, app.outbox_job_alerts
    restart identity cascade
  `;
  await admin`delete from app.service_credentials where workspace_id = ${WORKSPACE_ID}`;
  await admin`
    insert into app.service_credentials (workspace_id, secret_hash, scopes)
    values (
      ${WORKSPACE_ID},
      ${hashServiceSecret(SERVICE_SECRET)},
      ${['leads:write', 'quotes:create', 'orders:create']}
    )
  `;
  // Persist the stub's published offers through the REAL catalogue path, so the
  // products, immutable offer versions and availability rows are genuine.
  await catalogueService.reconcile(WORKSPACE_ID, ACTOR_ID);
}

async function main(): Promise<void> {
  const adminUrl = ADMIN_URL;
  if (!adminUrl) throw new Error('TEST_MIGRATION_DATABASE_URL is required');
  await applyMigrations({ connectionString: adminUrl, ssl: false });
  const admin = postgres(adminUrl, { max: 2, prepare: false, ssl: false });
  // The runtime role's password is a deployment secret, not part of the schema;
  // on a fresh disposable database it must be set before the app connects.
  await setTestRuntimePassword(admin);
  await seed(admin);

  // Built only after the runtime role is ready, so no connection is opened
  // before the disposable database has a usable app_runtime password.
  const app = createApp({ website });

  const internal = app.listen(INTERNAL_PORT, '127.0.0.1');
  await new Promise<void>((resolve) => internal.once('listening', resolve));

  let dropOrders = 0;

  const proxy = http.createServer((req, res) => {
    const url = req.url ?? '/';
    if (url.startsWith('/__e2e__/')) {
      void handleControl(req, res, admin);
      return;
    }
    const isOrder = req.method === 'POST' && url === '/api/v1/orders';
    const drop = isOrder && dropOrders > 0;
    if (drop) dropOrders -= 1;

    const upstream = http.request(
      {
        host: '127.0.0.1',
        port: INTERNAL_PORT,
        path: url,
        method: req.method,
        headers: req.headers,
      },
      (upstreamResponse) => {
        if (drop) {
          // The order is already committed upstream. Consume the response but
          // never deliver it, so the client sees a dropped connection.
          upstreamResponse.resume();
          upstreamResponse.on('end', () => res.socket?.destroy());
          return;
        }
        res.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502).end();
    });
    req.pipe(upstream);
  });

  async function handleControl(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    db: ReturnType<typeof postgres>,
  ): Promise<void> {
    const url = req.url ?? '';
    try {
      if (url === '/__e2e__/reset' && req.method === 'POST') {
        dropOrders = 0;
        catalogue.disarm();
        res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
        return;
      }
      if (url.startsWith('/__e2e__/drop-next-orders') && req.method === 'POST') {
        const requested = Number(new URL(url, 'http://127.0.0.1').searchParams.get('count') ?? '1');
        dropOrders = Number.isFinite(requested) && requested > 0 ? requested : 1;
        res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
        return;
      }
      if (url === '/__e2e__/fail-next-quotes' && req.method === 'POST') {
        catalogue.armFailure();
        res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
        return;
      }
      if (url === '/__e2e__/orders' && req.method === 'GET') {
        const rows = await db<{ reference: string }[]>`
          select reference from app.orders where workspace_id = ${WORKSPACE_ID} order by created_at
        `;
        res
          .writeHead(200, { 'content-type': 'application/json' })
          .end(
            JSON.stringify({ count: rows.length, references: rows.map((row) => row.reference) }),
          );
        return;
      }
      res.writeHead(404).end();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'control_failed';
      res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ message }));
    }
  }

  proxy.listen(PUBLIC_PORT, '127.0.0.1', () => {
    process.stdout.write(
      `e2e harness listening on http://127.0.0.1:${PUBLIC_PORT} (backend ${INTERNAL_PORT})\n`,
    );
  });

  const shutdown = () => {
    proxy.close();
    internal.close();
    void admin.end();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'harness_failed'}\n`);
  process.exit(1);
});
