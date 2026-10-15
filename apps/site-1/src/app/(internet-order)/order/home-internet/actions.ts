'use server';
import {
  validateInternetOrder,
  type InternetOrderPreviewResult,
} from '@/lib/internet-order-preview';
/** UI-only seam: no backend, persistence, email, messaging or live order operation. */
export async function internetOrderPreviewAction(
  input: unknown,
): Promise<InternetOrderPreviewResult> {
  const errors = validateInternetOrder(input);
  return Object.keys(errors).length
    ? { status: 'invalid', previewOnly: true, errors }
    : { status: 'preview', previewOnly: true };
}
