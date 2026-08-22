import { and, eq } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { branches, businesses, terminals, tenants } from '../../db/schema/index.js';
import { createHttpError } from '../../lib/http-error.js';
import type { TenantCoreRepository } from './tenant-core.repository.js';
import type {
  BranchRecord,
  BusinessRecord,
  TenantRecord,
  TerminalRecord
} from './tenant-core.types.js';

export type DevBootstrapInput = {
  branchAddress?: string;
  branchCode?: string;
  branchName?: string;
  businessCode?: string;
  businessName?: string;
  tenantId: string;
  tenantName: string;
  tenantSlug?: string;
  terminalCode?: string;
  terminalInstallationId?: string;
  terminalName?: string;
};

export type DevBootstrapResult = {
  branch?: BranchRecord;
  business?: BusinessRecord;
  created: Array<'branch' | 'business' | 'tenant' | 'terminal'>;
  tenant: TenantRecord;
  terminal?: TerminalRecord;
};

export const bootstrapDevelopmentTenant = async (
  db: AppDatabase,
  repository: TenantCoreRepository,
  input: DevBootstrapInput
): Promise<DevBootstrapResult> => {
  const created: DevBootstrapResult['created'] = [];
  const tenantSlug = input.tenantSlug ?? buildTenantSlug(input.tenantName, input.tenantId);

  const tenant =
    (await findTenantById(db, input.tenantId)) ??
    (await createTenant(db, repository, input.tenantId, input.tenantName, tenantSlug, created));

  let business: BusinessRecord | undefined = await findBusinessByCode(
    db,
    tenant.id,
    input.businessCode
  );
  if (!business && input.businessCode && input.businessName) {
    business = await repository.createBusiness({
      code: input.businessCode.toUpperCase(),
      name: input.businessName,
      tenantId: tenant.id
    });
    created.push('business');
  }

  let branch: BranchRecord | undefined = business
    ? await findBranchByCode(db, tenant.id, input.branchCode)
    : undefined;
  if (!branch && business && input.branchCode && input.branchName) {
    branch = await repository.createBranch({
      address: input.branchAddress,
      businessId: business.id,
      code: input.branchCode.toUpperCase(),
      name: input.branchName,
      tenantId: tenant.id
    });
    created.push('branch');
  }

  let terminal: TerminalRecord | undefined = branch
    ? await findTerminalByCode(db, tenant.id, input.terminalCode)
    : undefined;
  if (!terminal && branch && input.terminalCode && input.terminalName) {
    terminal = await repository.registerTerminal({
      branchId: branch.id,
      code: input.terminalCode.toUpperCase(),
      deviceInstallationId: input.terminalInstallationId,
      name: input.terminalName,
      tenantId: tenant.id
    });
    created.push('terminal');
  }

  return { branch, business, created, tenant, terminal };
};

const buildTenantSlug = (name: string, tenantId: string) => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 54);

  return slug.length >= 2 ? slug : `tenant-${tenantId.slice(0, 8)}`;
};

const createTenant = async (
  db: AppDatabase,
  repository: TenantCoreRepository,
  tenantId: string,
  tenantName: string,
  tenantSlug: string,
  created: DevBootstrapResult['created']
) => {
  const existingBySlug = await findTenantBySlug(db, tenantSlug);
  if (existingBySlug && existingBySlug.id !== tenantId) {
    throw createHttpError(409, 'TENANT_SLUG_CONFLICT', `Tenant slug ${tenantSlug} already exists`);
  }

  const tenant = await repository.createTenant({
    id: tenantId,
    name: tenantName,
    slug: tenantSlug
  });

  created.push('tenant');
  return tenant;
};

const findBranchByCode = async (db: AppDatabase, tenantId: string, code?: string) => {
  if (!code) return undefined;
  const [branch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.tenantId, tenantId), eq(branches.code, code.toUpperCase())))
    .limit(1);

  return branch ? { ...branch, address: branch.address ?? undefined } : undefined;
};

const findBusinessByCode = async (db: AppDatabase, tenantId: string, code?: string) => {
  if (!code) return undefined;
  const [business] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.tenantId, tenantId), eq(businesses.code, code.toUpperCase())))
    .limit(1);

  return business;
};

const findTenantById = async (db: AppDatabase, tenantId: string) => {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return tenant;
};

const findTenantBySlug = async (db: AppDatabase, tenantSlug: string) => {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1);
  return tenant;
};

const findTerminalByCode = async (db: AppDatabase, tenantId: string, code?: string) => {
  if (!code) return undefined;
  const [terminal] = await db
    .select()
    .from(terminals)
    .where(and(eq(terminals.tenantId, tenantId), eq(terminals.code, code.toUpperCase())))
    .limit(1);

  return terminal
    ? {
        ...terminal,
        deviceInstallationId: terminal.deviceInstallationId ?? undefined,
        lastSeenAt: terminal.lastSeenAt ?? undefined
      }
    : undefined;
};
