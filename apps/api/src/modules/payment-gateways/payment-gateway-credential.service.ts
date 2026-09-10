import { paymentGatewayCodes } from '../../db/schema/payment-gateway-credential.js';
import { createHttpError } from '../../lib/http-error.js';
import { decryptCredentialPayload, encryptCredentialPayload } from '../../lib/credential-encryption.js';
import { resolveWriteBusiness } from '../catalog/catalog-business-scope.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { PaymentGatewayCredentialRepository } from './payment-gateway-credential.repository.js';
import type {
  PaymentGatewayCardView,
  PaymentGatewayCode,
  PaymentGatewayCredentialRecord,
  ResolvedPaymentGatewayCredentials,
  UpdatePaymentGatewayCredentialsInput
} from './payment-gateway-credential.types.js';

const gatewayLabels: Record<PaymentGatewayCode, string> = {
  razorpay: 'Razorpay'
};

// Fields a gateway must have before it can be switched on — enabling
// without these would mean orders/webhooks can never actually work.
const requiredFieldsByGateway: Record<PaymentGatewayCode, string[]> = {
  razorpay: ['keyId', 'keySecret', 'webhookSecret']
};

export const createPaymentGatewayCredentialService = (
  repository: PaymentGatewayCredentialRepository,
  tenantCoreRepository: TenantCoreRepository,
  encryptionKey?: string
) => {
  const toCard = (
    record: PaymentGatewayCredentialRecord | null,
    code: PaymentGatewayCode
  ): PaymentGatewayCardView => ({
    code,
    configured: Boolean(record?.encryptedCredentials),
    isEnabled: Boolean(record?.isEnabled),
    label: gatewayLabels[code],
    updatedAt: record?.updatedAt.toISOString()
  });

  const decryptFields = (record: PaymentGatewayCredentialRecord | null): Record<string, string> => {
    if (!record?.encryptedCredentials || !encryptionKey) {
      return {};
    }
    try {
      return JSON.parse(decryptCredentialPayload(record.encryptedCredentials, encryptionKey)) as Record<
        string,
        string
      >;
    } catch {
      return {};
    }
  };

  return {
    listGatewayCards: async (
      context: AccessContext,
      businessId?: string
    ): Promise<PaymentGatewayCardView[]> => {
      const business = await resolveWriteBusiness(context, tenantCoreRepository, businessId);
      const records = await repository.listCredentials(context.tenantId, business.id);
      const byCode = new Map(records.map((record) => [record.gatewayCode, record]));

      return paymentGatewayCodes.map((code) => toCard(byCode.get(code) ?? null, code));
    },

    updateGatewayCredentials: async (
      context: AccessContext,
      gatewayCode: PaymentGatewayCode,
      input: UpdatePaymentGatewayCredentialsInput
    ): Promise<PaymentGatewayCardView> => {
      const business = await resolveWriteBusiness(context, tenantCoreRepository, input.businessId);
      const existing = await repository.findCredential(context.tenantId, business.id, gatewayCode);

      let mergedFields = decryptFields(existing);
      if (input.credentials && Object.keys(input.credentials).length > 0) {
        if (!encryptionKey) {
          throw createHttpError(
            503,
            'CREDENTIAL_ENCRYPTION_NOT_CONFIGURED',
            'Payment gateway credential storage is not configured'
          );
        }

        mergedFields = { ...mergedFields };
        for (const [key, value] of Object.entries(input.credentials)) {
          if (value) {
            mergedFields[key] = value;
          }
        }
      }

      const isEnabled = input.isEnabled ?? existing?.isEnabled ?? false;
      if (isEnabled) {
        const missing = requiredFieldsByGateway[gatewayCode].filter((field) => !mergedFields[field]);
        if (missing.length > 0) {
          throw createHttpError(
            400,
            'PAYMENT_GATEWAY_INCOMPLETE',
            `Cannot enable ${gatewayLabels[gatewayCode]} without: ${missing.join(', ')}`
          );
        }
      }

      const hasAnyField = Object.keys(mergedFields).length > 0;
      const encryptedCredentials =
        hasAnyField && encryptionKey
          ? encryptCredentialPayload(JSON.stringify(mergedFields), encryptionKey)
          : existing?.encryptedCredentials;

      const saved = await repository.upsertCredential({
        businessId: business.id,
        encryptedCredentials,
        gatewayCode,
        isEnabled,
        tenantId: context.tenantId
      });

      return toCard(saved, gatewayCode);
    },

    // Internal-only — resolved plaintext credentials for actually calling a
    // gateway. Never exposed over HTTP; only kiosk.service should call this.
    getResolvedCredentials: async (
      tenantId: string,
      businessId: string,
      gatewayCode: PaymentGatewayCode
    ): Promise<ResolvedPaymentGatewayCredentials | null> => {
      const record = await repository.findCredential(tenantId, businessId, gatewayCode);
      if (!record || !record.isEnabled || !record.encryptedCredentials || !encryptionKey) {
        return null;
      }

      try {
        const fields = JSON.parse(
          decryptCredentialPayload(record.encryptedCredentials, encryptionKey)
        ) as Record<string, string>;
        return { fields, isEnabled: true };
      } catch {
        return null;
      }
    }
  };
};

export type PaymentGatewayCredentialService = ReturnType<typeof createPaymentGatewayCredentialService>;
