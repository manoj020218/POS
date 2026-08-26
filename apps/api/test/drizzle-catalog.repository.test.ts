import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleCatalogRepository } from '../src/modules/catalog/drizzle-catalog.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const tenantB = '22222222-2222-4222-8222-222222222222';

describe('DrizzleCatalogRepository', () => {
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
    await tenantRepository.createTenant({ id: tenantB, name: 'Tenant B', slug: 'tenant-b' });
    businessA1 = (
      await tenantRepository.createBusiness({ code: 'STORE-A', name: 'Store A', tenantId: tenantA })
    ).id;
    businessA2 = (
      await tenantRepository.createBusiness({ code: 'STORE-B', name: 'Store B', tenantId: tenantA })
    ).id;
    await tenantRepository.createBusiness({ code: 'STORE-C', name: 'Store C', tenantId: tenantB });
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('persists and updates business-scoped catalog records', async () => {
    const masters = await createMasterSet(repository, tenantA, businessA1);
    const product = await repository.createProduct({
      businessId: businessA1,
      categoryId: masters.category.id,
      isActive: true,
      lowStockLevel: 0,
      name: 'Coca Cola 500ml',
      openingStock: 5,
      sellingPrice: 4000,
      sku: 'COKE-500',
      taxProfileId: masters.taxProfile.id,
      tenantId: tenantA,
      trackInventory: true,
      unitId: masters.unit.id
    });

    await repository.updateCategory(masters.category.id, tenantA, { name: 'Cold Drinks' });
    await repository.updateUnit(masters.unit.id, tenantA, { symbol: 'btl' });
    await repository.updateTaxProfile(masters.taxProfile.id, tenantA, { rateBasisPoints: 1800 });
    const updatedProduct = await repository.updateProduct(product.id, tenantA, {
      barcode: '8900000000012',
      sellingPrice: 4200
    });
    const found = await repository.findProductBySkuOrBarcode(tenantA, businessA1, {
      barcode: '8900000000012'
    });
    const listed = await repository.listProducts(tenantA, [businessA1], {
      page: 1,
      pageSize: 20
    });

    expect(updatedProduct?.sellingPrice).toBe(4200);
    expect(found?.sku).toBe('COKE-500');
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]).toBeDefined();
    expect(listed.items[0]!.barcode).toBe('8900000000012');
    expect(listed.meta).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: false,
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1
    });
    expect((await repository.findCategoryById(masters.category.id))?.name).toBe('Cold Drinks');
    expect((await repository.findUnitById(masters.unit.id))?.symbol).toBe('btl');
    expect((await repository.findTaxProfileById(masters.taxProfile.id))?.rateBasisPoints).toBe(1800);
  });

  it('returns paginated product listings with stable ordering metadata', async () => {
    const masters = await createMasterSet(repository, tenantA, businessA1);

    await repository.createProduct({
      businessId: businessA1,
      categoryId: masters.category.id,
      isActive: true,
      lowStockLevel: 0,
      name: 'Apple Juice',
      openingStock: 0,
      sellingPrice: 3000,
      sku: 'APPLE-1',
      taxProfileId: masters.taxProfile.id,
      tenantId: tenantA,
      trackInventory: true,
      unitId: masters.unit.id
    });
    await repository.createProduct({
      businessId: businessA1,
      categoryId: masters.category.id,
      isActive: true,
      lowStockLevel: 0,
      name: 'Banana Chips',
      openingStock: 0,
      sellingPrice: 1500,
      sku: 'BANANA-1',
      taxProfileId: masters.taxProfile.id,
      tenantId: tenantA,
      trackInventory: true,
      unitId: masters.unit.id
    });
    await repository.createProduct({
      businessId: businessA1,
      categoryId: masters.category.id,
      isActive: true,
      lowStockLevel: 0,
      name: 'Coconut Water',
      openingStock: 0,
      sellingPrice: 2500,
      sku: 'COCONUT-1',
      taxProfileId: masters.taxProfile.id,
      tenantId: tenantA,
      trackInventory: true,
      unitId: masters.unit.id
    });

    const firstPage = await repository.listProducts(tenantA, [businessA1], {
      page: 1,
      pageSize: 2
    });
    const secondPage = await repository.listProducts(tenantA, [businessA1], {
      page: 2,
      pageSize: 2
    });

    expect(firstPage.items.map((item) => item.name)).toEqual(['Apple Juice', 'Banana Chips']);
    expect(firstPage.meta).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
      page: 1,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2
    });
    expect(secondPage.items.map((item) => item.name)).toEqual(['Coconut Water']);
    expect(secondPage.meta).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
      page: 2,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2
    });
  });

  it('enforces duplicate codes and product identifiers per business', async () => {
    const first = await createMasterSet(repository, tenantA, businessA1);
    const second = await createMasterSet(repository, tenantA, businessA2);

    await expect(
      repository.createCategory({
        businessId: businessA1,
        code: 'GENERAL',
        isActive: true,
        name: 'Duplicate',
        tenantId: tenantA
      })
    ).rejects.toMatchObject({ code: 'DUPLICATE_CODE', statusCode: 409 });

    await repository.createProduct({
      barcode: '8900000000012',
      businessId: businessA1,
      categoryId: first.category.id,
      isActive: true,
      lowStockLevel: 0,
      name: 'Water Bottle',
      openingStock: 0,
      sellingPrice: 1200,
      sku: 'WATER-1',
      taxProfileId: first.taxProfile.id,
      tenantId: tenantA,
      trackInventory: true,
      unitId: first.unit.id
    });

    await expect(
      repository.createProduct({
        barcode: '8900000000012',
        businessId: businessA1,
        categoryId: first.category.id,
        isActive: true,
        lowStockLevel: 0,
        name: 'Duplicate Water',
        openingStock: 0,
        sellingPrice: 1200,
        sku: 'WATER-2',
        taxProfileId: first.taxProfile.id,
        tenantId: tenantA,
        trackInventory: true,
        unitId: first.unit.id
      })
    ).rejects.toMatchObject({ code: 'PRODUCT_IDENTIFIER_IN_USE', statusCode: 409 });

    const crossBusiness = await repository.createProduct({
      barcode: '8900000000012',
      businessId: businessA2,
      categoryId: second.category.id,
      isActive: true,
      lowStockLevel: 0,
      name: 'Water Bottle',
      openingStock: 0,
      sellingPrice: 1200,
      sku: 'WATER-1',
      taxProfileId: second.taxProfile.id,
      tenantId: tenantA,
      trackInventory: true,
      unitId: second.unit.id
    });

    expect(crossBusiness.businessId).toBe(businessA2);
  });
});

const createMasterSet = async (
  repository: DrizzleCatalogRepository,
  tenantId: string,
  businessId: string
) => {
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

  return { category, taxProfile, unit };
};
