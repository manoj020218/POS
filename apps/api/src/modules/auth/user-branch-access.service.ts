import { createHttpError } from '../../lib/http-error.js';
import type { BusinessRecord, BranchRecord } from '../tenant-core/tenant-core.types.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { AuthRepository } from './auth.repository.js';
import type { createAuthAuditLogger } from './auth-audit.service.js';
import type {
  AuthUserBranchAccessView,
  AuthUserBranchAssignmentFilter
} from './auth.types.js';

type ManageUserBranchAccessInput = {
  actorUserId: string;
  branchIds: string[];
  tenantId: string;
  userId: string;
};

type ListUserBranchAccessInput = Pick<AccessContext, 'tenantId'> & {
  assignment: AuthUserBranchAssignmentFilter;
  businessId?: string;
  search?: string;
  userId: string;
};

export const createUserBranchAccessHandlers = (
  repository: AuthRepository,
  tenantCoreRepository: TenantCoreRepository,
  auditLogger: ReturnType<typeof createAuthAuditLogger>
) => ({
  listUserBranchAccess: async (
    input: ListUserBranchAccessInput
  ): Promise<AuthUserBranchAccessView[]> => {
    await ensureTenantUser(repository, input.userId, input.tenantId);
    const [branchAccess, branches, businesses] = await Promise.all([
      repository.listBranchAccessForUser(input.userId, input.tenantId),
      tenantCoreRepository.listBranches(input.tenantId, input.businessId),
      tenantCoreRepository.listBusinesses(input.tenantId)
    ]);
    const assignedBranchIds = new Set(branchAccess.map((record) => record.branchId));
    const businessMap = new Map(businesses.map((business) => [business.id, business]));
    const normalizedSearch = input.search?.trim().toLowerCase();

    return branches
      .map((branch) =>
        toBranchAccessView(branch, businessMap.get(branch.businessId)!, assignedBranchIds.has(branch.id))
      )
      .filter((branch) => matchesAssignment(branch.assigned, input.assignment))
      .filter((branch) => matchesSearch(branch, normalizedSearch));
  },
  replaceUserBranchAccess: async (
    input: ManageUserBranchAccessInput
  ): Promise<AuthUserBranchAccessView[]> => {
    await ensureTenantUser(repository, input.userId, input.tenantId);
    const previousBranchIds = sortIds(
      (await repository.listBranchAccessForUser(input.userId, input.tenantId)).map(
        (record) => record.branchId
      )
    );
    const [tenantBranches, businesses] = await Promise.all([
      tenantCoreRepository.listBranches(input.tenantId),
      tenantCoreRepository.listBusinesses(input.tenantId)
    ]);
    const branchMap = new Map(tenantBranches.map((branch) => [branch.id, branch]));
    const businessMap = new Map(businesses.map((business) => [business.id, business]));
    const branchIds = [...new Set(input.branchIds)];

    for (const branchId of branchIds) {
      if (!branchMap.has(branchId)) {
        throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
      }
    }

    if (!hasSameBranchIds(previousBranchIds, branchIds)) {
      await repository.replaceBranchAccessForUser(input.userId, input.tenantId, branchIds);
      await auditLogger.recordUserBranchAccessReplaced({
        actorUserId: input.actorUserId,
        nextBranchIds: branchIds,
        previousBranchIds,
        tenantId: input.tenantId,
        userId: input.userId
      });
    }

    return branchIds.map((branchId) =>
      toBranchAccessView(branchMap.get(branchId)!, businessMap.get(branchMap.get(branchId)!.businessId)!, true)
    );
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

const hasSameBranchIds = (left: string[], right: string[]) => {
  const normalizedLeft = sortIds(left);
  const normalizedRight = sortIds(right);

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((branchId, index) => branchId === normalizedRight[index])
  );
};

const matchesAssignment = (
  assigned: boolean,
  filter: AuthUserBranchAssignmentFilter
) => {
  return filter === 'all' || (filter === 'assigned' ? assigned : !assigned);
};

const matchesSearch = (
  branch: AuthUserBranchAccessView,
  search: string | undefined
) => {
  if (!search) {
    return true;
  }

  return [branch.businessCode, branch.businessName, branch.code, branch.name].some((value) =>
    value.toLowerCase().includes(search)
  );
};

const sortIds = (ids: string[]) => [...new Set(ids)].sort();

const toBranchAccessView = (
  branch: BranchRecord,
  business: BusinessRecord,
  assigned: boolean
): AuthUserBranchAccessView => ({
  assigned,
  branchId: branch.id,
  businessCode: business.code,
  businessId: business.id,
  businessName: business.name,
  code: branch.code,
  isActive: branch.isActive,
  name: branch.name
});
