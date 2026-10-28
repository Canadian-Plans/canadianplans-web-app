/**
 * End-to-end harness (site-1 order journey + real staff API).
 *
 * Runs the REAL backend application (`createApp`) against a disposable
 * Postgres. Everything commercial is the real thing — real HTTP routes, real
 * service credentials and scopes, real Postgres with RLS, real lead/quote/order
 * transactions, real idempotency and reference generation, the real staff
 * authorization store, the real outbox runner and job store. Only a small,
 * clearly bounded set of test seams exists, none of which can be present in
 * production:
 *
 *  1. A stub published-catalogue provider, so the journey does not need a live
 *     Sanity project. It implements the same `SanityCatalogue` interface the
 *     real adapter does, and can be armed to fail (quote-failure path), have a
 *     price changed mid-flight (snapshot test), or have an offer withdrawn
 *     (withdrawal-policy test) — all still driven through the real reconcile
 *     path, never by poking the store directly.
 *  2. A stateful, action-bound one-use proof verifier. The browser replaces
 *     only Cloudflare's external script; missing/reused/wrong-action proofs
 *     fail here, while production uses the real Siteverify transport.
 *  3. Raised website rate-limit thresholds. The limiter itself is the real
 *     DB-backed one and still runs on every request; only the numbers move, so
 *     the whole suite cannot rate-limit itself from its single shared client
 *     IP (127.0.0.1) behind the proxy below.
 *  4. A stub staff-session verifier that admits one seeded, fully-privileged
 *     staff actor for a fixed bearer token. The production verifier is
 *     `SupabaseStaffSessionVerifier`; there is no Supabase Auth project in CI.
 *     Everything past the verifier — the real authorization store, RLS,
 *     transitions, order/job queries — is genuine.
 *  5. A harness-owned outbox runner whose email handler can be armed to fail
 *     permanently, so the "email failed, order intact, job visible/retryable"
 *     journey can be proven. The analytics handler and the store are the real
 *     ones.
 *
 * A tiny HTTP proxy fronts the app so a test can drop the response of an
 * already-committed `POST /api/v1/orders` ("connection dropped after the save")
 * and prove the retry returns the same reference, and so the `/__e2e__/*`
 * control plane can drive the seams above.
 *
 * This module is never imported by the deployed server: tsup bundles only
 * `src/server.ts`.
 */
import http from 'node:http';
import { createApp } from '../../src/app.js';
import { CatalogueService } from '../../src/catalogue/service.js';
import { DatabaseCatalogueStore } from '../../src/catalogue/store.js';
import {
  loadQuoteWithdrawalPolicy,
  type QuoteWithdrawalPolicy,
} from '../../src/catalogue/policy.js';
import { DatabaseLeadStore } from '../../src/leads/store.js';
import { DatabaseRegionWaitlistStore } from '../../src/waitlist/store.js';
import { OrderService } from '../../src/orders/service.js';
import { DatabaseOrderStore } from '../../src/orders/store.js';
import { DatabaseOutboxStore } from '../../src/jobs/store.js';
import { DatabaseTrackingStore } from '../../src/tracking/store.js';
import { TrackingService } from '../../src/tracking/service.js';
import { createTrackingOtpHandler } from '../../src/tracking/delivery.js';
import { DatabaseEmailStore } from '../../src/email/store.js';
import { DatabaseDraftGrantVerifier } from '../../src/documents/grant.js';
import { DatabaseDocumentContextResolver } from '../../src/documents/resolver.js';
import { DocumentService } from '../../src/documents/service.js';
import { DatabaseDocumentStore } from '../../src/documents/store.js';
import type { WebsiteRouteDependencies } from '../../src/routes/website.js';
import {
  createDefaultStaffRouteDependencies,
  type StaffRouteDependencies,
} from '../../src/routes/staff.js';
import type { StaffSessionVerifier, VerifiedStaffSession } from '../../src/auth/session.js';
import { hashServiceSecret } from '../../src/website/credential.js';
import type { PublishedOffer } from '@canadian-plans/contracts';
import { commercialOfferSchema } from '@canadian-plans/contracts';
import type { SanityCatalogue, SiteRevalidator } from '@canadian-plans/adapters';
import {
  FakeAnalyticsSink,
  FakeEmailAdapter,
  InMemoryR2DocumentStore,
  type CreateUploadInput,
  type PresignedUpload,
} from '@canadian-plans/adapters';
import {
  createJobHandlerRegistry,
  JobHandlerError,
  OutboxRunner,
  type JobHandler,
  type JobHandlerRegistry,
} from '@canadian-plans/jobs';
import postgres from 'postgres';
import { applyMigrations } from '@canadian-plans/db/migrations';
import {
  assertDisposableDatabaseUrl,
  setTestRuntimePassword,
} from '@canadian-plans/db/test-helpers';
import { rateLimitHit, resolveWebsiteCredential } from '@canadian-plans/db';

