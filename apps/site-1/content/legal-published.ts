import type { LegalBlock, LegalSlug } from '../src/lib/legal';

/**
 * Published legal text for canadianplans.com, used while Sanity is not in use
 * (ADR 0005). Written from the owner's Canada Wide and canadaesim texts and the
 * business details the owner gave on 20 October 2026. The readable copies live in
 * docs/legal/. Changing the wording means bumping `version` here AND the terms
 * version in packages/adapters/src/static-catalogue/site-1-plans.ts, so each order
 * records the text the customer actually saw.
 */

export interface PublishedLegal {
  readonly title: string;
  readonly version: number;
  readonly effectiveDate: string;
  readonly body: readonly LegalBlock[];
}

const heading = (text: string): LegalBlock => ({
  _type: 'block',
  style: 'h2',
  children: [{ text }],
});
const paragraph = (text: string): LegalBlock => ({
  _type: 'block',
  style: 'normal',
  children: [{ text }],
});
const bullet = (text: string): LegalBlock => ({
  _type: 'block',
  style: 'normal',
  listItem: 'bullet',
  children: [{ text }],
});

const termsBody: readonly LegalBlock[] = [
  paragraph(
    'These terms apply when you use the Canadian Plans website or submit an order or enquiry through it. By using the site, you agree to them. If you do not agree, please do not use the site.',
  ),
  paragraph(
    'The site is operated by Canadian Plans, 9981 Whalley Blvd, Surrey, BC V3T 0A8 ("Canadian Plans", "we", "us").',
  ),
  heading('1. What we do'),
  paragraph(
    'Canadian Plans helps people in and coming to Canada compare and sign up for internet and TV, bring-your-own-device mobile plans, and pre-arrival SIM and eSIM plans. For internet, TV and mobile we act as an authorised sales agent for the providers we work with. For pre-arrival plans we are an authorised reseller of Rogers, Fido and chatr.',
  ),
  paragraph(
    "We are not the network operator. The service itself is supplied by the provider, and your service agreement is with them. Coverage, network performance and outages are the provider's responsibility.",
  ),
  heading('2. Orders and enquiries are not a contract'),
  paragraph(
    'Submitting a form on this site is a request. It does not create a contract, reserve a plan or guarantee that a service is available to you.',
  ),
  paragraph('An agreement exists only once:'),
  bullet('for internet and TV, availability at your address has been confirmed;'),
  bullet('for mobile plans, your identity and credit check has been completed;'),
  bullet('you have accepted the final pricing; and'),
  bullet('the provider has approved your order.'),
  heading('3. No payment on this website'),
  paragraph(
    'We do not take payment through this website, and you are not charged when you submit a form.',
  ),
  paragraph(
    'Internet, TV and mobile services are billed by the provider under your service agreement with them, as set out in the offer you accepted. For pre-arrival plans we confirm the price with you, and how and when payment is collected, before anything is charged.',
  ),
  heading('4. Pricing, regions and promotional offers'),
  paragraph('Prices and offers shown on this site:'),
  bullet('are in Canadian dollars and exclude applicable taxes and government fees;'),
  bullet('assume any stated conditions are met, such as enrolling in automatic payments;'),
  bullet('depend on service being available and qualifying at your address;'),
  bullet(
    'for internet and TV, vary by province: the prices and offers you see apply to the province you choose; and',
  ),
  bullet('may change or be withdrawn at any time without notice.'),
  paragraph(
    'We record the price and offer shown when you submit your order. We will confirm your exact monthly total before anything is activated.',
  ),
  paragraph(
    'Promotional offers, including free months, price locks, trial periods and free installation, apply only to qualifying services and are subject to the conditions stated with each offer and to any further conditions set by the provider.',
  ),
  heading('5. Internet and TV: speeds, equipment and installation'),
  paragraph(
    'Advertised speeds are maximum speeds and are not guaranteed. Actual performance varies with your equipment, wiring, WiFi conditions, network congestion and other factors outside our control.',
  ),
  paragraph(
    "Where equipment such as a router, modem or PVR is described as included, it remains subject to the provider's terms and may need to be returned if you cancel. Free installation covers standard installation only; non-standard work may carry a charge, which will be quoted to you first.",
  ),
  heading('6. Mobile plans'),
  paragraph(
    'Our mobile plans are bring-your-own-device: you keep your own unlocked phone and buy only the plan.',
  ),
  bullet(
    'Your phone must be unlocked and compatible. If it is locked to another carrier, ask that carrier to unlock it first. An eSIM also needs an eSIM-capable phone.',
  ),
  bullet(
    "Mobile plans are postpaid and require an identity and credit check. We ask for a copy of one piece of government-issued ID (driver's licence, provincial ID or passport) and your consent to use it for that check. The ID is used only for that purpose.",
  ),
  bullet('If you ask to keep your number, we arrange the transfer from your current provider.'),
  bullet(
    "Data allowances, roaming and speed terms are those of the plan shown and the provider's own terms.",
  ),
  heading('7. Pre-arrival plans'),
  paragraph(
    'Pre-arrival plans are for people who are not yet in Canada, and are ordered before you arrive. Each plan states who it is for. Monthly Fido and Rogers plans are for people arriving on a study permit, a work permit or as a permanent resident and staying more than 90 days. chatr plans are for visitors arriving on a visitor visa or a Super Visa and staying under 90 days.',
  ),
  paragraph(
    'Regular online orders do not require you to upload documents when you order. If we need a document to confirm your identity or eligibility, we will ask you, and we may refuse, delay or cancel an order we cannot verify.',
  ),
  paragraph(
    'We confirm with you whether you receive an eSIM by email or a physical SIM. Your number is generally activated up to 24 hours before the arrival date you gave us, so it is ready when you land. You are responsible for making sure your device is unlocked and, for an eSIM, that it supports eSIM.',
  ),
  heading('8. Your responsibilities'),
  paragraph('When you use this site, you agree to:'),
  bullet('provide accurate, current and complete information;'),
  bullet('submit only your own information, or information you are authorised to give;'),
  bullet('be at least 18, or the age of majority where you live, to place an order; and'),
  bullet('not misuse the site, attempt to disrupt it, or submit fraudulent orders or documents.'),
  heading('9. Cancellation and refunds'),
  paragraph(
    "Because nothing is charged on this website, you can cancel an order with us at any time before the provider activates your service by contacting us at info@canadianplans.com. After activation, the provider's own cancellation, equipment-return and refund terms apply, and we will help you contact them.",
  ),
  heading('10. Intellectual property and third-party links'),
  paragraph(
    'The content on this site, including text, graphics, logos and layout, belongs to Canadian Plans or its licensors and may not be copied or reused without permission. Rogers, Fido, chatr and other provider names and logos belong to their owners and are used to describe the services we sell. The site may link to third-party websites; we do not control them and are not responsible for their content, practices or privacy policies.',
  ),
  heading('11. Limitation of liability'),
  paragraph(
    'The site is provided on an "as is" basis. To the fullest extent permitted by law, Canadian Plans is not liable for indirect or consequential loss arising from your use of the site or reliance on information shown on it, or for network outages and delays outside our control. Nothing in these terms limits rights you have under applicable consumer protection legislation.',
  ),
  heading('12. Privacy'),
  paragraph(
    'Personal information you submit is handled as described in our Privacy Policy, which forms part of these terms.',
  ),
  heading('13. Changes and governing law'),
  paragraph(
    'We may update these terms at any time. The revised version takes effect when posted on this page, and the version you accepted is recorded with your order.',
  ),
  paragraph(
    'These terms are governed by the laws of British Columbia and the applicable laws of Canada.',
  ),
  heading('14. Contact'),
  paragraph(
    'Questions about these terms: info@canadianplans.com, +1 778-682-3771, 9981 Whalley Blvd, Surrey, BC V3T 0A8.',
  ),
];

