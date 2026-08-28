import { createHttpError } from '../../lib/http-error.js';
import { listAccessibleBusinesses } from '../catalog/catalog-business-scope.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import { filterByBranchId } from '../tenant-core/branch-scope.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { BranchRecord, BusinessRecord } from '../tenant-core/tenant-core.types.js';

export type ReportingScope = {
  branchIds: string[];
  branches: BranchRecord[];
  businessIds: string[];
  businesses: BusinessRecord[];
};

export const resolveReportingScope = async (
  context: AccessContext,
  repository: TenantCoreRepository,
  businessId?: string
): Promise<ReportingScope> => {
  const accessibleBusinesses = await listAccessibleBusinesses(context, repository);
  const businesses = resolveBusinesses(accessibleBusinesses, businessId);
  const businessIds = businesses.map((business) => business.id);
  const allowedBusinessIds = new Set(businessIds);
  const branches = filterByBranchId(
    context,
    await repository.listBranches(context.tenantId, businessId),
    (branch) => branch.id
  ).filter((branch) => allowedBusinessIds.has(branch.businessId));

  return {
    branchIds: branches.map((branch) => branch.id),
    branches,
    businessIds,
    businesses
  };
};

const resolveBusinesses = (
  businesses: readonly BusinessRecord[],
  requestedBusinessId?: string
): BusinessRecord[] => {
  if (!requestedBusinessId) {
    return [...businesses];
  }

  const business = businesses.find((item) => item.id === requestedBusinessId);
  if (business) {
    return [business];
  }

  throw createHttpError(403, 'BRANCH_ACCESS_DENIED', 'Branch access denied');
};
