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

export const resolveSyncPullBranchIds = async (
  context: AccessContext,
  repository: TenantCoreRepository,
  branchId?: string
) => {
  const branches = await repository.listBranches(context.tenantId);

  if (branchId) {
    if (!branches.some((branch) => branch.id === branchId)) {
      throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    }

    assertBranchAccess(context, branchId);
    return [branchId];
  }

  return context.hasAllBranchAccess
    ? branches.map((item) => item.id)
    : branches.filter((item) => context.assignedBranchIds.includes(item.id)).map((item) => item.id);
};
