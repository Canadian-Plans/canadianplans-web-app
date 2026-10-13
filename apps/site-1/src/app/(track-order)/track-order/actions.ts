'use server';
import {
  lookupTrackingFixture,
  checkTrackingChange,
  type TrackingLookupResult,
  type TrackingChangeResult,
} from '@/lib/tracking-preview';
export async function trackingLookupAction(input: unknown): Promise<TrackingLookupResult> {
  return lookupTrackingFixture(input);
}
export async function trackingChangeAction(input: unknown): Promise<TrackingChangeResult> {
  return checkTrackingChange(input);
}
/** No live tracking, OTP, email, upload, persistence or change operation. */
export async function trackingNoticeAction(): Promise<{ status: 'preview'; previewOnly: true }> {
  return { status: 'preview', previewOnly: true };
}
