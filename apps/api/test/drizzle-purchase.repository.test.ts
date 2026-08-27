import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleAuthRepository } from '../src/modules/auth/drizzle-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { DrizzleCatalogRepository } from '../src/modules/catalog/drizzle-catalog.repository.js';
import { DrizzlePurchaseRepository } from '../src/modules/purchase/drizzle-purchase.repository.js';
import { DrizzleSaleRepository } from '../src/modules/sale/drizzle-sale.repository.js';
import { DrizzleSupplierRepository } from '../src/modules/supplier/drizzle-supplier.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantA = '11111111-1111-4111-8111-111111111111';

describe('DrizzlePurchaseRepository', () => {
  let close: () => Promise<void>;
  let database: Awaited<ReturnType<typeof createMemoryDatabase>>;

  beforeEach(async () => {
    database = await createMemoryDatabase();
    close = database.close;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('persists purchase snapshots and purchase-ledger inventory movements', async () => {
    const tenantRepository = new DrizzleTenantCoreRepository(database.db);
    const authRepository = new DrizzleAuthRepository(database.db);
    const catalogRepository = new DrizzleCatalogRepository(database.db);
    const purchaseRepository = new DrizzlePurchaseRepository(database.db);
    const saleRepository = new DrizzleSaleRepository(database.db);
    const supplierRepository = new DrizzleSupplierRepository(database.db);

    await tenantRepository.createTenant({ id: tenantA, name: 'Tenant A', slug: 'tenant-a' });
    await authRepository.upsertUser({
      displayName: 'Inventory Manager',
      email: 'inventory@example.com',
      id: '55555555-5555-4555-8555-555555555555',
      isActive: true,
      passwordHash: await hashPassword('Password123'),
      permissions: [],
      role: 'INVENTORY_MANAGER',
      tenantId: tenantA
    });
    const business = await tenantRepository.createBusiness({
      code: 'STORE-A',
      name: 'Store A',
      tenantId: tenantA
    });
    const branch = await tenantRepository.createBranch({
      address: 'Main Road',
      businessId: business.id,
      code: 'BR-A1',
      name: 'Store A Main',
      tenantId: tenantA
    });
    const category = await catalogRepository.createCategory({
      businessId: business.id,
      code: 'GENERAL',
      isActive: true,
      name: 'General',
      tenantId: tenantA
    });
    const unit = await catalogRepository.createUnit({
      businessId: business.id,
      code: 'PCS',
      isActive: true,
      name: 'Pieces',
      precision: 0,
      tenantId: tenantA
    });
    const taxProfile = await catalogRepository.createTaxProfile({
      businessId: business.id,
      code: 'GST-0',
      isActive: true,
      name: 'No Tax',
      rateBasisPoints: 0,
      tenantId: tenantA
    });
    const product = await catalogRepository.createProduct({
      businessId: business.id,
      categoryId: category.id,
      isActive: true,
      lowStockLevel: 1,
      name: 'Purchase Rice',
      openingStock: 2,
      purchasePrice: 1500,
      sellingPrice: 2000,
      sku: 'PUR-RICE',
      taxProfileId: taxProfile.id,
      tenantId: tenantA,
      trackInventory: true,
      unitId: unit.id
    });
    const supplier = await supplierRepository.createSupplier({
      businessId: business.id,
      isActive: true,
      name: 'Repository Supplier',
      tenantId: tenantA
    });

    const created = await purchaseRepository.createPurchase({
      inventoryMovements: [
        {
          branchId: branch.id,
          businessId: business.id,
          movementType: 'PURCHASE',
          occurredAt: new Date('2026-08-26T13:00:00.000Z'),
          productId: product.id,
          quantityDelta: 4,
          tenantId: tenantA
        }
      ],
      items: [
        {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          purchaseId: '',
          quantity: 4,
          tenantId: tenantA,
          totalCost: 6000,
          unitCost: 1500
        }
      ],
      purchase: {
        branchCode: branch.code,
        branchId: branch.id,
        businessId: business.id,
        createdByUserId: '55555555-5555-4555-8555-555555555555',
        itemCount: 1,
        occurredAt: new Date('2026-08-26T13:00:00.000Z'),
        supplierId: supplier.id,
        supplierName: supplier.name,
        tenantId: tenantA,
        totalAmount: 6000,
        totalQuantity: 4
      }
    });

    expect(created.purchase).toMatchObject({
      branchCode: 'BR-A1',
      supplierId: supplier.id,
      supplierName: 'Repository Supplier',
      totalAmount: 6000,
      totalQuantity: 4
    });
    await expect(purchaseRepository.listPurchases(tenantA, [branch.id], supplier.id)).resolves.toEqual([
      expect.objectContaining({
        id: created.purchase.id,
        totalAmount: 6000
      })
    ]);
    await expect(
      saleRepository.listInventoryBalances({
        businessIds: [business.id],
        tenantId: tenantA
      })
    ).resolves.toEqual([
      expect.objectContaining({
        businessId: business.id,
        netMovementQuantity: 4,
        productId: product.id,
        tenantId: tenantA
      })
    ]);
  });
});
