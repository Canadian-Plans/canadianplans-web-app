import type { BreadcrumbItem } from '@canadian-plans/ui/canadian-plans';
import { arrivalCopy } from './pre-arrival';
import { internetCopy } from './home-internet';
import { mobileCopy } from './mobile-plans';
import { homeRedesign, type CategoryKey } from './home-redesign';

/**
 * Electric Blue category page template content (14 October 2026).
 * Banner, feature, steps, cards and CTA copy come from the homepage explorer
 * (`homeRedesign.categories`) so a category says the same thing everywhere; this file
 * holds only what the full page adds. Existing page copy (breadcrumbs, quick answers,
 * descriptions, FAQ headings) is reused rather than rewritten.
 */
export interface RedesignFaqIntro {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly helpTitle: string;
  readonly helpBody: string;
  readonly helpAction: { readonly label: string; readonly href: string };
  readonly symbols: { readonly expand: string; readonly collapse: string };
}

export interface CategoryPageContent {
  readonly mainId: string;
  /** Where the hero action and CTA band send people: the page's own plan block. */
  readonly planHref: string;
  readonly breadcrumb: {
    readonly items: readonly BreadcrumbItem[];
    readonly label: string;
    readonly separator: string;
  };
  readonly hero: { readonly description: string; readonly action: string };
  readonly quick?: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
  };
  readonly faq: RedesignFaqIntro;
}

const faqHelp = {
  helpTitle: homeRedesign.faq.helpTitle,
  helpBody: homeRedesign.faq.helpBody,
  helpAction: homeRedesign.faq.helpAction,
  symbols: homeRedesign.faq.symbols,
} as const;

const banner = (key: CategoryKey) => {
  const category = homeRedesign.categories.find((item) => item.key === key);
  if (!category) throw new Error(`Missing redesign category ${key}`);
  return category;
};

export const categoryPages = {
  'pre-arrival': {
    mainId: 'arrival-main',
    planHref: '#plans',
    breadcrumb: {
      items: arrivalCopy.breadcrumb,
      label: arrivalCopy.breadcrumbLabel,
      separator: arrivalCopy.separator,
    },
    hero: {
      description: arrivalCopy.hero.description,
      action: banner('pre-arrival').banner.action,
    },
    quick: arrivalCopy.quick,
    faq: {
      eyebrow: arrivalCopy.faq.heading.eyebrow,
      title: arrivalCopy.faq.heading.title.join(' '),
      description: arrivalCopy.faq.heading.description,
      ...faqHelp,
    },
  },
  'home-internet': {
    mainId: 'internet-main',
    planHref: '#address-check',
    breadcrumb: {
      items: internetCopy.breadcrumb,
      label: internetCopy.breadcrumbLabel,
      separator: internetCopy.separator,
    },
    hero: {
      description: internetCopy.hero.description,
      action: banner('home-internet').banner.action,
    },
    quick: internetCopy.quick,
    faq: {
      eyebrow: internetCopy.faq.heading.eyebrow,
      title: internetCopy.faq.heading.title.join(' '),
      description: internetCopy.faq.heading.description,
      ...faqHelp,
    },
  },
  mobile: {
    mainId: 'main',
    planHref: '#mobile-plans',
    breadcrumb: {
      items: mobileCopy.breadcrumb,
      label: mobileCopy.breadcrumbLabel,
      separator: mobileCopy.separator,
    },
    hero: { description: mobileCopy.hero.description, action: banner('mobile').banner.action },
    quick: mobileCopy.quick,
    faq: {
      eyebrow: mobileCopy.faq.eyebrow,
      title: mobileCopy.faq.title.join(' '),
      description: mobileCopy.faq.description,
      ...faqHelp,
    },
  },
  business: {
    mainId: 'business-main',
    planHref: '#quote',
    breadcrumb: {
      items: [{ label: 'Home', href: '/' }, { label: 'Business Internet' }],
      label: 'Breadcrumb',
      separator: '/',
    },
    hero: {
      description: 'Business-grade support · One advisor · Set up around your hours',
      action: banner('business').banner.action,
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Business internet questions',
      description: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific time.',
      ...faqHelp,
    },
  },
} as const satisfies Record<CategoryKey, CategoryPageContent>;

export const redesignCategory = banner;
