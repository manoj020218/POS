import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleCatalogRepository } from '../src/modules/catalog/drizzle-catalog.repository.js';
import { DrizzleSettingsRepository } from '../src/modules/settings/drizzle-settings.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

describe('DrizzleSettingsRepository', () => {
  let close: () => Promise<void>;
  let repository: DrizzleSettingsRepository;
  let businessId: string;
  let branchId: string;
  let tenantId: string;

  afterEach(async () => {
    await close();
  });

  beforeEach(async () => {
    const database = await createMemoryDatabase();
    close = database.close;
    const tenantRepository = new DrizzleTenantCoreRepository(database.db);
    const catalogRepository = new DrizzleCatalogRepository(database.db);
    repository = new DrizzleSettingsRepository(database.db);
    tenantId = '11111111-1111-4111-8111-111111111111';
    await tenantRepository.createTenant({ id: tenantId, name: 'Tenant A', slug: 'tenant-a' });
    const business = await tenantRepository.createBusiness({
      code: 'STORE-A',
      name: 'Store A',
      tenantId
    });
    businessId = business.id;
    branchId = (
      await tenantRepository.createBranch({
        address: 'Main Road',
        businessId,
        code: 'BR-A1',
        name: 'Main Branch',
        tenantId
      })
    ).id;
    const unit = await catalogRepository.createUnit({
      businessId,
      code: 'BOX',
      isActive: true,
      name: 'Box',
      precision: 0,
      tenantId
    });
    const taxProfile = await catalogRepository.createTaxProfile({
      businessId,
      code: 'GST-5',
      isActive: true,
      name: 'GST 5',
      rateBasisPoints: 500,
      tenantId
    });

    await repository.upsertBusinessSettings({
      businessId,
      businessLogoUrl: 'https://example.com/logo.png',
      currencyCode: 'USD',
      defaultTaxProfileId: taxProfile.id,
      defaultTrackInventory: false,
      defaultUnitId: unit.id,
      invoicePrefix: 'BILL',
      receiptFooter: 'Visit again',
      tenantId,
      timezone: 'America/New_York'
    });
    await repository.upsertBranchSettings({
      branchId,
      receiptPrinterProfile: {
        connectionType: 'TCP',
        name: 'Counter Printer',
        paperWidth: '80mm',
        port: 9100,
        target: '192.168.1.55'
      },
      tenantId
    });
  }, 15000);

  it('persists and lists business and branch settings', async () => {
    const businessSettings = await repository.findBusinessSettingsByBusinessId(tenantId, businessId);
    const branchSettings = await repository.findBranchSettingsByBranchId(tenantId, branchId);
    const listedBusinessSettings = await repository.listBusinessSettings(tenantId, [businessId]);
    const listedBranchSettings = await repository.listBranchSettings(tenantId, [branchId]);

    expect(businessSettings).toMatchObject({
      businessId,
      businessLogoUrl: 'https://example.com/logo.png',
      currencyCode: 'USD',
      defaultTrackInventory: false,
      invoicePrefix: 'BILL',
      receiptFooter: 'Visit again',
      timezone: 'America/New_York'
    });
    expect(branchSettings).toMatchObject({
      branchId,
      receiptPrinterProfile: expect.objectContaining({
        connectionType: 'TCP',
        name: 'Counter Printer',
        paperWidth: '80mm'
      })
    });
    expect(listedBusinessSettings).toHaveLength(1);
    expect(listedBranchSettings).toHaveLength(1);
  });
});
