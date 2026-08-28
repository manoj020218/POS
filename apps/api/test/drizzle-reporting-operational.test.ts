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

describe('DrizzleSaleRepository operational reporting', () => {
  let close: () => Promise<void>;
  let database: Awaited<ReturnType<typeof createMemoryDatabase>>;

  beforeEach(async () => {
    database = await createMemoryDatabase();
    close = database.close;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('aggregates tax, stock movement, and sales return reporting rows from immutable records', async () => {
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
      name: 'Report Low Cola',
      openingStock: 5,
      sellingPrice: 2000,
      sku: 'REPORT-LOW-COLA',
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
      name: 'Other Business Soda',
      openingStock: 1,
      sellingPrice: 3000,
      sku: 'OTHER-BUSINESS-SODA',
      taxProfileId: mastersB.taxProfileId,
      tenantId: tenantA,
      trackInventory: true,
      unitId: mastersB.unitId
    });

    const saleA = await createRepositorySale(saleRepository, {
      branchCode: branchA.code,
      branchId: branchA.id,
      businessId: businessA.id,
      cashierUserId: cashierId,
      items: [
        {
          productId: productA.id,
          productName: productA.name,
          productSku: productA.sku,
          quantity: 2,
          taxAmount: 120,
          unitPrice: 2000
        }
      ],
      occurredAt: '2026-08-28T10:00:00.000Z',
      paymentMethod: 'CARD',
      tenantId: tenantA,
      terminalCode: terminalA.code,
      terminalId: terminalA.id
    });
    await saleRepository.createSaleReturn({
      inventoryMovements: [
        {
          branchId: branchA.id,
          businessId: businessA.id,
          movementType: 'SALE_RETURN',
          occurredAt: new Date('2026-08-28T11:00:00.000Z'),
          productId: productA.id,
          quantityDelta: 1,
          tenantId: tenantA
        }
      ],
      saleId: saleA.sale.id,
      tenantId: tenantA
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
          taxAmount: 60,
          unitPrice: 3000
        }
      ],
      occurredAt: '2026-08-28T12:00:00.000Z',
      paymentMethod: 'UPI',
      tenantId: tenantA,
      terminalCode: terminalB.code,
      terminalId: terminalB.id
    });

    const input = {
      branchIds: [branchA.id, branchB.id],
      businessIds: [businessA.id, businessB.id],
      occurredAtFrom: new Date('2026-08-28T00:00:00.000Z'),
      occurredAtTo: new Date('2026-08-29T00:00:00.000Z'),
      tenantId: tenantA
    };

    await expect(saleRepository.listTaxSummary(input)).resolves.toEqual([
      {
        businessId: businessA.id,
        discountAmount: 0,
        saleCount: 1,
        subtotalAmount: 4000,
        taxAmount: 120,
        totalAmount: 4120,
        totalQuantity: 2
      },
      {
        businessId: businessB.id,
        discountAmount: 0,
        saleCount: 1,
        subtotalAmount: 3000,
        taxAmount: 60,
        totalAmount: 3060,
        totalQuantity: 1
      }
    ]);
    await expect(saleRepository.listStockMovements(input)).resolves.toEqual([
      {
        branchId: branchA.id,
        businessId: businessA.id,
        lastMovementAt: new Date('2026-08-28T10:00:00.000Z'),
        movementCount: 1,
        movementType: 'SALE',
        productId: productA.id,
        quantityDelta: -2
      },
      {
        branchId: branchB.id,
        businessId: businessB.id,
        lastMovementAt: new Date('2026-08-28T12:00:00.000Z'),
        movementCount: 1,
        movementType: 'SALE',
        productId: productB.id,
        quantityDelta: -1
      },
      {
        branchId: branchA.id,
        businessId: businessA.id,
        lastMovementAt: new Date('2026-08-28T11:00:00.000Z'),
        movementCount: 1,
        movementType: 'SALE_RETURN',
        productId: productA.id,
        quantityDelta: 1
      }
    ]);
    await expect(saleRepository.listSalesReturns(input)).resolves.toEqual([
      {
        branchId: branchA.id,
        businessId: businessA.id,
        lastReturnedAt: new Date('2026-08-28T11:00:00.000Z'),
        productId: productA.id,
        productName: 'Report Low Cola',
        productSku: 'REPORT-LOW-COLA',
        returnCount: 1,
        returnedQuantity: 1
      }
    ]);
  });
});
