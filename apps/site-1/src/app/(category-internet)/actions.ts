'use server';

import { isValidPostalCode } from '@/lib/postal-preview';
import { categoryAddressFixtures } from '@content/category-internet';
import { z } from 'zod';

export type CategoryRegion = keyof typeof categoryAddressFixtures;
export type CategoryAddressResult =
  | { readonly status: 'invalid'; readonly previewOnly: true }
  | { readonly status: 'available'; readonly previewOnly: true }
  | { readonly status: 'unavailable'; readonly previewOnly: true }
  | { readonly status: 'unconfigured'; readonly previewOnly: true }
  | { readonly status: 'error'; readonly previewOnly: true };

const categoryAddressInput = z.object({
  region: z.enum(['vancouver', 'ontario']),
  postalCode: z.string().trim().min(1).max(10),
});

export async function checkCategoryAddress(input: unknown): Promise<CategoryAddressResult> {
  const parsed = categoryAddressInput.safeParse(input);
  if (!parsed.success || !isValidPostalCode(parsed.data.postalCode))
    return { status: 'invalid', previewOnly: true };
  const { region } = parsed.data;
  const postalCode = parsed.data.postalCode.replace(/\s/g, '').toUpperCase();
  const fixtures = categoryAddressFixtures[region];
  if (postalCode === fixtures.available.replace(/\s/g, ''))
    return { status: 'available', previewOnly: true };
  if (postalCode === fixtures.unavailable.replace(/\s/g, ''))
    return { status: 'unavailable', previewOnly: true };
  return { status: 'unconfigured', previewOnly: true };
}
