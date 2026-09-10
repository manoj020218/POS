import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { paymentGatewayCredentials } from '../../db/schema/index.js';
import type { PaymentGatewayCredentialRepository } from './payment-gateway-credential.repository.js';
import type {
  PaymentGatewayCode,
  PaymentGatewayCredentialRecord,
  UpsertPaymentGatewayCredentialInput
} from './payment-gateway-credential.types.js';

export class DrizzlePaymentGatewayCredentialRepository implements PaymentGatewayCredentialRepository {
  constructor(private readonly db: AppDatabase) {}

  async findCredential(tenantId: string, businessId: string, gatewayCode: PaymentGatewayCode) {
    const [record] = await this.db
      .select()
      .from(paymentGatewayCredentials)
      .where(
        and(
          eq(paymentGatewayCredentials.tenantId, tenantId),
          eq(paymentGatewayCredentials.businessId, businessId),
          eq(paymentGatewayCredentials.gatewayCode, gatewayCode)
        )
      )
      .limit(1);

    return record ? normalize(record) : null;
  }

  async listCredentials(tenantId: string, businessId: string) {
    const records = await this.db
      .select()
      .from(paymentGatewayCredentials)
      .where(
        and(
          eq(paymentGatewayCredentials.tenantId, tenantId),
          eq(paymentGatewayCredentials.businessId, businessId)
        )
      );

    return records.map(normalize);
  }

  async upsertCredential(input: UpsertPaymentGatewayCredentialInput) {
    const [record] = await this.db
      .insert(paymentGatewayCredentials)
      .values({
        businessId: input.businessId,
        encryptedCredentials: input.encryptedCredentials,
        gatewayCode: input.gatewayCode,
        id: randomUUID(),
        isEnabled: input.isEnabled,
        tenantId: input.tenantId
      })
      .onConflictDoUpdate({
        set: {
          encryptedCredentials: input.encryptedCredentials,
          isEnabled: input.isEnabled,
          updatedAt: new Date()
        },
        target: [paymentGatewayCredentials.businessId, paymentGatewayCredentials.gatewayCode]
      })
      .returning();

    return normalize(record!);
  }
}

const normalize = (
  record: typeof paymentGatewayCredentials.$inferSelect
): PaymentGatewayCredentialRecord => ({
  businessId: record.businessId,
  createdAt: record.createdAt,
  encryptedCredentials: record.encryptedCredentials ?? undefined,
  gatewayCode: record.gatewayCode as PaymentGatewayCode,
  id: record.id,
  isEnabled: record.isEnabled,
  tenantId: record.tenantId,
  updatedAt: record.updatedAt
});
