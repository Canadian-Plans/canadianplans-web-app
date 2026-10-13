'use server';

import { isValidPostalCode, type PostalPreviewState } from '@/lib/postal-preview';

export async function postalPreviewAction(
  _previous: PostalPreviewState,
  data: FormData,
): Promise<PostalPreviewState> {
  return { status: isValidPostalCode(data.get('postalCode')) ? 'preview' : 'invalid' };
}
