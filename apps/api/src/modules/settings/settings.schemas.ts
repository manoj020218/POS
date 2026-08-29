import { z } from 'zod';

const uuidSchema = z.string().uuid();
const nullableTrimmedString = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .transform((value) => (value === null || value.length === 0 ? null : value));

const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Timezone must be a valid IANA time zone' }
  );

const invoicePrefixSchema = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(/^[A-Za-z0-9_-]+$/)
  .transform((value) => value.toUpperCase());

const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Za-z]{3}$/)
  .transform((value) => value.toUpperCase());

const receiptPrinterProfileSchema = z.object({
  autoPrintReceipt: z.boolean().optional(),
  connectionType: z.enum(['BLUETOOTH', 'SYSTEM', 'TCP', 'USB']),
  name: z.string().trim().min(2).max(120),
  paperWidth: z.enum(['58mm', '80mm']),
  port: z.number().int().min(1).max(65535).optional(),
  target: z.string().trim().min(1).max(160).optional()
});

export const businessSettingsQuerySchema = z.object({
  businessId: uuidSchema.optional()
});

export const updateBusinessSettingsSchema = z
  .object({
    branches: z
      .array(
        z
          .object({
            address: z.string().trim().min(4).max(240).optional(),
            branchId: uuidSchema,
            receiptPrinterProfile: receiptPrinterProfileSchema.nullable().optional()
          })
          .refine(
            (value) =>
              value.address !== undefined || value.receiptPrinterProfile !== undefined,
            { message: 'Each branch update requires address or receiptPrinterProfile' }
          )
      )
      .optional(),
    businessId: uuidSchema.optional(),
    businessLogoUrl: z
      .union([z.string().trim().url().max(500), z.null()])
      .transform((value) => value ?? null)
      .optional(),
    currencyCode: currencyCodeSchema.optional(),
    defaultTaxProfileId: uuidSchema.nullable().optional(),
    defaultTrackInventory: z.boolean().optional(),
    defaultUnitId: uuidSchema.nullable().optional(),
    invoicePrefix: invoicePrefixSchema.optional(),
    receiptFooter: nullableTrimmedString(500).optional(),
    timezone: timezoneSchema.optional()
  })
  .refine(
    (value) =>
      value.branches !== undefined ||
      value.businessLogoUrl !== undefined ||
      value.currencyCode !== undefined ||
      value.defaultTaxProfileId !== undefined ||
      value.defaultTrackInventory !== undefined ||
      value.defaultUnitId !== undefined ||
      value.invoicePrefix !== undefined ||
      value.receiptFooter !== undefined ||
      value.timezone !== undefined,
    { message: 'At least one settings field is required' }
  );
