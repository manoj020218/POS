import { randomUUID } from 'node:crypto';

import { and, eq, inArray } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import {
  branchSettings,
  businessSettings
} from '../../db/schema/index.js';
import type { SettingsRepository } from './settings.repository.js';
import type {
  BranchSettingsRecord,
  BusinessSettingsRecord,
  SaveBranchSettingsInput,
  SaveBusinessSettingsInput
} from './settings.types.js';

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly db: AppDatabase) {}

  async findBranchSettingsByBranchId(tenantId: string, branchId: string) {
    const [record] = await this.db
      .select()
      .from(branchSettings)
      .where(and(eq(branchSettings.tenantId, tenantId), eq(branchSettings.branchId, branchId)))
      .limit(1);

    return record ? normalizeBranchSettings(record) : null;
  }

  async findBusinessSettingsByBusinessId(tenantId: string, businessId: string) {
    const [record] = await this.db
      .select()
      .from(businessSettings)
      .where(and(eq(businessSettings.tenantId, tenantId), eq(businessSettings.businessId, businessId)))
      .limit(1);

    return record ? normalizeBusinessSettings(record) : null;
  }

  async listBranchSettings(tenantId: string, branchIds: string[]) {
    if (branchIds.length === 0) return [];
    const records = await this.db
      .select()
      .from(branchSettings)
      .where(and(eq(branchSettings.tenantId, tenantId), inArray(branchSettings.branchId, branchIds)));

    return records.map(normalizeBranchSettings);
  }

  async listBusinessSettings(tenantId: string, businessIds: string[]) {
    if (businessIds.length === 0) return [];
    const records = await this.db
      .select()
      .from(businessSettings)
      .where(
        and(eq(businessSettings.tenantId, tenantId), inArray(businessSettings.businessId, businessIds))
      );

    return records.map(normalizeBusinessSettings);
  }

  async upsertBranchSettings(input: SaveBranchSettingsInput) {
    const [record] = await this.db
      .insert(branchSettings)
      .values({ id: randomUUID(), ...input })
      .onConflictDoUpdate({
        set: {
          receiptPrinterProfile: input.receiptPrinterProfile,
          tenantId: input.tenantId,
          updatedAt: new Date()
        },
        target: branchSettings.branchId
      })
      .returning();

    return normalizeBranchSettings(requireRow(record, 'Branch settings row missing after upsert'));
  }

  async upsertBusinessSettings(input: SaveBusinessSettingsInput) {
    const [record] = await this.db
      .insert(businessSettings)
      .values({ id: randomUUID(), ...input })
      .onConflictDoUpdate({
        set: {
          businessLogoUrl: input.businessLogoUrl,
          currencyCode: input.currencyCode,
          defaultTaxProfileId: input.defaultTaxProfileId,
          defaultTrackInventory: input.defaultTrackInventory,
          defaultUnitId: input.defaultUnitId,
          invoicePrefix: input.invoicePrefix,
          receiptFooter: input.receiptFooter,
          tenantId: input.tenantId,
          timezone: input.timezone,
          updatedAt: new Date()
        },
        target: businessSettings.businessId
      })
      .returning();

    return normalizeBusinessSettings(requireRow(record, 'Business settings row missing after upsert'));
  }
}

const normalizeBranchSettings = (
  record: typeof branchSettings.$inferSelect
): BranchSettingsRecord => ({
  branchId: record.branchId,
  createdAt: record.createdAt,
  receiptPrinterProfile: record.receiptPrinterProfile ?? undefined,
  tenantId: record.tenantId,
  updatedAt: record.updatedAt
});

const normalizeBusinessSettings = (
  record: typeof businessSettings.$inferSelect
): BusinessSettingsRecord => ({
  businessId: record.businessId,
  businessLogoUrl: record.businessLogoUrl ?? undefined,
  createdAt: record.createdAt,
  currencyCode: record.currencyCode,
  defaultTaxProfileId: record.defaultTaxProfileId ?? undefined,
  defaultTrackInventory: record.defaultTrackInventory,
  defaultUnitId: record.defaultUnitId ?? undefined,
  invoicePrefix: record.invoicePrefix,
  receiptFooter: record.receiptFooter ?? undefined,
  tenantId: record.tenantId,
  timezone: record.timezone,
  updatedAt: record.updatedAt
});

const requireRow = <T>(record: T | undefined, message: string): T => {
  if (!record) {
    throw new Error(message);
  }

  return record;
};
