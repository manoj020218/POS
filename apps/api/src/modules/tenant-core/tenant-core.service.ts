import type { AccessContext } from './access-context.js';
import type { TenantCoreRepository } from './tenant-core.repository.js';
import type {
  CreateBranchInput,
  CreateBusinessInput,
  RegisterTerminalInput,
  UpdateBranchInput,
  UpdateBusinessInput
} from './tenant-core.types.js';

export const createTenantCoreService = (repository: TenantCoreRepository) => ({
  createBranch: (context: AccessContext, input: Omit<CreateBranchInput, 'tenantId'>) =>
    repository.createBranch({ ...input, tenantId: context.tenantId }),
  createBusiness: (context: AccessContext, input: Omit<CreateBusinessInput, 'tenantId'>) =>
    repository.createBusiness({ ...input, tenantId: context.tenantId }),
  disableTerminal: (context: AccessContext, terminalId: string) =>
    repository.disableTerminal(context.tenantId, terminalId),
  listBranches: (context: AccessContext, businessId?: string) =>
    repository.listBranches(context.tenantId, businessId),
  listBusinesses: (context: AccessContext) => repository.listBusinesses(context.tenantId),
  listTerminals: (context: AccessContext, branchId?: string) =>
    repository.listTerminals(context.tenantId, branchId),
  registerTerminal: (context: AccessContext, input: Omit<RegisterTerminalInput, 'tenantId'>) =>
    repository.registerTerminal({ ...input, tenantId: context.tenantId }),
  updateBranch: (context: AccessContext, branchId: string, input: UpdateBranchInput) =>
    repository.updateBranch(context.tenantId, branchId, input),
  updateBusiness: (context: AccessContext, businessId: string, input: UpdateBusinessInput) =>
    repository.updateBusiness(context.tenantId, businessId, input)
});

export type TenantCoreService = ReturnType<typeof createTenantCoreService>;
