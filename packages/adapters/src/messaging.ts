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

export interface AnalyticsEvent {
  workspaceId: string;
  eventId: string;
  name: 'order_submitted';
  /** Internal opaque identifier only. No contact, URL, attribution, or free text. */
  orderId: string;
}

export interface AnalyticsAdapter {
  capture(event: AnalyticsEvent): Promise<ProviderDeliveryResult>;
}

/** In-memory analytics sink with stable event-id deduplication. */
export class FakeAnalyticsAdapter implements AnalyticsAdapter {
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
