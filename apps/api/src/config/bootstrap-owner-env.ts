import { z } from 'zod';

import { bootstrapOwnerRoles } from '../modules/auth/bootstrap-owner.service.js';

const BootstrapOwnerEnvSchema = z.object({
  BOOTSTRAP_OWNER_EMAIL: z.string().trim().email(),
  BOOTSTRAP_OWNER_NAME: z.string().trim().min(2).max(120),
  BOOTSTRAP_OWNER_PASSWORD: z.string().min(8).max(128),
  BOOTSTRAP_OWNER_ROLE: z.enum(bootstrapOwnerRoles).default('BUSINESS_OWNER'),
  BOOTSTRAP_OWNER_TENANT_ID: z.string().uuid(),
  BOOTSTRAP_OWNER_USER_ID: z.string().uuid().optional(),
  DATABASE_URL: z.url()
});

type BootstrapOwnerEnv = z.infer<typeof BootstrapOwnerEnvSchema>;

type BootstrapOwnerCliInput = Partial<
  Record<
    | 'BOOTSTRAP_OWNER_EMAIL'
    | 'BOOTSTRAP_OWNER_NAME'
    | 'BOOTSTRAP_OWNER_PASSWORD'
    | 'BOOTSTRAP_OWNER_ROLE'
    | 'BOOTSTRAP_OWNER_TENANT_ID'
    | 'BOOTSTRAP_OWNER_USER_ID',
    string
  >
>;

export type BootstrapOwnerConfig = {
  databaseUrl: string;
  displayName: string;
  email: string;
  password: string;
  role: BootstrapOwnerEnv['BOOTSTRAP_OWNER_ROLE'];
  tenantId: string;
  userId?: string;
};

export const loadBootstrapOwnerEnv = (
  args = process.argv.slice(2),
  env = process.env
): BootstrapOwnerConfig => {
  const cliInput = parseCliInput(args);
  const parsed = BootstrapOwnerEnvSchema.safeParse({
    BOOTSTRAP_OWNER_EMAIL: cliInput.BOOTSTRAP_OWNER_EMAIL ?? env.BOOTSTRAP_OWNER_EMAIL,
    BOOTSTRAP_OWNER_NAME: cliInput.BOOTSTRAP_OWNER_NAME ?? env.BOOTSTRAP_OWNER_NAME,
    BOOTSTRAP_OWNER_PASSWORD:
      cliInput.BOOTSTRAP_OWNER_PASSWORD ?? env.BOOTSTRAP_OWNER_PASSWORD,
    BOOTSTRAP_OWNER_ROLE: cliInput.BOOTSTRAP_OWNER_ROLE ?? env.BOOTSTRAP_OWNER_ROLE,
    BOOTSTRAP_OWNER_TENANT_ID:
      cliInput.BOOTSTRAP_OWNER_TENANT_ID ?? env.BOOTSTRAP_OWNER_TENANT_ID,
    BOOTSTRAP_OWNER_USER_ID: cliInput.BOOTSTRAP_OWNER_USER_ID ?? env.BOOTSTRAP_OWNER_USER_ID,
    DATABASE_URL: env.DATABASE_URL
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid bootstrap owner configuration: ${issues}`);
  }

  return {
    databaseUrl: parsed.data.DATABASE_URL,
    displayName: parsed.data.BOOTSTRAP_OWNER_NAME,
    email: parsed.data.BOOTSTRAP_OWNER_EMAIL,
    password: parsed.data.BOOTSTRAP_OWNER_PASSWORD,
    role: parsed.data.BOOTSTRAP_OWNER_ROLE,
    tenantId: parsed.data.BOOTSTRAP_OWNER_TENANT_ID,
    userId: parsed.data.BOOTSTRAP_OWNER_USER_ID
  };
};

const parseCliInput = (args: string[]): BootstrapOwnerCliInput => {
  const result: BootstrapOwnerCliInput = {};

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === '--') {
      continue;
    }

    if (!current?.startsWith('--')) {
      throw new Error(`Unsupported bootstrap owner argument: ${current}`);
    }

    const [flag, inlineValue] = current.split('=', 2);
    const nextValue = inlineValue ?? args[index + 1];
    const value = nextValue?.startsWith('--') ? undefined : nextValue;

    switch (flag) {
      case '--email':
        result.BOOTSTRAP_OWNER_EMAIL = requireCliValue(flag, value);
        break;
      case '--name':
        result.BOOTSTRAP_OWNER_NAME = requireCliValue(flag, value);
        break;
      case '--password':
        result.BOOTSTRAP_OWNER_PASSWORD = requireCliValue(flag, value);
        break;
      case '--role':
        result.BOOTSTRAP_OWNER_ROLE = requireCliValue(flag, value);
        break;
      case '--tenant-id':
        result.BOOTSTRAP_OWNER_TENANT_ID = requireCliValue(flag, value);
        break;
      case '--user-id':
        result.BOOTSTRAP_OWNER_USER_ID = requireCliValue(flag, value);
        break;
      default:
        throw new Error(`Unsupported bootstrap owner argument: ${flag}`);
    }

    if (!inlineValue) {
      index += 1;
    }
  }

  return result;
};

const requireCliValue = (flag: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing value for bootstrap owner argument: ${flag}`);
  }

  return value;
};
