import {
  provinceCodeSchema,
  provinceFromPostalCode,
  provinceNames,
  type ProvinceCode,
  type WebsiteOffer,
} from '@canadian-plans/contracts';
import { z } from 'zod';

import {
  MAXIMUM_AGE,
  MAX_LINES,
  MINIMUM_AGE,
  MIN_LINES,
  MOBILE_PROVIDERS,
  orderFormContent,
} from '@content/order-forms';

/**
 * What the customer enters, per category. One module owns the rules, so the
 * browser form (for instant messages) and the server action (which never trusts
 * the browser) validate identically. The internet and mobile rules mirror the
 * Canada Wide forms (ADR 0005, D7).
 */

export type OrderCategory = WebsiteOffer['commercial']['productType'];

interface ContactFields {
  fullName: string;
  email: string;
  phone: string;
}

/** Pre-arrival eSIM: the customer is usually outside Canada. */
export interface ArrivalDetails extends ContactFields {
  category: 'sim';
  countryCode: string;
  currentCountry: string;
  destination: string;
  arrivalDate: string;
}

interface AddressFields {
  streetAddress: string;
  aptUnit: string;
  city: string;
  postalCode: string;
}

/** Internet and TV: sold by province, to a service address. */
export interface InternetDetails extends ContactFields, AddressFields {
  category: 'internet';
  province: ProvinceCode | '';
  dateOfBirth: string;
  currentProvider: string;
  preferredInstallationTime: string;
}

/** Mobile, bring your own device. */
export interface MobileDetails extends ContactFields, AddressFields {
  category: 'mobile';
  lines: string;
  currentProvider: (typeof MOBILE_PROVIDERS)[number] | '';
  keepNumber: 'yes' | 'no' | '';
  simType: 'esim' | 'physical' | '';
  creditCheckConsent: boolean;
}

export type OrderDetailsInput = ArrivalDetails | InternetDetails | MobileDetails;

type DetailKey = keyof ArrivalDetails | keyof InternetDetails | keyof MobileDetails;

export type OrderDetailField = Exclude<DetailKey, 'category'> | 'terms' | 'marketing';
export type OrderFieldErrors = Partial<Record<OrderDetailField, string>>;

export function emptyDetails(category: OrderCategory): OrderDetailsInput {
  const contact = { fullName: '', email: '', phone: '' };
  const address = { streetAddress: '', aptUnit: '', city: '', postalCode: '' };
  switch (category) {
    case 'internet':
      return {
        category,
        ...contact,
        ...address,
        province: '',
        dateOfBirth: '',
        currentProvider: '',
        preferredInstallationTime: '',
      };
    case 'mobile':
      return {
        category,
        ...contact,
        ...address,
        lines: '1',
        currentProvider: '',
        keepNumber: '',
        simType: '',
        creditCheckConsent: false,
      };
    case 'sim':
      return {
        category,
        ...contact,
        countryCode: '',
        currentCountry: '',
        destination: '',
        arrivalDate: '',
      };
  }
}

/**
 * The empty form for a plan. An internet plan is sold in one province, so the
 * province comes from the plan rather than from a question.
 */
export function initialDetails(
  offer: Pick<WebsiteOffer['commercial'], 'productType' | 'regions'>,
): OrderDetailsInput {
  const empty = emptyDetails(offer.productType);
  if (empty.category !== 'internet' || offer.regions.length !== 1) return empty;
  const province = provinceCodeSchema.safeParse(offer.regions[0]);
  return province.success ? { ...empty, province: province.data } : empty;
}

/** Label and value pairs for the review step, in the order the customer entered them. */
export function reviewRows(details: OrderDetailsInput): { label: string; value: string }[] {
  const f = orderFormContent.fields;
  const row = (label: string, value: string) => ({ label, value });
  const address = (d: InternetDetails | MobileDetails) =>
    [d.aptUnit ? `${d.aptUnit} – ${d.streetAddress}` : d.streetAddress, d.city, d.postalCode]
      .filter((part) => part !== '')
      .join(', ');

  switch (details.category) {
    case 'sim':
      return [
        row(f.fullName.label, details.fullName),
        row(f.email.label, details.email),
        row(f.phone.label, `+${details.countryCode} ${details.phone}`),
        row(f.currentCountry.label, details.currentCountry),
        row(f.destination.label, details.destination),
        row(f.arrivalDate.label, details.arrivalDate),
      ];
    case 'internet':
      return [
        row(f.fullName.label, details.fullName),
        row(f.email.label, details.email),
        row(f.phone.label, details.phone),
        row(f.province.label, details.province ? provinceNames[details.province] : ''),
        row(f.dateOfBirth.label, details.dateOfBirth),
        row('Service address', address(details)),
        ...(details.currentProvider ? [row(f.currentProvider.label, details.currentProvider)] : []),
        ...(details.preferredInstallationTime
          ? [row('Preferred installation time', details.preferredInstallationTime)]
          : []),
      ];
    case 'mobile':
      return [
        row(f.fullName.label, details.fullName),
        row(f.email.label, details.email),
        row(f.phone.label, details.phone),
        row('Lines', details.lines),
        row(f.currentProvider.label, details.currentProvider),
        row('Keep your number', details.keepNumber === 'yes' ? 'Yes' : 'No, new number'),
        row('SIM', details.simType === 'esim' ? 'eSIM' : 'Physical SIM card'),
        row('Address', address(details)),
      ];
  }
}

