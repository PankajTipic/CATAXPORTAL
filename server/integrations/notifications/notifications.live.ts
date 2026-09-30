import { NotificationsAdapter, NotificationPayload, NotificationResult } from './notifications.types';

export class NotificationsLiveAdapter implements NotificationsAdapter {
  private smsGatewayUrl: string;
  private emailApiKey: string;
  private whatsappToken: string;

  constructor() {
    this.smsGatewayUrl = process.env.SMS_GATEWAY_URL || '';
    this.emailApiKey = process.env.EMAIL_API_KEY || '';
    this.whatsappToken = process.env.WHATSAPP_API_TOKEN || '';
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    // >>>>>> REPLACE WITH REAL NOTIFICATIONS API — START <<<<<<
    // If payload.channel === 'EMAIL': call SendGrid / SES API
    // If payload.channel === 'SMS': call Fast2SMS / Twilio API
    // If payload.channel === 'WHATSAPP': call Gupshup / WhatsApp Cloud API
    throw new Error(`NotificationsLiveAdapter: send for channel ${payload.channel} is not implemented. Plug in real notification API provider.`);
    // >>>>>> REPLACE WITH REAL NOTIFICATIONS API — END <<<<<<
  }

  async sendBatch(payloads: NotificationPayload[]): Promise<NotificationResult[]> {
    return Promise.all(payloads.map((p) => this.send(p)));
  }
}
