import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from './access-context.js';
import type { BranchRecord, BusinessRecord } from './tenant-core.types.js';

export const assertAllBranchAccess = (context: AccessContext) => {
  if (!context.hasAllBranchAccess) {
    throw createHttpError(403, 'BRANCH_ACCESS_DENIED', 'Branch access denied');
  }
};

export const assertBranchAccess = (context: AccessContext, branchId: string) => {
  if (context.hasAllBranchAccess || context.assignedBranchIds.includes(branchId)) {
    return;
  }

  throw createHttpError(403, 'BRANCH_ACCESS_DENIED', 'Branch access denied');
};

export const assertBusinessAccess = (
  context: AccessContext,
  businessId: string,
  branches: readonly BranchRecord[]
) => {
  if (context.hasAllBranchAccess) {
    return;
  }

  const allowed = branches.some((branch) => {
    return branch.businessId === businessId && context.assignedBranchIds.includes(branch.id);
  });

  if (!allowed) {
    throw createHttpError(403, 'BRANCH_ACCESS_DENIED', 'Branch access denied');
  }
};

export const filterByBranchId = <T>(
  context: AccessContext,
  items: T[],
  getBranchId: (item: T) => string
): T[] => {
  if (context.hasAllBranchAccess) {
    return items;
  }

  const allowed = new Set(context.assignedBranchIds);
  return items.filter((item) => allowed.has(getBranchId(item)));
};

export const filterBusinessesForBranchScope = (
  context: AccessContext,
  businesses: BusinessRecord[],
  branches: readonly BranchRecord[]
): BusinessRecord[] => {
  if (context.hasAllBranchAccess) {
    return businesses;
  }

  const allowedBusinessIds = new Set(
    branches
      .filter((branch) => context.assignedBranchIds.includes(branch.id))
      .map((branch) => branch.businessId)
  );

  return businesses.filter((business) => allowedBusinessIds.has(business.id));
};
