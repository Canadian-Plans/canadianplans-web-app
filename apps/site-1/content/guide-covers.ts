export interface GuideCoverContent {
  readonly src: string;
  readonly alt: string;
}

/** Approved branded covers; guides without an approved cover retain their placeholder. */
export const guideCovers: Readonly<Record<string, GuideCoverContent | undefined>> = {
  'esim-vs-physical-sim-canada': {
    src: '/images/guides/esim-vs-physical-sim-canada-cover-approved.png',
    alt: 'eSIM vs physical SIM in Canada — phone beside a SIM card and travel documents',
  },
  'credit-check-phone-plan-canada': {
    src: '/images/guides/credit-check-phone-plan-canada-cover-approved.png',
    alt: 'Phone plans and credit checks — newcomer reviewing an application beside a Canadian flag',
  },
  'home-internet-cost-canada-by-province': {
    src: '/images/guides/home-internet-cost-canada-by-province-cover-approved.png',
    alt: 'Home internet costs in Canada — neighbourhood landscape with WiFi connections',
  },
  'how-to-get-canadian-phone-number-before-arriving': {
    src: '/images/guides/how-to-get-canadian-phone-number-before-arriving-cover-approved.png',
    alt: 'Canadian number before you fly — traveller checking his phone at home beside packed luggage',
  },
  'rogers-vs-fido-vs-chatr-for-newcomers': {
    src: '/images/guides/rogers-vs-fido-vs-chatr-for-newcomers-cover-approved.png',
    alt: 'Rogers vs Fido vs Chatr — three phones showing carrier logos and illustrative sample plan cards',
  },
  'first-week-in-canada-checklist': {
    src: '/images/guides/first-week-in-canada-checklist-cover-approved.png',
    alt: 'First week in Canada checklist — newcomer organising her phone and documents',
  },
  'will-my-phone-work-in-canada': {
    src: '/images/guides/will-my-phone-work-in-canada-cover-approved.png',
    alt: 'Will your phone work in Canada — traveller checking device settings',
  },
  'keep-your-home-number-in-canada': {
    src: '/images/guides/keep-your-home-number-in-canada-cover-approved.png',
    alt: 'Keep your home number in Canada — phone showing home and Canadian SIM lines',
  },
  'workers-sim': {
    src: '/images/guides/workers-sim-cover-approved.png',
    alt: 'Canadian SIM guide for work permit holders — newcomer checking his phone at arrivals',
  },
  'new-immigrants-sim': {
    src: '/images/guides/new-immigrants-sim-cover-approved.png',
    alt: 'Canadian SIM guide for new immigrants — family checking a phone at arrivals',
  },
  'best-sim-for-students-from-india': {
    src: '/images/guides/best-sim-for-students-from-india-cover-v2.png',
    alt: 'Best SIM for Indian Students — student using her phone at Canadian arrivals',
  },
  'student-sim': {
    src: '/images/guides/student-sim-cover-v2.png',
    alt: 'Student eSIM for Canada — student checking his phone on campus',
  },
  'from-india': {
    src: '/images/guides/from-india-cover-v2.png',
    alt: 'Canadian SIM for Indian Newcomers — traveller with her phone and luggage',
  },
  'toronto-pearson': {
    src: '/images/guides/toronto-pearson-cover-v2.png',
    alt: 'Toronto Pearson eSIM Arrival Guide — traveller checking his phone at the airport',
  },
  'vancouver-internet': {
    src: '/images/guides/vancouver-internet-cover-v2.png',
    alt: 'Vancouver Home Internet for Renters — technician connecting a home router',
  },
  'ontario-internet': {
    src: '/images/guides/ontario-internet-cover-v2.png',
    alt: 'Ontario Home Internet City Guide — woman using home WiFi in a Toronto apartment',
  },
};
