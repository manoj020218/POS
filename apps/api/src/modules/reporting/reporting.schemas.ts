import { z } from 'zod';

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const salesReportQueryFields = {
  businessId: uuidSchema.optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional()
};

export const salesReportQuerySchema = z.object(salesReportQueryFields).refine((value) => {
  return Boolean(value.dateFrom) === Boolean(value.dateTo);
}, {
  message: 'dateFrom and dateTo must be provided together'
});

export const topProductsQuerySchema = z.object({
  ...salesReportQueryFields,
  limit: z.coerce.number().int().min(1).max(50).default(10)
}).refine((value) => {
  return Boolean(value.dateFrom) === Boolean(value.dateTo);
}, {
  message: 'dateFrom and dateTo must be provided together'
});
