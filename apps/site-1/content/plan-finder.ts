import type { FigmaAsset } from '@canadian-plans/ui/canadian-plans';
import { mobilePlans } from './mobile-plans';
import { internetOrderHref, internetPlansByProvince, internetProvinces } from './home-internet';
export interface FinderAnswers {
  location: 'canada' | 'arrival';
  need: 'phone' | 'internet';
  province: 'on' | 'bc' | 'ab' | 'qc' | 'mb' | 'ns' | 'sk' | 'other';
  provider: 'rogers' | 'fido' | 'chatr' | 'bell' | 'telus' | 'virgin' | 'freedom' | 'other';
  priority: 'speed' | 'value' | 'price';
  arrivalKind: 'student' | 'worker' | 'resident' | 'visitor';
  stay: 'short' | 'medium' | 'long' | 'permanent';
}
export type FinderQuestion = keyof FinderAnswers;
export type FinderStepId = FinderQuestion | 'result';
export interface FinderAssetPair {
  readonly desktop: FigmaAsset;
  readonly mobile: FigmaAsset;
}
export type FinderTone =
  | 'blue'
  | 'violet'
  | 'mint'
  | 'warm'
  | 'pink'
  | 'province'
  | 'rogers'
  | 'fido'
  | 'chatr'
  | 'bell'
  | 'telus'
  | 'virgin'
  | 'freedom'
  | 'neutral';
