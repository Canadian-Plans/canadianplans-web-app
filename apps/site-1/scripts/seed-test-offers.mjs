// SPIKE-free, reusable fixture seeder — not a spike. Idempotent: reruns
// replace the same documents rather than duplicating them.
//
// Seeds 3 stable products and 3 illustrative TEST offers (OPEN_INPUTS #3-6:
// real Rogers plan names/prices are unresolved; these are clearly labelled
// TEST fixtures, never real pricing). Refuses to run against any dataset
// whose name does not contain "test", so this can never touch production
// content by mistake.
import assert from 'node:assert/strict';
import { createClient } from '@sanity/client';

const projectId = process.env.SANITY_PROJECT_ID?.trim();
const dataset = process.env.SANITY_DATASET?.trim();
const token = process.env.SANITY_API_TOKEN?.trim();
const apiVersion = process.env.SANITY_API_VERSION?.trim() || '2026-01-01';

assert.ok(projectId, 'SANITY_PROJECT_ID is required.');
assert.ok(dataset, 'SANITY_DATASET is required.');
assert.ok(token, 'SANITY_API_TOKEN is required (a write-capable token).');
assert.ok(
  /test/i.test(dataset),
  `Refusing to seed TEST fixtures into dataset "${dataset}" — its name must contain "test".`,
);

const client = createClient({ projectId, dataset, token, apiVersion, useCdn: false });

const products = [
  ['5gb', '5GB'],
  ['10gb', '10GB'],
  ['unlimited', 'Unlimited'],
].map(([key, label]) => ({
  _id: `test-product-rogers-${key}`,
  _type: 'product',
  productKey: `rogers-sim-${key}`,
  title: `[TEST] Rogers ${label} Illustrative Plan`,
  slug: { _type: 'slug', current: `rogers-${key}-test` },
  type: 'sim',
}));

function testContractTerms(text) {
  return [
    {
      _type: 'block',
      _key: 'b1',
      children: [{ _type: 'span', _key: 's1', text }],
    },
  ];
}

function testOffer({
  id,
  productKey,
  name,
  recurringChargeAmountMinor,
  amountPayableTodayMinor,
  dataAllowance,
}) {
  return {
    _id: id,
    _type: 'offer',
    product: { _type: 'reference', _ref: `test-product-rogers-${productKey}` },
    name,
    currency: 'CAD',
    recurringChargeAmountMinor,
    oneTimeFees: [
      {
        _type: 'oneTimeFee',
        _key: 'activation',
        label: 'Activation fee (TEST)',
        amountMinor: 1000,
      },
    ],
    amountPayableTodayMinor,
    paymentRequired: false,
    documentChecklist: ['passport'],
    eligibility: 'TEST FIXTURE — illustrative only. Real eligibility rules pending OPEN_INPUTS #3.',
    availability: 'TEST FIXTURE — illustrative only. Not available for real orders.',
    billingParty: 'Canadian Plans (TEST)',
    contractTerms: testContractTerms(
      'TEST FIXTURE — illustrative contract terms, not for real use.',
    ),
    termsVersion: 'test-terms-2026-09',
    specs: { carrier: 'Rogers (TEST)', dataAllowance },
  };
}

const offers = [
  testOffer({
    id: 'test-offer-rogers-5gb',
    productKey: '5gb',
    name: '[TEST] Rogers 5GB Illustrative Plan',
    recurringChargeAmountMinor: 3500,
    amountPayableTodayMinor: 4500,
    dataAllowance: '5 GB (TEST)',
  }),
  testOffer({
    id: 'test-offer-rogers-10gb',
    productKey: '10gb',
    name: '[TEST] Rogers 10GB Illustrative Plan',
    recurringChargeAmountMinor: 5000,
    amountPayableTodayMinor: 6000,
    dataAllowance: '10 GB (TEST)',
  }),
  testOffer({
    id: 'test-offer-rogers-unlimited',
    productKey: 'unlimited',
    name: '[TEST] Rogers Unlimited Illustrative Plan',
    recurringChargeAmountMinor: 8000,
    amountPayableTodayMinor: 9000,
    dataAllowance: 'Unlimited (TEST, throttled after 50GB)',
  }),
];

const transaction = client.transaction();
for (const product of products) transaction.createOrReplace(product);
for (const offer of offers) transaction.createOrReplace(offer);
await transaction.commit();

console.info(
  `Seeded ${products.length} TEST products and ${offers.length} TEST offers into ${projectId}/${dataset}.`,
);
