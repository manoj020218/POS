import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  REFRESH_SECRET: z.string().min(32),
  DEV_TENANT_ID: z.string().uuid().optional(),
  DEV_TENANT_NAME: z.string().trim().min(2).max(120).optional(),
  DEV_TENANT_SLUG: z.string().trim().min(2).max(64).optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info')
})
  .refine(
    (env) =>
      (!env.DEV_TENANT_ID && !env.DEV_TENANT_NAME && !env.DEV_TENANT_SLUG) ||
      (env.DEV_TENANT_ID && env.DEV_TENANT_NAME),
    {
      message: 'DEV_TENANT_ID and DEV_TENANT_NAME must be provided together',
      path: ['DEV_TENANT_ID']
    }
  );

export type AppEnv = z.infer<typeof EnvSchema>;

export const loadEnv = (): AppEnv => {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return parsed.data;
};
