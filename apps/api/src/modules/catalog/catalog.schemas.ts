import { z } from 'zod';

const uuidSchema = z.string().uuid();
const businessScopedCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/)
  .transform((value) => value.toUpperCase());
const optionalBusinessScopedCodeSchema = businessScopedCodeSchema.optional();
const nameSchema = z.string().trim().min(2).max(160);
const optionalStringSchema = (max: number) => z.string().trim().min(1).max(max).optional();
const moneySchema = z.number().int().nonnegative().max(1_000_000_000);
const quantitySchema = z.number().int().nonnegative().max(1_000_000);

export const catalogQuerySchema = z.object({
  businessId: uuidSchema.optional()
});

export const productListQuerySchema = catalogQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
});

export const productSearchQuerySchema = catalogQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  query: z.string().trim().min(1).max(160)
});

export const categoryIdSchema = z.object({
  categoryId: uuidSchema
});

export const createCategorySchema = z.object({
  businessId: uuidSchema.optional(),
  code: optionalBusinessScopedCodeSchema,
  isActive: z.boolean().optional().default(true),
  name: nameSchema
});

export const updateCategorySchema = z
  .object({
    code: optionalBusinessScopedCodeSchema,
    isActive: z.boolean().optional(),
    name: nameSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

export const unitIdSchema = z.object({
  unitId: uuidSchema
});

export const createUnitSchema = z.object({
  businessId: uuidSchema.optional(),
  code: optionalBusinessScopedCodeSchema,
  isActive: z.boolean().optional().default(true),
  name: nameSchema,
  precision: z.number().int().min(0).max(3).optional().default(0),
  symbol: optionalStringSchema(24)
});

export const updateUnitSchema = z
  .object({
    code: optionalBusinessScopedCodeSchema,
    isActive: z.boolean().optional(),
    name: nameSchema.optional(),
    precision: z.number().int().min(0).max(3).optional(),
    symbol: optionalStringSchema(24)
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

export const taxProfileIdSchema = z.object({
  taxProfileId: uuidSchema
});

export const createTaxProfileSchema = z.object({
  businessId: uuidSchema.optional(),
  code: optionalBusinessScopedCodeSchema,
  isActive: z.boolean().optional().default(true),
  name: nameSchema,
  rateBasisPoints: z.number().int().min(0).max(10_000).optional().default(0)
});

export const updateTaxProfileSchema = z
  .object({
    code: optionalBusinessScopedCodeSchema,
    isActive: z.boolean().optional(),
    name: nameSchema.optional(),
    rateBasisPoints: z.number().int().min(0).max(10_000).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

export const productIdSchema = z.object({
  productId: uuidSchema
});

export const createProductSchema = z.object({
  barcode: optionalStringSchema(64),
  brand: optionalStringSchema(120),
  businessId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  description: optionalStringSchema(500),
  hsnSac: optionalStringSchema(32),
  imageUrl: z.string().trim().url().max(500).optional(),
  lowStockLevel: quantitySchema.optional().default(0),
  name: nameSchema,
  openingStock: quantitySchema.optional().default(0),
  purchasePrice: moneySchema.optional(),
  sellingPrice: moneySchema,
  sku: optionalStringSchema(64).transform((value) => value?.toUpperCase()),
  taxProfileId: uuidSchema.optional(),
  isActive: z.boolean().optional().default(true),
  trackInventory: z.boolean().optional(),
  unitId: uuidSchema.optional()
});

export const updateProductSchema = z
  .object({
    barcode: optionalStringSchema(64),
    brand: optionalStringSchema(120),
    categoryId: uuidSchema.optional(),
    description: optionalStringSchema(500),
    hsnSac: optionalStringSchema(32),
    imageUrl: z.string().trim().url().max(500).optional(),
    isActive: z.boolean().optional(),
    lowStockLevel: quantitySchema.optional(),
    name: nameSchema.optional(),
    openingStock: quantitySchema.optional(),
    purchasePrice: moneySchema.optional(),
    sellingPrice: moneySchema.optional(),
    sku: optionalStringSchema(64).transform((value) => value?.toUpperCase()),
    taxProfileId: uuidSchema.optional(),
    trackInventory: z.boolean().optional(),
    unitId: uuidSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });
