import type { ReceiptPrinterProfile } from '@smart-pos/printer';

export type ClientSettingsUnitSummary = {
  code: string;
  id?: string;
  name: string;
  precision: number;
  symbol?: string;
};

export type ClientSettingsTaxProfileSummary = {
  code: string;
  id?: string;
  name: string;
  rateBasisPoints: number;
};

export type ClientBranchSettings = {
  address?: string;
  branchCode: string;
  branchId: string;
  branchName: string;
  receiptPrinterProfile?: ReceiptPrinterProfile;
};

export type ClientBusinessSettings = {
  branches: ClientBranchSettings[];
  businessCode: string;
  businessId: string;
  businessLogoUrl?: string;
  businessName: string;
  currencyCode: string;
  defaultTaxProfile?: ClientSettingsTaxProfileSummary;
  defaultTaxProfileId?: string;
  defaultTrackInventory: boolean;
  defaultUnit?: ClientSettingsUnitSummary;
  defaultUnitId?: string;
  invoicePrefix: string;
  receiptFooter?: string;
  timezone: string;
};

export const defaultClientBusinessSettings = {
  currencyCode: 'INR',
  defaultTrackInventory: true,
  invoicePrefix: 'INV',
  timezone: 'Asia/Kolkata'
} as const;

export interface SettingsRepository {
  findBusinessSettings(businessId: string): Promise<ClientBusinessSettings | null>;
  saveBusinessSettings(settings: ClientBusinessSettings): Promise<void>;
}

export const resolveClientBusinessSettings = (
  settings: ClientBusinessSettings | null | undefined,
  fallback: { businessId: string; businessName: string }
): ClientBusinessSettings => ({
  branches: settings?.branches ?? [],
  businessCode: settings?.businessCode ?? fallback.businessName.toUpperCase().replace(/[^A-Z0-9]+/g, '-'),
  businessId: settings?.businessId ?? fallback.businessId,
  businessLogoUrl: settings?.businessLogoUrl,
  businessName: settings?.businessName ?? fallback.businessName,
  currencyCode: settings?.currencyCode ?? defaultClientBusinessSettings.currencyCode,
  defaultTaxProfile: settings?.defaultTaxProfile,
  defaultTaxProfileId: settings?.defaultTaxProfileId,
  defaultTrackInventory:
    settings?.defaultTrackInventory ?? defaultClientBusinessSettings.defaultTrackInventory,
  defaultUnit: settings?.defaultUnit,
  defaultUnitId: settings?.defaultUnitId,
  invoicePrefix: settings?.invoicePrefix ?? defaultClientBusinessSettings.invoicePrefix,
  receiptFooter: settings?.receiptFooter,
  timezone: settings?.timezone ?? defaultClientBusinessSettings.timezone
});
