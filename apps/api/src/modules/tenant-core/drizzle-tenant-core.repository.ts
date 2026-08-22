import { randomUUID } from 'node:crypto';

import { and, asc, eq } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { branches, businesses, terminals, tenants } from '../../db/schema/index.js';
import { createHttpError } from '../../lib/http-error.js';
import {
  isDuplicateCodeError,
  normalizeBranch,
  normalizeTerminal,
  requireRow
} from './drizzle-tenant-core.repository.utils.js';
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

export class DrizzleTenantCoreRepository implements TenantCoreRepository {
  constructor(private readonly db: AppDatabase) {}

  async createTenant(input: CreateTenantInput): Promise<TenantRecord> {
    const [tenant] = await this.db.insert(tenants).values(input).returning();
    return requireRow(tenant, 'TENANT_NOT_FOUND', 'Tenant not found');
  }

  async createBusiness(input: CreateBusinessInput): Promise<BusinessRecord> {
    await this.ensureTenant(input.tenantId);
    const values: typeof businesses.$inferInsert = { id: randomUUID(), ...input };

    try {
      const [business] = await this.db.insert(businesses).values(values).returning();
      return requireRow(business, 'BUSINESS_NOT_FOUND', 'Business not found');
    } catch (error) {
      this.rethrowDuplicateCode(error, input.code);
      throw error;
    }
  }

  async listBusinesses(tenantId: string): Promise<BusinessRecord[]> {
    await this.ensureTenant(tenantId);
    return this.db.select().from(businesses).where(eq(businesses.tenantId, tenantId)).orderBy(asc(businesses.createdAt));
  }

  async updateBusiness(
    tenantId: string,
    businessId: string,
    input: UpdateBusinessInput
  ): Promise<BusinessRecord> {
    await this.ensureBusiness(tenantId, businessId);

    try {
      const [business] = await this.db
        .update(businesses)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(businesses.id, businessId), eq(businesses.tenantId, tenantId)))
        .returning();

      return requireRow(business, 'BUSINESS_NOT_FOUND', 'Business not found');
    } catch (error) {
      this.rethrowDuplicateCode(error, input.code);
      throw error;
    }
  }

  async createBranch(input: CreateBranchInput): Promise<BranchRecord> {
    await this.ensureBusiness(input.tenantId, input.businessId);
    const values: typeof branches.$inferInsert = { id: randomUUID(), ...input };

    try {
      const [branch] = await this.db.insert(branches).values(values).returning();
      return normalizeBranch(requireRow(branch, 'BRANCH_NOT_FOUND', 'Branch not found'));
    } catch (error) {
      this.rethrowDuplicateCode(error, input.code);
      throw error;
    }
  }

  async listBranches(tenantId: string, businessId?: string): Promise<BranchRecord[]> {
    const whereClause = businessId
      ? and(eq(branches.tenantId, tenantId), eq(branches.businessId, businessId))
      : eq(branches.tenantId, tenantId);
    const rows = await this.db.select().from(branches).where(whereClause).orderBy(asc(branches.createdAt));
    return rows.map((row) => normalizeBranch(row));
  }

  async updateBranch(
    tenantId: string,
    branchId: string,
    input: UpdateBranchInput
  ): Promise<BranchRecord> {
    await this.ensureBranch(tenantId, branchId);

    try {
      const [branch] = await this.db
        .update(branches)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)))
        .returning();

      return normalizeBranch(requireRow(branch, 'BRANCH_NOT_FOUND', 'Branch not found'));
    } catch (error) {
      this.rethrowDuplicateCode(error, input.code);
      throw error;
    }
  }

  async registerTerminal(input: RegisterTerminalInput): Promise<TerminalRecord> {
    await this.ensureBranch(input.tenantId, input.branchId);
    const values: typeof terminals.$inferInsert = { id: randomUUID(), ...input };

    try {
      const [terminal] = await this.db.insert(terminals).values(values).returning();
      return normalizeTerminal(requireRow(terminal, 'TERMINAL_NOT_FOUND', 'Terminal not found'));
    } catch (error) {
      this.rethrowDuplicateCode(error, input.code);
      throw error;
    }
  }

  async listTerminals(tenantId: string, branchId?: string): Promise<TerminalRecord[]> {
    const whereClause = branchId
      ? and(eq(terminals.tenantId, tenantId), eq(terminals.branchId, branchId))
      : eq(terminals.tenantId, tenantId);
    const rows = await this.db.select().from(terminals).where(whereClause).orderBy(asc(terminals.createdAt));
    return rows.map((row) => normalizeTerminal(row));
  }

  async disableTerminal(tenantId: string, terminalId: string): Promise<TerminalRecord> {
    await this.ensureTerminal(tenantId, terminalId);
    const [terminal] = await this.db
      .update(terminals)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(terminals.id, terminalId), eq(terminals.tenantId, tenantId)))
      .returning();

    return normalizeTerminal(requireRow(terminal, 'TERMINAL_NOT_FOUND', 'Terminal not found'));
  }

  private async ensureBranch(tenantId: string, branchId: string) {
    const [branch] = await this.db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.tenantId, tenantId))).limit(1);
    if (!branch) throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    return branch;
  }

  private async ensureBusiness(tenantId: string, businessId: string) {
    const [business] = await this.db.select().from(businesses).where(and(eq(businesses.id, businessId), eq(businesses.tenantId, tenantId))).limit(1);
    if (!business) throw createHttpError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
    return business;
  }

  private async ensureTenant(tenantId: string) {
    const [tenant] = await this.db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant || !tenant.isActive) throw createHttpError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
    return tenant;
  }

  private async ensureTerminal(tenantId: string, terminalId: string) {
    const [terminal] = await this.db.select().from(terminals).where(and(eq(terminals.id, terminalId), eq(terminals.tenantId, tenantId))).limit(1);
    if (!terminal) throw createHttpError(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
    return terminal;
  }

  private normalizeBranch(branch: typeof branches.$inferSelect): BranchRecord {
    return { ...branch, address: branch.address ?? undefined };
  }

  private normalizeTerminal(terminal: typeof terminals.$inferSelect): TerminalRecord {
    return {
      ...terminal,
      deviceInstallationId: terminal.deviceInstallationId ?? undefined,
      lastSeenAt: terminal.lastSeenAt ?? undefined
    };
  }

  private requireRow<T>(row: T | undefined, code: string, message: string): T {
    if (!row) throw createHttpError(404, code, message);
    return row;
  }

  private rethrowDuplicateCode(error: unknown, code?: string) {
    if (isDuplicateCodeError(error) && code) {
      throw createHttpError(409, 'DUPLICATE_CODE', `Code ${code} already exists`);
    }
  }
}
