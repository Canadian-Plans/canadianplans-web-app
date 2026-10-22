import type { FaqItemContent, SectionHeadingContent } from '@canadian-plans/ui/canadian-plans';
import { componentAssets } from './components';

export interface HelpFaqItem extends FaqItemContent {
  /**
   * figma: owner design copy. site: answer reused from facts already published elsewhere on
   * the site (15 Oct 2026 redesign). pending: awaiting approved content, never in JSON-LD.
   */
  readonly answerStatus: 'figma' | 'site' | 'pending';
  readonly keywords?: readonly string[];
}
export interface HelpFaqGroup {
  readonly id: string;
  readonly topic: string;
  readonly heading: SectionHeadingContent;
  readonly items: readonly HelpFaqItem[];
}
export const faqCopy = {
  previewOnly: true,
  title: 'FAQ: Canadian SIM, eSIM, Phone Plans & Orders | Canadian Plans',
  description:
    'Answers about getting a Canadian SIM or eSIM before you arrive, choosing Rogers, Fido or Chatr, documents, billing and tracking your order.',
  breadcrumb: {
    label: 'Breadcrumb',
    separator: '/',
    items: [{ label: 'Home', href: '/' }, { label: 'FAQ' }],
  },
  skip: 'Skip to main content',
  hero: {
    eyebrow: 'Help center',
    title: 'Canadian SIM and phone plan FAQ',
    description:
      'Answers for every stage: before you land, while choosing a plan, and after you order. Can’t find it here? Reach a real advisor below.',
  },
  controls: {
    searchLabel: 'Search frequently asked questions',
    searchPlaceholder: 'Search, e.g. "no credit check"',
    topicsLabel: 'FAQ topics',
    clear: 'Clear search',
    resultsSingular: 'question found',
    resultsPlural: 'questions found',
    emptyTitle: 'No matching questions',
    emptyDescription:
      'Try a different search, clear it to browse every topic, or contact an advisor.',
    pendingAnswer:
      'This answer is awaiting approved content. Talk to an advisor for current details.',
    image: 'Image',
    expand: '+',
    collapse: '−',
    advisor: 'Contact an advisor',
  },
  final: {
    title: 'Still have a question?',
    subtitle: 'A real advisor answers by phone or email. Nothing to pay.',
    primary: { label: 'Talk to an advisor →', href: '/contact' },
    secondary: { label: 'Browse all plans ›', href: '/mobile-plans' },
  },
  destinations: {
    plans: '/mobile-plans',
    contact: '/contact#message-us',
    advisor: '/contact#contact-options',
    track: '/track',
  },
} as const;

