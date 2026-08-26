import { z } from 'zod';

const uuidSchema = z.string().uuid();
const optionalStringSchema = (max: number) => z.string().trim().min(1).max(max).optional();
const optionalEmailSchema = z.string().trim().email().max(160).transform((value) => value.toLowerCase()).optional();
const optionalMobileSchema = z.string().trim().min(3).max(32).optional();

export const customerIdSchema = z.object({
  customerId: uuidSchema
});

export const customerQuerySchema = z.object({
  businessId: uuidSchema.optional(),
  query: z.string().trim().min(1).max(160).optional()
});

export const createCustomerSchema = z
  .object({
    address: optionalStringSchema(500),
    businessId: uuidSchema.optional(),
    email: optionalEmailSchema,
    isActive: z.boolean().optional().default(true),
    mobile: optionalMobileSchema,
    name: optionalStringSchema(160),
    notes: optionalStringSchema(500),
    taxNumber: optionalStringSchema(64)
  })
  .refine((value) => Boolean(value.name || value.mobile || value.email), {
    message: 'At least one of name, mobile, or email is required'
  });

export const ensureWalkInCustomerSchema = z.object({
  businessId: uuidSchema.optional()
});

export const updateCustomerSchema = z
  .object({
    address: optionalStringSchema(500),
    email: optionalEmailSchema,
    isActive: z.boolean().optional(),
    mobile: optionalMobileSchema,
    name: optionalStringSchema(160),
    notes: optionalStringSchema(500),
    taxNumber: optionalStringSchema(64)
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });
