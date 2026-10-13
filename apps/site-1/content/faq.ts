import type { FaqItemContent, SectionHeadingContent } from '@canadian-plans/ui/canadian-plans';
import {
  chromeContent,
  componentAssets,
  footerContent,
  type ChromeContent,
  type FooterContent,
} from './components';

export interface HelpFaqItem extends FaqItemContent {
  readonly answerStatus: 'figma' | 'pending';
  readonly keywords?: readonly string[];
}
export interface HelpFaqGroup {
  readonly id: string;
  readonly topic: string;
  readonly heading: SectionHeadingContent;
  readonly imageCaption?: string;
  readonly items: readonly HelpFaqItem[];
}
export const faqCopy = {
  previewOnly: true,
  title: 'Frequently Asked Questions | Canadian Plans',
  skip: 'Skip to main content',
  hero: {
    eyebrow: 'Help center',
    title: 'Frequently asked questions',
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
    advisor: 'WhatsApp us',
  },
  final: {
    title: 'Still have a question?',
    description: 'A real advisor answers in minutes. WhatsApp, call or message us.',
    primary: 'Browse all plans  →',
    secondary: 'Talk to an advisor',
  },
  destinations: {
    plans: '/mobile-plans',
    contact: '/contact#message-us',
    whatsapp: '/contact#contact-options',
    track: '/track',
  },
} as const;

const pending = (id: string, question: string): HelpFaqItem => ({
  id,
  question,
  answer: faqCopy.controls.pendingAnswer,
  answerStatus: 'pending',
});
/** Source design copy only; closed questions have explicit pending answer slots. */
export const faqGroups: readonly HelpFaqGroup[] = [
  {
    id: 'faq-eligibility',
    topic: 'Eligibility',
    heading: {
      eyebrow: 'FAQ',
      title: ['General &', 'eligibility'],
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
      pending('sin', 'Do I need a SIN to sign up?'),
      pending('before-arrival', 'Can I order before I land in Canada?'),
      pending('identification', 'What ID do I need to order?'),
      pending('english', 'What if my English isn’t perfect?'),
      pending('choose-carrier', 'Which carrier should I pick: Rogers, Fido or Chatr?'),
      pending('official-carrier', 'Is Canadian Plans an official carrier?'),
    ],
  },
  {
    id: 'faq-plans-sim',
    topic: 'Plans & SIM',
    heading: { eyebrow: 'FAQ', title: ['Plans, SIM &', 'activation'] },
    imageCaption:
      'A phone showing the eSIM install screen with a QR code, next to a physical SIM card',
    items: [
      {
        id: 'esim-physical',
        question: 'What’s the difference between eSIM and a physical SIM?',
        answer:
          "An eSIM is a digital SIM built into newer phones, so there's no card to ship or insert. You can order it from any country and turn it on the moment you land. A physical SIM is the small card that goes in your phone's SIM tray. We'll check that your phone supports eSIM before we confirm.",
        answerStatus: 'figma',
      },
      pending('esim-support', 'How do I know if my phone supports eSIM?'),
      pending('activation-time', 'How long does activation take?'),
      pending('home-country-number', 'Can I keep my number from my home country?'),
      pending('data-limit', 'What happens when my data runs out?'),
      pending('change-plan', 'Can I switch plans later?'),
    ],
  },
  {
    id: 'faq-orders-billing',
    topic: 'Orders & billing',
    heading: { eyebrow: 'FAQ', title: ['Orders, billing', '& tracking'] },
    imageCaption: 'Close-up of a hand holding a phone with the order tracking page open',
    items: [
      {
        id: 'order-tracking',
        question: 'How do I track my order?',
        answer:
          'Use the Track order page with your order number and email. You’ll see live status, every document we have on file, and can request a change or upload anything missing right from there. No need to call unless you want to.',
        answerStatus: 'figma',
      },
      pending('payment-time', 'When am I charged?'),
      pending('change-order', 'Can I change my order after placing it?'),
      pending('missing-document', 'What if a document is missing or wrong?'),
      pending('cancel-refund', 'How do I cancel or get a refund?'),
      pending('support', 'Who do I contact if something goes wrong?'),
    ],
  },
];
export const faqAssets = {
  ...componentAssets,
  phone: { src: '/design/faq/1-imgPhoneIcon.svg', width: 16, height: 16, nodeId: '364:2155' },
  faqSearch: { src: '/design/faq/0-imgIconSearch.svg', width: 20, height: 20, nodeId: '332:818' },
};
export const faqChrome: ChromeContent = {
  ...chromeContent,
  navigation: [
    { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
    { label: 'Home Internet', href: '/home-internet' },
    { label: 'Mobile Plans', href: '/mobile-plans' },
    { label: 'Guides', href: '#faq-eligibility' },
  ],
  phone: { ...chromeContent.phone, href: faqCopy.destinations.whatsapp },
  track: { ...chromeContent.track, href: faqCopy.destinations.track },
  contact: { ...chromeContent.contact, href: '/contact' },
  help: { ...chromeContent.help, href: '#faq-main' },
  promoLink: { ...chromeContent.promoLink, href: '/pre-arrival-sim#plans' },
};
export const faqFooter: FooterContent = {
  ...footerContent,
  groups: footerContent.groups.map((group) => ({
    ...group,
    links: group.links.map((link) => ({
      ...link,
      href:
        group.title === 'Pre-arrival SIM'
          ? '/pre-arrival-sim#plans'
          : group.title === 'Home Internet'
            ? '/home-internet#internet-plans'
            : group.title === 'Mobile Plans'
              ? '/mobile-plans#mobile-plans'
              : link.label === 'Track order'
                ? faqCopy.destinations.track
                : link.label === 'Contact'
                  ? '/contact'
                  : '#faq-eligibility',
    })),
  })),
  legal: footerContent.legal.map((link) => ({
    ...link,
    href:
      link.label === 'Privacy'
        ? '/privacy'
        : link.label === 'Terms'
          ? '/terms'
          : '/contact#message-us',
  })),
};
