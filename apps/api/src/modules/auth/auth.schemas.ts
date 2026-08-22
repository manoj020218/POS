import { z } from 'zod';

import { appPermissions, appRoles, tenantAssignableRoles } from './authorization.js';

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
const displayNameSchema = z.string().trim().min(2).max(120);
const passwordSchema = z.string().min(8).max(128);
const optionalDeviceIdSchema = z.string().trim().min(4).max(120).optional();
const optionalDeviceNameSchema = z.string().trim().min(2).max(120).optional();
const tokenSchema = z.string().trim().min(32);
const tokenBaseSchema = z.object({
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  jti: z.string().uuid(),
  sessionId: z.string().uuid(),
  sub: z.string().uuid(),
  tenantId: z.string().uuid()
});

export const loginSchema = z.object({
  deviceInstallationId: optionalDeviceIdSchema,
  deviceName: optionalDeviceNameSchema,
  email: emailSchema,
  password: passwordSchema
});

export const refreshSchema = z.object({
  refreshToken: tokenSchema
});

export const logoutSchema = z.object({
  refreshToken: tokenSchema
});

export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema
});

export const passwordResetConfirmSchema = z.object({
  newPassword: passwordSchema,
  resetToken: tokenSchema
});

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().uuid()
});

export const userIdParamsSchema = z.object({
  userId: z.string().uuid()
});

export const createAuthUserSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  isActive: z.boolean().optional().default(true),
  password: passwordSchema,
  role: z.enum(tenantAssignableRoles)
});

export const updateAuthUserSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    email: emailSchema.optional(),
    isActive: z.boolean().optional(),
    role: z.enum(tenantAssignableRoles).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

export const accessTokenPayloadSchema = tokenBaseSchema.extend({
  displayName: z.string().trim().min(1).max(120),
  email: emailSchema,
  permissions: z.array(z.enum(appPermissions)),
  role: z.enum(appRoles),
  type: z.literal('access')
});

export const refreshTokenPayloadSchema = tokenBaseSchema.extend({
  type: z.literal('refresh')
});