const e = orderFormContent.errors;

const fullName = z.string().trim().min(1, e.fullName).max(160, e.fullName);
const email = z.string().trim().pipe(z.email(e.email).max(254, e.email));
const arrivalPhone = z.string().trim().min(5, e.phone).max(32, e.phone);
const canadianPhone = z
  .string()
  .trim()
  .max(32, e.phoneCanadian)
  .refine((value) => value.replace(/\D/g, '').length >= 10, e.phoneCanadian);

const POSTAL_PATTERN = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;
const postalCode = z
  .string()
  .trim()
  .regex(POSTAL_PATTERN, e.postalCode)
  .transform((value) => {
    const compact = value.replace(/[ -]/g, '').toUpperCase();
    return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  });

const address = {
  streetAddress: z.string().trim().min(1, e.streetAddress).max(200, e.streetAddress),
  aptUnit: z.string().trim().max(40),
  city: z.string().trim().min(1, e.city).max(80, e.city),
  postalCode,
};

/** Whole years since an ISO date, or null when the date does not exist. */
function ageInYears(iso: string, now: Date): number | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  const born = new Date(Date.UTC(y, m - 1, d));
  if (born.getUTCFullYear() !== y || born.getUTCMonth() !== m - 1 || born.getUTCDate() !== d) {
    return null;
  }
  const hadBirthday =
    now.getUTCMonth() > m - 1 || (now.getUTCMonth() === m - 1 && now.getUTCDate() >= d);
  return now.getUTCFullYear() - y - (hadBirthday ? 0 : 1);
}

function dateOfBirthSchema(now: Date) {
  return z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, e.dateOfBirth)
    .superRefine((value, ctx) => {
      const age = ageInYears(value, now);
      if (age === null || age < 0 || age > MAXIMUM_AGE) {
        ctx.addIssue({ code: 'custom', message: e.dateOfBirthImpossible });
      } else if (age < MINIMUM_AGE) {
        ctx.addIssue({ code: 'custom', message: e.dateOfBirthUnderage });
      }
    });
}

const arrivalSchema = z.object({
  category: z.literal('sim'),
  fullName,
  email,
  phone: arrivalPhone,
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, e.countryCode),
  currentCountry: z.string().trim().min(1, e.currentCountry).max(80, e.currentCountry),
  destination: z.string().trim().min(1, e.destination).max(160, e.destination),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, e.arrivalDate),
});

function internetSchema(now: Date) {
  return z
    .object({
      category: z.literal('internet'),
      fullName,
      email,
      phone: canadianPhone,
      province: z.enum(provinceCodeSchema.options, { error: () => e.province }),
      dateOfBirth: dateOfBirthSchema(now),
      ...address,
      currentProvider: z.string().trim().max(120),
      preferredInstallationTime: z.string().trim().max(120),
    })
    .superRefine((value, ctx) => {
      // A postal code that clearly belongs to another province would price the
      // wrong plan, so it is refused. `X` is shared by two territories and the
      // letter alone cannot decide, so it is not checked.
      const fromPostal = provinceFromPostalCode(value.postalCode);
      if (fromPostal && fromPostal !== value.province) {
        ctx.addIssue({ code: 'custom', path: ['postalCode'], message: e.postalCodeProvince });
      }
    });
}

const mobileSchema = z.object({
  category: z.literal('mobile'),
  fullName,
  email,
  phone: canadianPhone,
  lines: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/, e.lines)
    .transform(Number)
    .pipe(z.number().int().min(MIN_LINES, e.lines).max(MAX_LINES, e.lines)),
  currentProvider: z.enum(MOBILE_PROVIDERS, { error: () => e.currentProvider }),
  keepNumber: z.enum(['yes', 'no'], { error: () => e.keepNumber }),
  simType: z.enum(['esim', 'physical'], { error: () => e.simType }),
  ...address,
  creditCheckConsent: z.literal(true, { error: () => e.creditCheckConsent }),
});

/** The contact stored with the lead. */
export interface OrderContact {
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
}

export interface ParsedOrder {
  category: OrderCategory;
  contact: OrderContact;
  /** The province an internet plan is priced for; undefined for national categories. */
  province: ProvinceCode | undefined;
  /** Category fields as stored in the lead and order form payload. */
  fields: Record<string, unknown>;
}

