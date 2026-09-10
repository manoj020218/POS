import crypto from 'node:crypto';

import Razorpay from 'razorpay';

import type {
  CreateUpiQrOrderInput,
  CreateUpiQrOrderResult,
  PaymentGateway,
  RazorpayCredentialFields
} from './payment-gateway.js';

type RazorpayQrCode = { id: string; image_url: string };
type RazorpayWebhookBody = {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string } };
    qr_code?: { entity?: { id?: string } };
  };
};

const parseWebhookBody = (rawBody: string): RazorpayWebhookBody | null => {
  try {
    return JSON.parse(rawBody) as RazorpayWebhookBody;
  } catch {
    return null;
  }
};

export const createRazorpayGateway = (): PaymentGateway => ({
  async createUpiQrOrder(
    credentials: RazorpayCredentialFields,
    input: CreateUpiQrOrderInput
  ): Promise<CreateUpiQrOrderResult> {
    const client = new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret });

    const qrCode = (await client.qrCode.create({
      close_by: Math.floor(input.closeBy.getTime() / 1000),
      description: input.receipt,
      fixed_amount: true,
      name: 'Smart POS order',
      notes: input.notes,
      payment_amount: input.amount * 100,
      type: 'upi_qr',
      usage: 'single_use'
    })) as RazorpayQrCode;

    return { gatewayOrderId: qrCode.id, qrImageUrl: qrCode.image_url };
  },

  extractWebhookGatewayOrderId(rawBody) {
    return parseWebhookBody(rawBody)?.payload?.qr_code?.entity?.id ?? null;
  },

  verifyAndParseWebhookEvent(rawBody, signature, webhookSecret) {
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    let signatureValid: boolean;
    try {
      signatureValid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
      signatureValid = false;
    }
    if (!signatureValid) {
      return null;
    }

    const body = parseWebhookBody(rawBody);
    if (!body || body.event !== 'qr_code.credited') {
      return null;
    }

    const gatewayOrderId = body.payload?.qr_code?.entity?.id;
    const paymentRef = body.payload?.payment?.entity?.id;
    if (!gatewayOrderId || !paymentRef) {
      return null;
    }

    return { gatewayOrderId, paymentRef };
  }
});
