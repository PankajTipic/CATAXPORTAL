export interface NotificationPayload {
  recipient: string; // Email or Phone number
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
  templateId: string; // e.g. "DOC_REJECTED", "QUERY_RAISED", "CASE_FILED"
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  messageId: string;
  channel: string;
  deliveredAt: string;
}

export interface NotificationsAdapter {
  send(payload: NotificationPayload): Promise<NotificationResult>;
  sendBatch(payloads: NotificationPayload[]): Promise<NotificationResult[]>;
}
