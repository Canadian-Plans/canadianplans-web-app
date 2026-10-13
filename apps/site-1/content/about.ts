import type { FigmaAsset, SectionHeadingContent } from '@canadian-plans/ui/canadian-plans';
import {
  chromeContent,
  componentAssets,
  footerContent,
  type ChromeContent,
  type FooterContent,
} from './components';

interface AboutStat {
  readonly id: string;
  readonly value: string;
  readonly label: string;
}
interface AboutBenefit {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: FigmaAsset;
}

/** Owner-supplied design copy; business claims and contact details remain preview fixtures. */
export const aboutCopy = {
  previewOnly: true,
  title: 'About Canadian Plans',
  skip: 'Skip to main content',
  imageLabel: 'Image',
  hero: {
    eyebrow: 'About us',
    title: 'Canadian phone and internet plans, explained by humans.',
    desktopLines: ['Canadian phone and ', 'internet plans, explained by ', 'humans.'],
    description:
      "We're an authorized Rogers, Fido and Chatr dealer in Surrey, BC. We help newcomers get a phone or internet plan, no Canadian credit history needed, in plain English.",
    imageCaption: 'The Canadian Plans team at the Surrey shop counter, wearing name badges',
  },
  story: {
    heading: {
      eyebrow: 'Our story',
      title: ["We started because a phone plan shouldn't need a credit history."],
      description:
        "Too many newcomers were turned away for not having a SIN, a credit score or a local address, or were sold plans they didn't need. So we became an authorized Rogers, Fido and Chatr dealer for people arriving in Canada: students, workers, permanent residents and visitors.",
    } satisfies SectionHeadingContent,
    imageCaption:
      'An advisor helping a newly arrived student set up an eSIM on her phone at the counter',
    stats: [
      { id: 'location', value: 'Surrey, BC', label: 'visit us in person' },
      { id: 'carriers', value: '3 carriers', label: 'Rogers, Fido, Chatr' },
      { id: 'hours', value: 'Mon–Sat', label: '9am–9pm Pacific' },
      { id: 'payment', value: '$0', label: 'due today to order' },
    ] satisfies readonly AboutStat[],
  },
  benefitsHeading: { title: ['Why newcomers choose us'] } satisfies SectionHeadingContent,
  dealer: {
    label: 'Authorized dealer for',
    carriers: ['ROGERS', 'FIDO', 'CHATR'],
    description:
      "We're an independent authorized dealer, not the carrier. Carrier prices, no markup.",
  },
  final: {
    title: 'Ready to get connected?',
    description: 'Talk to a real advisor. No bots, no pressure, nothing to pay today.',
    primary: 'See plans  →',
    secondary: 'Talk to an advisor',
  },
  destinations: {
    plans: '/mobile-plans',
    advisor: '/contact#message-us',
    whatsapp: '/contact#contact-options',
  },
} as const;
export const aboutAssets = {
  ...componentAssets,
  phone: { src: '/design/about/1-imgPhoneIcon.svg', width: 16, height: 16, nodeId: '364:2155' },
};
/** Desktop and mobile exports have identical intrinsic 24×24 icons. */
export const aboutBenefits: readonly AboutBenefit[] = [
  {
    id: 'credit',
    title: 'No credit history needed',
    description: 'No Canadian credit history? No problem. We work with newcomers every day.',
    icon: { src: '/design/about/0-imgIcon1.svg', width: 24, height: 24, nodeId: '314:439' },
  },
  {
    id: 'humans',
    title: 'Real humans',
    description: 'A real advisor calls to confirm every order. No bots, no phone menus.',
    icon: { src: '/design/about/0-imgIcon2.svg', width: 24, height: 24, nodeId: '314:443' },
  },
  {
    id: 'anywhere',
    title: 'Order from anywhere',
    description: 'Start before you land. Order your eSIM from your home country.',
    icon: { src: '/design/about/0-imgIcon3.svg', width: 24, height: 24, nodeId: '314:446' },
  },
  {
    id: 'dealer',
    title: 'Authorized dealer',
    description: "Rogers, Fido and Chatr plans at the carriers' own prices. No markup.",
    icon: { src: '/design/about/0-imgIcon4.svg', width: 24, height: 24, nodeId: '314:449' },
  },
];
export const aboutChrome: ChromeContent = {
  ...chromeContent,
  navigation: [
    { label: 'Pre-arrival SIM', href: '/pre-arrival-sim' },
    { label: 'Home Internet', href: '/home-internet' },
    { label: 'Mobile Plans', href: '/mobile-plans' },
    { label: 'Guides', href: '/faq' },
  ],
  phone: { ...chromeContent.phone, href: aboutCopy.destinations.whatsapp },
  track: { ...chromeContent.track, href: '/track' },
  contact: { ...chromeContent.contact, href: '/contact' },
  help: { ...chromeContent.help, href: '/faq' },
  promoLink: { ...chromeContent.promoLink, href: '/pre-arrival-sim#plans' },
};
export const aboutFooter: FooterContent = {
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
                ? '/track'
                : link.label === 'Contact'
                  ? '/contact'
                  : '/faq',
    })),
  })),
  legal: footerContent.legal.map((link) => ({
    ...link,
    href:
      link.label === 'Privacy'
        ? '/privacy'
        : link.label === 'Terms'
          ? '/terms'
          : aboutCopy.destinations.advisor,
  })),
};