export type ParseOrderResult =
  { ok: true; order: ParsedOrder } | { ok: false; errors: OrderFieldErrors };

/** Every field a message can attach to, so a Zod path is mapped without a cast. */
export const ORDER_DETAIL_FIELDS: readonly OrderDetailField[] = [
  'fullName',
  'email',
  'phone',
  'countryCode',
  'currentCountry',
  'destination',
  'arrivalDate',
  'province',
  'dateOfBirth',
  'streetAddress',
  'aptUnit',
  'city',
  'postalCode',
  'currentProvider',
  'preferredInstallationTime',
  'lines',
  'keepNumber',
  'simType',
  'creditCheckConsent',
  'terms',
  'marketing',
];

function collect(error: z.ZodError): OrderFieldErrors {
  const errors: OrderFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    const field = ORDER_DETAIL_FIELDS.find((candidate) => candidate === key);
    // First message per field wins; the form shows one message per field.
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

const categorySchema = z.enum(['sim', 'internet', 'mobile']);

/**
 * Validates what the customer entered and returns the normalised order fields.
 * `now` is injectable so the age rule is testable. A missing `category` means
 * the pre-arrival form, which predates categories.
 */
export function parseOrderDetails(input: unknown, now: Date = new Date()): ParseOrderResult {
  const raw: Record<string, unknown> =
    typeof input === 'object' && input !== null ? { ...input } : {};
  const category = categorySchema.safeParse(raw['category'] ?? 'sim');
  if (!category.success) {
    return { ok: false, errors: {} };
  }

  switch (category.data) {
    case 'internet': {
      const parsed = internetSchema(now).safeParse(raw);
      if (!parsed.success) return { ok: false, errors: collect(parsed.error) };
      const v = parsed.data;
      return {
        ok: true,
        order: {
          category: 'internet',
          contact: { fullName: v.fullName, email: v.email, phone: v.phone, countryCode: 'CA' },
          province: v.province,
          fields: {
            category: 'internet',
            province: v.province,
            dateOfBirth: v.dateOfBirth,
            address: {
              street: v.streetAddress,
              ...(v.aptUnit ? { unit: v.aptUnit } : {}),
              city: v.city,
              postalCode: v.postalCode,
            },
            ...(v.currentProvider ? { currentProvider: v.currentProvider } : {}),
            ...(v.preferredInstallationTime
              ? { preferredInstallationTime: v.preferredInstallationTime }
              : {}),
          },
        },
      };
    }
    case 'mobile': {
      const parsed = mobileSchema.safeParse(raw);
      if (!parsed.success) return { ok: false, errors: collect(parsed.error) };
      const v = parsed.data;
      return {
        ok: true,
        order: {
          category: 'mobile',
          contact: { fullName: v.fullName, email: v.email, phone: v.phone, countryCode: 'CA' },
          province: provinceFromPostalCode(v.postalCode),
          fields: {
            category: 'mobile',
            lines: v.lines,
            currentProvider: v.currentProvider,
            keepNumber: v.keepNumber === 'yes',
            simType: v.simType,
            address: {
              street: v.streetAddress,
              ...(v.aptUnit ? { unit: v.aptUnit } : {}),
              city: v.city,
              postalCode: v.postalCode,
            },
          },
        },
      };
    }
    case 'sim': {
      const parsed = arrivalSchema.safeParse({ ...raw, category: 'sim' });
      if (!parsed.success) return { ok: false, errors: collect(parsed.error) };
      const v = parsed.data;
      return {
        ok: true,
        order: {
          category: 'sim',
          contact: {
            fullName: v.fullName,
            email: v.email,
            phone: v.phone,
            countryCode: v.countryCode,
          },
          province: undefined,
          // Unchanged from before categories existed, so existing orders read the same.
          fields: {
            currentCountry: v.currentCountry,
            destination: v.destination,
            arrivalDate: v.arrivalDate,
          },
        },
      };
    }
  }
}

/**
 * The versioned form sent to the backend. One shape for every save, so a later
 * PATCH replaces (never drops) earlier steps.
 */
export function buildOrderForm(
  order: ParsedOrder,
  documentKeys: readonly string[],
  acknowledged: boolean,
  options: { creditCheckConsentVersion: string; extra?: Record<string, unknown> },
) {
  const consent =
    order.category === 'mobile'
      ? { creditCheck: { consent: true, version: options.creditCheckConsentVersion } }
      : {};
  return {
    schemaVersion: 1,
    payload: {
      ...order.fields,
      ...consent,
      documents: {
        required: [...documentKeys],
        // Real uploads are handled separately; this records only that the step was seen.
        acknowledged,
      },
      ...options.extra,
    },
  };
}
