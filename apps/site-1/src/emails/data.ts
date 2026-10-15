import { z } from 'zod';
import { emailPreviewCopy, emailCopy, type EmailTemplate } from '@content/emails';
const text = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine(
    (value) =>
      ![...value].some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ),
  );
const url = z.url().refine((value) => {
  const parsed = new URL(value);
  return (
    !parsed.username &&
    !parsed.password &&
    (parsed.protocol === 'https:' ||
      (parsed.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)))
  );
});
const orderSchema = z.object({
  customerName: text,
  orderReference: text,
  plan: text,
  monthlyPrice: text,
  paidToday: text,
  actionUrl: url,
});
const esimSchema = z.object({
  customerName: text,
  number: text,
  plan: text,
  starts: text,
  actionUrl: url,
});
const installSchema = z.object({
  orderReference: text,
  plan: text,
  monthlyPrice: text,
  installPrice: text,
  shortDate: text,
  date: text,
  window: text,
  address: text,
  actionUrl: url,
});
const messageSchema = z.discriminatedUnion('template', [
  z.object({ template: z.literal('order-received'), data: orderSchema }),
  z.object({ template: z.literal('esim-ready'), data: esimSchema }),
  z.object({ template: z.literal('install-booked'), data: installSchema }),
]);
export type OrderReceivedData = z.infer<typeof orderSchema>;
export type EsimReadyData = z.infer<typeof esimSchema>;
export type InstallBookedData = z.infer<typeof installSchema>;
export type EmailMessage = z.infer<typeof messageSchema>;
export interface EmailResources {
  assetBaseUrl: string;
  previewInbox?: boolean;
}
export function isEmailTemplate(value: unknown): value is EmailTemplate {
  return typeof value === 'string' && Object.hasOwn(emailCopy, value);
}
export function parseEmailMessage(input: unknown): EmailMessage {
  const result = messageSchema.safeParse(input);
  if (!result.success) throw new Error(emailPreviewCopy.invalidData);
  return result.data;
}
export function emailAssetOrigin(value: string): string {
  const parsed = url.safeParse(value);
  if (!parsed.success) throw new Error(emailPreviewCopy.invalidOrigin);
  const origin = new URL(parsed.data);
  if (origin.pathname !== '/' || origin.search || origin.hash)
    throw new Error(emailPreviewCopy.invalidOrigin);
  return origin.origin;
}
