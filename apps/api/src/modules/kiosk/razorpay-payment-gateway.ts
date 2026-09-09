import crypto from 'node:crypto';

import Razorpay from 'razorpay';

import type {
  CreateUpiQrOrderInput,
  CreateUpiQrOrderResult,
  PaymentGateway
} from './payment-gateway.js';

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
};

type RazorpayQrCode = { id: string; image_url: string };
type RazorpayWebhookBody = {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string } };
    qr_code?: { entity?: { id?: string } };
  };
};

export const createRazorpayGateway = (config: RazorpayConfig): PaymentGateway => {
  const client = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });

  return {
    async createUpiQrOrder(input: CreateUpiQrOrderInput): Promise<CreateUpiQrOrderResult> {
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

    parseWebhookPaymentEvent(rawBody, signature) {
      const expected = crypto.createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex');
      let signatureValid: boolean;
      try {
        signatureValid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
      } catch {
        signatureValid = false;
      }
      if (!signatureValid) {
        return null;
      }

      const body = JSON.parse(rawBody) as RazorpayWebhookBody;
      if (body.event !== 'qr_code.credited') {
        return null;
      }

      const gatewayOrderId = body.payload?.qr_code?.entity?.id;
      const paymentRef = body.payload?.payment?.entity?.id;
      if (!gatewayOrderId || !paymentRef) {
        return null;
      }

      return { gatewayOrderId, paymentRef };
    }
  };
};
