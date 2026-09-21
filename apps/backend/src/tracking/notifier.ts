/**
 * OTP delivery seam (T22). The selected transactional `EmailAdapter` (T18) is
 * not on this branch, so the default is a no-op that never logs the code. Tests
 * inject a recording notifier. Wire the real adapter here when it lands.
 */

export interface TrackingOtpMessage {
  workspaceId: string;
  email: string;
  reference: string;
  code: string;
}

export interface TrackingNotifier {
  send(message: TrackingOtpMessage): Promise<void>;
}

/** Delivers nothing. Used until the selected email adapter is wired; never logs the code. */
export class NoopTrackingNotifier implements TrackingNotifier {
  async send(_message: TrackingOtpMessage): Promise<void> {}
}

export function loadTrackingNotifier(): TrackingNotifier {
  return new NoopTrackingNotifier();
}
