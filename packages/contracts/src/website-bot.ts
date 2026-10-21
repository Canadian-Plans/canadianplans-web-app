import { z } from 'zod';

/** The backend selects these actions by route; callers cannot choose a policy. */
export const websiteBotActions = [
  'lead-save',
  'waitlist-join',
  'quote-create',
  'order-submit',
  'upload-intent',
  'upload-finalize',
  'file-download',
  'tracking-request',
  'tracking-verify',
] as const;
export type WebsiteBotAction = (typeof websiteBotActions)[number];
export const websiteBotTokenSchema = z.string().min(1).max(2048);
export interface WebsiteBotProof {
  turnstileToken?: string;
}
