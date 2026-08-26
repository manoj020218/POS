import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleAuthRepository } from '../src/modules/auth/drizzle-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { DrizzleCatalogRepository } from '../src/modules/catalog/drizzle-catalog.repository.js';
import { DrizzleCustomerRepository } from '../src/modules/customer/drizzle-customer.repository.js';
import { DrizzleSaleRepository } from '../src/modules/sale/drizzle-sale.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantA = '11111111-1111-4111-8111-111111111111';

describe('DrizzleSaleRepository', () => {
  let close: () => Promise<void>;
  let database: Awaited<ReturnType<typeof createMemoryDatabase>>;

  beforeEach(async () => {
    database = await createMemoryDatabase();
    close = database.close;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('persists sale records and immutable item snapshots', async () => {
    const tenantRepository = new DrizzleTenantCoreRepository(database.db);
    const authRepository = new DrizzleAuthRepository(database.db);
    const catalogRepository = new DrizzleCatalogRepository(database.db);
    const customerRepository = new DrizzleCustomerRepository(database.db);
    const saleRepository = new DrizzleSaleRepository(database.db);

    await tenantRepository.createTenant({ id: tenantA, name: 'Tenant A', slug: 'tenant-a' });
    await authRepository.upsertUser({
      displayName: 'Cashier',
      email: 'cashier@example.com',
      id: '33333333-3333-4333-8333-333333333333',
      isActive: true,
      passwordHash: await hashPassword('Password123'),
      permissions: [],
      role: 'CASHIER',
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
    const terminal = await tenantRepository.registerTerminal({
      branchId: branch.id,
      code: 'TERM-A1',
      name: 'Terminal A1',
      tenantId: tenantA
    });
    const secondTerminal = await tenantRepository.registerTerminal({
      branchId: branch.id,
      code: 'TERM-A2',
      name: 'Terminal A2',
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
      lowStockLevel: 0,
      name: 'Repository Cola',
      openingStock: 0,
      sellingPrice: 4000,
      sku: 'REPO-COLA',
      taxProfileId: taxProfile.id,
      tenantId: tenantA,
      trackInventory: true,
      unitId: unit.id
    });
    const customer = await customerRepository.createCustomer({
      businessId: business.id,
      isActive: true,
      isWalkIn: false,
      mobile: '9999999999',
      name: 'Repo Customer',
      tenantId: tenantA
    });

    const firstSale = await saleRepository.createSale({
      items: [
        {
          discountAmount: 100,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: 2,
          saleId: '',
          subtotalAmount: 8000,
          taxAmount: 36,
          tenantId: tenantA,
          totalAmount: 7936,
          unitPrice: 4000
        }
      ],
      sale: {
        branchCode: branch.code,
        branchId: branch.id,
        businessId: business.id,
        cashierUserId: '33333333-3333-4333-8333-333333333333',
        changeAmount: 64,
        customerId: customer.id,
        customerName: customer.name,
        discountAmount: 100,
        occurredAt: new Date('2026-08-26T12:00:00.000Z'),
        paymentMethod: 'CASH',
        subtotalAmount: 8000,
        taxAmount: 36,
        tenderedAmount: 8000,
        tenantId: tenantA,
        terminalCode: terminal.code,
        terminalId: terminal.id,
        totalAmount: 7936
      }
    });
    const secondSale = await saleRepository.createSale({
      items: [
        {
          discountAmount: 0,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: 1,
          saleId: '',
          subtotalAmount: 4000,
          taxAmount: 0,
          tenantId: tenantA,
          totalAmount: 4000,
          unitPrice: 4000
        }
      ],
      sale: {
        branchCode: branch.code,
        branchId: branch.id,
        businessId: business.id,
        cashierUserId: '33333333-3333-4333-8333-333333333333',
        changeAmount: 0,
        customerId: customer.id,
        customerName: customer.name,
        discountAmount: 0,
        occurredAt: new Date('2026-08-26T12:05:00.000Z'),
        paymentMethod: 'CARD',
        subtotalAmount: 4000,
        taxAmount: 0,
        tenderedAmount: 4000,
        tenantId: tenantA,
        terminalCode: terminal.code,
        terminalId: terminal.id,
        totalAmount: 4000
      }
    });
    const thirdSale = await saleRepository.createSale({
      items: [
        {
          discountAmount: 0,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: 1,
          saleId: '',
          subtotalAmount: 4000,
          taxAmount: 0,
          tenantId: tenantA,
          totalAmount: 4000,
          unitPrice: 4000
        }
      ],
      sale: {
        branchCode: branch.code,
        branchId: branch.id,
        businessId: business.id,
        cashierUserId: '33333333-3333-4333-8333-333333333333',
        changeAmount: 0,
        customerId: customer.id,
        customerName: customer.name,
        discountAmount: 0,
        occurredAt: new Date('2026-08-26T12:10:00.000Z'),
        paymentMethod: 'UPI',
        subtotalAmount: 4000,
        taxAmount: 0,
        tenderedAmount: 4000,
        tenantId: tenantA,
        terminalCode: secondTerminal.code,
        terminalId: secondTerminal.id,
        totalAmount: 4000
      }
    });

    expect(firstSale.sale).toMatchObject({
      branchCode: 'BR-A1',
      businessId: business.id,
      changeAmount: 64,
      customerId: customer.id,
      customerName: 'Repo Customer',
      invoiceNumber: 'INV-BR-A1-TERM-A1-000001',
      invoiceSequence: 1,
      paymentMethod: 'CASH',
      terminalCode: 'TERM-A1',
      totalAmount: 7936
    });
    expect(firstSale.items).toEqual([
      expect.objectContaining({
        discountAmount: 100,
        productId: product.id,
        productName: 'Repository Cola',
        productSku: 'REPO-COLA',
        quantity: 2,
        subtotalAmount: 8000,
        totalAmount: 7936,
        unitPrice: 4000
      })
    ]);
    expect(secondSale.sale).toMatchObject({
      invoiceNumber: 'INV-BR-A1-TERM-A1-000002',
      invoiceSequence: 2,
      paymentMethod: 'CARD',
      terminalCode: 'TERM-A1'
    });
    expect(thirdSale.sale).toMatchObject({
      invoiceNumber: 'INV-BR-A1-TERM-A2-000001',
      invoiceSequence: 1,
      paymentMethod: 'UPI',
      terminalCode: 'TERM-A2'
    });
  });
});
