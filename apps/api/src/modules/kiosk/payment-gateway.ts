export type RazorpayCredentialFields = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
};

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

// Stateless — credentials are resolved per-business (see
// PaymentGatewayCredentialService) and passed into each call, rather than
// bound once at server startup. This lets every tenant use their own
// Razorpay account instead of one shared platform-level key.
export interface PaymentGateway {
  createUpiQrOrder(
    credentials: RazorpayCredentialFields,
    input: CreateUpiQrOrderInput
  ): Promise<CreateUpiQrOrderResult>;
  /**
   * Reads the gateway order id out of a webhook body WITHOUT verifying its
   * signature — used only to look up which business's webhook secret to
   * verify against next. Never act on anything else from this call.
   */
  extractWebhookGatewayOrderId(rawBody: string): string | null;
  /** Verifies the signature with the given business's own secret, then parses the event. Returns null if invalid, unverifiable, or not a payment-success event. */
  verifyAndParseWebhookEvent(
    rawBody: string,
    signature: string,
    webhookSecret: string
  ): WebhookPaymentEvent | null;
}