const INTERNAL_PORT = Number(process.env['E2E_BACKEND_PORT'] ?? 4101);
const PUBLIC_PORT = Number(process.env['E2E_HARNESS_PORT'] ?? 4100);
const WORKSPACE_ID = process.env['E2E_WORKSPACE_ID'] ?? '10000000-0000-4000-8000-000000000e01';
const ACTOR_ID = process.env['E2E_ACTOR_ID'] ?? '20000000-0000-4000-8000-000000000e02';
const STAFF_ACTOR_ID = process.env['E2E_STAFF_ACTOR_ID'] ?? '20000000-0000-4000-8000-000000000e03';
const MEMBER_ACTOR_ID = '20000000-0000-4000-8000-000000000e04';
const MEMBER_BEARER = 'e2e-staff-session-member-aal2';
const STAFF_EMAIL = process.env['E2E_STAFF_EMAIL'] ?? 'staff@example.test';
const STAFF_BEARER = process.env['E2E_STAFF_BEARER'] ?? 'e2e-staff-session-owner-aal2';
const SERVICE_SECRET =
  process.env['E2E_SERVICE_CREDENTIAL'] ?? 'cplsk_e2e_order_journey_secret_0001';
const ADMIN_URL = process.env['TEST_MIGRATION_DATABASE_URL'];
const TRACKING_SECRET = 'e2e-only-tracking-secret-32characters-0001';
process.env.TRACKING_HASH_SECRET = TRACKING_SECRET;

/**
 * The default policy at boot and after every `reset`. An unset/`unresolved`
 * environment falls back to `honour_until_expiry` so the happy-path journey and
 * the existing suite work; the `unresolved` production-gating case is armed
 * per-test through `set-withdrawal-policy`.
 */
const ENV_POLICY = loadQuoteWithdrawalPolicy();
const DEFAULT_POLICY: QuoteWithdrawalPolicy =
  ENV_POLICY === 'unresolved' ? 'honour_until_expiry' : ENV_POLICY;

/** Fixture prices. Kept here so the specs can assert against known values. */
const PASSPORT_KEY = 'e2e-passport-plan';
const PASSPORT_DOCUMENT = 'e2e-document-passport';
const ACTIVATION_FEE_MINOR = 1_000;
const ORIGINAL_PASSPORT_RECURRING_MINOR = 3_500;
const ORIGINAL_PASSPORT_PAYABLE_TODAY_MINOR = 4_500;

if (!ADMIN_URL) {
  process.stderr.write('TEST_MIGRATION_DATABASE_URL is required for the e2e harness.\n');
  process.exit(1);
}

