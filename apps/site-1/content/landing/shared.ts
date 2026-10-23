import type { RedesignFaqIntro } from '../category-redesign';
import { homeRedesign } from '../home-redesign';
import type { LandingChecklistBlock, LandingStepsBlock } from './types';

/** Help card + accordion symbols shared with the homepage FAQ. */
export const landingFaqIntro = (
  intro: Pick<RedesignFaqIntro, 'eyebrow' | 'title' | 'description'>,
): RedesignFaqIntro => ({
  ...intro,
  helpTitle: homeRedesign.faq.helpTitle,
  helpBody: homeRedesign.faq.helpBody,
  helpAction: homeRedesign.faq.helpAction,
  symbols: homeRedesign.faq.symbols,
});

export const landingBreadcrumb = {
  label: 'Breadcrumb',
  separator: '/',
} as const;

export const landingSkip = 'Skip to main content';

export const advisorHours = 'Advisors are available Monday to Saturday, 9am to 9pm Pacific time.';

/** Same pre-arrival timing as the category page; shared by every pre-arrival landing page. */
export const preArrivalSteps = (title: string): LandingStepsBlock => ({
  kind: 'steps',
  id: 'how-it-works',
  eyebrow: 'How it works',
  title,
  aside: 'Done in 3 steps',
  items: [
    {
      id: 'order',
      marker: '1',
      meta: '1–3 weeks before',
      title: 'Order and get your number',
      body: 'Pick a plan online in about 2 minutes, from any country. No payment and nothing to upload. An advisor confirms by phone or email and your Canadian number is assigned, ready for bank and school forms.',
      art: 'step-pa-order',
    },
    {
      id: 'install',
      marker: '2',
      meta: 'Before you fly',
      title: 'Install the eSIM at home',
      body: 'Scan the QR code we email you while you are on WiFi. The line stays off until you land.',
      art: 'step-pa-esim',
    },
    {
      id: 'land',
      marker: '✓',
      meta: 'Day 1',
      title: 'Land and switch on',
      body: 'Turn off airplane mode at arrivals. Calls, texts and data work before you reach baggage claim.',
      art: 'step-pa-online',
      done: true,
    },
  ],
});

export const eSimCheck = {
  title: 'Is my phone eSIM-ready?',
  body: 'Your phone must be unlocked and support eSIM. It takes about 30 seconds to check.',
  rows: [
    { label: 'iPhone', value: 'Settings → General → About. Look for “EID” or “Digital SIM”.' },
    {
      label: 'Samsung and Android',
      value: 'Settings → Connections → SIM manager. Look for “Add eSIM”.',
    },
    { label: 'Not sure?', value: 'Email us your phone model and we will check it.' },
  ],
} as const;

/** The documents checklist every pre-arrival page shows; the permit line varies by audience. */
export const preArrivalDocuments = (
  id: string,
  title: string,
  permit: { readonly title: string; readonly body: string },
): LandingChecklistBlock => ({
  kind: 'checklist',
  id,
  eyebrow: 'Before you order',
  title,
  description:
    'You do not upload anything to order, and there is no credit check. Have these ready in case the carrier asks your advisor for them.',
  mark: '✓',
  items: [
    { title: 'Passport', body: 'The photo page. Your name should match your travel document.' },
    permit,
    { title: 'Arrival date and city', body: 'So your plan starts the day you land.' },
    { title: 'Email address', body: 'We send your eSIM QR code here.' },
  ],
  aside: eSimCheck,
});

export const pricesNote =
  'Prices in Canadian dollars, before tax, checked 5 October 2026 against Rogers, Fido and Chatr plan pages. Prices change often; the plan list shows today’s price.';

/** FAQ answers every pre-arrival audience page shares, worded to stand alone when quoted. */
export const sharedArrivalFaq = {
  esim: {
    id: 'shared-esim',
    question: 'How do I know if my phone supports eSIM?',
    answer:
      'Check your phone settings for an EID or an “Add eSIM” option. On an iPhone it is under Settings, General, About; on Android under Settings, Connections, SIM manager. Your phone also has to be unlocked. Send us the model if you are unsure.',
  },
  pay: {
    id: 'shared-pay',
    question: 'When do I pay, and how much?',
    answer:
      'Nothing is paid on this website. Once your number is active, your first bill comes from Rogers, Fido or Chatr for the monthly or prepaid price plus tax, and your advisor explains the date before anything is billed. Canadian Plans charges no SIM, activation or shipping fee.',
  },
  wifi: {
    id: 'shared-wifi',
    question: 'Do I need WiFi at the airport to switch it on?',
    answer:
      'No. Install the eSIM at home on WiFi before you fly. When you land, turn off airplane mode and the line connects on its own.',
  },
  family: {
    id: 'shared-family',
    question: 'Can I order eSIMs for my whole family?',
    answer:
      'Yes. Place one order per person, each with their own name, email and phone model, so each line is in the right name. An advisor can set up several lines in one call.',
  },
  airport: {
    id: 'shared-airport',
    question: 'Does it matter which airport I land at?',
    answer:
      'No. These are national plans on the Rogers network, so your eSIM works whether you land in Toronto, Vancouver, Montreal, Calgary or anywhere else in Canada.',
  },
  cancel: {
    id: 'shared-cancel',
    question: 'What if my plans change or I need to cancel?',
    answer:
      'Before activation you can cancel at no cost: tell your advisor and the order is closed. After activation the plan is with the carrier, so you cancel with them under their terms. Because nothing was paid to Canadian Plans, there is nothing for us to refund.',
  },
} as const;
