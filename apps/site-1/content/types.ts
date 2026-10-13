import type { WebsiteOffer } from '@canadian-plans/contracts';

export interface SiteContent {
  readonly name: string;
}

/** Local design fixtures use the existing offer contract and never enable checkout. */
export interface PreviewPlan {
  readonly previewOnly: true;
  readonly offer: WebsiteOffer;
}
