import { randomUUID } from 'node:crypto';

import { createHttpError } from '../../lib/http-error.js';
import type { TenantCoreRepository } from './tenant-core.repository.js';
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

export class InMemoryTenantCoreRepository implements TenantCoreRepository {
  private readonly branches = new Map<string, BranchRecord>();
  private readonly businesses = new Map<string, BusinessRecord>();
  private readonly tenants = new Map<string, TenantRecord>();
  private readonly terminals = new Map<string, TerminalRecord>();

  async createTenant(input: CreateTenantInput): Promise<TenantRecord> {
    const timestamp = new Date();
    const tenant: TenantRecord = { ...input, createdAt: timestamp, isActive: true, updatedAt: timestamp };
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  async createBusiness(input: CreateBusinessInput): Promise<BusinessRecord> {
    this.requireTenant(input.tenantId);
    this.assertUniqueCode(this.businesses.values(), input.tenantId, input.code);
    return this.storeBusiness({ ...input, createdAt: new Date(), id: randomUUID(), updatedAt: new Date() });
  }

  async listBusinesses(tenantId: string): Promise<BusinessRecord[]> {
    this.requireTenant(tenantId);
    return [...this.businesses.values()].filter((item) => item.tenantId === tenantId);
  }

  async updateBusiness(tenantId: string, businessId: string, input: UpdateBusinessInput) {
    const business = this.requireBusiness(tenantId, businessId);
    this.assertUniqueCode(this.businesses.values(), tenantId, input.code, businessId);
    return this.storeBusiness({ ...business, ...input, updatedAt: new Date() });
  }

  async createBranch(input: CreateBranchInput): Promise<BranchRecord> {
    this.requireBusiness(input.tenantId, input.businessId);
    this.assertUniqueCode(this.branches.values(), input.tenantId, input.code);
    return this.storeBranch({
      ...input,
      createdAt: new Date(),
      id: randomUUID(),
      isActive: true,
      updatedAt: new Date()
    });
  }

  async listBranches(tenantId: string, businessId?: string): Promise<BranchRecord[]> {
    return [...this.branches.values()].filter((item) => {
      return item.tenantId === tenantId && (!businessId || item.businessId === businessId);
    });
  }

  async updateBranch(tenantId: string, branchId: string, input: UpdateBranchInput) {
    const branch = this.requireBranch(tenantId, branchId);
    this.assertUniqueCode(this.branches.values(), tenantId, input.code, branchId);
    return this.storeBranch({ ...branch, ...input, updatedAt: new Date() });
  }

  async registerTerminal(input: RegisterTerminalInput): Promise<TerminalRecord> {
    this.requireBranch(input.tenantId, input.branchId);
    this.assertUniqueCode(this.terminals.values(), input.tenantId, input.code);
    return this.storeTerminal({
      ...input,
      createdAt: new Date(),
      id: randomUUID(),
      isActive: true,
      updatedAt: new Date()
    });
  }

  async listTerminals(tenantId: string, branchId?: string): Promise<TerminalRecord[]> {
    return [...this.terminals.values()].filter((item) => {
      return item.tenantId === tenantId && (!branchId || item.branchId === branchId);
    });
  }

  async disableTerminal(tenantId: string, terminalId: string): Promise<TerminalRecord> {
    const terminal = this.requireTerminal(tenantId, terminalId);
    return this.storeTerminal({ ...terminal, isActive: false, updatedAt: new Date() });
  }

  private assertUniqueCode(
    records: Iterable<{ code: string; id: string; tenantId: string }>,
    tenantId: string,
    code?: string,
    currentId?: string
  ) {
    if (!code) return;
    const exists = [...records].some((item) => item.tenantId === tenantId && item.code === code && item.id !== currentId);
    if (exists) throw createHttpError(409, 'DUPLICATE_CODE', `Code ${code} already exists`);
  }

  private requireBranch(tenantId: string, branchId: string) {
    const branch = this.branches.get(branchId);
    if (!branch || branch.tenantId !== tenantId) throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    return branch;
  }

  private requireBusiness(tenantId: string, businessId: string) {
    const business = this.businesses.get(businessId);
    if (!business || business.tenantId !== tenantId) throw createHttpError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
    return business;
  }

  private requireTenant(tenantId: string) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant || !tenant.isActive) throw createHttpError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
    return tenant;
  }

  private requireTerminal(tenantId: string, terminalId: string) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal || terminal.tenantId !== tenantId) throw createHttpError(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
    return terminal;
  }

  private storeBranch(branch: BranchRecord) {
    this.branches.set(branch.id, branch);
    return branch;
  }

  private storeBusiness(business: BusinessRecord) {
    this.businesses.set(business.id, business);
    return business;
  }

  private storeTerminal(terminal: TerminalRecord) {
    this.terminals.set(terminal.id, terminal);
    return terminal;
  }
}

export type { TenantCoreRepository } from './tenant-core.repository.js';