const pending = (id: string, question: string): HelpFaqItem => ({
  id,
  question,
  answer: faqCopy.controls.pendingAnswer,
  answerStatus: 'pending',
});
const site = (
  id: string,
  question: string,
  answer: string,
  keywords?: readonly string[],
): HelpFaqItem => ({
  id,
  question,
  answer,
  answerStatus: 'site',
  ...(keywords ? { keywords } : {}),
});
/** Source design copy only; closed questions have explicit pending answer slots. */
export const faqGroups: readonly HelpFaqGroup[] = [
  {
    id: 'faq-eligibility',
    topic: 'Eligibility',
    heading: {
      eyebrow: 'Eligibility',
      title: ['General and eligibility'],
      description: 'Talk to an advisor, Monday to Saturday, 9am–9pm Pacific time.',
    },
    items: [
      {
        id: 'credit-history',
        question: 'Do I need a Canadian credit history to order?',
        answer:
          "No. We help newcomers with no Canadian credit history every day. Our pre-arrival plans don't need one. If a plan you choose does, we'll tell you before anything is set up and suggest one that doesn't.",
        answerStatus: 'figma',
        keywords: ['no credit check', 'credit history', 'newcomer'],
      },
      site(
        'sin',
        'Do I need a SIN to sign up?',
        'No. You order with your name, email, phone, arrival date and city. An advisor asks for your passport or permit only if the provider needs it.',
      ),
      site(
        'before-arrival',
        'Can I order before I land in Canada?',
        'Yes. Order your eSIM online 1 to 3 weeks before your flight, from any country. Your Canadian number is ready before you fly and the line switches on when you land.',
        ['pre-arrival', 'esim'],
      ),
      site(
        'identification',
        'What ID do I need to order?',
        'Nothing is uploaded when you order. If asked, your passport photo page and your study or work permit, letter of introduction, visa or PR confirmation (COPR). A clear photo or PDF of each is enough.',
        ['documents', 'passport', 'permit'],
      ),
      pending('english', 'What if my English isn’t perfect?'),
      site(
        'choose-carrier',
        'Which carrier should I pick: Rogers, Fido or Chatr?',
        'All three use the Rogers network, so coverage is the same. Chatr has the lowest price, Fido is the best value for most people, and Rogers adds 5G+ speeds and Canada–US plans.',
      ),
      site(
        'official-carrier',
        'Is Canadian Plans an official carrier?',
        'No. We are an independent authorized dealer for Rogers, Fido and Chatr pre-arrival plans, and an authorized sales agent for home internet and mobile providers. Your plan and bill come from the provider, at the provider’s own prices.',
        ['dealer', 'authorized'],
      ),
    ],
  },
  {
    id: 'faq-plans-sim',
    topic: 'Plans & SIM',
    heading: { eyebrow: 'Plans & SIM', title: ['Plans, SIM and activation'] },
    items: [
      {
        id: 'esim-physical',
        question: 'What’s the difference between eSIM and a physical SIM?',
        answer:
          "An eSIM is a digital SIM built into newer phones, so there's no card to ship or insert. You can order it from any country and turn it on the moment you land. A physical SIM is the small card that goes in your phone's SIM tray. We'll check that your phone supports eSIM before we confirm.",
        answerStatus: 'figma',
      },
      site(
        'esim-support',
        'How do I know if my phone supports eSIM?',
        'On an iPhone, go to Settings → General → About and look for “EID” or “Digital SIM”. On Samsung and Android, go to Settings → Connections → SIM manager and look for “Add eSIM”. Your phone must also be unlocked.',
      ),
      pending('activation-time', 'How long does activation take?'),
      site(
        'home-country-number',
        'Can I keep my number from my home country?',
        'Yes, keep your home SIM alongside your Canadian eSIM in a dual-SIM phone so you still get one-time codes from your bank. Turn off roaming on the home SIM to avoid charges.',
        ['dual sim', 'otp'],
      ),
      pending('data-limit', 'What happens when my data runs out?'),
      site(
        'change-plan',
        'Can I switch plans later?',
        'Yes. You can change your plan after the first month if you use more or less data than expected.',
      ),
    ],
  },
  {
    id: 'faq-orders-billing',
    topic: 'Orders & billing',
    heading: { eyebrow: 'Orders & billing', title: ['Orders, billing and tracking'] },
    items: [
      {
        id: 'order-tracking',
        question: 'How do I track my order?',
        answer:
          'Use the Track order page with your order number and email. You’ll see live status, every document we have on file, and can request a change or upload anything missing right from there. No need to call unless you want to.',
        answerStatus: 'figma',
      },
      site(
        'payment-time',
        'When am I charged?',
        'Nothing is paid online when you order. Once your number is active, your first bill comes from the carrier, and an advisor walks you through the date before anything is billed.',
        ['payment', 'bill'],
      ),
      pending('change-order', 'Can I change my order after placing it?'),
      pending('missing-document', 'What if a document is missing or wrong?'),
      pending('cancel-refund', 'How do I cancel or get a refund?'),
      site(
        'support',
        'Who do I contact if something goes wrong?',
        'Contact us by phone or email, Monday to Saturday, 9am–9pm Pacific time. You will reach the same advisors who confirm every order.',
        ['help', 'contact'],
      ),
    ],
  },
];
export const faqAssets = {
  ...componentAssets,
  phone: { src: '/design/faq/1-imgPhoneIcon.svg', width: 16, height: 16, nodeId: '364:2155' },
  faqSearch: { src: '/design/faq/0-imgIconSearch.svg', width: 20, height: 20, nodeId: '332:818' },
};
