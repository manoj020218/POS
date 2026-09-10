import { randomUUID } from 'node:crypto';

import type { PaymentGatewayCredentialRepository } from './payment-gateway-credential.repository.js';
import type {
  PaymentGatewayCode,
  PaymentGatewayCredentialRecord,
  UpsertPaymentGatewayCredentialInput
} from './payment-gateway-credential.types.js';

export class InMemoryPaymentGatewayCredentialRepository implements PaymentGatewayCredentialRepository {
  private readonly records = new Map<string, PaymentGatewayCredentialRecord>();

  private key(businessId: string, gatewayCode: PaymentGatewayCode) {
    return `${businessId}:${gatewayCode}`;
  }

  async findCredential(tenantId: string, businessId: string, gatewayCode: PaymentGatewayCode) {
    const record = this.records.get(this.key(businessId, gatewayCode));
    return record?.tenantId === tenantId ? record : null;
  }

  async listCredentials(tenantId: string, businessId: string) {
    return [...this.records.values()].filter(
      (record) => record.tenantId === tenantId && record.businessId === businessId
    );
  }

  async upsertCredential(input: UpsertPaymentGatewayCredentialInput) {
    const key = this.key(input.businessId, input.gatewayCode);
    const existing = this.records.get(key);
    const now = new Date();
    const record: PaymentGatewayCredentialRecord = {
      businessId: input.businessId,
      createdAt: existing?.createdAt ?? now,
      encryptedCredentials: input.encryptedCredentials,
      gatewayCode: input.gatewayCode,
      id: existing?.id ?? randomUUID(),
      isEnabled: input.isEnabled,
      tenantId: input.tenantId,
      updatedAt: now
    };
    this.records.set(key, record);
    return record;
  }
}
