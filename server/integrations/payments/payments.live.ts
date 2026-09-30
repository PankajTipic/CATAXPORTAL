import {
  PaymentsAdapter,
  CreateOrderParams,
  PaymentOrderResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
} from './payments.types';

export class PaymentsLiveAdapter implements PaymentsAdapter {
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || process.env.PAYMENT_GATEWAY_KEY || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_SECRET || '';
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    // >>>>>> REPLACE WITH REAL PAYMENT GATEWAY API — START <<<<<<
    // endpoint: POST https://api.razorpay.com/v1/orders
    // auth: Basic Auth (keyId:keySecret)
    // body: { amount: params.amount * 100, currency: params.currency, receipt: params.caseId }
    // mapping: real gateway response -> PaymentOrderResult
    throw new Error('PaymentsLiveAdapter: createOrder is not implemented. Configure live payment gateway credentials.');
    // >>>>>> REPLACE WITH REAL PAYMENT GATEWAY API — END <<<<<<
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    // >>>>>> REPLACE WITH REAL PAYMENT GATEWAY API — START <<<<<<
    // verify HMAC SHA256 signature of (order_id + "|" + payment_id) using keySecret
    throw new Error('PaymentsLiveAdapter: verifyPayment is not implemented.');
    // >>>>>> REPLACE WITH REAL PAYMENT GATEWAY API — END <<<<<<
  }
}
