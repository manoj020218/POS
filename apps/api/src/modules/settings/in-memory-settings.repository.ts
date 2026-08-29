import type { SettingsRepository } from './settings.repository.js';
import type {
  BranchSettingsRecord,
  BusinessSettingsRecord,
  SaveBranchSettingsInput,
  SaveBusinessSettingsInput
} from './settings.types.js';

export class InMemorySettingsRepository implements SettingsRepository {
  private readonly branchSettings = new Map<string, BranchSettingsRecord>();
  private readonly businessSettings = new Map<string, BusinessSettingsRecord>();

  async findBranchSettingsByBranchId(tenantId: string, branchId: string) {
    const record = this.branchSettings.get(branchId);
    return record?.tenantId === tenantId ? record : null;
  }

  async findBusinessSettingsByBusinessId(tenantId: string, businessId: string) {
    const record = this.businessSettings.get(businessId);
    return record?.tenantId === tenantId ? record : null;
  }

  async listBranchSettings(tenantId: string, branchIds: string[]) {
    const allowed = new Set(branchIds);
    return [...this.branchSettings.values()].filter(
      (record) => record.tenantId === tenantId && allowed.has(record.branchId)
    );
  }

  async listBusinessSettings(tenantId: string, businessIds: string[]) {
    const allowed = new Set(businessIds);
    return [...this.businessSettings.values()].filter(
      (record) => record.tenantId === tenantId && allowed.has(record.businessId)
    );
  }

  async upsertBranchSettings(input: SaveBranchSettingsInput) {
    const existing = this.branchSettings.get(input.branchId);
    const now = new Date();
    const record: BranchSettingsRecord = {
      branchId: input.branchId,
      createdAt: existing?.createdAt ?? now,
      receiptPrinterProfile: input.receiptPrinterProfile ?? undefined,
      tenantId: input.tenantId,
      updatedAt: now
    };

    this.branchSettings.set(input.branchId, record);
    return record;
  }

  async upsertBusinessSettings(input: SaveBusinessSettingsInput) {
    const existing = this.businessSettings.get(input.businessId);
    const now = new Date();
    const record: BusinessSettingsRecord = {
      businessId: input.businessId,
      businessLogoUrl: input.businessLogoUrl ?? undefined,
      createdAt: existing?.createdAt ?? now,
      currencyCode: input.currencyCode,
      defaultTaxProfileId: input.defaultTaxProfileId ?? undefined,
      defaultTrackInventory: input.defaultTrackInventory,
      defaultUnitId: input.defaultUnitId ?? undefined,
      invoicePrefix: input.invoicePrefix,
      receiptFooter: input.receiptFooter ?? undefined,
      tenantId: input.tenantId,
      timezone: input.timezone,
      updatedAt: now
    };

    this.businessSettings.set(input.businessId, record);
    return record;
  }
}
