import { z } from 'zod';

const optionalCode = z.string().trim().min(2).max(32).optional();
const optionalName = z.string().trim().min(2).max(120).optional();

const BootstrapEnvSchema = z
  .object({
    DATABASE_URL: z.url(),
    DEV_BRANCH_ADDRESS: z.string().trim().min(4).max(240).optional(),
    DEV_BRANCH_CODE: optionalCode,
    DEV_BRANCH_NAME: optionalName,
    DEV_BUSINESS_CODE: optionalCode,
    DEV_BUSINESS_NAME: optionalName,
    DEV_TENANT_ID: z.string().uuid(),
    DEV_TENANT_NAME: z.string().trim().min(2).max(120),
    DEV_TENANT_SLUG: z.string().trim().min(2).max(64).optional(),
    DEV_TERMINAL_CODE: optionalCode,
    DEV_TERMINAL_INSTALLATION_ID: z.string().trim().min(4).max(120).optional(),
    DEV_TERMINAL_NAME: optionalName
  })
  .superRefine((env, context) => {
    const pairs: Array<[keyof typeof env, keyof typeof env]> = [
      ['DEV_BUSINESS_CODE', 'DEV_BUSINESS_NAME'],
      ['DEV_BRANCH_CODE', 'DEV_BRANCH_NAME'],
      ['DEV_TERMINAL_CODE', 'DEV_TERMINAL_NAME']
    ];

    pairs.forEach(([codeKey, nameKey]) => {
      const hasCode = Boolean(env[codeKey]);
      const hasName = Boolean(env[nameKey]);

      if (hasCode !== hasName) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${codeKey} and ${nameKey} must be provided together`,
          path: [codeKey]
        });
      }
    });
  });

export type BootstrapEnv = z.infer<typeof BootstrapEnvSchema>;

export const loadBootstrapEnv = (): BootstrapEnv => {
  const parsed = BootstrapEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid bootstrap configuration: ${issues}`);
  }

  return parsed.data;
};
