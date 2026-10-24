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
/**
 * /faq copy (SEO rewrite, 23 October 2026). Answers are written to stand alone when quoted:
 * each repeats the key fact and the price or rule it depends on. Facts trace to
 * docs/LAUNCH_PLANS.md and docs/OPEN_INPUTS.md; questions the owner has not decided keep a
 * visible pending slot and stay out of the FAQPage schema.
 */
export const faqCopy = {
  previewOnly: true,
  title: 'Canadian SIM Card & Phone Plan FAQ for Newcomers | Canadian Plans',
  description:
    'Straight answers about getting a Canadian SIM or eSIM before you arrive, credit checks, SIN, documents, billing, cancelling and tracking your order.',
  breadcrumb: {
    label: 'Breadcrumb',
    separator: '/',
    items: [{ label: 'Home', href: '/' }, { label: 'FAQ' }],
  },
  skip: 'Skip to main content',
  hero: {
    eyebrow: 'Help centre',
    title: 'Canadian SIM card and phone plan questions, answered',
    description:
      'Everything people ask us before they land, while choosing a plan, and after they order. If your question is not here, a real advisor answers by phone or email.',
  },
  controls: {
    searchLabel: 'Search frequently asked questions',
    searchPlaceholder: 'Search, e.g. "credit check"',
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
    subtitle: 'A real advisor answers by phone or email, Monday to Saturday. Nothing to pay.',
    primary: { label: 'Talk to an advisor →', href: '/contact' },
    secondary: { label: 'See eSIM plans ›', href: '/pre-arrival-sim#plans' },
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
export const faqGroups: readonly HelpFaqGroup[] = [
  {
    id: 'faq-eligibility',
    topic: 'Eligibility',
    heading: {
      eyebrow: 'Eligibility',
      title: ['Who can order, and what you need'],
      description: 'Talk to an advisor, Monday to Saturday, 9am to 9pm Pacific time.',
    },
    items: [
      site(
        'credit-history',
        'Do I need a Canadian credit history or a credit check to get a phone plan?',
        'Not for the eSIM plans you order before you arrive: Rogers, Fido and Chatr plans through Canadian Plans need no credit check and no Canadian credit history. The bring-your-own-phone mobile plans for people already in Canada are postpaid and do need an identity and credit check; if that is a problem, start with an eSIM plan instead.',
        ['no credit check', 'credit history', 'newcomer'],
      ),
      site(
        'before-arrival',
        'Can I order a Canadian SIM before I land in Canada?',
        'Yes. Order your eSIM online 1 to 3 weeks before your flight, from any country. An advisor confirms the order, your Canadian number is assigned and your eSIM QR code arrives by email. Install it at home and the line starts when you land.',
        ['pre-arrival', 'esim', 'before you arrive'],
      ),
      site(
        'who-eligible',
        'Which plan can I get: monthly or prepaid?',
        'Arriving on a study permit, a work permit or as a permanent resident and staying over 90 days: a monthly Rogers or Fido plan, from $35 a month. Arriving on a visitor visa or a Super Visa for under 90 days: a Chatr prepaid plan, from $35 for 30 days. Prices are CAD plus tax.',
        ['student', 'worker', 'visitor', 'super visa', 'permanent resident'],
      ),
      site(
        'sin',
        'Do I need a SIN to sign up?',
        'No. You order with your name, email, phone, arrival date and city. An advisor asks for your passport or permit only if the carrier needs it.',
        ['sin', 'social insurance number'],
      ),
      site(
        'identification',
        'What ID do I need to order?',
        'Nothing is uploaded when you order an eSIM plan. If the carrier asks, your advisor requests your passport photo page and your study or work permit, letter of introduction, visa or confirmation of permanent residence (COPR). A clear photo or PDF is enough. Bring-your-own-phone mobile plans do need a government ID for the credit check.',
        ['documents', 'passport', 'permit', 'copr'],
      ),
      pending('english', 'What if my English isn’t perfect?'),
      site(
        'choose-carrier',
        'Which carrier should I pick: Rogers, Fido or Chatr?',
        'All three use the Rogers network, so coverage is the same. Chatr is prepaid and for visitors staying under 90 days. Fido is the lowest monthly price for longer stays (75 GB for $35). Rogers gives you more data, a hotspot, and on the $50 plan Canada + US calling and roaming.',
        ['rogers', 'fido', 'chatr', 'network'],
      ),
      site(
        'official-carrier',
        'Is Canadian Plans a phone carrier?',
        'No. We are an independent authorized reseller of Rogers, Fido and Chatr for the eSIM plans you order before you arrive, and an authorized sales agent for home internet and mobile providers. Your plan and your bill come from the provider, at the provider’s own price. Our help costs you nothing.',
        ['dealer', 'authorized', 'reseller'],
      ),
    ],
  },
  {
    id: 'faq-plans-sim',
    topic: 'Plans & SIM',
    heading: { eyebrow: 'Plans & SIM', title: ['Plans, eSIM and activation'] },
    items: [
      site(
        'esim-physical',
        'What is the difference between an eSIM and a physical SIM?',
        'An eSIM is a digital SIM built into newer phones, so there is no card to ship or insert. You can order it from any country and switch it on the moment you land. A physical SIM is the small card that goes in the phone’s SIM tray. Plans you order before you arrive are eSIM only; mobile plans for people already in Canada can be either.',
        ['esim', 'physical sim'],
      ),
      site(
        'esim-support',
        'How do I know if my phone supports eSIM?',
        'On an iPhone, go to Settings, General, About and look for “EID” or “Digital SIM”. On Samsung and other Android phones, go to Settings, Connections, SIM manager and look for “Add eSIM”. Your phone must also be unlocked. Not sure? Email us the model and we check.',
        ['eid', 'unlocked', 'compatible'],
      ),
      site(
        'activation-time',
        'How long does activation take?',
        'After you order, an advisor confirms it with you, usually the same day. Your eSIM QR code then arrives by email within minutes. You install it at home on WiFi, and the line starts when you land. Chatr prepaid plans are activated 24 hours before your arrival date.',
        ['activation', 'how long'],
      ),
      site(
        'home-country-number',
        'Can I keep my number from my home country?',
        'Yes. Keep your home SIM alongside your Canadian eSIM in a dual-SIM phone so you still receive one-time codes from your bank. Turn off roaming on the home SIM to avoid charges.',
        ['dual sim', 'otp'],
      ),
      site(
        'data-limit',
        'What happens when my data runs out?',
        'On the Rogers and Fido monthly plans you keep going at a reduced speed until your next billing date, with no overage charge. On Chatr prepaid plans you also drop to a slower speed until the plan renews. You can change to a bigger plan after the first month.',
        ['data', 'overage', 'slow'],
      ),
      site(
        'change-plan',
        'Can I switch plans later?',
        'Yes. You can change your plan after the first month if you use more or less data than expected. Ask your advisor and they arrange it with the provider.',
      ),
      site(
        'unlocked',
        'Does my phone need to be unlocked?',
        'Yes. Every plan is bring-your-own-device, so your phone must be unlocked. If it is locked to a carrier at home, ask that carrier to unlock it before you order.',
        ['unlocked', 'locked phone'],
      ),
    ],
  },
  {
    id: 'faq-orders-billing',
    topic: 'Orders & billing',
    heading: { eyebrow: 'Orders & billing', title: ['Orders, billing, cancelling and tracking'] },
    items: [
      site(
        'payment-time',
        'When am I charged, and by whom?',
        'Nothing is paid on this website, on any plan. Once your plan is active, the provider bills you directly for the monthly price plus tax. Your advisor explains the billing date before anything is charged. Canadian Plans charges no SIM, activation or shipping fee.',
        ['payment', 'bill', 'charged'],
      ),
      site(
        'order-tracking',
        'How do I track my order?',
        'Use the Track order page with your order number and email. You see the current status and any document we still need, and you can request a change from there. No account is needed.',
        ['track', 'status'],
      ),
      site(
        'cancel-refund',
        'How do I cancel, and can I get a refund?',
        'Before your plan is activated, tell your advisor and we cancel the order at no cost. After activation your plan is with the provider, so you cancel with them under their terms. Because Canadian Plans takes no payment, there is nothing for us to refund.',
        ['cancel', 'refund'],
      ),
      pending('change-order', 'Can I change my order after placing it?'),
      pending('missing-document', 'What if a document is missing or wrong?'),
      site(
        'support',
        'Who do I contact if something goes wrong?',
        'Call or email us, Monday to Saturday, 9am to 9pm Pacific time. You reach the same advisors who confirm every order. For a problem with an active plan, your advisor also tells you how to reach the provider.',
        ['help', 'contact'],
      ),
    ],
  },
  {
    id: 'faq-internet',
    topic: 'Home internet',
    heading: { eyebrow: 'Home internet', title: ['Home internet and TV'] },
    items: [
      site(
        'internet-where',
        'Where do you sell home internet?',
        'British Columbia, Alberta, Manitoba and Saskatchewan, priced by province. Plans start at $50 a month in Saskatchewan, $70 in BC and Alberta, and $90 in Manitoba, plus tax, with unlimited data, a WiFi router and modem included and free installation. If you live elsewhere, join the wish list on the order page.',
        ['internet', 'province', 'bc', 'alberta', 'manitoba', 'saskatchewan'],
      ),
      site(
        'internet-install',
        'How fast can home internet be installed?',
        'Usually within about 3 days of your call with an advisor. Installation is free, nothing is paid up front, and a technician sets up the modem and WiFi.',
        ['install', 'installation'],
      ),
      site(
        'internet-contract',
        'Is there a contract for home internet?',
        'No. There is no contract, even with the 2-year price lock in BC, Alberta and Manitoba. In Saskatchewan the first two months are free. Your service agreement is with the provider, and your advisor explains it before anything is booked.',
        ['contract', 'price lock'],
      ),
    ],
  },
];
export const faqAssets = {
  ...componentAssets,
  phone: { src: '/design/faq/1-imgPhoneIcon.svg', width: 16, height: 16, nodeId: '364:2155' },
  faqSearch: { src: '/design/faq/0-imgIconSearch.svg', width: 20, height: 20, nodeId: '332:818' },
};
