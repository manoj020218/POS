import { createHttpError } from '../../lib/http-error.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { AuthRepository } from './auth.repository.js';
import type { AuthUserBranchAccessView } from './auth.types.js';

type ManageUserBranchAccessInput = {
  branchIds: string[];
  tenantId: string;
  userId: string;
};

type ListUserBranchAccessInput = Pick<AccessContext, 'tenantId'> & {
  userId: string;
};

export const createUserBranchAccessHandlers = (
  repository: AuthRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  listUserBranchAccess: async (
    input: ListUserBranchAccessInput
  ): Promise<AuthUserBranchAccessView[]> => {
    await ensureTenantUser(repository, input.userId, input.tenantId);
    const assignedBranchIds = new Set(
      (await repository.listBranchAccessForUser(input.userId, input.tenantId)).map(
        (record) => record.branchId
      )
    );
    const branches = await tenantCoreRepository.listBranches(input.tenantId);

    return branches
      .filter((branch) => assignedBranchIds.has(branch.id))
      .map((branch) => ({
        branchId: branch.id,
        businessId: branch.businessId,
        code: branch.code,
        isActive: branch.isActive,
        name: branch.name
      }));
  },
  replaceUserBranchAccess: async (
    input: ManageUserBranchAccessInput
  ): Promise<AuthUserBranchAccessView[]> => {
    await ensureTenantUser(repository, input.userId, input.tenantId);
    const tenantBranches = await tenantCoreRepository.listBranches(input.tenantId);
    const branchMap = new Map(tenantBranches.map((branch) => [branch.id, branch]));
    const branchIds = [...new Set(input.branchIds)];

    for (const branchId of branchIds) {
      if (!branchMap.has(branchId)) {
        throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
      }
    }

    await repository.replaceBranchAccessForUser(input.userId, input.tenantId, branchIds);

    return branchIds.map((branchId) => {
      const branch = branchMap.get(branchId)!;
      return {
        branchId: branch.id,
        businessId: branch.businessId,
        code: branch.code,
        isActive: branch.isActive,
        name: branch.name
      };
    });
  }
});

const ensureTenantUser = async (
  repository: AuthRepository,
  userId: string,
  tenantId: string
) => {
  const user = await repository.findUserById(userId);

  if (!user || user.tenantId !== tenantId) {
    throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'User not found');
  }
};
