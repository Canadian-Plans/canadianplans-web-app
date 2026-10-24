import type { FigmaAsset, FaqItemContent } from '@canadian-plans/ui/canadian-plans';

/** Structured guide article blocks; rendered by src/components/guides/article-body.tsx. */
export type ArticleBlock =
  | {
      readonly kind: 'section';
      readonly id: string;
      readonly title: string;
      readonly text?: string;
      readonly mobileLines?: readonly string[];
    }
  | { readonly kind: 'checklist'; readonly items: readonly string[] }
  | {
      readonly kind: 'comparison';
      readonly rows: readonly StudentComparison[];
      readonly note: string;
    }
  | {
      readonly kind: 'table';
      readonly id: string;
      readonly title: string;
      readonly caption: string;
      readonly columns: readonly string[];
      readonly rows: readonly { readonly label: string; readonly values: readonly string[] }[];
      readonly note: string;
      /** Short numeric tables fit a phone screen instead of scrolling sideways. */
      readonly compact?: boolean;
    }
  | {
      readonly kind: 'plan-cta';
      readonly eyebrow: string;
      readonly text: string;
      readonly label: string;
      /** Where the button goes; defaults to the eSIM plans. */
      readonly href?: string;
      readonly mobileLines?: readonly string[];
    }
  | { readonly kind: 'devices'; readonly items: readonly DeviceInstructions[] }
  | {
      readonly kind: 'steps';
      readonly id: string;
      readonly title: string;
      readonly items: readonly string[];
    }
  | { readonly kind: 'tip'; readonly label: string; readonly text: string }
  | {
      readonly kind: 'faq';
      readonly id: string;
      readonly title: string;
      readonly items: readonly FaqItemContent[];
    };
export interface StudentComparison {
  readonly id: string;
  readonly name: string;
  readonly data: string;
  readonly price: string;
  readonly storePrice?: string;
  readonly detail?: string;
  readonly bestFor: string;
  readonly desktopBestForLines?: readonly string[];
  readonly mobileDescription: string;
  readonly popular?: boolean;
}
export interface DeviceInstructions {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly caption: string;
}
export interface GuideArticle {
  readonly previewOnly: true;
  readonly slug: string;
  readonly title: string;
  readonly breadcrumbTitle: string;
  readonly category: string;
  readonly description: string;
  readonly author: {
    readonly name: string;
    readonly label: string;
    readonly detail: string;
    readonly avatar: FigmaAsset;
  };
  readonly reviewer: {
    readonly name: string;
    readonly label: string;
    readonly detail: string;
    readonly avatar: FigmaAsset;
  };
  readonly updated: string;
  readonly updatedLabel: string;
  readonly readingLabel: string;
  readonly imageCaption: string;
  readonly quickAnswer: string;
  readonly quickMobileLines?: readonly string[];
  readonly blocks: readonly ArticleBlock[];
  readonly sources: string;
}

// Owner decision (22 Oct 2026, SEC-18): guides are credited to the team, not to individuals.
export const teamAuthor = {
  name: 'Canadian Plans',
  label: 'Written by the Canadian Plans team',
  detail: 'Plan advisors, Surrey, BC',
  avatar: { src: '/design/guides/0-imgEllipse1.svg', width: 44, height: 44, nodeId: '133:47' },
} as const;
export const teamReviewer = {
  name: 'Canadian Plans',
  label: 'Checked against carrier plan pages',
  detail: 'October 2026',
  avatar: { src: '/design/guides/0-imgEllipse2.svg', width: 44, height: 44, nodeId: '133:52' },
} as const;
