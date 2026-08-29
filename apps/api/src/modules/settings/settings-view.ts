import type { BranchRecord, BusinessRecord } from '../tenant-core/tenant-core.types.js';
import type {
  BranchSettingsRecord,
  BranchSettingsView,
  BusinessSettingsView,
  SettingsTaxProfileSummary,
  SettingsUnitSummary
} from './settings.types.js';

export const toBranchSettingsView = (
  branch: BranchRecord,
  settings?: BranchSettingsRecord
): BranchSettingsView => ({
  address: branch.address,
  branchCode: branch.code,
  branchId: branch.id,
  branchName: branch.name,
  receiptPrinterProfile: settings?.receiptPrinterProfile
});

export const toBusinessSettingsView = (input: {
  branches: BranchSettingsView[];
  business: BusinessRecord;
  businessLogoUrl?: string;
  currencyCode: string;
  defaultTaxProfile?: SettingsTaxProfileSummary;
  defaultTaxProfileId?: string;
  defaultTrackInventory: boolean;
  defaultUnit?: SettingsUnitSummary;
  defaultUnitId?: string;
  invoicePrefix: string;
  receiptFooter?: string;
  timezone: string;
}): BusinessSettingsView => ({
  branches: input.branches,
  businessCode: input.business.code,
  businessId: input.business.id,
  businessLogoUrl: input.businessLogoUrl,
  businessName: input.business.name,
  currencyCode: input.currencyCode,
  defaultTaxProfile: input.defaultTaxProfile,
  defaultTaxProfileId: input.defaultTaxProfileId,
  defaultTrackInventory: input.defaultTrackInventory,
  defaultUnit: input.defaultUnit,
  defaultUnitId: input.defaultUnitId,
  invoicePrefix: input.invoicePrefix,
  receiptFooter: input.receiptFooter,
  timezone: input.timezone
});
