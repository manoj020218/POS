import { z } from 'zod';

const uuidSchema = z.string().uuid();
const moneySchema = z.number().int().nonnegative().max(1_000_000_000);
const optionalStringSchema = (max: number) => z.string().trim().min(1).max(max).optional();

export const purchaseQuerySchema = z.object({
  branchId: uuidSchema.optional(),
  supplierId: uuidSchema.optional()
});

export const createPurchaseSchema = z.object({
  branchId: uuidSchema,
  items: z
    .array(
      z.object({
        productId: uuidSchema,
        quantity: z.number().int().positive().max(10_000),
        unitCost: moneySchema.optional()
      })
    )
    .min(1)
    .max(500),
  notes: optionalStringSchema(500),
  occurredAt: z.coerce.date().optional(),
  referenceNumber: optionalStringSchema(96),
  supplierId: uuidSchema.optional()
});
