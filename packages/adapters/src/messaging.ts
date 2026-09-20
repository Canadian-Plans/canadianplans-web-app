export interface EmailMessage {
  workspaceId: string;
  messageId: string;
  template: 'order_acknowledgement';
  orderId: string;
  reference: string;
}

export type ProviderDeliveryResult =
  { status: 'delivered'; providerId: string } | { status: 'uncertain'; errorCode: string };

export interface EmailAdapter {
  send(message: EmailMessage): Promise<ProviderDeliveryResult>;
}

/** Deterministic, deduplicating provider fake used by tests and non-production environments. */
export class FakeEmailAdapter implements EmailAdapter {
  readonly deliveries: EmailMessage[] = [];
  private readonly providerIds = new Map<string, string>();

  async send(message: EmailMessage): Promise<ProviderDeliveryResult> {
    const existing = this.providerIds.get(message.messageId);
    if (existing) return { status: 'delivered', providerId: existing };
    const providerId = `fake-email:${message.messageId}`;
    this.providerIds.set(message.messageId, providerId);
    this.deliveries.push(structuredClone(message));
    return { status: 'delivered', providerId };
  }
}

/**
 * The server-emitted conversion events (IMPLEMENTATION_PLAN §9). Both are
 * emitted once from the transactional outbox, never from the browser, so a
 * submission is counted exactly once (REQ 35).
 */
export const analyticsEventNames = ['lead_saved', 'order_submitted'] as const;
export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export interface AnalyticsEvent {
  workspaceId: string;
  /** Stable logical id (the outbox `message_id`); providers dedupe on it. */
  eventId: string;
  name: AnalyticsEventName;
  /** Internal opaque lead/order identifier only. No contact, URL, attribution, or free text. */
  subjectId: string;
}

/**
 * The analytics seam (PLATFORM_CONTEXT §6). Only an Umami and a fake/log sink
 * exist in Phase A; Google Ads/Meta are Phase B sinks over the same events.
 */
export interface AnalyticsSink {
  capture(event: AnalyticsEvent): Promise<ProviderDeliveryResult>;
}

/** In-memory analytics sink with stable event-id deduplication (tests, non-production). */
export class FakeAnalyticsSink implements AnalyticsSink {
  readonly events: AnalyticsEvent[] = [];
  private readonly providerIds = new Map<string, string>();

  async capture(event: AnalyticsEvent): Promise<ProviderDeliveryResult> {
    const existing = this.providerIds.get(event.eventId);
    if (existing) return { status: 'delivered', providerId: existing };
    const providerId = `fake-analytics:${event.eventId}`;
    this.providerIds.set(event.eventId, providerId);
    this.events.push(structuredClone(event));
    return { status: 'delivered', providerId };
  }
}
