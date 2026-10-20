import { z } from 'zod';

import {
  NATIONAL_REGION,
  productTypes,
  provinceCodes,
  regionCodes,
  type ProvinceCode,
  type RegionCode,
} from '@canadian-plans/types';

/**
 * Regions an offer can be sold in. Prices and promotions vary by province for
 * internet and TV; mobile and pre-arrival plans are national (`CA`). The server
 * is the only authority on which region an offer belongs to (invariant 4).
 */

export const productTypeSchema = z.enum(productTypes);

export const provinceCodeSchema = z.enum(provinceCodes);

export const regionCodeSchema = z.enum(regionCodes);

/** Full province names, as shown in the picker (a region is chosen by name). */
export const provinceNames: Readonly<Record<ProvinceCode, string>> = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  YT: 'Yukon',
};

/** Lower-cases, trims, collapses spaces and strips accents, so "Québec" matches "quebec". */
const normalizeName = (value: string): string =>
  value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Resolves a province from its name or code ("british columbia", "BC"), or undefined. */
export function provinceFromName(value: string): ProvinceCode | undefined {
  const wanted = normalizeName(value);
  if (!wanted) return undefined;
  return provinceCodes.find(
    (code) => normalizeName(code) === wanted || normalizeName(provinceNames[code]) === wanted,
  );
}

/** URL-safe province slug, e.g. `british-columbia`. */
export function provinceSlug(code: ProvinceCode): string {
  return normalizeName(provinceNames[code]).replace(/ /g, '-');
}

/** Resolves a province from a URL slug, or undefined. */
export function provinceFromSlug(slug: string): ProvinceCode | undefined {
  const wanted = slug.trim().toLowerCase();
  return provinceCodes.find((code) => provinceSlug(code) === wanted);
}

const postalFirstLetterProvince: Readonly<Record<string, ProvinceCode>> = {
  A: 'NL',
  B: 'NS',
  C: 'PE',
  E: 'NB',
  G: 'QC',
  H: 'QC',
  J: 'QC',
  K: 'ON',
  L: 'ON',
  M: 'ON',
  N: 'ON',
  P: 'ON',
  R: 'MB',
  S: 'SK',
  T: 'AB',
  V: 'BC',
  Y: 'YT',
};

/**
 * The province a Canadian postal code belongs to, from its first letter, or
 * undefined when it cannot be told from the letter alone (`X` is shared by
 * Nunavut and the Northwest Territories) or the code is malformed.
 */
export function provinceFromPostalCode(postalCode: string): ProvinceCode | undefined {
  const compact = postalCode.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact)) return undefined;
  return postalFirstLetterProvince[compact.charAt(0)];
}

/** True when an offer with these regions is sold in `province`. */
export function isOfferSoldIn(regions: readonly RegionCode[], province: ProvinceCode): boolean {
  return regions.includes(NATIONAL_REGION) || regions.includes(province);
}

export type { ProvinceCode, RegionCode };
export { NATIONAL_REGION };