export interface FinderOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly summary: string;
  readonly tone: FinderTone;
  readonly icon?: FinderAssetPair;
  readonly symbol?: string;
  readonly badge?: string;
  readonly description?: string;
  readonly mobileDescription?: string;
}
export interface FinderStep<K extends FinderQuestion> {
  readonly id: K;
  readonly frame: string;
  readonly defaultValue: FinderAnswers[K];
  readonly progress: string;
  readonly title: string;
  readonly description: string;
  readonly mobileDescription?: string;
  readonly question?: string;
  readonly layout: 'location' | 'need' | 'compact' | 'priority' | 'arrival' | 'stay';
  readonly options: readonly FinderOption<FinderAnswers[K]>[];
  readonly routes: readonly { readonly value?: FinderAnswers[K]; readonly to: FinderStepId }[];
  readonly progressRatio: { readonly desktop: number; readonly mobile: number };
  readonly headerIcon?: FinderAssetPair;
  readonly headerTone?: FinderTone;
  readonly ordinal?: number;
  readonly total?: number;
  readonly tip?: string;
}
export type FinderConfig = { readonly [K in FinderQuestion]: FinderStep<K> };
export interface FinderMatch {
  readonly id: string;
  readonly previewOnly: true;
  readonly title: string;
  readonly carrier: string;
  readonly symbol: string;
  readonly tone: FinderTone;
  readonly description: string;
  readonly price: string;
  readonly comparison?: string;
  /** The plan in the order form. */
  readonly href: string;
  readonly features: readonly string[];
}
export const finderCopy = {
  close: 'Close plan finder',
  closeSymbol: '×',
  back: 'Back',
  backSymbol: '←',
  continue: 'Continue →',
  matches: 'See my matches →',
  privacy: 'No sign-up · no personal info needed',
  allDone: 'All done',
  progressLabel: 'Plan finder progress',
  resultPrefix: 'We found',
  resultSuffix: 'plans for you',
  resultDescription: 'Based on what you told us:',
  edit: 'Edit',
  best: 'BEST MATCH',
  details: 'Plan details',
  getPlan: 'Get this plan →',
  choosePlan: 'Choose this plan',
  help: 'Not sure? Call or email our team and an advisor will help.',
  allPlans: 'See all plans →',
  previewNotice: 'Preview matches only. Current offers and eligibility have not been checked.',
  detailsTitle: 'Plan details preview',
  continueTitle: 'Selected plan preview',
  continueDescription:
    'Your selection is a preview. No order, payment, activation or contact request has been created.',
  backToMatches: 'Back to matches',
  advisorTitle: 'Advisor preview',
  advisorDescription:
    'Advisor contact will be connected separately. This preview sends no message.',
} as const;
export const finderSteps = {
  location: {
    id: 'location',
    frame: '291:3',
    defaultValue: 'arrival',
    progress: 'Plan finder · about 30 seconds',
    title: 'Hi! Let’s find your perfect plan.',
    description:
      'Answer a few quick questions and we’ll match you with the best Rogers, Fido or Chatr plan. No sign-up needed.',
    question: 'Where are you right now?',
    layout: 'location',
    routes: [
      {
        value: 'canada',
        to: 'need',
      },
      {
        value: 'arrival',
        to: 'arrivalKind',
      },
    ],
    options: [
      {
        value: 'canada',
        label: 'I already live in Canada',
        summary: 'Already in Canada',
        tone: 'warm',
        icon: {
          desktop: {
            src: '/design/plan-finder/291-3-imgIconHome1.svg',
            width: 26,
            height: 26,
            nodeId: '291:3',
          },
          mobile: {
            src: '/design/plan-finder/291-3-imgIconHome1.svg',
            width: 26,
            height: 26,
            nodeId: '291:3',
          },
        },
        description: 'Get a new phone or internet plan, or switch and save',
      },
      {
        value: 'arrival',
        label: 'I’m moving to or visiting Canada',
        summary: 'Moving to Canada',
        tone: 'blue',
        icon: {
          desktop: {
            src: '/design/plan-finder/291-3-imgIconPlane1.svg',
            width: 26,
            height: 26,
            nodeId: '291:3',
          },
          mobile: {
            src: '/design/plan-finder/291-3-imgIconPlane1.svg',
            width: 26,
            height: 26,
            nodeId: '291:3',
          },
        },
        badge: 'FROM $35/MO',
        description: 'Get your Canadian number before you land',
      },
    ],
    progressRatio: {
      desktop: 0.07649253731343283,
      mobile: 0.06206896551724138,
    },
  },
  need: {
    id: 'need',
    frame: '291:62',
    defaultValue: 'phone',
    progress: 'Step 1 of 4',
    title: 'What can we help you with?',
    description: 'Pick one. You can add more later.',
    layout: 'need',
    routes: [
      {
        to: 'province',
      },
    ],
    headerIcon: {
      desktop: {
        src: '/design/plan-finder/291-62-imgIconSparkle.svg',
        width: 28,
        height: 28,
        nodeId: '291:62',
      },
      mobile: {
        src: '/design/plan-finder/291-62-imgIconSparkle.svg',
        width: 28,
        height: 28,
        nodeId: '291:62',
      },
    },
    headerTone: 'blue',
    ordinal: 1,
    total: 4,
    options: [
      {
        value: 'phone',
        label: 'Phone plan',
        summary: 'Phone plan',
        tone: 'violet',
        icon: {
          desktop: {
            src: '/design/plan-finder/291-62-imgIconPhone.svg',
            width: 32,
            height: 32,
            nodeId: '291:62',
          },
          mobile: {
            src: '/design/plan-finder/291-62-imgIconPhone.svg',
            width: 32,
            height: 32,
            nodeId: '291:62',
          },
        },
        description: 'SIM or eSIM',
      },
      {
        value: 'internet',
        label: 'Home internet',
        summary: 'Home internet',
        tone: 'mint',
        icon: {
          desktop: {
            src: '/design/plan-finder/291-62-imgIconWifi.svg',
            width: 32,
            height: 32,
            nodeId: '291:62',
          },
          mobile: {
            src: '/design/plan-finder/291-62-imgIconWifi.svg',
            width: 32,
            height: 32,
            nodeId: '291:62',
          },
        },
        description: 'Wi-Fi at home',
      },
    ],
    progressRatio: {
      desktop: 0.2126865671641791,
      mobile: 0.19655172413793104,
    },
  },
  province: {
    id: 'province',
    frame: '291:109',
    defaultValue: 'on',
    progress: 'Step 2 of 4',
    title: 'Which province are you in?',
    description: 'Plans and prices change by province.',
    layout: 'compact',
    routes: [
      {
        to: 'provider',
      },
    ],
    headerIcon: {
      desktop: {
        src: '/design/plan-finder/291-109-imgIconPin.svg',
        width: 28,
        height: 28,
        nodeId: '291:109',
      },
      mobile: {
        src: '/design/plan-finder/291-109-imgIconPin.svg',
        width: 28,
        height: 28,
        nodeId: '291:109',
      },
    },
    headerTone: 'pink',
    ordinal: 2,
    total: 4,
    options: [
      {
        value: 'on',
        label: 'Ontario',
        summary: 'Ontario',
        tone: 'province',
        symbol: 'ON',
      },
      {
        value: 'bc',
        label: 'British Columbia',
        summary: 'British Columbia',
        tone: 'province',
        symbol: 'BC',
      },
      {
        value: 'ab',
        label: 'Alberta',
        summary: 'Alberta',
        tone: 'province',
        symbol: 'AB',
      },
      {
        value: 'qc',
        label: 'Quebec',
        summary: 'Quebec',
        tone: 'province',
        symbol: 'QC',
      },
      {
        value: 'mb',
        label: 'Manitoba',
        summary: 'Manitoba',
        tone: 'province',
        symbol: 'MB',
      },
      {
        value: 'ns',
        label: 'Nova Scotia',
        summary: 'Nova Scotia',
        tone: 'province',
        symbol: 'NS',
      },
      {
        value: 'sk',
        label: 'Saskatchewan',
        summary: 'Saskatchewan',
        tone: 'province',
        symbol: 'SK',
      },
      {
        value: 'other',
        label: 'Other province',
        summary: 'Other province',
        tone: 'province',
        symbol: '…',
      },
    ],
    progressRatio: {
      desktop: 0.4253731343283582,
      mobile: 0.3931034482758621,
    },
  },
  provider: {
    id: 'provider',
    frame: '292:3',
    defaultValue: 'rogers',
    progress: 'Step 3 of 4',
    title: 'Who is your provider today?',
    description: 'We’ll check if switching saves you money.',
    layout: 'compact',
    routes: [
      {
        to: 'priority',
      },
    ],
    headerIcon: {
      desktop: {
        src: '/design/plan-finder/292-3-imgIconSignal.svg',
        width: 28,
        height: 28,
        nodeId: '292:3',
      },
      mobile: {
        src: '/design/plan-finder/292-3-imgIconSignal.svg',
        width: 28,
        height: 28,
        nodeId: '292:3',
      },
    },
    headerTone: 'violet',
    ordinal: 3,
    total: 4,
    tip: 'Switching? Keep your current number. We handle the transfer for free.',
    options: [
      {
        value: 'rogers',
        label: 'Rogers',
        summary: 'Rogers',
        tone: 'rogers',
        symbol: 'R',
      },
      {
        value: 'fido',
        label: 'Fido',
        summary: 'Fido',
        tone: 'fido',
        symbol: 'F',
      },
      {
        value: 'chatr',
        label: 'Chatr',
        summary: 'Chatr',
        tone: 'chatr',
        symbol: 'C',
      },
      {
        value: 'bell',
        label: 'Bell',
        summary: 'Bell',
        tone: 'bell',
        symbol: 'B',
      },
      {
        value: 'telus',
        label: 'Telus',
        summary: 'Telus',
        tone: 'telus',
        symbol: 'T',
      },
      {
        value: 'virgin',
        label: 'Virgin Plus',
        summary: 'Virgin Plus',
        tone: 'virgin',
        symbol: 'V',
      },
      {
        value: 'freedom',
        label: 'Freedom',
        summary: 'Freedom',
        tone: 'freedom',
        symbol: 'Fr',
      },
      {
        value: 'other',
        label: 'None / other',
        summary: 'None / other',
        tone: 'neutral',
        symbol: '—',
      },
    ],
    progressRatio: {
      desktop: 0.6380597014925373,
      mobile: 0.5862068965517241,
    },
  },
  priority: {
    id: 'priority',
    frame: '292:91',
    defaultValue: 'value',
    progress: 'Step 4 of 4 · last one!',
    title: 'What matters most to you?',
    description: 'We’ll sort your matches by this.',
    layout: 'priority',
    routes: [
      {
        to: 'result',
      },
    ],
    headerIcon: {
      desktop: {
        src: '/design/plan-finder/292-91-imgIconZap.svg',
        width: 28,
        height: 28,
        nodeId: '292:91',
      },
      mobile: {
        src: '/design/plan-finder/292-91-imgIconZap.svg',
        width: 28,
        height: 28,
        nodeId: '292:91',
      },
    },
    headerTone: 'warm',
    ordinal: 4,
    total: 4,
    options: [
      {
        value: 'speed',
        label: 'Speed & data',
        summary: 'Speed & data',
        tone: 'blue',
        icon: {
          desktop: {
            src: '/design/plan-finder/292-91-imgIconZap1.svg',
            width: 28,
            height: 28,
            nodeId: '292:91',
          },
          mobile: {
            src: '/design/plan-finder/305-292-imgIconZap1.svg',
            width: 22,
            height: 22,
            nodeId: '305:292',
          },
        },
        description: '5G, big data, no slowdowns',
      },
      {
        value: 'value',
        label: 'Best value',
        summary: 'Best value',
        tone: 'violet',
        icon: {
          desktop: {
            src: '/design/plan-finder/292-91-imgIconScale.svg',
            width: 28,
            height: 28,
            nodeId: '292:91',
          },
          mobile: {
            src: '/design/plan-finder/305-292-imgIconScale.svg',
            width: 22,
            height: 22,
            nodeId: '305:292',
          },
        },
        badge: 'RECOMMENDED',
        description: 'Balance of price & data',
      },
      {
        value: 'price',
        label: 'Lowest price',
        summary: 'Lowest price',
        tone: 'mint',
        icon: {
          desktop: {
            src: '/design/plan-finder/292-91-imgIconTag.svg',
            width: 28,
            height: 28,
            nodeId: '292:91',
          },
          mobile: {
            src: '/design/plan-finder/305-292-imgIconTag.svg',
            width: 22,
            height: 22,
            nodeId: '305:292',
          },
        },
        description: 'Pay as little as possible',
      },
    ],
    progressRatio: {
      desktop: 0.8507462686567164,
      mobile: 0.7793103448275862,
    },
  },
  arrivalKind: {
    id: 'arrivalKind',
    frame: '292:145',
    defaultValue: 'student',
    progress: 'Step 1 of 2',
    title: 'Welcome! How are you coming to Canada?',
    description: 'We show the plans that fit how you are arriving.',
    mobileDescription: 'We show the plans that fit\nhow you are arriving.',
    layout: 'arrival',
    routes: [
      {
        to: 'stay',
      },
    ],
    headerIcon: {
      desktop: {
        src: '/design/plan-finder/292-145-imgIconPlane.svg',
        width: 28,
        height: 28,
        nodeId: '292:145',
      },
      mobile: {
        src: '/design/plan-finder/292-145-imgIconPlane.svg',
        width: 28,
        height: 28,
        nodeId: '292:145',
      },
    },
    headerTone: 'blue',
    ordinal: 1,
    total: 2,
    options: [
      {
        value: 'student',
        label: 'Student',
        summary: 'Student',
        tone: 'blue',
        icon: {
          desktop: {
            src: '/design/plan-finder/292-145-imgIconGrad.svg',
            width: 28,
            height: 28,
            nodeId: '292:145',
          },
          mobile: {
            src: '/design/plan-finder/305-349-imgIconGrad.svg',
            width: 22,
            height: 22,
            nodeId: '305:349',
          },
        },
        description: 'Study permit · college or university',
        mobileDescription: 'Study permit · college or\nuniversity',
      },
      {
        value: 'worker',
        label: 'Worker',
        summary: 'Worker',
        tone: 'warm',
        icon: {
          desktop: {
            src: '/design/plan-finder/292-145-imgIconBrief.svg',
            width: 28,
            height: 28,
            nodeId: '292:145',
          },
          mobile: {
            src: '/design/plan-finder/305-349-imgIconBrief.svg',
            width: 22,
            height: 22,
            nodeId: '305:349',
          },
        },
        description: 'Work permit · job offer',
      },
      {
        value: 'resident',
        label: 'Permanent resident',
        summary: 'Permanent resident',
        tone: 'mint',
        icon: {
          desktop: {
            src: '/design/plan-finder/292-145-imgIconIdcard.svg',
            width: 28,
            height: 28,
            nodeId: '292:145',
          },
          mobile: {
            src: '/design/plan-finder/305-349-imgIconIdcard.svg',
            width: 22,
            height: 22,
            nodeId: '305:349',
          },
        },
        description: 'PR or landing soon',
      },
      {
        value: 'visitor',
        label: 'Visitor or tourist',
        summary: 'Visitor or tourist',
        tone: 'pink',
        icon: {
          desktop: {
            src: '/design/plan-finder/292-145-imgIconCamera.svg',
            width: 28,
            height: 28,
            nodeId: '292:145',
          },
          mobile: {
            src: '/design/plan-finder/305-349-imgIconCamera.svg',
            width: 22,
            height: 22,
            nodeId: '305:349',
          },
        },
        description: 'Holiday, family visit, super visa',
      },
    ],
    progressRatio: {
      desktop: 0.4253731343283582,
      mobile: 0.3931034482758621,
    },
  },
  stay: {
    id: 'stay',
    frame: '293:3',
    defaultValue: 'long',
    progress: 'Step 2 of 2 · last one!',
    title: 'How long will you be in Canada?',
    description: 'Short trips and long stays need different plans.',
    layout: 'stay',
    routes: [
      {
        to: 'result',
      },
    ],
    headerIcon: {
      desktop: {
        src: '/design/plan-finder/293-3-imgIconCal.svg',
        width: 28,
        height: 28,
        nodeId: '293:3',
      },
      mobile: {
        src: '/design/plan-finder/293-3-imgIconCal.svg',
        width: 28,
        height: 28,
        nodeId: '293:3',
      },
    },
    headerTone: 'warm',
    ordinal: 2,
    total: 2,
    options: [
      {
        value: 'short',
        label: 'Less than a month',
        summary: 'Less than a month',
        tone: 'pink',
        icon: {
          desktop: {
            src: '/design/plan-finder/293-3-imgIconClock.svg',
            width: 22,
            height: 22,
            nodeId: '293:3',
          },
          mobile: {
            src: '/design/plan-finder/293-3-imgIconClock.svg',
            width: 22,
            height: 22,
            nodeId: '293:3',
          },
        },
        description: 'Short visit. A 30-day prepaid plan works best',
      },
      {
        value: 'medium',
        label: '1 to 6 months',
        summary: '1–6 months',
        tone: 'warm',
        icon: {
          desktop: {
            src: '/design/plan-finder/293-3-imgIconCal1.svg',
            width: 22,
            height: 22,
            nodeId: '293:3',
          },
          mobile: {
            src: '/design/plan-finder/293-3-imgIconCal1.svg',
            width: 22,
            height: 22,
            nodeId: '293:3',
          },
        },
        description: 'Exchange term, seasonal work or a long visit',
      },
      {
        value: 'long',
        label: '6 months or more',
        summary: '6+ months',
        tone: 'blue',
        icon: {
          desktop: {
            src: '/design/plan-finder/293-3-imgIconCal2.svg',
            width: 22,
            height: 22,
            nodeId: '293:3',
          },
          mobile: {
            src: '/design/plan-finder/293-3-imgIconCal2.svg',
            width: 22,
            height: 22,
            nodeId: '293:3',
          },
        },
        badge: 'TYPICAL FOR STUDENTS',
        description: 'A full school year, work permit or longer',
      },
      {
        value: 'permanent',
        label: 'I’m moving here for good',
        summary: 'Permanent move',
        tone: 'mint',
        icon: {
          desktop: {
            src: '/design/plan-finder/293-3-imgIconHome.svg',
            width: 22,
            height: 22,
            nodeId: '293:3',
          },
          mobile: {
            src: '/design/plan-finder/293-3-imgIconHome.svg',
            width: 22,
            height: 22,
            nodeId: '293:3',
          },
        },
        description: 'PR or permanent move. Build Canadian credit',
      },
    ],
    progressRatio: {
      desktop: 0.8955223880597015,
      mobile: 0.8206896551724138,
    },
  },
} satisfies FinderConfig;
export const finderPaths = {
  canada: ['location', 'need', 'province', 'provider', 'priority'],
  arrival: ['location', 'arrivalKind', 'stay'],
} as const satisfies Record<FinderAnswers['location'], readonly FinderQuestion[]>;
export const finderQuestionIds = [
  'location',
  'need',
  'province',
  'provider',
  'priority',
  'arrivalKind',
  'stay',
] as const;
export const finderAssets = {
  '291-109-imgIconPin': {
    src: '/design/plan-finder/291-109-imgIconPin.svg',
    width: 28,
    height: 28,
    nodeId: '291:109',
  },
  '291-109-imgRadioOn': {
    src: '/design/plan-finder/291-109-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '291:109',
  },
  '291-3-imgIconHome': {
    src: '/design/plan-finder/291-3-imgIconHome.svg',
    width: 32,
    height: 32,
    nodeId: '291:3',
  },
  '291-3-imgIconHome1': {
    src: '/design/plan-finder/291-3-imgIconHome1.svg',
    width: 26,
    height: 26,
    nodeId: '291:3',
  },
  '291-3-imgIconPhone': {
    src: '/design/plan-finder/291-3-imgIconPhone.svg',
    width: 32,
    height: 32,
    nodeId: '291:3',
  },
  '291-3-imgIconPlane': {
    src: '/design/plan-finder/291-3-imgIconPlane.svg',
    width: 32,
    height: 32,
    nodeId: '291:3',
  },
  '291-3-imgIconPlane1': {
    src: '/design/plan-finder/291-3-imgIconPlane1.svg',
    width: 26,
    height: 26,
    nodeId: '291:3',
  },
  '291-3-imgIconWifi': {
    src: '/design/plan-finder/291-3-imgIconWifi.svg',
    width: 32,
    height: 32,
    nodeId: '291:3',
  },
  '291-3-imgRadioOn': {
    src: '/design/plan-finder/291-3-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '291:3',
  },
  '291-62-imgIconPhone': {
    src: '/design/plan-finder/291-62-imgIconPhone.svg',
    width: 32,
    height: 32,
    nodeId: '291:62',
  },
  '291-62-imgIconSparkle': {
    src: '/design/plan-finder/291-62-imgIconSparkle.svg',
    width: 28,
    height: 28,
    nodeId: '291:62',
  },
  '291-62-imgIconWifi': {
    src: '/design/plan-finder/291-62-imgIconWifi.svg',
    width: 32,
    height: 32,
    nodeId: '291:62',
  },
  '291-62-imgRadioOn': {
    src: '/design/plan-finder/291-62-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '291:62',
  },
  '292-145-imgIconBrief': {
    src: '/design/plan-finder/292-145-imgIconBrief.svg',
    width: 28,
    height: 28,
    nodeId: '292:145',
  },
  '292-145-imgIconCamera': {
    src: '/design/plan-finder/292-145-imgIconCamera.svg',
    width: 28,
    height: 28,
    nodeId: '292:145',
  },
  '292-145-imgIconGrad': {
    src: '/design/plan-finder/292-145-imgIconGrad.svg',
    width: 28,
    height: 28,
    nodeId: '292:145',
  },
  '292-145-imgIconIdcard': {
    src: '/design/plan-finder/292-145-imgIconIdcard.svg',
    width: 28,
    height: 28,
    nodeId: '292:145',
  },
  '292-145-imgIconPlane': {
    src: '/design/plan-finder/292-145-imgIconPlane.svg',
    width: 28,
    height: 28,
    nodeId: '292:145',
  },
  '292-145-imgRadioOn': {
    src: '/design/plan-finder/292-145-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '292:145',
  },
  '292-3-imgIconSignal': {
    src: '/design/plan-finder/292-3-imgIconSignal.svg',
    width: 28,
    height: 28,
    nodeId: '292:3',
  },
  '292-3-imgIconSwap': {
    src: '/design/plan-finder/292-3-imgIconSwap.svg',
    width: 16,
    height: 16,
    nodeId: '292:3',
  },
  '292-3-imgRadioOn': {
    src: '/design/plan-finder/292-3-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '292:3',
  },
  '292-91-imgIconScale': {
    src: '/design/plan-finder/292-91-imgIconScale.svg',
    width: 28,
    height: 28,
    nodeId: '292:91',
  },
  '292-91-imgIconTag': {
    src: '/design/plan-finder/292-91-imgIconTag.svg',
    width: 28,
    height: 28,
    nodeId: '292:91',
  },
  '292-91-imgIconZap': {
    src: '/design/plan-finder/292-91-imgIconZap.svg',
    width: 28,
    height: 28,
    nodeId: '292:91',
  },
  '292-91-imgIconZap1': {
    src: '/design/plan-finder/292-91-imgIconZap1.svg',
    width: 28,
    height: 28,
    nodeId: '292:91',
  },
  '292-91-imgRadioOn': {
    src: '/design/plan-finder/292-91-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '292:91',
  },
  '293-3-imgIconCal': {
    src: '/design/plan-finder/293-3-imgIconCal.svg',
    width: 28,
    height: 28,
    nodeId: '293:3',
  },
  '293-3-imgIconCal1': {
    src: '/design/plan-finder/293-3-imgIconCal1.svg',
    width: 22,
    height: 22,
    nodeId: '293:3',
  },
  '293-3-imgIconCal2': {
    src: '/design/plan-finder/293-3-imgIconCal2.svg',
    width: 22,
    height: 22,
    nodeId: '293:3',
  },
  '293-3-imgIconClock': {
    src: '/design/plan-finder/293-3-imgIconClock.svg',
    width: 22,
    height: 22,
    nodeId: '293:3',
  },
  '293-3-imgIconHome': {
    src: '/design/plan-finder/293-3-imgIconHome.svg',
    width: 22,
    height: 22,
    nodeId: '293:3',
  },
  '293-3-imgRadioOn': {
    src: '/design/plan-finder/293-3-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '293:3',
  },
  '293-73-imgIconChat': {
    src: '/design/plan-finder/293-73-imgIconChat.svg',
    width: 18,
    height: 18,
    nodeId: '293:73',
  },
  '293-73-imgIconCheck': {
    src: '/design/plan-finder/293-73-imgIconCheck.svg',
    width: 16,
    height: 16,
    nodeId: '293:73',
  },
  '293-73-imgIconSparkle': {
    src: '/design/plan-finder/293-73-imgIconSparkle.svg',
    width: 28,
    height: 28,
    nodeId: '293:73',
  },
  '305-114-imgIconPin': {
    src: '/design/plan-finder/305-114-imgIconPin.svg',
    width: 28,
    height: 28,
    nodeId: '305:114',
  },
  '305-114-imgRadioOn': {
    src: '/design/plan-finder/305-114-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '305:114',
  },
  '305-2-imgIconHome': {
    src: '/design/plan-finder/305-2-imgIconHome.svg',
    width: 32,
    height: 32,
    nodeId: '305:2',
  },
  '305-2-imgIconHome1': {
    src: '/design/plan-finder/305-2-imgIconHome1.svg',
    width: 26,
    height: 26,
    nodeId: '305:2',
  },
  '305-2-imgIconPhone': {
    src: '/design/plan-finder/305-2-imgIconPhone.svg',
    width: 32,
    height: 32,
    nodeId: '305:2',
  },
  '305-2-imgIconPlane': {
    src: '/design/plan-finder/305-2-imgIconPlane.svg',
    width: 32,
    height: 32,
    nodeId: '305:2',
  },
  '305-2-imgIconPlane1': {
    src: '/design/plan-finder/305-2-imgIconPlane1.svg',
    width: 26,
    height: 26,
    nodeId: '305:2',
  },
  '305-2-imgIconWifi': {
    src: '/design/plan-finder/305-2-imgIconWifi.svg',
    width: 32,
    height: 32,
    nodeId: '305:2',
  },
  '305-2-imgRadioOn': {
    src: '/design/plan-finder/305-2-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '305:2',
  },
  '305-201-imgIconSignal': {
    src: '/design/plan-finder/305-201-imgIconSignal.svg',
    width: 28,
    height: 28,
    nodeId: '305:201',
  },
  '305-201-imgIconSwap': {
    src: '/design/plan-finder/305-201-imgIconSwap.svg',
    width: 16,
    height: 16,
    nodeId: '305:201',
  },
  '305-201-imgRadioOn': {
    src: '/design/plan-finder/305-201-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '305:201',
  },
  '305-292-imgIconScale': {
    src: '/design/plan-finder/305-292-imgIconScale.svg',
    width: 22,
    height: 22,
    nodeId: '305:292',
  },
  '305-292-imgIconTag': {
    src: '/design/plan-finder/305-292-imgIconTag.svg',
    width: 22,
    height: 22,
    nodeId: '305:292',
  },
  '305-292-imgIconZap': {
    src: '/design/plan-finder/305-292-imgIconZap.svg',
    width: 28,
    height: 28,
    nodeId: '305:292',
  },
  '305-292-imgIconZap1': {
    src: '/design/plan-finder/305-292-imgIconZap1.svg',
    width: 22,
    height: 22,
    nodeId: '305:292',
  },
  '305-292-imgRadioOn': {
    src: '/design/plan-finder/305-292-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '305:292',
  },
  '305-349-imgIconBrief': {
    src: '/design/plan-finder/305-349-imgIconBrief.svg',
    width: 22,
    height: 22,
    nodeId: '305:349',
  },
  '305-349-imgIconCamera': {
    src: '/design/plan-finder/305-349-imgIconCamera.svg',
    width: 22,
    height: 22,
    nodeId: '305:349',
  },
  '305-349-imgIconGrad': {
    src: '/design/plan-finder/305-349-imgIconGrad.svg',
    width: 22,
    height: 22,
    nodeId: '305:349',
  },
  '305-349-imgIconIdcard': {
    src: '/design/plan-finder/305-349-imgIconIdcard.svg',
    width: 22,
    height: 22,
    nodeId: '305:349',
  },
  '305-349-imgIconPlane': {
    src: '/design/plan-finder/305-349-imgIconPlane.svg',
    width: 28,
    height: 28,
    nodeId: '305:349',
  },
  '305-349-imgRadioOn': {
    src: '/design/plan-finder/305-349-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '305:349',
  },
  '305-419-imgIconCal': {
    src: '/design/plan-finder/305-419-imgIconCal.svg',
    width: 28,
    height: 28,
    nodeId: '305:419',
  },
  '305-419-imgIconCal1': {
    src: '/design/plan-finder/305-419-imgIconCal1.svg',
    width: 22,
    height: 22,
    nodeId: '305:419',
  },
  '305-419-imgIconCal2': {
    src: '/design/plan-finder/305-419-imgIconCal2.svg',
    width: 22,
    height: 22,
    nodeId: '305:419',
  },
  '305-419-imgIconClock': {
    src: '/design/plan-finder/305-419-imgIconClock.svg',
    width: 22,
    height: 22,
    nodeId: '305:419',
  },
  '305-419-imgIconHome': {
    src: '/design/plan-finder/305-419-imgIconHome.svg',
    width: 22,
    height: 22,
    nodeId: '305:419',
  },
  '305-419-imgRadioOn': {
    src: '/design/plan-finder/305-419-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '305:419',
  },
  '305-492-imgIconChat': {
    src: '/design/plan-finder/305-492-imgIconChat.svg',
    width: 18,
    height: 18,
    nodeId: '305:492',
  },
  '305-492-imgIconCheck': {
    src: '/design/plan-finder/305-492-imgIconCheck.svg',
    width: 16,
    height: 16,
    nodeId: '305:492',
  },
  '305-492-imgIconSparkle': {
    src: '/design/plan-finder/305-492-imgIconSparkle.svg',
    width: 22,
    height: 22,
    nodeId: '305:492',
  },
  '305-64-imgIconPhone': {
    src: '/design/plan-finder/305-64-imgIconPhone.svg',
    width: 32,
    height: 32,
    nodeId: '305:64',
  },
  '305-64-imgIconSparkle': {
    src: '/design/plan-finder/305-64-imgIconSparkle.svg',
    width: 28,
    height: 28,
    nodeId: '305:64',
  },
  '305-64-imgIconWifi': {
    src: '/design/plan-finder/305-64-imgIconWifi.svg',
    width: 32,
    height: 32,
    nodeId: '305:64',
  },
  '305-64-imgRadioOn': {
    src: '/design/plan-finder/305-64-imgRadioOn.svg',
    width: 22,
    height: 22,
    nodeId: '305:64',
  },
} satisfies Record<string, FigmaAsset>;
export const finderArrivalMatches: readonly FinderMatch[] = [
  {
    id: 'prearrival-rogers-plus-100',
    previewOnly: true,
    title: 'Rogers Plus · 100 GB',
    carrier: 'Rogers',
    symbol: 'R',
    tone: 'rogers',
    description: 'Our most popular plan. Lots of data, and your number works the day you land.',
    price: '$40/mo',
    href: '/order?plan=prearrival-rogers-plus-100&category=sim',
    features: [
      '100 GB at up to 1 Gbps',
      'Unlimited Canada-wide calling',
      '1,000 international minutes',
      'eSIM ready',
      'Pay $0 today',
    ],
  },
  {
    id: 'prearrival-fido-essential-75',
    previewOnly: true,
    title: 'Fido Essential · 75 GB',
    carrier: 'Fido',
    symbol: 'F',
    tone: 'fido',
    description: 'A little less data for a lower monthly bill.',
    price: '$35/mo',
    href: '/order?plan=prearrival-fido-essential-75&category=sim',
    features: [
      '75 GB 5G data',
      'Unlimited Canada-wide calling',
      '1,000 international minutes',
      'Pay $0 today',
    ],
  },
];

