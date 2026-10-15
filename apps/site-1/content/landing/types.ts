import type {
  BreadcrumbItem,
  CpCategoryTone,
  CpCtaBandContent,
  CpLinkContent,
  CpStepContent,
  FaqItemContent,
} from '@canadian-plans/ui/canadian-plans';
import type { RedesignFaqIntro } from '../category-redesign';
import type { RedesignAssetKey } from '../home-redesign';

/**
 * Electric Blue landing pages (15 October 2026): SEO pages for one audience, place or
 * comparison. Every block is optional except hero, quick answer, FAQ and CTA, so the
 * same kit serves student, country, airport, carrier and city pages.
 */

/** A FAQ answer still waiting for owner approval is shown but kept out of JSON-LD. */
export interface LandingFaqItem extends FaqItemContent {
  readonly pending?: true;
}

export interface LandingHero {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly action: CpLinkContent;
  /** Already formatted. Commercial values stay backend-authoritative. */
  readonly price?: string;
  readonly pricePrefix?: string;
  readonly priceSuffix?: string;
  /** Caption for the photo slot until real photography exists. */
  readonly photo: string;
  /** Short proof points under the banner. */
  readonly highlights: readonly string[];
}

export interface LandingCard {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly chip?: string;
  readonly icon?: RedesignAssetKey;
}

export interface LandingCardsBlock {
  readonly kind: 'cards';
  readonly id: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly columns?: 2 | 3;
  readonly items: readonly LandingCard[];
}

export interface LandingStepsBlock {
  readonly kind: 'steps';
  readonly id: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly aside?: string;
  readonly items: readonly (CpStepContent & { readonly art?: RedesignAssetKey })[];
}

/** Checklist card beside a grey help card (documents + eSIM check, what to bring). */
export interface LandingChecklistBlock {
  readonly kind: 'checklist';
  readonly id: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly mark: string;
  readonly items: readonly { readonly title: string; readonly body: string }[];
  readonly aside: {
    readonly title: string;
    readonly body: string;
    readonly rows: readonly { readonly label: string; readonly value: string }[];
  };
}

/** Long-form answers with a key-facts card; the main SEO body of a page. */
export interface LandingArticleBlock {
  readonly kind: 'article';
  readonly id: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly intro?: string;
  readonly sections: readonly { readonly title: string; readonly body: readonly string[] }[];
  readonly facts?: {
    readonly title: string;
    readonly items: readonly { readonly label: string; readonly value: string }[];
    readonly note?: string;
  };
}

/** A real data table; first column is the row header. */
export interface LandingTableBlock {
  readonly kind: 'table';
  readonly id: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly caption: string;
  readonly columns: readonly string[];
  /** Index into `columns` to highlight (0 is the row-header column), e.g. our offer. */
  readonly highlight?: number;
  readonly rows: readonly { readonly label: string; readonly values: readonly string[] }[];
  readonly note?: string;
}

/** Two lists side by side: what we like / watch out for. */
export interface LandingProsConsBlock {
  readonly kind: 'proscons';
  readonly id: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly pros: {
    readonly title: string;
    readonly mark: string;
    readonly items: readonly string[];
  };
  readonly cons: {
    readonly title: string;
    readonly mark: string;
    readonly items: readonly string[];
  };
}

/** Slot for a page's interactive block (plan picker, address check). */
export interface LandingSlotBlock {
  readonly kind: 'slot';
  readonly id: string;
}

export type LandingBlock =
  | LandingCardsBlock
  | LandingStepsBlock
  | LandingChecklistBlock
  | LandingArticleBlock
  | LandingTableBlock
  | LandingProsConsBlock
  | LandingSlotBlock;

export interface LandingPageContent {
  readonly path: string;
  /** <title> and Open Graph title. */
  readonly title: string;
  readonly description: string;
  readonly mainId: string;
  readonly skip: string;
  readonly tone: CpCategoryTone;
  readonly breadcrumb: {
    readonly label: string;
    readonly separator: string;
    readonly items: readonly BreadcrumbItem[];
  };
  readonly hero: LandingHero;
  /** "Updated 5 Oct 2026 · Reviewed by a plan advisor" */
  readonly byline?: string;
  readonly onThisPage?: { readonly label: string; readonly links: readonly CpLinkContent[] };
  readonly quick: { readonly eyebrow: string; readonly title: string; readonly answer: string };
  readonly facts?: {
    readonly label: string;
    readonly items: readonly {
      readonly label: string;
      readonly value: string;
      readonly detail?: string;
    }[];
    readonly note?: string;
  };
  readonly blocks: readonly LandingBlock[];
  readonly faq: { readonly intro: RedesignFaqIntro; readonly items: readonly LandingFaqItem[] };
  readonly related: {
    readonly title: string;
    readonly groups: readonly {
      readonly title: string;
      readonly links: readonly CpLinkContent[];
    }[];
    readonly note?: string;
  };
  readonly cta: CpCtaBandContent & { readonly icon: RedesignAssetKey };
}
