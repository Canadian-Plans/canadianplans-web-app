import { componentAssets } from './components';
import type { FigmaAsset } from '@canadian-plans/ui/canadian-plans';
export type LegalRoute = 'privacy' | 'terms';
export interface LegalDraftSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly bullets: readonly string[];
}
export interface LegalDraft {
  readonly previewOnly: true;
  readonly title: string;
  readonly updated: string;
  readonly effective: string;
  readonly version: string;
  readonly shortTitle: string;
  readonly short: readonly string[];
  readonly sections: readonly LegalDraftSection[];
  readonly contact: {
    readonly title: string;
    readonly lines: readonly string[];
    readonly button: string;
    readonly href: string;
  };
}
export const legalDrafts = {
  privacy: {
    previewOnly: true,
    title: 'Privacy Policy',
    updated: 'Last updated: 5 October 2026',
    effective: 'Effective: 5 October 2026',
    version: 'Version 1.0',
    shortTitle: 'The short version',
    short: [
      '✓  We only collect what we need to set up your plan and help you.',
      '✓  Your ID documents are used to activate your plan with Rogers — then deleted after [X] days.',
      '✓  We never sell your personal information.',
      '✓  You can ask to see, correct or delete your information at any time.',
    ],
    sections: [
      {
        id: 'privacy-who-we-are',
        title: '1. Who we are',
        paragraphs: [
          'Canadian Plans ([legal company name]) is an authorized Rogers dealer based in Surrey, British Columbia. This policy explains how we handle personal information under Canada’s PIPEDA and British Columbia’s PIPA.',
        ],
        bullets: [],
      },
      {
        id: 'privacy-what-we-collect',
        title: '2. What we collect',
        paragraphs: [
          'We collect information you give us when you order, check an address or contact us:',
        ],
        bullets: [
          'Contact details — name, email, phone and WhatsApp number',
          'Identity details — passport, visa, study/work permit or COPR, and date of birth (needed to activate a plan)',
          'Order details — plan, arrival date and, for home internet, your install address',
          'Website data — basic analytics and cookies (see section 8)',
        ],
      },
      {
        id: 'privacy-why-we-collect-it',
        title: '3. Why we collect it',
        paragraphs: [
          'We use your information to confirm and activate your order, send your eSIM or book your install, support you afterwards, and meet legal and carrier requirements. We do not use your ID documents for anything else.',
        ],
        bullets: [],
      },
      {
        id: 'privacy-who-we-share-it-with',
        title: '4. Who we share it with',
        paragraphs: ['We share only what is needed with:'],
        bullets: [
          'Rogers Communications (Rogers, Fido, Chatr) — to activate your service',
          'Email and messaging providers — to send your eSIM and order updates',
          'Service providers who help us run the website and messaging (for example hosting and WhatsApp) under contract',
          'Authorities, only when the law requires it',
        ],
      },
      {
        id: 'privacy-how-long-we-keep-it',
        title: '5. How long we keep it',
        paragraphs: [
          'We keep ID documents for [X] days after activation, then delete them. We keep order records for [X] years for accounting and legal reasons.',
        ],
        bullets: [],
      },
      {
        id: 'privacy-how-we-protect-it',
        title: '6. How we protect it',
        paragraphs: [
          'We use encryption, access controls and staff training to protect your information.\n[Describe actual safeguards.]',
        ],
        bullets: [],
      },
      {
        id: 'privacy-your-rights',
        title: '7. Your rights',
        paragraphs: [
          'You can ask for a copy of your information, ask us to correct it, or withdraw consent (this may stop us from providing a service). If you are not satisfied with our answer, you can complain to the Office of the Privacy Commissioner of Canada or the Office of the Information and Privacy Commissioner for British Columbia.',
        ],
        bullets: [],
      },
      {
        id: 'privacy-cookies',
        title: '8. Cookies',
        paragraphs: [
          'We use essential cookies to make the site work and, with your consent, analytics cookies to improve it. You can change your choice any time in Cookie settings.',
        ],
        bullets: [],
      },
      {
        id: 'privacy-marketing-messages',
        title: '9. Marketing messages',
        paragraphs: [
          'We only send offers if you agree. Every email or message has an easy way to unsubscribe, as required by Canada’s Anti-Spam Legislation (CASL).',
        ],
        bullets: [],
      },
      {
        id: 'privacy-storage-outside-canada',
        title: '10. Storage outside Canada',
        paragraphs: [
          'Some of our service providers may store information outside Canada (for example in the United States). [List countries/providers.] It is then subject to those countries’ laws.',
        ],
        bullets: [],
      },
      {
        id: 'privacy-contact-our-privacy-officer',
        title: '11. Contact our Privacy Officer',
        paragraphs: [
          '[Name], Privacy Officer · info@canadianplans.com · 9981 Whalley Blvd, Surrey, BC.',
        ],
        bullets: [],
      },
    ],
    contact: {
      title: 'Questions about your privacy?',
      lines: ['Our Privacy Officer replies within [X] business days.'],
      button: 'Email info@canadianplans.com',
      href: 'mailto:info@canadianplans.com',
    },
  },
  terms: {
    previewOnly: true,
    title: 'Terms of Service',
    updated: 'Last updated: 5 October 2026',
    effective: 'Effective: 5 October 2026',
    version: 'Version 1.0',
    shortTitle: 'The short version',
    short: [
      "✓  Placing an order on our site is a request. You aren't charged until an advisor confirms it with you.",
      '✓  Your phone or internet service is provided by Rogers, Fido or Chatr under their own customer agreement.',
      '✓  Prices are in CAD, taxes extra, and dated. We confirm the final price before activation.',
      '✓  You can change or cancel for free until your plan is activated.',
    ],
    sections: [
      {
        id: 'terms-about-these-terms',
        title: '1. About these terms',
        paragraphs: [
          'These terms apply when you use canadianplans.com or order through us. By sending an order you agree to them. [Legal company name] (“Canadian Plans”, “we”) is located in Surrey, British Columbia.',
        ],
        bullets: [],
      },
      {
        id: 'terms-who-we-are',
        title: '2. Who we are',
        paragraphs: [
          'We are an authorized dealer of Rogers Communications. We are not Rogers. Rogers, Fido and Chatr provide the service; we help you choose, order and set it up.',
        ],
        bullets: [],
      },
      {
        id: 'terms-how-ordering-works',
        title: '3. How ordering works',
        paragraphs: [
          'Sending a form is a request, not a purchase. An advisor contacts you by phone or WhatsApp to confirm your details, plan and price. Your order is accepted only when you confirm with us. We never take payment on this website.',
        ],
        bullets: [],
      },
      {
        id: 'terms-prices',
        title: '4. Prices',
        paragraphs: [
          'Prices are shown in Canadian dollars, exclude taxes and are dated (“Prices as of”). Carrier prices can change; if the price changes before activation, we tell you and you can cancel at no cost.',
        ],
        bullets: [],
      },
      {
        id: 'terms-eligibility-and-id',
        title: '5. Eligibility and ID',
        paragraphs: [
          'You must be at least 18 (or the age of majority in your province) and provide valid ID as required by the carrier,\nsuch as a passport and visa, study/work permit or COPR.',
        ],
        bullets: [],
      },
      {
        id: 'terms-esim-delivery',
        title: '6. eSIM delivery',
        paragraphs: [
          'Pre-arrival plans are eSIM only. We email your eSIM QR code after we confirm your order. Keep it private — anyone with the code could install your plan. If you lose it or change phones before activation, we send a new one free.',
        ],
        bullets: [],
      },
      {
        id: 'terms-changes-and-cancellations',
        title: '7. Changes and cancellations',
        paragraphs: [
          'You can change or cancel for free until your plan is activated. After activation, the carrier’s cancellation rules apply. [Confirm exact rules.]',
        ],
        bullets: [],
      },
      {
        id: 'terms-your-service-and-the-carrier',
        title: '8. Your service and the carrier',
        paragraphs: [
          'After activation your service is governed by the carrier’s customer agreement and applicable CRTC rules. Billing, network and roaming are the carrier’s responsibility; we will still help you contact them.',
        ],
        bullets: [],
      },
      {
        id: 'terms-our-responsibility',
        title: '9. Our responsibility',
        paragraphs: [
          'We take care to give accurate information, but we are not responsible for carrier network outages or delays outside our control. Nothing in these terms limits rights you have under consumer protection law. [Lawyer to draft liability wording.]',
        ],
        bullets: [],
      },
      {
        id: 'terms-trademarks',
        title: '10. Trademarks',
        paragraphs: [
          'Rogers, Fido and Chatr are trademarks of Rogers Communications Inc., used under licence as an authorized dealer.',
        ],
        bullets: [],
      },
      {
        id: 'terms-governing-law',
        title: '11. Governing law',
        paragraphs: [
          'These terms are governed by the laws of British Columbia and the federal laws of Canada that apply there.',
        ],
        bullets: [],
      },
      {
        id: 'terms-changes-to-these-terms',
        title: '12. Changes to these terms',
        paragraphs: [
          'We may update these terms. We show the date of the latest version at the top of this page. Orders already confirmed keep the terms that applied when you confirmed.',
        ],
        bullets: [],
      },
      {
        id: 'terms-contact',
        title: '13. Contact',
        paragraphs: [
          'Questions about these terms: info@canadianplans.com · +1 778-682-3771 · 9981 Whalley Blvd, Surrey, BC.',
        ],
        bullets: [],
      },
    ],
    contact: {
      title: 'Questions about these terms?',
      lines: ['A real person answers.', 'Mon to Sat, 9am to 9pm PT.'],
      button: 'Contact us',
      href: '/contact#contact-options',
    },
  },
} as const satisfies Record<LegalRoute, LegalDraft>;
export const legalCopy = {
  skip: 'Skip to main content',
  home: 'Home',
  category: 'Legal',
  breadcrumb: 'Breadcrumb',
  separator: '/',
  contents: 'Contents',
  showAll: 'Show all',
  sections: 'sections',
  showFewer: 'Show fewer sections',
  draft: 'Design draft — not approved legal text.',
  publishedEffective: 'Effective:',
  pending: 'unavailable',
  version: 'Version',
  publishedHeader: 'Published legal text',
  publishedContact: 'Contact us with questions about this published policy.',
  contact: 'Contact us',
  bullet: '•  ',
  privacyTab: 'Privacy Policy',
  termsTab: 'Terms of Service',
  cookieTab: 'Cookie settings',
  cookieDescription:
    'Cookie controls are not connected in this design preview. No preference is saved or changed.',
  cookieClose: 'Close cookie settings',
  cookieAnalytics: 'Analytics preferences need owner approval and integration before launch.',
  cookieContact: 'Contact us about cookies',
  reviewNote:
    'Legal text is a draft structure, not legal advice. Have a Canadian lawyer review Privacy (PIPEDA, BC PIPA, CASL) and Terms before launch, and replace every [bracketed] item with real details.',
} as const;
const asset = (src: string, width: number, height: number, nodeId: string): FigmaAsset => ({
  src,
  width,
  height,
  nodeId,
});
export const legalAssets = {
  ...componentAssets,
  logo: asset('/design/components/364-2163-imgMark.svg', 36, 36, '136:17'),
  search: asset('/design/legal/0-imgSearchIcon.svg', 18, 18, '136:27'),
  phone: asset('/design/legal/1-imgPhoneIcon.svg', 16, 16, '364:2155'),
  jump: asset('/design/legal/1-imgIcon2.svg', 18, 18, '317:771'),
  expand: asset('/design/legal/1-imgIcon3.svg', 20, 20, '317:791'),
};
