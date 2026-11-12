import type {
  Attribution,
  ChangeRequestFields,
  DocumentMediaType,
  LeadContact,
  LeadForm,
  LeadStatus,
  WebsitePlan,
} from '@canadian-plans/crm-contracts';

/** Everything the stub remembers. One process, one site, in memory only. */

export interface StoredFile {
  id: string;
  documentType: string;
  contentType: DocumentMediaType;
  sizeBytes: number;
  checksumSha256: string;
  createdAt: string;
}

export interface StoredChangeRequest {
  requestNo: number;
  fields: ChangeRequestFields;
  documents: ('passport' | 'visa')[];
  createdAt: string;
  updatedAt: string;
}

export interface FrozenPlan {
  id: string;
  name: string;
  priceMinor: number;
  billingPeriod: WebsitePlan['billingPeriod'];
  requiredDocuments: string[];
}

export interface StoredLead {
  id: string;
  leadType: string;
  status: LeadStatus;
  /** The working stage staff move; the stub starts it where the CRM does. */
  stage: string;
  externalRef: string | null;
  contact: LeadContact;
  form: LeadForm | null;
  order: { planId: string; quantity: number } | null;
  /** The plan as it was sold when the lead was submitted. */
  frozenPlan: FrozenPlan | null;
  attribution: Attribution;
  /** Every consent version recorded on the lead, oldest first. */
  consentVersions: string[];
  grant: { token: string; expiresAt: string } | null;
  files: StoredFile[];
  pendingChange: StoredChangeRequest | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

export interface StoredUpload {
  id: string;
  leadId: string;
  documentType: string;
  contentType: DocumentMediaType;
  sizeBytes: number;
  bytes: Buffer | null;
}

export interface IdempotencyRecord {
  fingerprint: string;
  leadId: string;
}

/** One `/api/v1` request as the stub received it, for the specs to assert on. */
export interface ReceivedRequest {
  method: string;
  path: string;
  idempotencyKey: string | null;
  /** The action of the browser fixture's proof (`e2e.<action>.<uuid>`), when one was sent. */
  botAction: string | null;
  body: unknown;
  /** The HTTP status answered; 0 when the connection was dropped instead. */
  status: number;
}

export type FailureMode =
  | { kind: 'transport' }
  | { kind: 'drop_response' }
  | { kind: 'error'; status: number; code: string };

export interface PlannedFailure {
  method: string;
  /** A prefix of the request path, e.g. `/api/v1/website/leads`. */
  pathPrefix: string;
  mode: FailureMode;
  remaining: number;
}

export const SEED_PLAN_IDS = {
  simPassport: '11111111-1111-4111-8111-111111111101',
  simSimple: '11111111-1111-4111-8111-111111111102',
  mobile: '11111111-1111-4111-8111-111111111201',
  internet: '11111111-1111-4111-8111-111111111301',
} as const;

/** The plans every test starts with; a spec replaces them through `PUT /__stub/plans`. */
export const SEED_PLANS: readonly WebsitePlan[] = [
  {
    id: SEED_PLAN_IDS.simPassport,
    leadType: 'sim_order',
    name: 'E2E Passport Plan',
    priceMinor: 4500,
    currency: 'CAD',
    billingPeriod: '30_days',
    paymentRequired: false,
    requiredDocuments: ['passport', 'visa'],
    properties: {
      custom_product_key: 'e2e-passport',
      custom_product_title: 'Pre-arrival eSIM',
      custom_best_for: 'Students arriving this term',
      custom_features: '50 GB data\nUnlimited Canada-wide calling',
    },
  },
  {
    id: SEED_PLAN_IDS.simSimple,
    leadType: 'sim_order',
    name: 'E2E Simple Plan',
    priceMinor: 2500,
    currency: 'CAD',
    billingPeriod: '30_days',
    paymentRequired: false,
    requiredDocuments: [],
    properties: { custom_product_key: 'e2e-simple' },
  },
  {
    id: SEED_PLAN_IDS.mobile,
    leadType: 'mobility',
    name: 'E2E Mobile 50 GB',
    priceMinor: 4000,
    currency: 'CAD',
    billingPeriod: 'month',
    paymentRequired: false,
    requiredDocuments: ['government_id'],
    properties: { custom_product_key: 'e2e-mobile-50' },
  },
  {
    id: SEED_PLAN_IDS.internet,
    leadType: 'internet',
    name: 'E2E Internet 1 Gig',
    priceMinor: 8500,
    currency: 'CAD',
    billingPeriod: 'month',
    paymentRequired: false,
    requiredDocuments: ['government_id'],
    properties: { custom_product_key: 'e2e-internet-1g', custom_regions: 'AB, BC' },
  },
];

export interface StubState {
  plans: WebsitePlan[];
  leads: Map<string, StoredLead>;
  uploads: Map<string, StoredUpload>;
  idempotency: Map<string, IdempotencyRecord>;
  /** The code "emailed" to each normalized address. */
  trackingCodes: Map<string, { code: string; expiresAt: number; attempts: number }>;
  /** Customer grants by token. */
  trackingGrants: Map<string, { email: string; expiresAt: number }>;
  requests: ReceivedRequest[];
  failures: PlannedFailure[];
  nextSimOrderNumber: number;
  nextChangeRequestNumber: number;
}

function freshState(): StubState {
  return {
    plans: SEED_PLANS.map((plan) => ({ ...plan })),
    leads: new Map(),
    uploads: new Map(),
    idempotency: new Map(),
    trackingCodes: new Map(),
    trackingGrants: new Map(),
    requests: [],
    failures: [],
    nextSimOrderNumber: 1001,
    nextChangeRequestNumber: 1,
  };
}

export const state: StubState = freshState();

export function resetState(): void {
  Object.assign(state, freshState());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
