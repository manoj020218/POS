import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const inventoryBalanceQuerySchema = z.object({
  businessId: uuidSchema.optional(),
  productId: uuidSchema.optional()
});
