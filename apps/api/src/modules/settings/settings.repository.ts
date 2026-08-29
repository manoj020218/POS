import type {
  BranchSettingsRecord,
  BusinessSettingsRecord,
  SaveBranchSettingsInput,
  SaveBusinessSettingsInput
} from './settings.types.js';

export interface SettingsRepository {
  findBranchSettingsByBranchId(
    tenantId: string,
    branchId: string
  ): Promise<BranchSettingsRecord | null>;
  findBusinessSettingsByBusinessId(
    tenantId: string,
    businessId: string
  ): Promise<BusinessSettingsRecord | null>;
  listBranchSettings(tenantId: string, branchIds: string[]): Promise<BranchSettingsRecord[]>;
  listBusinessSettings(
    tenantId: string,
    businessIds: string[]
  ): Promise<BusinessSettingsRecord[]>;
  upsertBranchSettings(input: SaveBranchSettingsInput): Promise<BranchSettingsRecord>;
  upsertBusinessSettings(input: SaveBusinessSettingsInput): Promise<BusinessSettingsRecord>;
}
