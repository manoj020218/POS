import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { BusinessRecord } from '../tenant-core/tenant-core.types.js';

export const listAccessibleBusinesses = async (
  context: AccessContext,
  repository: TenantCoreRepository
) => {
  const businesses = await repository.listBusinesses(context.tenantId);

  if (context.hasAllBranchAccess) {
    return businesses;
  }

  const branches = await repository.listBranches(context.tenantId);
  const allowedBusinessIds = new Set(
    branches
      .filter((branch) => context.assignedBranchIds.includes(branch.id))
      .map((branch) => branch.businessId)
  );

  return businesses.filter((business) => allowedBusinessIds.has(business.id));
};

export const resolveReadBusinessIds = async (
  context: AccessContext,
  repository: TenantCoreRepository,
  businessId?: string
) => {
  const accessibleBusinesses = await listAccessibleBusinesses(context, repository);

  if (!businessId) {
    return accessibleBusinesses.map((business) => business.id);
  }

  const business = accessibleBusinesses.find((item) => item.id === businessId);
  if (!business) {
    throw createHttpError(403, 'BRANCH_ACCESS_DENIED', 'Branch access denied');
  }

  return [business.id];
};

export const resolveWriteBusiness = async (
  context: AccessContext,
  repository: TenantCoreRepository,
  businessId?: string
): Promise<BusinessRecord> => {
  const accessibleBusinesses = await listAccessibleBusinesses(context, repository);

  if (accessibleBusinesses.length === 0) {
    throw createHttpError(403, 'BRANCH_ACCESS_DENIED', 'Branch access denied');
  }

  if (businessId) {
    const business = accessibleBusinesses.find((item) => item.id === businessId);
    if (!business) {
      throw createHttpError(403, 'BRANCH_ACCESS_DENIED', 'Branch access denied');
    }

    return business;
  }

  if (accessibleBusinesses.length === 1) {
    return accessibleBusinesses[0]!;
  }

  throw createHttpError(
    400,
    'BUSINESS_CONTEXT_REQUIRED',
    'Business context is required when multiple businesses are accessible'
  );
};
