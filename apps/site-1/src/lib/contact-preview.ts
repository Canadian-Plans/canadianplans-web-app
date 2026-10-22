import { contactCopy, contactTopics, type ContactTopic } from '@content/contact';

export interface ContactMessageInput {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly topic: string;
  readonly message: string;
}
export interface ContactTrackingInput {
  readonly order: string;
  readonly email: string;
}
export type ContactMessageErrors = Partial<Record<keyof ContactMessageInput, string>>;
export type ContactTrackingErrors = Partial<Record<keyof ContactTrackingInput, string>>;
export type ContactPreviewRequest =
  | { readonly kind: 'message'; readonly input: ContactMessageInput }
  | { readonly kind: 'tracking'; readonly input: ContactTrackingInput };
export type ContactPreviewResult =
  | { readonly status: 'preview'; readonly previewOnly: true }
  | { readonly status: 'invalid'; readonly previewOnly: true };

export function isContactTopic(value: string): value is ContactTopic {
  return contactTopics.some((topic) => topic.value === value);
}
function validEmail(value: string): boolean {
  return value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim());
}
export function validateContactMessage(input: ContactMessageInput): ContactMessageErrors {
  const errors: ContactMessageErrors = {};
  const copy = contactCopy.feedback.errors;
  if (!input.name.trim() || input.name.trim().length > 200) errors.name = copy.name;
  if (!validEmail(input.email)) errors.email = copy.email;
  const phone = input.phone.trim();
  const digits = phone.replace(/\D/gu, '').length;
  if (phone && (phone.length > 40 || !/^\+?[\d\s().-]+$/u.test(phone) || digits < 7 || digits > 15))
    errors.phone = copy.phone;
  if (!isContactTopic(input.topic)) errors.topic = copy.topic;
  if (!input.message.trim() || input.message.trim().length > 4000) errors.message = copy.message;
  return errors;
}
/**
 * Interim for REL-33 (owner decision 22 Oct 2026): until the site can deliver
 * messages itself, the message form opens the visitor's email app with a
 * draft to the support inbox. Nothing is sent to or stored by the site.
 */
export function contactMessageMailto(input: ContactMessageInput): string {
  const topic = contactTopics.find((option) => option.value === input.topic)?.label;
  const subject = topic ? `${contactCopy.message.subject}: ${topic}` : contactCopy.message.subject;
  const phone = input.phone.trim();
  const body = [
    input.message.trim(),
    '',
    `Name: ${input.name.trim()}`,
    `Email: ${input.email.trim()}`,
    ...(phone ? [`Phone: ${phone}`] : []),
  ].join('\n');
  return `mailto:${contactCopy.emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
export function validateContactTracking(input: ContactTrackingInput): ContactTrackingErrors {
  const errors: ContactTrackingErrors = {};
  if (!input.order.trim() || input.order.trim().length > 80)
    errors.order = contactCopy.feedback.errors.order;
  if (!validEmail(input.email)) errors.email = contactCopy.feedback.errors.email;
  return errors;
}
