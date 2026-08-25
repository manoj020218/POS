import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from './access-context.js';
import {
  assertAllBranchAccess,
  assertBranchAccess,
  assertBusinessAccess,
  filterByBranchId,
  filterBusinessesForBranchScope
} from './branch-scope.js';
import type { TenantCoreRepository } from './tenant-core.repository.js';
import type {
  CreateBranchInput,
  CreateBusinessInput,
  RegisterTerminalInput,
  UpdateBranchInput,
  UpdateBusinessInput
} from './tenant-core.types.js';

export const createTenantCoreService = (repository: TenantCoreRepository) => ({
  createBranch: (context: AccessContext, input: Omit<CreateBranchInput, 'tenantId'>) => {
    assertAllBranchAccess(context);
    return repository.createBranch({ ...input, tenantId: context.tenantId });
  },
  createBusiness: (context: AccessContext, input: Omit<CreateBusinessInput, 'tenantId'>) => {
    assertAllBranchAccess(context);
    return repository.createBusiness({ ...input, tenantId: context.tenantId });
  },
  disableTerminal: async (context: AccessContext, terminalId: string) => {
    const terminals = await repository.listTerminals(context.tenantId);
    const terminal = terminals.find((item) => item.id === terminalId);

    if (!terminal) {
      throw createHttpError(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
    }

    assertBranchAccess(context, terminal.branchId);
    return repository.disableTerminal(context.tenantId, terminalId);
  },
  listBranches: async (context: AccessContext, businessId?: string) => {
    const branches = await repository.listBranches(context.tenantId, businessId);
    return filterByBranchId(context, branches, (branch) => branch.id);
  },
  listBusinesses: async (context: AccessContext) => {
    const businesses = await repository.listBusinesses(context.tenantId);

    if (context.hasAllBranchAccess) {
      return businesses;
    }

    const branches = await repository.listBranches(context.tenantId);
    return filterBusinessesForBranchScope(context, businesses, branches);
  },
  listTerminals: async (context: AccessContext, branchId?: string) => {
    if (branchId) {
      assertBranchAccess(context, branchId);
    }

    const terminals = await repository.listTerminals(context.tenantId, branchId);
    return filterByBranchId(context, terminals, (terminal) => terminal.branchId);
  },
  registerTerminal: (context: AccessContext, input: Omit<RegisterTerminalInput, 'tenantId'>) => {
    assertBranchAccess(context, input.branchId);
    return repository.registerTerminal({ ...input, tenantId: context.tenantId });
  },
  updateBranch: (context: AccessContext, branchId: string, input: UpdateBranchInput) => {
    assertBranchAccess(context, branchId);
    return repository.updateBranch(context.tenantId, branchId, input);
  },
  updateBusiness: async (
    context: AccessContext,
    businessId: string,
    input: UpdateBusinessInput
  ) => {
    if (!context.hasAllBranchAccess) {
      const branches = await repository.listBranches(context.tenantId, businessId);
      assertBusinessAccess(context, businessId, branches);
    }

    return repository.updateBusiness(context.tenantId, businessId, input);
  }
});

export type TenantCoreService = ReturnType<typeof createTenantCoreService>;
