import {
  advisorHours,
  landingBreadcrumb,
  landingFaqIntro,
  landingSkip,
  preArrivalDocuments,
  preArrivalSteps,
  pricesNote,
  sharedArrivalFaq,
} from './shared';
import type { LandingPageContent } from './types';

/**
 * /pre-arrival-sim/students (SEO rewrite, 23 October 2026). Primary phrase: SIM card for
 * international students in Canada; supporting: best phone plan for international students
 * in Canada, student eSIM Canada, study permit. Facts from docs/LAUNCH_PLANS.md table D.
 */
export const studentsLanding: LandingPageContent = {
  path: '/pre-arrival-sim/students',
  title: 'SIM Card for International Students in Canada: eSIM from $35/mo | Canadian Plans',
  description:
    'Canadian SIM card or eSIM for international students, ready before you fly. Rogers and Fido plans from $35/mo, no credit history, order with your study permit.',
  mainId: 'students-main',
  skip: landingSkip,
  tone: 'amber',
  breadcrumb: {
    ...landingBreadcrumb,
    items: [
      { label: 'Home', href: '/' },
      { label: 'SIM before you arrive', href: '/pre-arrival-sim' },
      { label: 'International students' },
    ],
  },
  hero: {
    eyebrow: 'Student SIM · Canada',
    title: 'SIM card and eSIM for international students in Canada, ready before your first class',
    description:
      'Order from home with your passport and study permit or letter of introduction. Your Canadian number is ready before you fly, so you can open a bank account and fill in college forms on day one. Rogers and Fido plans from $35 a month, no credit check, nothing paid online.',
    action: { label: 'See student plans', href: '#plans' },
    pricePrefix: 'from',
    price: '$35',
    priceSuffix: '/mo',
    photo: 'PHOTO · student checking a new Canadian number at Toronto Pearson arrivals',
    highlights: ['Order from any country', 'No credit check', 'Nothing paid online'],
  },
  byline: 'Updated 23 October 2026 · Checked by a Canadian Plans plan advisor',
  onThisPage: {
    label: 'On this page',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Student plans', href: '#plans' },
      { label: 'What you need', href: '#documents' },
      { label: 'Student guide', href: '#guide' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  quick: {
    eyebrow: 'Quick answer',
    title: 'What is the best SIM card for international students in Canada?',
    answer:
      'For most international students, a monthly eSIM plan with 75 to 100 GB of data is the right fit: Fido 75 GB for $35 or Rogers 100 GB for $40 a month (CAD, plus tax), both with unlimited Canada-wide calling and 1,000 international minutes. Order it 1 to 3 weeks before your flight, from any country, with your passport and study permit or letter of introduction. There is no Canadian credit check and nothing is paid online; the carrier bills you after your line is active.',
  },
  facts: {
    label: 'Student plan facts',
    items: [
      { label: 'Price', value: '$35–$50/mo', detail: 'CAD, plus tax' },
      { label: 'Data', value: '75–120 GB', detail: 'Every month' },
      { label: 'Credit check', value: 'None', detail: 'No Canadian history needed' },
      { label: 'Order', value: '1–3 weeks before', detail: 'From any country' },
    ],
  },
  blocks: [
    preArrivalSteps('Get your student SIM in 3 steps'),
    { kind: 'slot', id: 'plans' },
    preArrivalDocuments('documents', 'What you need to order a student SIM', {
      title: 'Study permit or letter of introduction',
      body: 'You can order before the permit itself is issued; the letter of introduction is enough.',
    }),
    {
      kind: 'article',
      id: 'guide',
      eyebrow: 'Student guide',
      title: 'Phone plans for international students in Canada: a short guide',
      sections: [
        {
          title: 'How much data do international students need?',
          body: [
            'Campus WiFi covers lectures and the library, so many students use 15 to 30 GB a month on their own. Our plans start at 75 GB, which leaves room for daily video calls home, maps on a new transit system and streaming on the bus.',
            'If you use more or less than expected, you can change your plan after the first month.',
          ],
        },
        {
          title: 'Prepaid or postpaid as a student?',
          body: [
            'Postpaid plans bought in a Canadian store usually need a credit check or a deposit. The Rogers and Fido plans you order through Canadian Plans before you arrive are postpaid but skip that: no Canadian credit history, no deposit, and nothing paid online.',
            'If you are visiting for under 90 days rather than studying, choose a Chatr prepaid plan instead.',
          ],
        },
        {
          title: 'Which carrier works best on campus?',
          body: [
            'Rogers and Fido both run on the Rogers network, so coverage on campus is the same. The difference is price and extras: Fido is the lowest monthly price at $35 for 75 GB, Rogers 100 GB for $40 adds a hotspot, and Rogers 120 GB for $50 adds US calling and roaming for trips across the border.',
          ],
        },
        {
          title: 'Why have a Canadian number before you land?',
          body: [
            'Your bank, your college portal, your landlord and your part-time employer all want a Canadian number, and most of them text a code to it. With your number assigned before you fly, you can book your bank appointment and fill in the college’s arrival forms from home.',
          ],
        },
      ],
      facts: {
        title: 'Key facts',
        items: [
          { label: 'Price range', value: '$35–$50/mo, CAD + tax' },
          { label: 'Credit check', value: 'None needed' },
          { label: 'When to order', value: '1–3 weeks before your flight' },
          { label: 'How you get it', value: 'eSIM by email, from any country' },
          { label: 'Plan starts', value: 'When you land' },
          { label: 'Carriers', value: 'Rogers, Fido' },
        ],
        note: 'Updated 23 October 2026',
      },
    },
  ],
  faq: {
    intro: landingFaqIntro({
      eyebrow: 'FAQ',
      title: 'Student SIM questions',
      description: advisorHours,
    }),
    items: [
      {
        id: 'student-permit',
        question: 'Can I order a Canadian SIM before I get my study permit?',
        answer:
          'Yes. Order with your passport and letter of introduction. Your Canadian number is assigned before you fly, and the line starts when you land with your permit.',
      },
      {
        id: 'student-bank',
        question: 'Can I open a Canadian bank account with this number?',
        answer:
          'Yes. Most banks only need a Canadian number to send you a verification code, and your number works for that as soon as it is assigned, even before you land.',
      },
      sharedArrivalFaq.pay,
      sharedArrivalFaq.esim,
      {
        id: 'student-discount',
        question: 'Is there a student discount?',
        answer:
          'This answer is awaiting approved content. Ask an advisor to confirm current offers.',
        pending: true,
      },
      sharedArrivalFaq.cancel,
      {
        id: 'student-parents',
        question: 'Can my parents pay for my plan?',
        answer: 'This answer is awaiting approved content. Ask an advisor about payment options.',
        pending: true,
      },
    ],
  },
  related: {
    title: 'Keep exploring',
    groups: [
      {
        title: 'Moving from',
        links: [{ label: 'India', href: '/pre-arrival-sim/from-india' }],
      },
      {
        title: 'Arriving at',
        links: [{ label: 'Toronto Pearson (YYZ)', href: '/pre-arrival-sim/toronto-pearson' }],
      },
      {
        title: 'Compare and learn',
        links: [
          { label: 'All eSIM plans', href: '/pre-arrival-sim' },
          {
            label: 'Best SIM for students from India',
            href: '/guides/best-sim-for-students-from-india',
          },
          { label: 'Newcomer guides', href: '/guides' },
        ],
      },
    ],
    note: pricesNote,
  },
  cta: {
    title: 'Your Canadian number, ready before your first class',
    subtitle: 'Choose a plan in about 2 minutes. No credit check, nothing paid online.',
    primary: { label: 'See student plans →', href: '#plans' },
    secondary: { label: 'Talk to an advisor ›', href: '/contact' },
    icon: 'cta-pre-arrival',
  },
};

/** Plan block heading on the students page; the plan list itself is shared. */
export const studentsPlanHeading = {
  title: ['Pick your student plan'],
  description:
    'Every plan is an eSIM with nothing paid online, and it works the minute you land. “Student” is selected so you see the monthly plans students are eligible for.',
};
