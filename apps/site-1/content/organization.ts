/**
 * Public business facts for the sitewide Organization schema (23 October 2026). Every value
 * is already published on the contact page and in the legal texts; none is personal data.
 * Source: docs/LAUNCH_PLANS.md (owner, 21–22 October 2026). The owner says the phone number
 * will change; update it here and in contact.ts and site-chrome.ts together.
 */
export const organizationContent = {
  name: 'Canadian Plans',
  description:
    'Canadian SIM cards, phone plans and home internet for newcomers to Canada. Authorized Rogers, Fido and Chatr reseller for eSIM plans ordered before arrival, and authorized sales agent for home internet and mobile plans.',
  email: 'info@canadianplans.com',
  telephone: '+1-778-682-3771',
  address: {
    streetAddress: '9981 Whalley Blvd',
    addressLocality: 'Surrey',
    addressRegion: 'BC',
    postalCode: 'V3T 0A8',
    addressCountry: 'CA',
  },
  /** Support hours, Pacific time, as published on the contact page. */
  hours: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '09:00',
    closes: '21:00',
  },
  areaServed: 'CA',
  languages: ['en-CA'],
  logoPath: '/design/components/60-13-imgMark.svg',
} as const;
