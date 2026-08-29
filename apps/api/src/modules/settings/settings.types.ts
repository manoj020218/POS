import type { ReceiptPrinterProfileDocument } from '../../db/schema/branch-setting.js';

export type ReceiptPrinterProfile = ReceiptPrinterProfileDocument;

export type BusinessSettingsRecord = {
  businessId: string;
  businessLogoUrl?: string;
  createdAt: Date;
  currencyCode: string;
  defaultTaxProfileId?: string;
  defaultTrackInventory: boolean;
  defaultUnitId?: string;
  invoicePrefix: string;
  receiptFooter?: string;
  tenantId: string;
  timezone: string;
  updatedAt: Date;
};

export type SaveBusinessSettingsInput = {
  businessId: string;
  businessLogoUrl: string | null;
  currencyCode: string;
  defaultTaxProfileId: string | null;
  defaultTrackInventory: boolean;
  defaultUnitId: string | null;
  invoicePrefix: string;
  receiptFooter: string | null;
  tenantId: string;
  timezone: string;
};

export type BranchSettingsRecord = {
  branchId: string;
  createdAt: Date;
  receiptPrinterProfile?: ReceiptPrinterProfile;
  tenantId: string;
  updatedAt: Date;
};

export type SaveBranchSettingsInput = {
  branchId: string;
  receiptPrinterProfile: ReceiptPrinterProfile | null;
  tenantId: string;
};

export type BusinessSettingsQuery = {
  businessId?: string;
};

export type BranchSettingsPatchInput = {
  address?: string;
  branchId: string;
  receiptPrinterProfile?: ReceiptPrinterProfile | null;
};

export type UpdateBusinessSettingsInput = {
  branches?: BranchSettingsPatchInput[];
  businessId?: string;
  businessLogoUrl?: string | null;
  currencyCode?: string;
  defaultTaxProfileId?: string | null;
  defaultTrackInventory?: boolean;
  defaultUnitId?: string | null;
  invoicePrefix?: string;
  receiptFooter?: string | null;
  timezone?: string;
};

export type SettingsUnitSummary = {
  code: string;
  id?: string;
  name: string;
  precision: number;
  symbol?: string;
};

export type SettingsTaxProfileSummary = {
  code: string;
  id?: string;
  name: string;
  rateBasisPoints: number;
};

export type BranchSettingsView = {
  address?: string;
  branchCode: string;
  branchId: string;
  branchName: string;
  receiptPrinterProfile?: ReceiptPrinterProfile;
};

export type BusinessSettingsView = {
  branches: BranchSettingsView[];
  businessCode: string;
  businessId: string;
  businessLogoUrl?: string;
  businessName: string;
  currencyCode: string;
  defaultTaxProfile?: SettingsTaxProfileSummary;
  defaultTaxProfileId?: string;
  defaultTrackInventory: boolean;
  defaultUnit?: SettingsUnitSummary;
  defaultUnitId?: string;
  invoicePrefix: string;
  receiptFooter?: string;
  timezone: string;
};
