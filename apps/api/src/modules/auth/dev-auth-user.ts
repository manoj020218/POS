import { z } from 'zod';

import { appRoles } from './authorization.js';
import type { AuthUserRecord } from './auth.types.js';
import { hashPassword } from './password.js';

const defaultUserId = '99999999-9999-4999-8999-999999999999';
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const DevAuthEnvSchema = z
  .object({
    DEV_AUTH_EMAIL: z.string().trim().email().optional(),
    DEV_AUTH_NAME: z.string().trim().min(2).max(120).optional(),
    DEV_AUTH_PASSWORD: z.string().min(8).max(128).optional(),
    DEV_AUTH_ROLE: z.enum(appRoles).optional(),
    DEV_AUTH_USER_ID: z.string().uuid().optional(),
    DEV_TENANT_ID: z.string().uuid().optional()
  })
  .superRefine((env, context) => {
    const enabled = Boolean(
      env.DEV_AUTH_EMAIL ||
        env.DEV_AUTH_NAME ||
        env.DEV_AUTH_PASSWORD ||
        env.DEV_AUTH_ROLE ||
        env.DEV_AUTH_USER_ID
    );

    if (!enabled) return;

    if (!env.DEV_AUTH_EMAIL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DEV_AUTH_EMAIL is required when development auth is enabled',
        path: ['DEV_AUTH_EMAIL']
      });
    }

    if (!env.DEV_AUTH_NAME) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DEV_AUTH_NAME is required when development auth is enabled',
        path: ['DEV_AUTH_NAME']
      });
    }

    if (!env.DEV_AUTH_PASSWORD) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DEV_AUTH_PASSWORD is required when development auth is enabled',
        path: ['DEV_AUTH_PASSWORD']
      });
    }

    if (!env.DEV_TENANT_ID) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DEV_TENANT_ID is required when development auth is enabled',
        path: ['DEV_TENANT_ID']
      });
    }
  });

export const buildDevelopmentAuthUsers = async (env = process.env): Promise<AuthUserRecord[]> => {
  const parsed = DevAuthEnvSchema.safeParse(env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid development auth configuration: ${issues}`);
  }

  if (!parsed.data.DEV_AUTH_EMAIL) {
    return [];
  }

  return [
    {
      displayName: parsed.data.DEV_AUTH_NAME!,
      email: normalizeEmail(parsed.data.DEV_AUTH_EMAIL),
      id: parsed.data.DEV_AUTH_USER_ID ?? defaultUserId,
      isActive: true,
      passwordHash: await hashPassword(parsed.data.DEV_AUTH_PASSWORD!),
      permissions: [],
      role: parsed.data.DEV_AUTH_ROLE ?? 'BUSINESS_OWNER',
      tenantId: parsed.data.DEV_TENANT_ID!
    }
  ];
};
