import { z } from 'zod';

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/)
  .transform((value) => value.toUpperCase());

const nameSchema = z.string().trim().min(2).max(120);
const uuidSchema = z.string().uuid();

export const createBusinessSchema = z.object({
  code: codeSchema,
  name: nameSchema
});

export const updateBusinessSchema = createBusinessSchema.partial().refine((value) => Object.keys(value).length > 0);

export const businessIdSchema = z.object({
  businessId: uuidSchema
});

export const createBranchSchema = z.object({
  address: z.string().trim().min(4).max(240).optional(),
  businessId: uuidSchema,
  code: codeSchema,
  name: nameSchema
});

export const updateBranchSchema = createBranchSchema
  .omit({ businessId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export const branchIdSchema = z.object({
  branchId: uuidSchema
});

export const branchQuerySchema = z.object({
  businessId: uuidSchema.optional()
});

export const registerTerminalSchema = z.object({
  branchId: uuidSchema,
  code: codeSchema,
  deviceInstallationId: z.string().trim().min(4).max(120).optional(),
  name: nameSchema
});

export const terminalIdSchema = z.object({
  terminalId: uuidSchema
});

export const terminalQuerySchema = z.object({
  branchId: uuidSchema.optional()
});
