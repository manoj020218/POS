import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { TaxProfileRecord, UnitRecord } from '../catalog/catalog.types.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { BusinessRecord } from '../tenant-core/tenant-core.types.js';
import {
  fallbackSettingsTaxProfile,
  fallbackSettingsUnit,
  resolveEffectiveBusinessSettings
} from './settings-defaults.js';
import type { SettingsRepository } from './settings.repository.js';
import type { BusinessSettingsView } from './settings.types.js';
import { toBranchSettingsView, toBusinessSettingsView } from './settings-view.js';

export const loadBusinessSettingsView = async (
  repository: SettingsRepository,
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository,
  tenantId: string,
  business: BusinessRecord
): Promise<BusinessSettingsView> => {
  const [branchRecords, businessSettings] = await Promise.all([
    tenantCoreRepository.listBranches(tenantId, business.id),
    repository.findBusinessSettingsByBusinessId(tenantId, business.id)
  ]);
  const [branchSettings, defaultTaxProfile, defaultUnit] = await Promise.all([
    repository.listBranchSettings(
      tenantId,
      branchRecords.map((branch) => branch.id)
    ),
    resolveSettingsTaxProfile(catalogRepository, business.id, businessSettings?.defaultTaxProfileId),
    resolveSettingsUnit(catalogRepository, business.id, businessSettings?.defaultUnitId)
  ]);
  const effective = resolveEffectiveBusinessSettings(businessSettings);
  const branchSettingsMap = new Map(
    branchSettings.map((settings) => [settings.branchId, settings] as const)
  );

  return toBusinessSettingsView({
    branches: branchRecords.map((branch) =>
      toBranchSettingsView(branch, branchSettingsMap.get(branch.id))
    ),
    business,
    businessLogoUrl: effective.businessLogoUrl,
    currencyCode: effective.currencyCode,
    defaultTaxProfile,
    defaultTaxProfileId: effective.defaultTaxProfileId,
    defaultTrackInventory: effective.defaultTrackInventory,
    defaultUnit,
    defaultUnitId: effective.defaultUnitId,
    invoicePrefix: effective.invoicePrefix,
    receiptFooter: effective.receiptFooter,
    timezone: effective.timezone
  });
};

export const isBusinessOwnedRecord = <T extends { businessId: string }>(
  record: T | null,
  businessId: string
): record is T => Boolean(record && record.businessId === businessId);

const resolveSettingsTaxProfile = async (
  catalogRepository: CatalogRepository,
  businessId: string,
  taxProfileId?: string
) => {
  if (!taxProfileId) return fallbackSettingsTaxProfile;
  const taxProfile = await catalogRepository.findTaxProfileById(taxProfileId);
  return isBusinessOwnedRecord(taxProfile, businessId)
    ? toTaxProfileSummary(taxProfile)
    : fallbackSettingsTaxProfile;
};

const resolveSettingsUnit = async (
  catalogRepository: CatalogRepository,
  businessId: string,
  unitId?: string
) => {
  if (!unitId) return fallbackSettingsUnit;
  const unit = await catalogRepository.findUnitById(unitId);
  return isBusinessOwnedRecord(unit, businessId) ? toUnitSummary(unit) : fallbackSettingsUnit;
};

const toTaxProfileSummary = (record: TaxProfileRecord) => ({
  code: record.code,
  id: record.id,
  name: record.name,
  rateBasisPoints: record.rateBasisPoints
});

const toUnitSummary = (record: UnitRecord) => ({
  code: record.code,
  id: record.id,
  name: record.name,
  precision: record.precision,
  symbol: record.symbol
});
