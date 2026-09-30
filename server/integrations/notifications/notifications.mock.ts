import { NotificationsAdapter, NotificationPayload, NotificationResult } from './notifications.types';

export class NotificationsMockAdapter implements NotificationsAdapter {
  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const messageId = `MOCK_MSG_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const timestamp = new Date().toISOString();

    // Log to console for development audit
    console.log(`[MOCK NOTIFICATION] [${payload.channel}] to: ${payload.recipient} | Subject: "${payload.title}" | Body: "${payload.body}"`);

    return {
      success: true,
      messageId,
      channel: payload.channel,
      deliveredAt: timestamp,
    };
  }

  async sendBatch(payloads: NotificationPayload[]): Promise<NotificationResult[]> {
    return Promise.all(payloads.map((p) => this.send(p)));
  }
}
