export interface CreateOrderParams {
  caseId: string;
  userId: string;
  amount: number; // in INR
  currency: string;
  planName: string; // e.g. "ITR-1 CA Assisted Filing"
  customerEmail: string;
  customerPhone?: string;
}

export interface PaymentOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  status: 'CREATED' | 'PAID' | 'FAILED';
  invoiceNumber: string;
  paymentUrl?: string;
  createdAt: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  orderId: string;
  paymentId: string;
  amount: number;
  paidAt: string;
}

export interface PaymentsAdapter {
  createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
}
