import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  REFRESH_SECRET: z.string().min(32),
  BRIDGE_SHARED_SECRET: z.string().min(32),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().min(1).optional(),
  UPLOAD_DIR: z.string().min(1).default('./uploads/products'),
  PUBLIC_BASE_URL: z.string().url().optional(),
  // Encrypts tenant-owned payment-gateway secrets (Razorpay keys, etc.) at
  // rest — 32 bytes as 64 hex characters. Without it, businesses can still
  // view/enable payment gateway cards but writing new credentials is
  // refused rather than ever stored in plaintext.
  CREDENTIALS_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'CREDENTIALS_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
    .optional()
});

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
