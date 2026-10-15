'use server';

import { isValidPreviewSearch, type PreviewSearchState } from '@/lib/preview-search';

/** UI-only stub. No query echo, logging, persistence, external calls or order operation. */
export async function previewSearchAction(
  _previous: PreviewSearchState,
  formData: FormData,
): Promise<PreviewSearchState> {
  return { status: isValidPreviewSearch(formData.get('query')) ? 'preview' : 'invalid' };
}
