import type { CpButtonTone } from '@canadian-plans/ui/canadian-plans';
import { componentAssets } from './components';

export type ContactTopic = 'general' | 'sim' | 'mobile' | 'internet' | 'documents' | 'verification';
export type ContactPreviewKind = 'whatsapp' | 'call' | 'directions';
interface ContactOption {
  readonly id: 'whatsapp' | 'call' | 'email';
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly action: string;
  readonly tone: 'mint' | 'sky' | 'lemon';
  readonly buttonTone: CpButtonTone;
}

/** Design copy and contact details are preview fixtures, pending business approval. */
export const contactCopy = {
  previewOnly: true,
  title: 'Contact Canadian Plans: WhatsApp, Phone, Email & Surrey Office',
  description:
    'Contact Canadian Plans by WhatsApp, phone or email, or visit our Surrey, BC office. Real advisors Monday to Saturday, 9am–9pm Pacific. Track your order without an account.',
  skip: 'Skip to main content',
  breadcrumb: {
    label: 'Breadcrumb',
    separator: '/',
    items: [{ label: 'Home', href: '/' }, { label: 'Contact' }],
  },
  hero: {
    eyebrow: 'Contact Canadian Plans',
    title: 'Talk to a real person',
    description:
      "No bots, no call-centre maze. You'll reach the same advisors who confirm every order, Mon–Sat, 9am–9pm Pacific.",
    trust: 'Authorized Rogers, Fido and Chatr dealer in Surrey, BC',
  },
  options: [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      title: 'Fastest reply',
      description: 'Usually within 15 minutes during opening hours.',
      action: 'Chat on WhatsApp',
      tone: 'mint',
      buttonTone: 'primary',
    },
    {
      id: 'call',
      label: 'Call us',
      title: '+1 778-682-3771',
      description: 'Toll-free in Canada. International callers: use WhatsApp.',
      action: 'Call now',
      tone: 'sky',
      buttonTone: 'outline',
    },
    {
      id: 'email',
      label: 'Email',
      title: 'info@canadianplans.com',
      description: 'We reply within 1 business day.',
      action: 'Send an email',
      tone: 'lemon',
      buttonTone: 'outline',
    },
  ] satisfies readonly ContactOption[],
  track: {
    title: 'Track your order',
    description: 'See where your eSIM, mobile plan or internet install is. No account needed.',
    orderLabel: 'Order number',
    orderPlaceholder: 'CP-2026-10482',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    submit: 'Track order  →',
    help: "Can't find your order number? It's in your confirmation email. Or WhatsApp us and we'll look it up.",
    pending: 'Checking…',
    result:
      'Tracking preview complete. No live order lookup was performed. Your details have not been saved.',
  },
  office: {
    title: 'Our office',
    image: 'Image',
    caption: 'Our advisors outside the shop on Whalley Blvd, Surrey, with the sign in view',
    address: ['9981 Whalley Blvd', 'Surrey, BC'],
    directions: 'Get directions →',
    hours: [
      { day: 'Mon–Fri', time: '9am – 9pm PT' },
      { day: 'Saturday', time: '9am – 9pm PT' },
      { day: 'Sunday', time: 'Closed' },
    ],
  },
  message: {
    title: 'Send us a message',
    name: { label: 'Name', placeholder: 'Your name' },
    email: { label: 'Email', placeholder: 'you@example.com' },
    phone: {
      label: 'Phone',
      optional: '(optional)',
      placeholder: '+1 or your country code',
      hint: "Only if you'd like an advisor to call you back.",
    },
    topic: { label: 'Topic', placeholder: 'Choose a topic', indicator: '▾' },
    message: { label: 'Message', placeholder: 'How can we help?' },
    submit: 'Send message',
    pending: 'Sending preview…',
    result: 'Message preview complete. No message was sent and your details have not been saved.',
  },
  quickHelp: {
    title: 'Quick help',
    arrow: '→',
    links: [
      { label: 'Where is my SIM?', href: '#track-order' },
      { label: 'How do I install my eSIM?', href: '/pre-arrival-sim#faq' },
      { label: 'Change my install date', topic: 'internet' },
      { label: 'Update my documents', topic: 'documents' },
      { label: 'Is this call really from you?', topic: 'verification' },
      { label: 'All FAQs', href: '/faq' },
    ] satisfies readonly (
      { label: string; href: string } | { label: string; topic: ContactTopic }
    )[],
  },
  feedback: {
    retry: 'The preview could not complete. Your inputs are still here; please try again.',
    errors: {
      name: 'Enter your name (up to 200 characters).',
      email: 'Enter a valid email address.',
      phone: 'Enter a phone number with 7–15 digits, or leave this optional field empty.',
      topic: 'Choose a topic.',
      message: 'Enter a message (up to 4,000 characters).',
      order: 'Enter your order number (up to 80 characters).',
    },
  },
  preview: {
    title: 'Contact preview',
    close: 'Close',
    descriptions: {
      whatsapp:
        'WhatsApp is a UI preview. A verified business number is needed before live chat can open. No chat or message was started.',
      call: 'The phone number shown is a Figma placeholder. Calling will be enabled after the business confirms its number.',
      directions:
        'The office address shown is a Figma placeholder. Directions will be enabled after the business confirms its location.',
    } satisfies Record<ContactPreviewKind, string>,
  },
} as const;

/** Topic choices are a reversible UI proposal; the Figma dropdown is closed. */
export const contactTopics: readonly { value: ContactTopic; label: string }[] = [
  { value: 'general', label: 'General question' },
  { value: 'sim', label: 'Pre-arrival SIM / eSIM' },
  { value: 'mobile', label: 'Mobile plans' },
  { value: 'internet', label: 'Home internet / installation' },
  { value: 'documents', label: 'Documents' },
  { value: 'verification', label: 'Verify a call' },
];
export const contactAssets = {
  ...componentAssets,
  // Other chrome / image-slot SVGs are byte-identical to the shared assets.
  phone: { src: '/design/contact/1-imgPhoneIcon.svg', width: 16, height: 16, nodeId: '220:70' },
  trust: {
    src: '/design/contact/0-imgIconShieldCheck.svg',
    width: 22,
    height: 22,
    nodeId: '332:836',
  },
};
