import { z } from 'zod';

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const salesSummaryQuerySchema = z
  .object({
    businessId: uuidSchema.optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional()
  })
  .refine((value) => Boolean(value.dateFrom) === Boolean(value.dateTo), {
    message: 'dateFrom and dateTo must be provided together'
  });
