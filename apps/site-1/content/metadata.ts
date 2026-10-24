/**
 * Page descriptions (SEO rewrite, 23 October 2026; see docs/marketing/seo-content-research-2026-10-23.md).
 * Public descriptions only: never interpolate queries, order data or personal details.
 * Keep each between about 120 and 160 characters and lead with the phrase people search for.
 */
export const pageDescriptions: Readonly<Record<string, string>> = {
  '/': 'Canadian SIM, phone and home internet plans for newcomers. Get a Canadian number before you arrive, from $35/mo. Rogers, Fido and chatr. Nothing paid online.',
  '/pre-arrival-sim':
    'Order a Rogers, Fido or chatr eSIM before you arrive in Canada. Your number is ready before you fly. From $35/mo, no credit check, nothing paid online.',
  '/home-internet':
    'Home internet in BC, Alberta, Manitoba and Saskatchewan from $50/mo. Unlimited data, free professional install, router included, nothing to pay up front.',
  '/mobile-plans':
    'Bring your own phone and keep your number. 100 GB Canada + US from $40/mo, 150 GB with Mexico $65, unlimited 5G+ $90. Unlimited talk and text, no contract.',
  '/business-internet': 'Preview business internet options and request a quote from an advisor.',
  '/contact':
    'Call, email or write to Canadian Plans. Real advisors Monday to Saturday, 9am to 9pm Pacific. Based in Surrey, BC. Track an order without an account.',
  '/faq':
    'Straight answers about getting a Canadian SIM or eSIM before you arrive, credit checks, SIN, documents, billing, cancelling and tracking your order.',
  '/about':
    'Canadian Plans is an authorised Rogers, Fido and chatr reseller in Surrey, BC, helping newcomers get a Canadian phone plan or home internet. Nothing paid online.',
  '/guides':
    'Plain-English guides to Canadian SIM cards, eSIM, phone plans, credit checks and home internet for students, workers, new immigrants and visitors.',
  '/order/home-internet': 'Preview the home internet order form.',
  '/order/pre-arrival': 'Preview the pre-arrival SIM order form.',
  '/track-order': 'Preview the order tracking design.',
  '/privacy': 'Read the Canadian Plans privacy policy and cookie information.',
  '/terms': 'Read the Canadian Plans terms and conditions.',
  '/accessibility': 'Read the Canadian Plans accessibility statement and find support options.',
  '/search': 'Search Canadian Plans pages and guides.',
  '/dev/components': 'Canadian Plans component preview for design review.',
  '/dev/emails': 'Canadian Plans transactional email previews with synthetic sample data.',
  '/plans': 'Canadian Plans catalogue preview. Published offers are not yet available.',
  '/plans/test-plan': 'Canadian Plans plan details preview.',
  '/order': 'Order a Canadian mobile plan.',
  '/track': 'Securely look up the status of your Canadian Plans order.',
  '/studio': 'Canadian Plans content editing workspace.',
};
export const metadataCopy = {
  siteDescription:
    'Canadian SIM cards, phone plans and home internet for newcomers to Canada. Get your Canadian number before you arrive. Nothing is paid online.',
  imageAlt: 'Canadian Plans: Canadian SIM, phone and internet plans for newcomers',
  missingTitle: 'Page not found | Canadian Plans',
  missingDescription:
    'The requested page could not be found. Explore Canadian Plans or search for help.',
  plansTitle: 'Plans | Canadian Plans',
  planTitle: 'Plan details | Canadian Plans',
  trackTitle: 'Track your order | Canadian Plans',
};
export const chromeAccessibility = {
  utility: 'Support and plan shortcuts',
  promo: 'Current plan promotion',
  comparisonFeature: 'Plan feature',
};
export const studioCopy = {
  suffix: 'Studio',
  pending: 'Sanity project connection is pending T9.',
  unavailable: 'Content editing is unavailable until the project and editor access are configured.',
  back: 'Return to storefront',
};
