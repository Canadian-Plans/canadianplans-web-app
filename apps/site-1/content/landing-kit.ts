import type { CpStepContent, FaqItemContent } from '@canadian-plans/ui/canadian-plans';
import type { RedesignAssetKey } from './home-redesign';
import { siteFooter } from './site-chrome';

/**
 * Category landing kit (24 October 2026): the content shape every category landing page
 * (home internet, mobile, pre-arrival) fills. Research, blueprint and card pattern are in
 * docs/LANDING_PAGES.md. Prices in this content are display copies of the catalogue; the
 * order flow re-reads every price from the backend.
 */

export type LandingFaq = FaqItemContent;

export interface LandingLink {
  readonly label: string;
  readonly href: string;
}

/** An image the owner drops into /public; until then the slot shows its caption. */
export interface LandingImage {
  readonly caption: string;
  readonly src?: string;
  readonly alt?: string;
}

/** Heading, body and button on one side, an image on the other; rows alternate sides. */
export interface LandingShowcaseRow {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly action: LandingLink;
  readonly image: LandingImage;
  readonly reverse?: boolean;
}

export interface LandingIconCard {
  readonly id: string;
  readonly icon: RedesignAssetKey;
  readonly title: string;
  readonly body: string;
}

/** A real data table with one highlighted column. */
export interface LandingTable {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly caption: string;
  readonly rowHeaderLabel: string;
  readonly columns: readonly string[];
  readonly recommended: number;
  readonly recommendedLabel: string;
  readonly rows: readonly { readonly label: string; readonly values: readonly string[] }[];
  readonly note: string;
  readonly action: LandingLink;
}

/** Dark band: eyebrow, title, body and button beside a short fact list. */
export interface LandingSpotlight {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly facts: readonly { readonly label: string; readonly value: string }[];
  readonly action: LandingLink;
}

/**
 * One plan card (Mobbin pricing pattern): tag on the top edge for the highlighted card,
 * name, one line of context, price, sub-line, button, then an "Includes" tick list.
 */
export interface LandingPlanCard {
  readonly id: string;
  readonly href: string;
  readonly featured: boolean;
  readonly tag?: string;
  readonly eyebrow?: string;
  readonly name: string;
  readonly context: string;
  readonly fromLabel?: string;
  readonly currency: string;
  readonly price: string;
  readonly period: string;
  readonly priceNote: string;
  readonly action: string;
  readonly includesTitle: string;
  readonly includes: readonly string[];
}

/** Everything a category's landing pages share. */
export interface LandingKitShared {
  readonly key: string;
  readonly skip: string;
  readonly mainId: string;
  readonly breadcrumbLabel: string;
  readonly separator: string;
  readonly promo: { readonly text: string; readonly link: LandingLink };
  readonly proof: readonly { readonly title: string; readonly body: string }[];
  readonly included: {
    readonly id: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly items: readonly LandingIconCard[];
  };
  readonly showcase: readonly LandingShowcaseRow[];
  readonly showcaseLabel: string;
  readonly table?: LandingTable;
  readonly how: {
    readonly id: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    readonly label: string;
    readonly steps: readonly CpStepContent[];
    readonly aside: { readonly title: string; readonly body: string; readonly action: LandingLink };
  };
  readonly spotlight?: LandingSpotlight;
  readonly who: {
    readonly id: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly items: readonly LandingIconCard[];
  };
  readonly about: LandingAbout;
  readonly faqIntro: {
    readonly id: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    readonly helpTitle: string;
    readonly helpBody: string;
    readonly helpAction: LandingLink;
    readonly symbols: { readonly expand: string; readonly collapse: string };
  };
  readonly final: { readonly icon: RedesignAssetKey; readonly secondary: LandingLink };
  readonly stickyButton: string;
  readonly related: { readonly title: string; readonly links: readonly LandingLink[] };
}

export interface LandingAbout {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly points: readonly string[];
  readonly contactTitle: string;
  readonly contactLines: readonly string[];
  readonly hours: string;
  readonly action: LandingLink;
  readonly secondary: LandingLink;
}

/** What one page (the category page, or a province page) decides for itself. */
export interface LandingKitPage {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly breadcrumb: readonly { readonly label: string; readonly href?: string }[];
  readonly hero: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    /** Offer bullets under the lead; empty when the page has none. */
    readonly bullets: readonly string[];
    readonly primary: LandingLink;
    readonly secondary: LandingLink;
    readonly priceLabel: string;
    readonly price: string;
    readonly priceSuffix: string;
    readonly chips: readonly string[];
    readonly art: RedesignAssetKey;
    readonly artLabel: string;
    readonly badge: { readonly top: string; readonly price: string; readonly suffix: string };
    readonly sticker: string;
  };
  /** The plans block's heading and the rows under the cards; the cards come from the page. */
  readonly plans: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    readonly date: string;
    readonly cardsLabel: string;
    readonly promoLabel?: string;
    readonly promo?: string;
    readonly includesTitle: string;
    readonly includes: readonly string[];
    readonly aside?: {
      readonly title: string;
      readonly body: string;
      readonly action: LandingLink;
    };
  };
  readonly faq: readonly LandingFaq[];
  readonly final: {
    readonly title: string;
    readonly subtitle: string;
    readonly primary: LandingLink;
  };
  readonly sticky: { readonly title: string; readonly detail: string };
  /** Extra link row above the shared related links (other provinces, other categories). */
  readonly moreLinks?: { readonly title: string; readonly links: readonly LandingLink[] };
}

/**
 * "Who you are buying from": the same office, hours and promises on every category page.
 * `role` is how Canadian Plans sells that category (sales agent for internet and mobile,
 * reseller for pre-arrival); `providerLine` says how the provider is confirmed.
 */
export const landingAbout = (
  providerLine: string,
  role = 'Canadian Plans is an authorized sales agent.',
): LandingAbout => ({
  id: 'about',
  eyebrow: 'Who you are buying from',
  title: 'A real office in Surrey, BC. A real person on the phone.',
  body: `${role} Your service agreement is with the provider, who bills you directly after activation. ${providerLine} Our help costs you nothing extra.`,
  points: [
    'You pay the provider, never this website',
    'Cancel with us free any time before the provider activates your service',
    'One advisor from order to activation, and afterwards',
  ],
  contactTitle: 'Talk to us',
  contactLines: siteFooter.contactLines ?? [],
  hours: 'Monday to Saturday, 9am–9pm Pacific',
  action: { label: 'Contact an advisor', href: '/contact' },
  secondary: { label: 'About Canadian Plans', href: '/about' },
});

export const landingFaqIntro = (title: string) =>
  ({
    id: 'faq',
    eyebrow: 'FAQ',
    title,
    lead: 'Still unsure? An advisor can answer in a quick call, at no cost.',
    helpTitle: 'Prefer to ask a person?',
    helpBody: 'Call, email or send us a message and an advisor replies the same day.',
    helpAction: { label: 'Talk to an advisor', href: '/contact' },
    symbols: { expand: '+', collapse: '×' },
  }) as const;

export const landingChrome = {
  skip: 'Skip to main content',
  mainId: 'landing-main',
  breadcrumbLabel: 'Breadcrumb',
  separator: '/',
} as const;