// The harness truncates 22 tenant tables and resets app_runtime's password:
// refuse anything but a local or explicitly disposable database, for both the
// privileged URL and the runtime URL the backend will use.
try {
  assertDisposableDatabaseUrl(ADMIN_URL);
  const runtimeUrl = process.env['DATABASE_URL'];
  if (runtimeUrl) assertDisposableDatabaseUrl(runtimeUrl);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

interface OfferOverrides {
  recurringChargeAmountMinor?: number;
}

function buildOffer(
  productKey: string,
  documentId: string,
  offerName: string,
  recurringChargeAmountMinor: number,
  amountPayableTodayMinor: number,
  documentChecklist: string[],
  revision: number,
): PublishedOffer {
  return {
    documentId,
    revisionId: `${documentId}-r${revision}`,
    commercial: commercialOfferSchema.parse({
      productKey,
      productTitle: '[TEST] E2E SIM plan',
      productType: 'sim',
      offerName,
      currency: 'CAD',
      recurringChargeAmountMinor,
      oneTimeFees: [{ label: 'Activation fee (TEST)', amountMinor: ACTIVATION_FEE_MINOR }],
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

interface OfferSpec {
  productKey: string;
  documentId: string;
  offerName: string;
  recurringChargeAmountMinor: number;
  amountPayableTodayMinor: number;
  documentChecklist: string[];
}

const DEFAULT_OFFERS: readonly OfferSpec[] = [
  {
    productKey: PASSPORT_KEY,
    documentId: PASSPORT_DOCUMENT,
    offerName: '[TEST] E2E Passport Plan',
    recurringChargeAmountMinor: ORIGINAL_PASSPORT_RECURRING_MINOR,
    amountPayableTodayMinor: ORIGINAL_PASSPORT_PAYABLE_TODAY_MINOR,
    documentChecklist: ['passport', 'study_permit'],
  },
  {
    productKey: 'e2e-simple-plan',
    documentId: 'e2e-document-simple',
    offerName: '[TEST] E2E Simple Plan',
    recurringChargeAmountMinor: 5_000,
    amountPayableTodayMinor: 6_000,
    documentChecklist: ['none'],
  },
];

/**
 * Same interface as the real Sanity adapter. Mutable so the control plane can
 * arm a fetch failure (quote-failure test), change a price (snapshot test) and
 * withdraw an offer (withdrawal-policy test). Every mutation is still applied to
 * published state through the real reconcile path, never to the store directly.
 */
class StubCatalogue implements SanityCatalogue {
  private offers = new Map<string, PublishedOffer>();
  private readonly hidden = new Set<string>();
  private readonly revision = new Map<string, number>();
  private failing = false;

  constructor(private readonly defaults: readonly OfferSpec[]) {
    this.restore();
  }

  /** Reset every offer to its default price and make all of them visible. */
  restore(): void {
    this.offers = new Map();
    this.hidden.clear();
    this.failing = false;
    for (const spec of this.defaults) this.set(spec, {});
  }

  private set(spec: OfferSpec, overrides: OfferOverrides): void {
    const revision = (this.revision.get(spec.productKey) ?? 0) + 1;
    this.revision.set(spec.productKey, revision);
    this.offers.set(
      spec.productKey,
      buildOffer(
        spec.productKey,
        spec.documentId,
        spec.offerName,
        overrides.recurringChargeAmountMinor ?? spec.recurringChargeAmountMinor,
        spec.amountPayableTodayMinor,
        spec.documentChecklist,
        revision,
      ),
    );
  }

  addInternetFixture(): void {
    const offer = buildOffer(
      'e2e-internet-plan',
      'e2e-document-internet',
      '[TEST] E2E Internet',
      3500,
      0,
      ['none'],
      1,
    );
    this.offers.set('e2e-internet-plan', {
      ...offer,
      commercial: commercialOfferSchema.parse({
        ...offer.commercial,
        productTitle: '[TEST] Internet',
        productType: 'internet',
        regions: ['SK'],
        specs: { carrier: 'E2E Internet', dataAllowance: 'Unlimited', speed: '100 Mbps' },
      }),
    });
  }

  /** Publish a new revision of one offer at a new recurring charge. */
  setRecurringCharge(productKey: string, recurringChargeAmountMinor: number): boolean {
    const spec = this.defaults.find((candidate) => candidate.productKey === productKey);
    if (!spec) return false;
    this.set(spec, { recurringChargeAmountMinor });
    return true;
  }

  /** Remove one offer from the published set (an unpublish in the CMS). */
  hide(productKey: string): boolean {
    if (!this.offers.has(productKey)) return false;
    this.hidden.add(productKey);
    return true;
  }

  armFailure(): void {
    this.failing = true;
  }

  private guard(): void {
    if (this.failing) throw new Error('sanity_unavailable');
  }

  private visible(): PublishedOffer[] {
    return [...this.offers.values()].filter(
      (offer) => !this.hidden.has(offer.commercial.productKey),
    );
  }

  async fetchPublishedByDocumentId(documentId: string) {
    this.guard();
    return this.visible().find((candidate) => candidate.documentId === documentId);
  }

  async fetchPublishedByProductKey(productKey: string) {
    this.guard();
    return this.visible().find((candidate) => candidate.commercial.productKey === productKey);
  }

  async listPublished() {
    return this.visible();
  }
}

const revalidator: SiteRevalidator = { revalidate: async () => undefined };
const catalogue = new StubCatalogue(DEFAULT_OFFERS);

// The mutable services. `set-withdrawal-policy` rebuilds both; the website
// delegates below always call through the current instance.
let policy: QuoteWithdrawalPolicy = DEFAULT_POLICY;

function buildCatalogueService(current: QuoteWithdrawalPolicy): CatalogueService {
  return new CatalogueService(
    new DatabaseCatalogueStore(),
    () => ({ account: 'e2e-catalogue-account', catalogue, revalidator }),
    current,
  );
}

let catalogueService = buildCatalogueService(policy);
let orderService = new OrderService(new DatabaseOrderStore(), policy);

function rebuildServices(next: QuoteWithdrawalPolicy): void {
  policy = next;
  catalogueService = buildCatalogueService(next);
  orderService = new OrderService(new DatabaseOrderStore(), next);
}

function isWithdrawalPolicy(value: string): value is QuoteWithdrawalPolicy {
  return value === 'immediate' || value === 'honour_until_expiry' || value === 'unresolved';
}

/** Reads the two frozen totals out of an order snapshot without a cast. */
function snapshotTotals(snapshot: unknown): {
  totalMinor: number | null;
  amountPayableTodayMinor: number | null;
} {
  const amountMinorOf = (owner: object, key: string): number | null => {
    if (!(key in owner)) return null;
    const nested: unknown = Reflect.get(owner, key);
    if (typeof nested !== 'object' || nested === null || !('amountMinor' in nested)) return null;
    const amount = nested.amountMinor;
    return typeof amount === 'number' ? amount : null;
  };
  if (typeof snapshot !== 'object' || snapshot === null) {
    return { totalMinor: null, amountPayableTodayMinor: null };
  }
  return {
    totalMinor: amountMinorOf(snapshot, 'total'),
    amountPayableTodayMinor: amountMinorOf(snapshot, 'amountPayableToday'),
  };
}

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

/**
 * Seam 6: private storage. The real document service and DB store run; only
 * R2 is the in-memory fake. Its signed PUT names an https origin (the site's
 * CSP allows only https uploads), which a browser test intercepts and forwards
 * to `PUT /__e2e__/r2/<key>` here.
 */
const E2E_STORAGE_ORIGIN = 'https://storage.e2e.test';
class HarnessR2DocumentStore extends InMemoryR2DocumentStore {
  override async createUpload(input: CreateUploadInput): Promise<PresignedUpload> {
    const upload = await super.createUpload(input);
    return { ...upload, url: `${E2E_STORAGE_ORIGIN}/${encodeURIComponent(input.stagingKey)}` };
  }
}
const r2 = new HarnessR2DocumentStore();
const documentService = new DocumentService(
  new DatabaseDocumentStore(),
  r2,
  new DatabaseDocumentContextResolver(),
);

const usedProofs = new Set<string>();
const website: WebsiteRouteDependencies = {
  auth: {
    resolveCredential: resolveWebsiteCredential,
    rateLimit: rateLimitHit,
    botCheck: async (req, action) => {
      const token = req.get('x-turnstile-token');
      if (
        !token ||
        !token.startsWith(`e2e.${action}.`) ||
        !/^[a-f0-9-]{36}$/.test(token.slice(`e2e.${action}.`.length)) ||
        usedProofs.has(token)
      )
        return false;
      usedProofs.add(token);
      return true;
    },
    limits: E2E_RATE_LIMITS,
  },
  leads: { store: new DatabaseLeadStore() },
  regionWaitlist: { store: new DatabaseRegionWaitlistStore() },
  quotes: { service: { createQuote: (input) => catalogueService.createQuote(input) } },
  orders: { service: { submit: (input) => orderService.submit(input) } },
  // The website-scoped published-offer read the order form's step 1 uses.
  catalogue: { store: new DatabaseCatalogueStore() },
  documents: { service: documentService, grants: new DatabaseDraftGrantVerifier() },
  tracking: {
    service: new TrackingService({ store: new DatabaseTrackingStore(), secret: TRACKING_SECRET }),
  },
};

// Seam 4: a stub staff-session verifier admitting the one seeded owner actor.
const staffSessionVerifier: StaffSessionVerifier = {
  verify: async (token: string): Promise<VerifiedStaffSession | undefined> =>
    token === STAFF_BEARER
      ? { actorId: STAFF_ACTOR_ID, verifiedEmail: STAFF_EMAIL, assuranceLevel: 'aal2' }
      : token === MEMBER_BEARER
        ? {
            actorId: MEMBER_ACTOR_ID,
            verifiedEmail: 'model-member@example.test',
            assuranceLevel: 'aal2',
          }
        : undefined,
};

const staff: StaffRouteDependencies = {
  ...createDefaultStaffRouteDependencies(),
  sessionVerifier: staffSessionVerifier,
  // The same harness document service (seam 6), so the admin Documents panel
  // lists what the customer uploaded.
  documentService,
};

// Seam 5: a harness-owned outbox runner. The analytics handler and store are
// real; only the email handler gains an armable permanent failure.
const emailAdapter = new FakeEmailAdapter();
const analyticsSink = new FakeAnalyticsSink();
let armEmailFailure = false;

function buildOutboxHandlers(): JobHandlerRegistry {
  const real = createJobHandlerRegistry({
    email: emailAdapter,
    analytics: analyticsSink,
    eligibility: {
      checkTransactional: async () => ({ eligible: true }),
      checkMarketing: async () => ({ eligible: true }),
    },
  });
  const realEmail = real.get('order_acknowledgement_email');
  if (!realEmail) throw new Error('email handler missing from registry');
  const emailWithSeam: JobHandler = async (job, signal) => {
    if (armEmailFailure) {
      // Non-retryable so the runner records the job as `failed` in one pass, the
      // exact state admin then makes visible and retryable.
      throw new JobHandlerError('fake_email_forced_failure', false);
    }
    return realEmail(job, signal);
  };
  const handlers = new Map(real);
  handlers.set('order_acknowledgement_email', emailWithSeam);
  handlers.set(
    'tracking_otp_email',
    createTrackingOtpHandler({
      email: emailAdapter,
      eligibility: new DatabaseEmailStore(),
      secret: TRACKING_SECRET,
    }),
  );
  return handlers;
}

const outboxRunner = new OutboxRunner({
  store: new DatabaseOutboxStore(),
  handlers: buildOutboxHandlers(),
});

const DATA_TABLES = [
  'app.lead_views',
  'app.lead_layouts',
  'app.lead_fields',
  'app.lead_object_settings',
  'app.membership_permissions',
  'app.orders',
  'app.quotes',
  'app.leads',
  'app.draft_grants',
  'app.idempotency_keys',
  'app.catalogue_sync_events',
  'app.catalogue_sync_leases',
  'app.catalogue_sync_state',
  'app.products',
  'app.offer_versions',
  'app.product_availability',
  'app.audit_events',
  'app.outbox_jobs',
  'app.outbox_job_alerts',
  'app.email_messages',
  'app.email_suppressions',
  'app.email_provider_events',
  'app.region_waitlist',
  'app.marketing_consents',
  'app.follow_up_schedules',
  'app.tracking_challenges',
  'app.files',
  // OTP limits must start with the rest of each disposable journey's state.
  // Otherwise earlier desktop/mobile runs consume the same ten-minute bucket.
  'app.rate_limit_buckets',
];

async function reseed(admin: ReturnType<typeof postgres>): Promise<void> {
  await admin.unsafe(`truncate table ${DATA_TABLES.join(', ')} restart identity cascade`);
  // Persist the stub's published offers through the REAL catalogue path, so the
  // products, immutable offer versions and availability rows are genuine.
  await catalogueService.reconcile(WORKSPACE_ID, ACTOR_ID);
}

async function seedStaticRows(admin: ReturnType<typeof postgres>): Promise<void> {
  await admin`
    insert into app.workspaces (id, slug, name)
    values (${WORKSPACE_ID}, 'e2e-order-journey', 'E2E Order Journey')
    on conflict (id) do nothing
  `;
  await admin`delete from app.service_credentials where workspace_id = ${WORKSPACE_ID}`;
  await admin`
    insert into app.service_credentials (workspace_id, secret_hash, scopes)
    values (
      ${WORKSPACE_ID},
      ${hashServiceSecret(SERVICE_SECRET)},
      ${['leads:write', 'quotes:create', 'orders:create', 'tracking:otp']}
    )
  `;
  // A fully-privileged (owner) staff membership so the real authorization store
  // admits the seeded actor for the admin-processing leg.
  const existingRole = await admin<{ id: string }[]>`
    select id from app.roles where workspace_id = ${WORKSPACE_ID} and name = 'owner' limit 1
  `;
  let roleId = existingRole[0]?.id;
  if (!roleId) {
    const [role] = await admin<{ id: string }[]>`
      insert into app.roles (workspace_id, name) values (${WORKSPACE_ID}, 'owner') returning id
    `;
    roleId = role?.id;
  }
  const existingMembership = await admin<{ id: string }[]>`
    select id from app.memberships
    where workspace_id = ${WORKSPACE_ID} and user_id = ${STAFF_ACTOR_ID} limit 1
  `;
  let membershipId = existingMembership[0]?.id;
  if (!membershipId) {
    const [membership] = await admin<{ id: string }[]>`
      insert into app.memberships (workspace_id, user_id, membership_type, status, accepted_at)
      values (${WORKSPACE_ID}, ${STAFF_ACTOR_ID}, 'staff', 'active', now())
      returning id
    `;
    membershipId = membership?.id;
  }
  if (roleId && membershipId) {
    await admin`
      insert into app.membership_roles (workspace_id, membership_id, role_id)
      select ${WORKSPACE_ID}, ${membershipId}, ${roleId}
      where not exists (
        select 1 from app.membership_roles
        where workspace_id = ${WORKSPACE_ID}
          and membership_id = ${membershipId}
          and role_id = ${roleId}
      )
    `;
  }
}

async function seedModelMember(admin: ReturnType<typeof postgres>): Promise<void> {
  const [role] = await admin<
    { id: string }[]
  >`insert into app.roles(workspace_id,name) values (${WORKSPACE_ID},'orders') on conflict (workspace_id,name) do update set name = excluded.name returning id`;
  const [member] = await admin<
    { id: string }[]
  >`insert into app.memberships(workspace_id,user_id,membership_type,status,accepted_at) values (${WORKSPACE_ID},${MEMBER_ACTOR_ID},'staff','active',now()) on conflict (workspace_id,user_id) do update set status = 'active' returning id`;
  if (role && member)
    await admin`insert into app.membership_roles(workspace_id,membership_id,role_id) values (${WORKSPACE_ID},${member.id},${role.id}) on conflict do nothing`;
}

async function main(): Promise<void> {
  const adminUrl = ADMIN_URL;
  if (!adminUrl) throw new Error('TEST_MIGRATION_DATABASE_URL is required');
  await applyMigrations({ connectionString: adminUrl, ssl: false });
  const admin = postgres(adminUrl, { max: 2, prepare: false, ssl: false });
  // The runtime role's password is a deployment secret, not part of the schema;
  // on a fresh disposable database it must be set before the app connects.
  await setTestRuntimePassword(admin);
  await seedStaticRows(admin);
  await seedModelMember(admin);
  await reseed(admin);

  // Built only after the runtime role is ready, so no connection is opened
  // before the disposable database has a usable app_runtime password.
  const app = createApp({ website, staff });

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

  function ok(res: http.ServerResponse, body: Record<string, unknown> = { ok: true }): void {
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  }

  async function handleControl(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    db: ReturnType<typeof postgres>,
  ): Promise<void> {
    const url = new URL(req.url ?? '', 'http://127.0.0.1');
    const path = url.pathname;
    try {
      if (path === '/__e2e__/reset' && req.method === 'POST') {
        usedProofs.clear();
        emailAdapter.deliveries.length = 0;
        dropOrders = 0;
        armEmailFailure = false;
        catalogue.restore();
        rebuildServices(DEFAULT_POLICY);
        await reseed(db);
        ok(res);
        return;
      }
      if (path === '/__e2e__/drop-next-orders' && req.method === 'POST') {
        const requested = Number(url.searchParams.get('count') ?? '1');
        dropOrders = Number.isFinite(requested) && requested > 0 ? requested : 1;
        ok(res);
        return;
      }
      if (path === '/__e2e__/fail-next-quotes' && req.method === 'POST') {
        catalogue.armFailure();
        ok(res);
        return;
      }
      if (path === '/__e2e__/set-withdrawal-policy' && req.method === 'POST') {
        const requested = url.searchParams.get('policy');
        if (!requested || !isWithdrawalPolicy(requested)) {
          res
            .writeHead(400, { 'content-type': 'application/json' })
            .end('{"message":"bad_policy"}');
          return;
        }
        rebuildServices(requested);
        ok(res, { ok: true, policy: requested });
        return;
      }
      if (path === '/__e2e__/add-internet-fixture' && req.method === 'POST') {
        catalogue.addInternetFixture();
        await catalogueService.reconcile(WORKSPACE_ID, ACTOR_ID);
        ok(res);
        return;
      }
      if (path === '/__e2e__/set-price' && req.method === 'POST') {
        const key = url.searchParams.get('key') ?? PASSPORT_KEY;
        const minor = Number(url.searchParams.get('minor'));
        if (!Number.isFinite(minor) || minor < 0 || !catalogue.setRecurringCharge(key, minor)) {
          res.writeHead(400, { 'content-type': 'application/json' }).end('{"message":"bad_price"}');
          return;
        }
        // Publish the new price through the real reconcile path (a new immutable
        // offer version). Existing quotes keep their frozen snapshot.
        await catalogueService.reconcile(WORKSPACE_ID, ACTOR_ID);
        ok(res, { ok: true, key, recurringChargeAmountMinor: minor });
        return;
      }
      if (path === '/__e2e__/withdraw-offer' && req.method === 'POST') {
        const key = url.searchParams.get('key') ?? PASSPORT_KEY;
        if (!catalogue.hide(key)) {
          res
            .writeHead(400, { 'content-type': 'application/json' })
            .end('{"message":"unknown_offer"}');
          return;
        }
        // Withdraw through reconcile so the current policy decides whether
        // outstanding quotes are revoked immediately or honoured to expiry.
        await catalogueService.reconcile(WORKSPACE_ID, ACTOR_ID);
        ok(res, { ok: true, key, policy });
        return;
      }
      if (path === '/__e2e__/arm-email-failure' && req.method === 'POST') {
        // `?on=false` disarms, so the admin retry leg can prove the same job
        // then delivers cleanly. Any other value (or none) arms it.
        armEmailFailure = url.searchParams.get('on') !== 'false';
        ok(res, { ok: true, armed: armEmailFailure });
        return;
      }
      if (path === '/__e2e__/run-outbox' && req.method === 'POST') {
        const summary = await outboxRunner.run({
          authorizedWorkspaceIds: [WORKSPACE_ID],
          actorId: STAFF_ACTOR_ID,
        });
        ok(res, { ok: true, ...summary });
        return;
      }
      if (path.startsWith('/__e2e__/r2/')) {
        if (req.method === 'PUT') {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.from(chunk));
          r2.putStagingObject(
            decodeURIComponent(path.slice('/__e2e__/r2/'.length)),
            new Uint8Array(Buffer.concat(chunks)),
          );
          ok(res);
          return;
        }
      }
      // The newest code emailed to an address. POST, so the synthetic address
      // stays out of the URL like every real one (invariant 12).
      if (path === '/__e2e__/tracking-code' && req.method === 'POST') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const email =
          body && typeof body === 'object' && 'email' in body && typeof body.email === 'string'
            ? body.email.trim().toLowerCase()
            : '';
        const message = emailAdapter.deliveries.findLast(
          (entry) => entry.template === 'tracking_otp' && entry.toAddress === email,
        );
        if (!message?.variables?.code) {
          res.writeHead(404).end();
          return;
        }
        ok(res, { code: message.variables.code });
        return;
      }
      if (path === '/__e2e__/orders' && req.method === 'GET') {
        const rows = await db<{ reference: string }[]>`
          select reference from app.orders where workspace_id = ${WORKSPACE_ID} order by created_at
        `;
        ok(res, { count: rows.length, references: rows.map((row) => row.reference) });
        return;
      }
      if (path === '/__e2e__/order-snapshot' && req.method === 'GET') {
        const reference = url.searchParams.get('reference') ?? '';
        const rows = await db<{ status: string; payment_state: string; snapshot: unknown }[]>`
          select status, payment_state, snapshot from app.orders
          where workspace_id = ${WORKSPACE_ID} and reference = ${reference} limit 1
        `;
        const row = rows[0];
        if (!row) {
          res.writeHead(404, { 'content-type': 'application/json' }).end('{"found":false}');
          return;
        }
        const totals = snapshotTotals(row.snapshot);
        ok(res, {
          found: true,
          status: row.status,
          paymentState: row.payment_state,
          totalMinor: totals.totalMinor,
          amountPayableTodayMinor: totals.amountPayableTodayMinor,
        });
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
