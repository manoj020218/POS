import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleAuthRepository } from '../src/modules/auth/drizzle-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { DrizzleCatalogRepository } from '../src/modules/catalog/drizzle-catalog.repository.js';
import { DrizzleSaleRepository } from '../src/modules/sale/drizzle-sale.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';
import { createMasters, createRepositorySale } from './helpers/sales-reporting.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const cashierId = '33333333-3333-4333-8333-333333333333';

describe('DrizzleSaleRepository reporting summary', () => {
  let close: () => Promise<void>;
  let database: Awaited<ReturnType<typeof createMemoryDatabase>>;

  beforeEach(async () => {
    database = await createMemoryDatabase();
    close = database.close;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('summarizes sales by business scope and occurred-at range', async () => {
    const authRepository = new DrizzleAuthRepository(database.db);
    const catalogRepository = new DrizzleCatalogRepository(database.db);
    const saleRepository = new DrizzleSaleRepository(database.db);
    const tenantRepository = new DrizzleTenantCoreRepository(database.db);

    await tenantRepository.createTenant({ id: tenantA, name: 'Tenant A', slug: 'tenant-a' });
    await authRepository.upsertUser({
      displayName: 'Cashier',
      email: 'cashier@example.com',
      id: cashierId,
      isActive: true,
      passwordHash: await hashPassword('Password123'),
      permissions: [],
      role: 'CASHIER',
      tenantId: tenantA
    });
    const businessA = await tenantRepository.createBusiness({
      code: 'STORE-A',
      name: 'Store A',
      tenantId: tenantA
    });
    const businessB = await tenantRepository.createBusiness({
      code: 'STORE-B',
      name: 'Store B',
      tenantId: tenantA
    });
    const branchA = await tenantRepository.createBranch({
      address: 'Main Road',
      businessId: businessA.id,
      code: 'BR-A1',
      name: 'Store A Main',
      tenantId: tenantA
    });
    const branchB = await tenantRepository.createBranch({
      address: 'Annex Road',
      businessId: businessB.id,
      code: 'BR-B1',
      name: 'Store B Main',
      tenantId: tenantA
    });
    const terminalA = await tenantRepository.registerTerminal({
      branchId: branchA.id,
      code: 'TERM-A1',
      name: 'Terminal A1',
      tenantId: tenantA
    });
    const terminalB = await tenantRepository.registerTerminal({
      branchId: branchB.id,
      code: 'TERM-B1',
      name: 'Terminal B1',
      tenantId: tenantA
    });
    const mastersA = await createMasters(catalogRepository, tenantA, businessA.id);
    const mastersB = await createMasters(catalogRepository, tenantA, businessB.id);
    const productA = await catalogRepository.createProduct({
      businessId: businessA.id,
      categoryId: mastersA.categoryId,
      isActive: true,
      lowStockLevel: 0,
      name: 'Summary Cola',
      openingStock: 0,
      sellingPrice: 2000,
      sku: 'SUMMARY-COLA',
      taxProfileId: mastersA.taxProfileId,
      tenantId: tenantA,
      trackInventory: true,
      unitId: mastersA.unitId
    });
    const productB = await catalogRepository.createProduct({
      businessId: businessB.id,
      categoryId: mastersB.categoryId,
      isActive: true,
      lowStockLevel: 0,
      name: 'Other Summary Cola',
      openingStock: 0,
      sellingPrice: 3000,
      sku: 'SUMMARY-OTHER',
      taxProfileId: mastersB.taxProfileId,
      tenantId: tenantA,
      trackInventory: true,
      unitId: mastersB.unitId
    });

    await createRepositorySale(saleRepository, {
      branchCode: branchA.code,
      branchId: branchA.id,
      businessId: businessA.id,
      cashierUserId: cashierId,
      items: [
        {
          discountAmount: 100,
          productId: productA.id,
          productName: productA.name,
          productSku: productA.sku,
          quantity: 2,
          taxAmount: 50,
          unitPrice: 2000
        }
      ],
      occurredAt: '2026-08-27T10:00:00.000Z',
      tenantId: tenantA,
      terminalCode: terminalA.code,
      terminalId: terminalA.id,
    });
    await createRepositorySale(saleRepository, {
      branchCode: branchA.code,
      branchId: branchA.id,
      businessId: businessA.id,
      cashierUserId: cashierId,
      items: [
        {
          productId: productA.id,
          productName: productA.name,
          productSku: productA.sku,
          quantity: 1,
          unitPrice: 2000
        }
      ],
      occurredAt: '2026-08-28T12:00:00.000Z',
      tenantId: tenantA,
      terminalCode: terminalA.code,
      terminalId: terminalA.id,
    });
    await createRepositorySale(saleRepository, {
      branchCode: branchB.code,
      branchId: branchB.id,
      businessId: businessB.id,
      cashierUserId: cashierId,
      items: [
        {
          productId: productB.id,
          productName: productB.name,
          productSku: productB.sku,
          quantity: 1,
          unitPrice: 3000
        }
      ],
      occurredAt: '2026-08-28T13:00:00.000Z',
      tenantId: tenantA,
      terminalCode: terminalB.code,
      terminalId: terminalB.id
    });

    await expect(
      saleRepository.summarizeSales({
        branchIds: [branchA.id],
        businessIds: [businessA.id],
        occurredAtFrom: new Date('2026-08-27T00:00:00.000Z'),
        occurredAtTo: new Date('2026-08-29T00:00:00.000Z'),
        tenantId: tenantA
      })
    ).resolves.toEqual({
      discountAmount: 100,
      saleCount: 2,
      subtotalAmount: 6000,
      taxAmount: 50,
      totalAmount: 5950,
      totalQuantity: 3
    });
    await expect(
      saleRepository.summarizeSales({
        branchIds: [branchA.id],
        businessIds: [businessA.id],
        occurredAtFrom: new Date('2026-08-28T00:00:00.000Z'),
        occurredAtTo: new Date('2026-08-29T00:00:00.000Z'),
        tenantId: tenantA
      })
    ).resolves.toEqual({
      discountAmount: 0,
      saleCount: 1,
      subtotalAmount: 2000,
      taxAmount: 0,
      totalAmount: 2000,
      totalQuantity: 1
    });
  });
});
