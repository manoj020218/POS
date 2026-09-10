import { z } from 'zod';

import { paymentGatewayCodes } from '../../db/schema/payment-gateway-credential.js';

const uuidSchema = z.string().uuid();
const gatewayCodeSchema = z.enum([...paymentGatewayCodes] as [string, ...string[]]);

export const listPaymentGatewaysQuerySchema = z.object({
  businessId: uuidSchema.optional()
});

export const paymentGatewayParamsSchema = z.object({
  gatewayCode: gatewayCodeSchema
});

export const updatePaymentGatewayCredentialsSchema = z
  .object({
    businessId: uuidSchema.optional(),
    credentials: z.record(z.string(), z.string().trim().max(500)).optional(),
    isEnabled: z.boolean().optional()
  })
  .refine((value) => value.credentials !== undefined || value.isEnabled !== undefined, {
    message: 'At least one of credentials or isEnabled is required'
  });
