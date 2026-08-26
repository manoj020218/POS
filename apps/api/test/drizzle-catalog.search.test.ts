import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleCatalogRepository } from '../src/modules/catalog/drizzle-catalog.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('DrizzleCatalogRepository search', () => {
  let businessAId: string;
  let businessBId: string;
  let close: () => Promise<void>;
  let repository: DrizzleCatalogRepository;

  beforeEach(async () => {
    const database = await createMemoryDatabase();
    const tenantRepository = new DrizzleTenantCoreRepository(database.db);

    close = database.close;
    repository = new DrizzleCatalogRepository(database.db);

    await tenantRepository.createTenant({ id: tenantId, name: 'Tenant A', slug: 'tenant-a' });
    businessAId = (
      await tenantRepository.createBusiness({ code: 'STORE-A', name: 'Store A', tenantId })
    ).id;
    businessBId = (
      await tenantRepository.createBusiness({ code: 'STORE-B', name: 'Store B', tenantId })
    ).id;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('prioritizes exact barcode matches and excludes inactive products', async () => {
    const masterSet = await createMasterSet(repository, businessAId);
    await createProduct(repository, businessAId, masterSet, {
      barcode: '8900000000012',
      name: 'Barcode Cola',
      sku: 'BAR-890'
    });
    await createProduct(repository, businessAId, masterSet, {
      name: '8900000000012 Soda',
      sku: 'MATCH-890'
    });
    await createProduct(repository, businessAId, masterSet, {
      isActive: false,
      name: 'Inactive Cola',
      sku: 'COLA-OFF'
    });

    const barcodeResults = await repository.searchProducts(
      tenantId,
      [businessAId],
      '8900000000012',
      10
    );
    const nameResults = await repository.searchProducts(tenantId, [businessAId], 'cola', 10);

    expect(barcodeResults.map((product) => product.name)).toEqual(['Barcode Cola']);
    expect(nameResults.map((product) => product.name)).toEqual(['Barcode Cola']);
  });

  it('respects business scope and search limits', async () => {
    const masterSetA = await createMasterSet(repository, businessAId);
    const masterSetB = await createMasterSet(repository, businessBId);

    await createProduct(repository, businessAId, masterSetA, {
      name: 'Water Alpha',
      sku: 'WATER-A'
    });
    await createProduct(repository, businessAId, masterSetA, {
      name: 'Water Beta',
      sku: 'WATER-B'
    });
    await createProduct(repository, businessBId, masterSetB, {
      name: 'Water Bravo',
      sku: 'WATER-C'
    });

    const scoped = await repository.searchProducts(tenantId, [businessBId], 'water', 10);
    const limited = await repository.searchProducts(tenantId, [businessAId], 'water', 1);

    expect(scoped.map((product) => product.businessId)).toEqual([businessBId]);
    expect(limited).toHaveLength(1);
    expect(limited[0]?.businessId).toBe(businessAId);
  });
});

const createMasterSet = async (repository: DrizzleCatalogRepository, businessId: string) => {
  const category = await repository.createCategory({
    businessId,
    code: 'GENERAL',
    isActive: true,
    name: 'General',
    tenantId
  });
  const unit = await repository.createUnit({
    businessId,
    code: 'PCS',
    isActive: true,
    name: 'Pieces',
    precision: 0,
    symbol: 'pcs',
    tenantId
  });
  const taxProfile = await repository.createTaxProfile({
    businessId,
    code: 'GST-0',
    isActive: true,
    name: 'No Tax',
    rateBasisPoints: 0,
    tenantId
  });

  return { categoryId: category.id, taxProfileId: taxProfile.id, unitId: unit.id };
};

const createProduct = async (
  repository: DrizzleCatalogRepository,
  businessId: string,
  masterSet: { categoryId: string; taxProfileId: string; unitId: string },
  overrides: Partial<Awaited<ReturnType<typeof repository.createProduct>>>
) =>
  repository.createProduct({
    businessId,
    categoryId: masterSet.categoryId,
    isActive: overrides.isActive ?? true,
    lowStockLevel: 0,
    name: overrides.name ?? 'Sample Product',
    openingStock: 0,
    sellingPrice: 1000,
    sku: overrides.sku ?? `SKU-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    taxProfileId: masterSet.taxProfileId,
    tenantId,
    trackInventory: true,
    unitId: masterSet.unitId,
    barcode: overrides.barcode
  });
