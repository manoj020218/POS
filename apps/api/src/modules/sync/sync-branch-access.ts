import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import { assertBranchAccess } from '../tenant-core/branch-scope.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { CreateSyncEventInput } from './sync.types.js';

export const assertSyncEventBranchesAccessible = async (
  context: AccessContext,
  repository: TenantCoreRepository,
  events: CreateSyncEventInput[]
) => {
  const branches = await repository.listBranches(context.tenantId);
  const branchIds = new Set(branches.map((branch) => branch.id));

  events.forEach((event) => {
    if (!branchIds.has(event.branchId)) {
      throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    }

    assertBranchAccess(context, event.branchId);
  });
};

export const resolveSyncPullScope = async (
  context: AccessContext,
  repository: TenantCoreRepository,
  branchId?: string
) => {
  const branches = await repository.listBranches(context.tenantId);
  const accessibleBranches = context.hasAllBranchAccess
    ? branches
    : branches.filter((item) => context.assignedBranchIds.includes(item.id));

  if (branchId) {
    const branch = branches.find((item) => item.id === branchId);
    if (!branch) {
      throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    }

    assertBranchAccess(context, branchId);
    return { branchIds: [branchId], businessIds: [branch.businessId] };
  }

  return {
    branchIds: accessibleBranches.map((item) => item.id),
    businessIds: [...new Set(accessibleBranches.map((item) => item.businessId))]
  };
};
