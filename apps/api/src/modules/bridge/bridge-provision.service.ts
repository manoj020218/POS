import { randomUUID } from 'node:crypto';

import type { createAuthAuditLogger } from '../auth/auth-audit.service.js';
import type { AuthRepository } from '../auth/auth.repository.js';
import { bootstrapOwnerUser } from '../auth/bootstrap-owner.service.js';
import { generateTemporaryPassword } from '../auth/generate-temporary-password.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { ProvisionRequestInput } from './bridge.schemas.js';

export type ProvisionResult = {
  branchId: string;
  businessCode: string;
  businessId: string;
  ownerEmail: string;
  tempPassword: string;
  tenantId: string;
  terminalId: string;
};

const slugify = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20) || 'BIZ';

const uniqueSuffix = () => randomUUID().split('-')[0]!.toUpperCase();

// A self-serve signup always creates a brand-new tenant, so this composes the
// TenantCoreRepository's create* methods directly rather than reusing
// bootstrapDevelopmentTenant — that helper's lookup-by-code idempotency checks run raw
// Drizzle queries against a real Postgres handle (not the repository interface), so it
// can't run against the in-memory repository used for tests/dev:memory. Nothing here
// needs that idempotency anyway: every signup is fresh.
export const createBridgeProvisionService = (
  tenantCoreRepository: TenantCoreRepository,
  authRepository: AuthRepository,
  auditLogger: ReturnType<typeof createAuthAuditLogger>
) => ({
  provision: async (input: ProvisionRequestInput): Promise<ProvisionResult> => {
    const businessCode = slugify(input.businessName);
    const tenantSlug = `${businessCode.toLowerCase()}-${uniqueSuffix().toLowerCase()}`;

    const tenant = await tenantCoreRepository.createTenant({
      id: randomUUID(),
      name: input.businessName,
      slug: tenantSlug
    });

    const business = await tenantCoreRepository.createBusiness({
      code: businessCode,
      name: input.businessName,
      tenantId: tenant.id
    });

    const branch = await tenantCoreRepository.createBranch({
      address: input.address,
      businessId: business.id,
      code: 'MAIN',
      name: 'Main Branch',
      tenantId: tenant.id
    });

    const terminal = await tenantCoreRepository.registerTerminal({
      branchId: branch.id,
      code: 'T1',
      deviceInstallationId: undefined,
      name: 'Counter 1',
      tenantId: tenant.id
    });

    const tempPassword = generateTemporaryPassword();

    await bootstrapOwnerUser(authRepository, auditLogger, {
      displayName: input.ownerName,
      email: input.email,
      password: tempPassword,
      role: 'BUSINESS_OWNER',
      tenantId: tenant.id
    });

    return {
      branchId: branch.id,
      businessCode: business.code,
      businessId: business.id,
      ownerEmail: input.email,
      tempPassword,
      tenantId: tenant.id,
      terminalId: terminal.id
    };
  }
});

export type BridgeProvisionService = ReturnType<typeof createBridgeProvisionService>;
