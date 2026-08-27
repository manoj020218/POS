import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleCatalogRepository } from '../src/modules/catalog/drizzle-catalog.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { buildProductSyncPullChangeKey } from '../src/modules/sync/sync-pull-cursor.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantA = '11111111-1111-4111-8111-111111111111';

describe('DrizzleCatalogRepository sync feed', () => {
  let businessA1: string;
  let businessA2: string;
  let close: () => Promise<void>;
  let repository: DrizzleCatalogRepository;

  beforeEach(async () => {
    const database = await createMemoryDatabase();
    const tenantRepository = new DrizzleTenantCoreRepository(database.db);

    close = database.close;
    repository = new DrizzleCatalogRepository(database.db);

    await tenantRepository.createTenant({ id: tenantA, name: 'Tenant A', slug: 'tenant-a' });
    businessA1 = (
      await tenantRepository.createBusiness({ code: 'STORE-A', name: 'Store A', tenantId: tenantA })
    ).id;
    businessA2 = (
      await tenantRepository.createBusiness({ code: 'STORE-B', name: 'Store B', tenantId: tenantA })
    ).id;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('lists updated products by business scope and pull cursor order', async () => {
    const firstMasters = await createMasterSet(repository, businessA1);
    const secondMasters = await createMasterSet(repository, businessA2);
    const first = await repository.createProduct({
      businessId: businessA1,
      categoryId: firstMasters.categoryId,
      isActive: true,
      lowStockLevel: 0,
      name: 'Sync Water',
      openingStock: 0,
      sellingPrice: 1000,
      sku: 'SYNC-WATER',
      taxProfileId: firstMasters.taxProfileId,
      tenantId: tenantA,
      trackInventory: true,
      unitId: firstMasters.unitId
    });
    const second = await repository.createProduct({
      businessId: businessA1,
      categoryId: firstMasters.categoryId,
      isActive: true,
      lowStockLevel: 0,
      name: 'Sync Juice',
      openingStock: 0,
      sellingPrice: 2000,
      sku: 'SYNC-JUICE',
      taxProfileId: firstMasters.taxProfileId,
      tenantId: tenantA,
      trackInventory: true,
      unitId: firstMasters.unitId
    });

    await repository.createProduct({
      businessId: businessA2,
      categoryId: secondMasters.categoryId,
      isActive: true,
      lowStockLevel: 0,
      name: 'Other Business Product',
      openingStock: 0,
      sellingPrice: 3000,
      sku: 'OTHER-1',
      taxProfileId: secondMasters.taxProfileId,
      tenantId: tenantA,
      trackInventory: true,
      unitId: secondMasters.unitId
    });
    await repository.updateProduct(first.id, tenantA, { sellingPrice: 1200 });

    const firstPage = await repository.listProductsUpdatedSince(tenantA, [businessA1], { limit: 1 });
    const secondPage = await repository.listProductsUpdatedSince(tenantA, [businessA1], {
      cursor: {
        changeKey: buildProductSyncPullChangeKey(firstPage[0]!.id),
        updatedAt: firstPage[0]!.updatedAt
      },
      limit: 10
    });

    expect(firstPage.map((product) => product.id)).toEqual([second.id]);
    expect(secondPage).toHaveLength(1);
    expect(secondPage[0]).toMatchObject({ id: first.id, sellingPrice: 1200 });
  });
});

const createMasterSet = async (repository: DrizzleCatalogRepository, businessId: string) => {
  const category = await repository.createCategory({
    businessId,
    code: 'GENERAL',
    isActive: true,
    name: 'General',
    tenantId: tenantA
  });
  const unit = await repository.createUnit({
    businessId,
    code: 'PCS',
    isActive: true,
    name: 'Pieces',
    precision: 0,
    symbol: 'pcs',
    tenantId: tenantA
  });
  const taxProfile = await repository.createTaxProfile({
    businessId,
    code: 'GST-0',
    isActive: true,
    name: 'No Tax',
    rateBasisPoints: 0,
    tenantId: tenantA
  });

  return { categoryId: category.id, taxProfileId: taxProfile.id, unitId: unit.id };
};
