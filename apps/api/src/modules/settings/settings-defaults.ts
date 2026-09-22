import {
  defaultTaxProfileDefinition,
  defaultUnitDefinition
} from '../catalog/catalog-defaults.js';
import type {
  BusinessSettingsRecord,
  SettingsTaxProfileSummary,
  SettingsUnitSummary
} from './settings.types.js';

export const defaultBusinessSettings = {
  businessType: 'GENERAL',
  currencyCode: 'INR',
  defaultTrackInventory: true,
  invoicePrefix: 'INV',
  timezone: 'Asia/Kolkata'
} as const;

export const fallbackSettingsTaxProfile: SettingsTaxProfileSummary = {
  code: defaultTaxProfileDefinition.code,
  name: defaultTaxProfileDefinition.name,
  rateBasisPoints: defaultTaxProfileDefinition.rateBasisPoints
};

export const fallbackSettingsUnit: SettingsUnitSummary = {
  code: defaultUnitDefinition.code,
  name: defaultUnitDefinition.name,
  precision: defaultUnitDefinition.precision,
  symbol: defaultUnitDefinition.symbol
};

export const resolveEffectiveBusinessSettings = (
  settings?: BusinessSettingsRecord | null
) => ({
  businessLogoUrl: settings?.businessLogoUrl,
  businessType: settings?.businessType ?? defaultBusinessSettings.businessType,
  currencyCode: settings?.currencyCode ?? defaultBusinessSettings.currencyCode,
  defaultTaxProfileId: settings?.defaultTaxProfileId,
  defaultTrackInventory:
    settings?.defaultTrackInventory ?? defaultBusinessSettings.defaultTrackInventory,
  defaultUnitId: settings?.defaultUnitId,
  gstin: settings?.gstin,
  invoicePrefix: settings?.invoicePrefix ?? defaultBusinessSettings.invoicePrefix,
  receiptFooter: settings?.receiptFooter,
  timezone: settings?.timezone ?? defaultBusinessSettings.timezone
});
