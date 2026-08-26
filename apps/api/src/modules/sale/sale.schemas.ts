import { z } from 'zod';

import { paymentMethods } from './sale.types.js';

const uuidSchema = z.string().uuid();
const moneySchema = z.number().int().nonnegative().max(1_000_000_000);

export const createSaleSchema = z.object({
  branchId: uuidSchema,
  customerId: uuidSchema.optional(),
  items: z
    .array(
      z.object({
        discountAmount: moneySchema.optional().default(0),
        productId: uuidSchema,
        quantity: z.number().int().positive().max(10_000),
        taxAmount: moneySchema.optional().default(0),
        unitPrice: moneySchema.optional()
      })
    )
    .min(1)
    .max(500),
  occurredAt: z.coerce.date().optional(),
  payment: z.object({
    method: z.enum(paymentMethods),
    tenderedAmount: moneySchema.optional()
  }),
  terminalId: uuidSchema
});
