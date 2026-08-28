import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleAuthRepository } from '../src/modules/auth/drizzle-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { DrizzleCatalogRepository } from '../src/modules/catalog/drizzle-catalog.repository.js';
import { DrizzleSaleRepository } from '../src/modules/sale/drizzle-sale.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';
import { createMasters, createRepositorySale } from './helpers/sales-reporting.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';
const managerId = '33333333-3333-4333-8333-333333333333';

describe('DrizzleSaleRepository reporting breakdowns', () => {
  let close: () => Promise<void>;
  let database: Awaited<ReturnType<typeof createMemoryDatabase>>;

  beforeEach(async () => {
    database = await createMemoryDatabase();
    close = database.close;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('aggregates branch, terminal, cashier, payment-method, and top-product reporting', async () => {
    const authRepository = new DrizzleAuthRepository(database.db);
    const catalogRepository = new DrizzleCatalogRepository(database.db);
    const saleRepository = new DrizzleSaleRepository(database.db);
    const tenantRepository = new DrizzleTenantCoreRepository(database.db);

    await tenantRepository.createTenant({ id: tenantA, name: 'Tenant A', slug: 'tenant-a' });
    await authRepository.upsertUser(await createUser(ownerId, 'owner@example.com', 'Owner'));
    await authRepository.upsertUser(await createUser(managerId, 'manager@example.com', 'Manager'));
    const businessA = await tenantRepository.createBusiness({ code: 'STORE-A', name: 'Store A', tenantId: tenantA });
    const businessB = await tenantRepository.createBusiness({ code: 'STORE-B', name: 'Store B', tenantId: tenantA });
    const branchA = await tenantRepository.createBranch({ address: 'Main Road', businessId: businessA.id, code: 'BR-A1', name: 'Store A Main', tenantId: tenantA });
    const branchA2 = await tenantRepository.createBranch({ address: 'South Road', businessId: businessA.id, code: 'BR-A2', name: 'Store A South', tenantId: tenantA });
    const branchB = await tenantRepository.createBranch({ address: 'Annex Road', businessId: businessB.id, code: 'BR-B1', name: 'Store B Main', tenantId: tenantA });
    const terminalA = await tenantRepository.registerTerminal({ branchId: branchA.id, code: 'TERM-A1', name: 'Terminal A1', tenantId: tenantA });
    const terminalA2 = await tenantRepository.registerTerminal({ branchId: branchA2.id, code: 'TERM-A2', name: 'South Counter', tenantId: tenantA });
    const terminalB = await tenantRepository.registerTerminal({ branchId: branchB.id, code: 'TERM-B1', name: 'Terminal B1', tenantId: tenantA });
    const mastersA = await createMasters(catalogRepository, tenantA, businessA.id);
    const mastersB = await createMasters(catalogRepository, tenantA, businessB.id);
    const productA = await catalogRepository.createProduct({ businessId: businessA.id, categoryId: mastersA.categoryId, isActive: true, lowStockLevel: 0, name: 'Report Cola', openingStock: 0, sellingPrice: 2000, sku: 'REPORT-COLA', taxProfileId: mastersA.taxProfileId, tenantId: tenantA, trackInventory: true, unitId: mastersA.unitId });
    const productSnack = await catalogRepository.createProduct({ businessId: businessA.id, categoryId: mastersA.categoryId, isActive: true, lowStockLevel: 0, name: 'Report Snack', openingStock: 0, sellingPrice: 1000, sku: 'REPORT-SNACK', taxProfileId: mastersA.taxProfileId, tenantId: tenantA, trackInventory: true, unitId: mastersA.unitId });
    const productB = await catalogRepository.createProduct({ businessId: businessB.id, categoryId: mastersB.categoryId, isActive: true, lowStockLevel: 0, name: 'Report Juice', openingStock: 0, sellingPrice: 1500, sku: 'REPORT-JUICE', taxProfileId: mastersB.taxProfileId, tenantId: tenantA, trackInventory: true, unitId: mastersB.unitId });

    await createRepositorySale(saleRepository, { branchCode: branchA.code, branchId: branchA.id, businessId: businessA.id, cashierUserId: managerId, items: [{ productId: productA.id, productName: productA.name, productSku: productA.sku, quantity: 2, unitPrice: 2000 }], occurredAt: '2026-08-28T10:00:00.000Z', paymentMethod: 'CARD', tenantId: tenantA, terminalCode: terminalA.code, terminalId: terminalA.id });
    await createRepositorySale(saleRepository, { branchCode: branchA.code, branchId: branchA.id, businessId: businessA.id, cashierUserId: ownerId, items: [{ productId: productSnack.id, productName: productSnack.name, productSku: productSnack.sku, quantity: 1, unitPrice: 1000 }], occurredAt: '2026-08-28T10:05:00.000Z', paymentMethod: 'CARD', tenantId: tenantA, terminalCode: terminalA.code, terminalId: terminalA.id });
    await createRepositorySale(saleRepository, { branchCode: branchA2.code, branchId: branchA2.id, businessId: businessA.id, cashierUserId: ownerId, items: [{ productId: productA.id, productName: productA.name, productSku: productA.sku, quantity: 1, unitPrice: 2000 }, { productId: productSnack.id, productName: productSnack.name, productSku: productSnack.sku, quantity: 2, unitPrice: 1000 }], occurredAt: '2026-08-28T10:10:00.000Z', paymentMethod: 'CASH', tenantId: tenantA, terminalCode: terminalA2.code, terminalId: terminalA2.id });
    await createRepositorySale(saleRepository, { branchCode: branchB.code, branchId: branchB.id, businessId: businessB.id, cashierUserId: ownerId, items: [{ productId: productB.id, productName: productB.name, productSku: productB.sku, quantity: 3, unitPrice: 1500 }], occurredAt: '2026-08-28T10:15:00.000Z', paymentMethod: 'UPI', tenantId: tenantA, terminalCode: terminalB.code, terminalId: terminalB.id });

    const input = {
      branchIds: [branchA.id, branchA2.id, branchB.id],
      businessIds: [businessA.id, businessB.id],
      occurredAtFrom: new Date('2026-08-28T00:00:00.000Z'),
      occurredAtTo: new Date('2026-08-29T00:00:00.000Z'),
      tenantId: tenantA
    };

    await expect(saleRepository.listSalesByBranch(input)).resolves.toEqual([
      { branchCode: 'BR-A1', branchId: branchA.id, businessId: businessA.id, discountAmount: 0, saleCount: 2, subtotalAmount: 5000, taxAmount: 0, totalAmount: 5000, totalQuantity: 3 },
      { branchCode: 'BR-B1', branchId: branchB.id, businessId: businessB.id, discountAmount: 0, saleCount: 1, subtotalAmount: 4500, taxAmount: 0, totalAmount: 4500, totalQuantity: 3 },
      { branchCode: 'BR-A2', branchId: branchA2.id, businessId: businessA.id, discountAmount: 0, saleCount: 1, subtotalAmount: 4000, taxAmount: 0, totalAmount: 4000, totalQuantity: 3 }
    ]);
    await expect(saleRepository.listSalesByTerminal(input)).resolves.toEqual([
      { branchId: branchA.id, businessId: businessA.id, terminalCode: 'TERM-A1', terminalId: terminalA.id, discountAmount: 0, saleCount: 2, subtotalAmount: 5000, taxAmount: 0, totalAmount: 5000, totalQuantity: 3 },
      { branchId: branchB.id, businessId: businessB.id, terminalCode: 'TERM-B1', terminalId: terminalB.id, discountAmount: 0, saleCount: 1, subtotalAmount: 4500, taxAmount: 0, totalAmount: 4500, totalQuantity: 3 },
      { branchId: branchA2.id, businessId: businessA.id, terminalCode: 'TERM-A2', terminalId: terminalA2.id, discountAmount: 0, saleCount: 1, subtotalAmount: 4000, taxAmount: 0, totalAmount: 4000, totalQuantity: 3 }
    ]);
    await expect(saleRepository.listSalesByCashier(input)).resolves.toEqual([
      { cashierUserId: ownerId, discountAmount: 0, saleCount: 3, subtotalAmount: 9500, taxAmount: 0, totalAmount: 9500, totalQuantity: 7 },
      { cashierUserId: managerId, discountAmount: 0, saleCount: 1, subtotalAmount: 4000, taxAmount: 0, totalAmount: 4000, totalQuantity: 2 }
    ]);
    await expect(saleRepository.listSalesByPaymentMethod(input)).resolves.toEqual([
      { paymentMethod: 'CARD', discountAmount: 0, saleCount: 2, subtotalAmount: 5000, taxAmount: 0, totalAmount: 5000, totalQuantity: 3 },
      { paymentMethod: 'UPI', discountAmount: 0, saleCount: 1, subtotalAmount: 4500, taxAmount: 0, totalAmount: 4500, totalQuantity: 3 },
      { paymentMethod: 'CASH', discountAmount: 0, saleCount: 1, subtotalAmount: 4000, taxAmount: 0, totalAmount: 4000, totalQuantity: 3 }
    ]);
    await expect(saleRepository.listTopProducts({ ...input, limit: 2 })).resolves.toEqual([
      { productId: productA.id, productName: 'Report Cola', productSku: 'REPORT-COLA', discountAmount: 0, saleCount: 2, subtotalAmount: 6000, taxAmount: 0, totalAmount: 6000, totalQuantity: 3 },
      { productId: productB.id, productName: 'Report Juice', productSku: 'REPORT-JUICE', discountAmount: 0, saleCount: 1, subtotalAmount: 4500, taxAmount: 0, totalAmount: 4500, totalQuantity: 3 }
    ]);
  });
});

const createUser = async (id: string, email: string, displayName: string) => ({
  displayName,
  email,
  id,
  isActive: true,
  passwordHash: await hashPassword('Password123'),
  permissions: [],
  role: 'BRANCH_MANAGER' as const,
  tenantId: tenantA
});
