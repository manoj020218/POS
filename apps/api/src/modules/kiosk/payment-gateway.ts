export type CreateUpiQrOrderInput = {
  amount: number;
  closeBy: Date;
  notes: Record<string, string>;
  receipt: string;
};

export type CreateUpiQrOrderResult = {
  gatewayOrderId: string;
  qrImageUrl: string;
};

export type WebhookPaymentEvent = {
  gatewayOrderId: string;
  paymentRef: string;
};

export interface PaymentGateway {
  createUpiQrOrder(input: CreateUpiQrOrderInput): Promise<CreateUpiQrOrderResult>;
  parseWebhookPaymentEvent(rawBody: string, signature: string): WebhookPaymentEvent | null;
}
