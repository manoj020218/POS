import type {
  PaymentGatewayCode,
  PaymentGatewayCredentialRecord,
  UpsertPaymentGatewayCredentialInput
} from './payment-gateway-credential.types.js';

export interface PaymentGatewayCredentialRepository {
  findCredential(
    tenantId: string,
    businessId: string,
    gatewayCode: PaymentGatewayCode
  ): Promise<PaymentGatewayCredentialRecord | null>;
  listCredentials(tenantId: string, businessId: string): Promise<PaymentGatewayCredentialRecord[]>;
  upsertCredential(input: UpsertPaymentGatewayCredentialInput): Promise<PaymentGatewayCredentialRecord>;
}
