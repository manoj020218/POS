import { z } from 'zod';

const uuidSchema = z.string().uuid();
const optionalStringSchema = (max: number) => z.string().trim().min(1).max(max).optional();
const optionalEmailSchema = z
  .string()
  .trim()
  .email()
  .max(160)
  .transform((value) => value.toLowerCase())
  .optional();
const optionalMobileSchema = z.string().trim().min(3).max(32).optional();

export const supplierIdSchema = z.object({
  supplierId: uuidSchema
});

export const supplierQuerySchema = z.object({
  businessId: uuidSchema.optional(),
  query: z.string().trim().min(1).max(160).optional()
});

export const createSupplierSchema = z.object({
  address: optionalStringSchema(500),
  businessId: uuidSchema.optional(),
  email: optionalEmailSchema,
  isActive: z.boolean().optional().default(true),
  mobile: optionalMobileSchema,
  name: z.string().trim().min(1).max(160),
  notes: optionalStringSchema(500),
  taxNumber: optionalStringSchema(64)
});

export const updateSupplierSchema = z
  .object({
    address: optionalStringSchema(500),
    email: optionalEmailSchema,
    isActive: z.boolean().optional(),
    mobile: optionalMobileSchema,
    name: z.string().trim().min(1).max(160).optional(),
    notes: optionalStringSchema(500),
    taxNumber: optionalStringSchema(64)
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });
