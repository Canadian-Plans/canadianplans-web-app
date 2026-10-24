export interface GuideCoverContent {
  readonly src: string;
  readonly alt: string;
}

/** Approved branded covers; guides without an approved cover retain their placeholder. */
export const guideCovers: Readonly<Record<string, GuideCoverContent | undefined>> = {
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
