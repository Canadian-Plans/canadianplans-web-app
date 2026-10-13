'use server';
import { checkPreArrivalPreview, type PreArrivalPreviewResult } from '@/lib/pre-arrival-order';
/** UI preview only. File blobs never cross this boundary. */
export async function preArrivalPreviewAction(
  input: unknown,
  planId: unknown,
): Promise<PreArrivalPreviewResult> {
  return checkPreArrivalPreview(input, planId);
}
