import type { RedesignFaqIntro } from '../category-redesign';
import { homeRedesign } from '../home-redesign';
import type { LandingStepsBlock } from './types';

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
      body: 'Pick a plan online in about 2 minutes, from any country. We confirm by phone or email and assign your Canadian number, ready for bank and school forms.',
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
      body: 'Turn the line on at arrivals. Calls, texts and data work before you reach baggage claim.',
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

export const pricesNote =
  'Prices in Canadian dollars, before tax, checked 5 October 2026 against Rogers, Fido and Chatr plan pages. Prices change often; the plan list shows today’s price.';
