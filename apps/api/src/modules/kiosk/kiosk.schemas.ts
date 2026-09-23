import { z } from 'zod';

import { terminalModes } from '../../db/schema/terminal-setting.js';

const uuidSchema = z.string().uuid();

export const createKioskOrderSchema = z.object({
  branchId: uuidSchema,
  items: z
    .array(
      z.object({
        productId: uuidSchema,
        quantity: z.number().int().min(1).max(1000)
      })
    )
    .min(1)
    .max(50),
  terminalId: uuidSchema
});

export const kioskOrderIdSchema = z.object({
  orderId: uuidSchema
});

export const kioskOrderQuerySchema = z.object({
  businessId: uuidSchema.optional()
});

export const terminalIdParamsSchema = z.object({
  terminalId: uuidSchema
});

export const updateTerminalSettingsSchema = z
  .object({
    gatewayTimeoutMinutes: z.number().int().min(1).max(60).optional(),
    kioskCollectsPayment: z.boolean().optional(),
    mode: z.enum(terminalModes).optional(),
    printDualTokens: z.boolean().optional(),
    showWalkInCustomer: z.boolean().optional()
  })
  .refine(
    (value) =>
      value.gatewayTimeoutMinutes !== undefined ||
      value.kioskCollectsPayment !== undefined ||
      value.mode !== undefined ||
      value.printDualTokens !== undefined ||
      value.showWalkInCustomer !== undefined,
    { message: 'At least one setting field is required' }
  );

export const razorpayWebhookBodySchema = z.object({
  event: z.string(),
  payload: z
    .object({
      payment: z
        .object({
          entity: z.object({
            id: z.string(),
            order_id: z.string().optional()
          })
        })
        .optional()
    })
    .passthrough()
});
