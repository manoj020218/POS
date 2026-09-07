import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());
const requiredName = (max: number) => z.string().trim().min(2).max(max);
const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();
const mobileSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, 'Mobile must be 7-15 digits, optionally prefixed with +');

export const provisionRequestSchema = z.object({
  address: optionalText(240),
  agentCode: optionalText(64),
  businessName: requiredName(160),
  city: optionalText(120),
  email: emailSchema,
  mobile: mobileSchema,
  ownerName: requiredName(160),
  pincode: optionalText(16),
  state: optionalText(120)
});

export type ProvisionRequestInput = z.infer<typeof provisionRequestSchema>;
