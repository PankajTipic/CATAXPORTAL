import {
  PaymentsAdapter,
  CreateOrderParams,
  PaymentOrderResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
} from './payments.types';

export class PaymentsMockAdapter implements PaymentsAdapter {
  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    const timestamp = Date.now();
    const orderId = `MOCK_ORD_${timestamp}`;
    const invoiceNumber = `INV-AY2627-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      orderId,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: 'PAID', // Instant mock success in test mode
      invoiceNumber,
      paymentUrl: `/mock-payment?order=${orderId}`,
      createdAt: new Date().toISOString(),
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    return {
      verified: true,
      orderId: params.orderId,
      paymentId: params.paymentId || `MOCK_PAY_${Date.now()}`,
      amount: 1499,
      paidAt: new Date().toISOString(),
    };
  }
}