/** Each match is a real plan in /order, with the numbers the ranking uses. */
export interface FinderCatalogMatch extends FinderMatch {
  readonly priceCad: number;
  readonly speedRank: number;
  readonly popular: boolean;
}
const strip = (feature: string) => feature.replace(/^✓\s*/, '');

export const finderPhoneMatches: readonly FinderCatalogMatch[] = mobilePlans.map((plan) => ({
  id: plan.id,
  previewOnly: true,
  title: `${plan.carrier} · ${plan.allowance}`,
  carrier: plan.carrier,
  symbol: plan.carrier.slice(0, 1),
  tone: 'blue',
  description: plan.goodFor ?? plan.finePrint,
  price: plan.amount + plan.period,
  href: `/order?plan=${plan.id}&category=mobile`,
  features: plan.features.map(strip),
  priceCad: plan.priceCad,
  speedRank: plan.priceCad,
  popular: plan.featured,
}));

/** Internet matches for the province chosen in the finder; none where internet is not sold. */
export function finderInternetMatches(
  province: FinderAnswers['province'] | undefined,
): readonly FinderCatalogMatch[] {
  const code = internetProvinces.find((item) => item.toLowerCase() === province);
  const plans = code ? internetPlansByProvince[code] : [];
  return plans.map((plan) => ({
    id: plan.id,
    previewOnly: true,
    title: `${plan.carrier} · ${plan.allowance}`,
    carrier: plan.carrier,
    symbol: plan.allowance.slice(0, 1),
    tone: 'mint',
    description: plan.goodFor ?? plan.finePrint,
    price: plan.amount + plan.period,
    href: internetOrderHref(plan.province, plan),
    features: plan.features.map(strip),
    priceCad: plan.priceCad,
    speedRank: plan.mbps,
    popular: plan.badge !== undefined,
  }));
}
