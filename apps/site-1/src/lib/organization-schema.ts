import { organizationContent } from '@content/organization';

export interface OrganizationSchema {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'Organization';
  readonly '@id': string;
  readonly name: string;
  readonly url: string;
  readonly logo: string;
  readonly description: string;
  readonly email: string;
  readonly telephone: string;
  readonly address: {
    readonly '@type': 'PostalAddress';
    readonly streetAddress: string;
    readonly addressLocality: string;
    readonly addressRegion: string;
    readonly postalCode: string;
    readonly addressCountry: string;
  };
  readonly areaServed: string;
  readonly contactPoint: readonly {
    readonly '@type': 'ContactPoint';
    readonly contactType: string;
    readonly email: string;
    readonly telephone: string;
    readonly availableLanguage: readonly string[];
    readonly hoursAvailable: {
      readonly '@type': 'OpeningHoursSpecification';
      readonly dayOfWeek: readonly string[];
      readonly opens: string;
      readonly closes: string;
    };
  }[];
}

/**
 * Sitewide Organization JSON-LD (SEO rewrite, 23 October 2026). Only the public business
 * facts from content/organization.ts; the origin comes from the deployment so previews never
 * advertise a production identity they do not have.
 */
export function buildOrganizationSchema(origin: string): OrganizationSchema {
  const base = origin.replace(/\/+$/u, '');
  const content = organizationContent;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: content.name,
    url: `${base}/`,
    logo: `${base}${content.logoPath}`,
    description: content.description,
    email: content.email,
    telephone: content.telephone,
    address: { '@type': 'PostalAddress', ...content.address },
    areaServed: content.areaServed,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: content.email,
        telephone: content.telephone,
        availableLanguage: content.languages,
        hoursAvailable: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: content.hours.days,
          opens: content.hours.opens,
          closes: content.hours.closes,
        },
      },
    ],
  };
}

/** Same script-terminator escaping as the FAQ and landing schemas. */
export function serializeOrganizationSchema(schema: OrganizationSchema): string {
  return JSON.stringify(schema).replace(/</gu, '\\u003c');
}