const privacyBody: readonly LegalBlock[] = [
  paragraph(
    'Canadian Plans, 9981 Whalley Blvd, Surrey, BC V3T 0A8 ("Canadian Plans", "we", "us") respects your privacy. This policy explains what personal information we collect when you use our website, place an order or submit an enquiry, why we collect it, how we protect it, and the choices available to you.',
  ),
  paragraph(
    "We handle personal information in line with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), British Columbia's Personal Information Protection Act (PIPA), and Canada's anti-spam law (CASL).",
  ),
  heading('1. Information we collect'),
  paragraph('When you submit a form on our website, we ask for:'),
  bullet('Contact details: your full name, email address and phone number.'),
  bullet(
    'Address: street address, unit number, city and postal code, and the province you choose. For internet and TV, availability and pricing depend on your exact location.',
  ),
  bullet(
    'Date of birth (internet and TV): used to verify identity and confirm eligibility with the providers we work with.',
  ),
  bullet(
    'Service choices: the plan you selected and, depending on the plan, your preferred installation time, your current provider, whether you want to keep your number, the number of lines, and eSIM or physical SIM.',
  ),
  bullet(
    "Identity document (mobile plans): one copy of government-issued ID (driver's licence, provincial ID or passport), the type of ID, and your consent to use it for a credit check.",
  ),
  bullet(
    'Documents for your plan: any other documents a plan requires, for example a passport or permit for pre-arrival plans.',
  ),
  bullet(
    'Wish list: if we do not yet serve your province, your email address and the plans you are interested in, if you choose to leave them.',
  ),
  paragraph(
    'We also record the date, time and version of the terms and consents you accepted, so we can show the basis on which we contacted you.',
  ),
  paragraph(
    'Information collected automatically. Our website may collect standard technical information such as IP address, browser type and the pages you visit. We use privacy-friendly analytics that count visits and the provinces and plans people look at, without recording personal details. We use a bot-protection check on forms.',
  ),
  heading('2. Why we collect it'),
  paragraph('We use your personal information only to:'),
  bullet('contact you about the order or enquiry you submitted;'),
  bullet(
    'check availability and pricing at your address, and, for mobile plans, carry out the identity and credit check;',
  ),
  bullet('arrange installation, activation or delivery of your service if you choose to proceed;'),
  bullet('decide which provinces and plans to add next; and'),
  bullet('meet our legal, regulatory and record-keeping obligations.'),
  paragraph(
    'We do not sell your personal information, and we do not use it for unrelated marketing without your consent.',
  ),
  heading('3. Consent'),
  paragraph(
    'By submitting a form you consent to being contacted by phone, text or email about the services you asked about, and to our using the information you provided for the purposes above. Marketing messages are sent only if you separately opt in, and every message has an easy way to unsubscribe.',
  ),
  paragraph(
    'You may withdraw consent at any time by contacting us at info@canadianplans.com. Withdrawing consent may mean we can no longer process your order.',
  ),
  heading('4. Sharing your information'),
  paragraph('We may share your information with:'),
  bullet(
    'Service providers: the telecommunications companies whose plans you asked for, so they can confirm availability, check identity and credit, and set up your service.',
  ),
  bullet(
    'Technology suppliers: vendors who host our website and store our records on our behalf, under contractual confidentiality obligations (see below).',
  ),
  bullet('Authorities: where we are required to do so by law.'),
  paragraph(
    'Where your information is stored. Some of our suppliers store data outside Canada, so it can be subject to the laws of that country:',
  ),
  bullet('Database: Supabase, United States (west coast).'),
  bullet('Application server: Railway, United States (west coast).'),
  bullet('Website hosting and analytics: Vercel, United States (west coast).'),
  bullet(
    'Document storage and bot protection: Cloudflare, United States and other countries where it operates.',
  ),
  bullet('Email: Resend, United States and other countries where it operates.'),
  heading('5. How we protect and keep it'),
  paragraph(
    'Records are stored in an access-controlled database. Access is limited to staff who need it to do their job, and information is transmitted over an encrypted connection. Identity documents are stored privately and are available only through short-lived, permission-checked links.',
  ),
  paragraph(
    'We retain identity documents, order and contact information, and wish-list emails until you ask us to delete them. We do not automatically delete this customer information after a fixed period or when an order is completed. To request deletion, contact info@canadianplans.com. We delete or restrict the requested personal information unless we are required by law to retain it. Limited transaction and audit records may be retained for legal and record-keeping purposes. Copies in backups expire through the regular backup schedule; a deletion request is applied before recovered records can be used again.',
  ),
  paragraph(
    'No method of transmission or storage is completely secure. While we take reasonable steps to protect your information, we cannot guarantee absolute security.',
  ),
  heading('6. Your rights'),
  paragraph('Subject to applicable law, you may:'),
  bullet('ask what personal information we hold about you;'),
  bullet('ask us to correct information that is inaccurate or incomplete;'),
  bullet('ask us to delete your information, where we are not required to keep it; and'),
  bullet('withdraw your consent to being contacted.'),
  paragraph(
    'Contact our Privacy Officer at info@canadianplans.com and we will respond within 30 days. If you are not satisfied with our response, you can complain to the Office of the Privacy Commissioner of Canada or the Office of the Information and Privacy Commissioner for British Columbia.',
  ),
  heading('7. Cookies'),
  paragraph(
    'We use essential cookies to make the site work. With your consent, we use analytics cookies to count visits. If you agree to marketing cookies, advertising platforms may set cookies to measure our advertising. You can change your choice at any time in Cookie settings, and through your browser settings; disabling cookies may affect how parts of the site work.',
  ),
  heading('8. Children'),
  paragraph(
    'Our services are intended for adults. We do not knowingly collect personal information from children. If you believe a child has provided us information, contact us and we will delete it.',
  ),
  heading('9. Changes to this policy'),
  paragraph(
    'We may update this policy from time to time. The revised version takes effect when posted on this page, and the version in force when you submitted your order is recorded with it.',
  ),
  heading('10. Contact'),
  paragraph(
    'Canadian Plans, 9981 Whalley Blvd, Surrey, BC V3T 0A8. Email info@canadianplans.com. Phone +1 778-682-3771.',
  ),
];

export const publishedLegal: Record<LegalSlug, PublishedLegal> = {
  terms: {
    title: 'Terms of Service',
    version: 2,
    effectiveDate: '2026-10-21',
    body: termsBody,
  },
  privacy: {
    title: 'Privacy Policy',
    version: 2,
    effectiveDate: '2026-10-21',
    body: privacyBody,
  },
};
