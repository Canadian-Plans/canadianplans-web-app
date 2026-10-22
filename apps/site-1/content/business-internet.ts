import type { FaqItemContent } from '@canadian-plans/ui/canadian-plans';
import type { ChromeContent, FooterContent } from './components';
import { legalAssets } from './legal';
import { siteChrome, siteFooter } from './site-chrome';

/**
 * Business Internet preview page (Electric Blue, 14 October 2026). Noindex design preview.
 * Bracketed values are open business inputs (pricing, install timelines, static IP
 * availability) and must be confirmed before publication. The quote form is a UI stub:
 * nothing is stored or sent.
 */
export const businessCopy = {
  title: 'Business Internet | Canadian Plans',
  skip: 'Skip to main content',
  quote: {
    eyebrow: 'Get a quote',
    title: 'Tell us about your business',
    description:
      'An advisor checks what is available at your address and sends you a quote. You pay nothing until you confirm.',
    previewNote: 'Design preview: this form is not connected yet and sends nothing.',
    businessName: { label: 'Business name', placeholder: 'e.g. Maple Street Café' },
    name: { label: 'Your name', placeholder: 'First and last name' },
    email: { label: 'Email', placeholder: 'you@business.ca' },
    phone: {
      label: 'Phone',
      hint: 'Optional. Include the country code if outside Canada.',
      placeholder: '+1 604 555 0100',
    },
    postalCode: { label: 'Business postal code', placeholder: 'e.g. V3T 1Z2' },
    need: { label: 'What do you need?', placeholder: 'Choose one', indicator: '▾' },
    notes: {
      label: 'Anything else? (optional)',
      placeholder: 'Number of staff, opening hours, current provider…',
    },
    submit: 'Request my quote',
    pending: 'Checking…',
    result:
      'Preview only: your details look complete, but this form is not connected yet and nothing was sent. Call or WhatsApp us for a real quote.',
    retry: 'Something went wrong. Please try again, or call or WhatsApp us.',
    errors: {
      businessName: 'Enter your business name.',
      name: 'Enter your name.',
      email: 'Enter a valid email address, like you@business.ca.',
      phone: 'Enter a valid phone number, or leave it empty.',
      postalCode: 'Enter a Canadian postal code, like V3T 1Z2.',
      need: 'Choose what you need.',
      notes: 'Keep this under 2,000 characters.',
    },
  },
} as const;

export const businessNeeds = [
  { value: 'internet', label: 'Business internet' },
  { value: 'internet-phones', label: 'Internet and team phones' },
  { value: 'not-sure', label: 'Not sure yet' },
] as const;
export type BusinessNeed = (typeof businessNeeds)[number]['value'];

export const businessFaq: readonly FaqItemContent[] = [
  {
    id: 'business-faq-price',
    question: 'How much does business internet cost?',
    answer: 'An advisor quotes the exact price for your address before anything is set up.',
  },
  {
    id: 'business-faq-install',
    question: 'How soon can you install?',
    answer:
      'Usually [typical business install timeline]. We book the visit around your opening hours.',
  },
  {
    id: 'business-faq-static-ip',
    question: 'Can I get a static IP?',
    answer:
      'Static IP options are available on [confirm which business plans]. Ask your advisor when you request a quote.',
  },
  {
    id: 'business-faq-phones',
    question: 'Can you set up phones for my team too?',
    answer:
      'Yes. Choose "Internet and team phones" in the quote form and your advisor will include mobile plans for your staff.',
  },
];

/** Business preview uses the shared site chrome (15 October 2026). */
export const businessChrome: ChromeContent = {
  ...siteChrome,
  promoLink: { ...siteChrome.promoLink, href: '/pre-arrival-sim#plans' },
};
export const businessAssets = legalAssets;
export const businessFooter: FooterContent = siteFooter;
