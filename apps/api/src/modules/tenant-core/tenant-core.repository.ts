import type {
  BranchRecord,
  BusinessRecord,
  CreateBranchInput,
  CreateBusinessInput,
  CreateTenantInput,
  RegisterTerminalInput,
  TenantRecord,
  TerminalRecord,
  UpdateBranchInput,
  UpdateBusinessInput
} from './tenant-core.types.js';

export type TenantCoreRepository = {
  createBranch(input: CreateBranchInput): Promise<BranchRecord>;
  createBusiness(input: CreateBusinessInput): Promise<BusinessRecord>;
  createTenant(input: CreateTenantInput): Promise<TenantRecord>;
  disableTerminal(tenantId: string, terminalId: string): Promise<TerminalRecord>;
  listBranches(tenantId: string, businessId?: string): Promise<BranchRecord[]>;
  listBusinesses(tenantId: string): Promise<BusinessRecord[]>;
  listTerminals(tenantId: string, branchId?: string): Promise<TerminalRecord[]>;
  registerTerminal(input: RegisterTerminalInput): Promise<TerminalRecord>;
  updateBranch(
    tenantId: string,
    branchId: string,
    input: UpdateBranchInput
  ): Promise<BranchRecord>;
  updateBusiness(
    tenantId: string,
    businessId: string,
    input: UpdateBusinessInput
  ): Promise<BusinessRecord>;
};
