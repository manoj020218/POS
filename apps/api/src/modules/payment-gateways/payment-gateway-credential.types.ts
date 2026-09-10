import type { PaymentGatewayCode } from '../../db/schema/payment-gateway-credential.js';

export type { PaymentGatewayCode };

export type PaymentGatewayCredentialRecord = {
  businessId: string;
  createdAt: Date;
  encryptedCredentials?: string;
  gatewayCode: PaymentGatewayCode;
  id: string;
  isEnabled: boolean;
  tenantId: string;
  updatedAt: Date;
};

export type UpsertPaymentGatewayCredentialInput = {
  businessId: string;
  encryptedCredentials?: string;
  gatewayCode: PaymentGatewayCode;
  isEnabled: boolean;
  tenantId: string;
};

// What the settings UI ever sees — never the decrypted field values, only
// whether something has been saved.
export type PaymentGatewayCardView = {
  code: PaymentGatewayCode;
  configured: boolean;
  isEnabled: boolean;
  label: string;
  updatedAt?: string;
};

export type UpdatePaymentGatewayCredentialsInput = {
  businessId?: string;
  // Per-gateway field values, e.g. { keyId, keySecret, webhookSecret } for
  // Razorpay. A blank/omitted value keeps whatever is already stored,
  // mirroring how the reference admin panel's own credential form behaves.
  credentials?: Record<string, string>;
  isEnabled?: boolean;
};

// Resolved, decrypted credentials for actually calling a gateway — never
// serialized back over HTTP. Only kiosk.service (or another server-side
// caller) should ever see this shape.
export type ResolvedPaymentGatewayCredentials = {
  fields: Record<string, string>;
  isEnabled: boolean;
};
