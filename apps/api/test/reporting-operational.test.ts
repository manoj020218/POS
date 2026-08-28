import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('operational reporting routes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let branchAId: string;
  let branchBId: string;
  let businessAId: string;
  let businessBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];
  let terminalAId: string;
  let terminalBId: string;

  beforeEach(async () => {
    ({ app, branchAId, branchBId, businessAId, businessBId, loginAs, terminalAId, terminalBId } =
      await createCatalogTestContext());
  });

  it('returns tax, stock, movement, and sales return reports for the unfinished Phase 9 slice', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const supplier = await request(app).post('/api/v1/suppliers').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Report Supplier'
    });
    const productLow = await createProduct(app, ownerAccess, {
      businessId: businessAId,
      lowStockLevel: 4,
      name: 'Report Low Cola',
      openingStock: 5,
      sellingPrice: 2000,
      trackInventory: true
    });
    const productStock = await createProduct(app, ownerAccess, {
      businessId: businessAId,
      lowStockLevel: 1,
      name: 'Report Bulk Rice',
      openingStock: 2,
      purchasePrice: 1000,
      sellingPrice: 1500,
      trackInventory: true
    });
    const productB = await createProduct(app, ownerAccess, {
      businessId: businessBId,
      lowStockLevel: 0,
      name: 'Other Business Soda',
      openingStock: 1,
      sellingPrice: 3000,
      trackInventory: true
    });
    const purchase = await createPurchase(app, ownerAccess, {
      branchId: branchAId,
      items: [{ productId: productStock.body.data.id, quantity: 5, unitCost: 1000 }],
      occurredAt: '2026-08-28T09:00:00.000Z',
      supplierId: supplier.body.data.id
    });
    const saleA = await createSale(app, ownerAccess, {
      branchId: branchAId,
      items: [{ productId: productLow.body.data.id, quantity: 2, taxAmount: 120 }],
      occurredAt: '2026-08-28T10:00:00.000Z',
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });
    const saleReturn = await createSaleReturn(app, ownerAccess, saleA.body.data.id as string, {
      items: [{ productId: productLow.body.data.id, quantity: 1 }],
      occurredAt: '2026-08-28T11:00:00.000Z'
    });
    const saleB = await createSale(app, ownerAccess, {
      branchId: branchBId,
      items: [{ productId: productB.body.data.id, quantity: 1, taxAmount: 60 }],
      occurredAt: '2026-08-28T12:00:00.000Z',
      payment: { method: 'UPI' },
      terminalId: terminalBId
    });
    const range = { dateFrom: '2026-08-28', dateTo: '2026-08-28' };
    const [taxSummary, currentStock, lowStock, stockMovement, salesReturns] = await Promise.all([
      request(app).get('/api/v1/reports/sales/tax-summary').query(range).set(ownerAccess),
      request(app)
        .get('/api/v1/reports/inventory/current-stock')
        .query({ businessId: businessAId })
        .set(ownerAccess),
      request(app)
        .get('/api/v1/reports/inventory/low-stock')
        .query({ businessId: businessAId })
        .set(ownerAccess),
      request(app)
        .get('/api/v1/reports/inventory/stock-movement')
        .query({ ...range, businessId: businessAId })
        .set(ownerAccess),
      request(app)
        .get('/api/v1/reports/sales/returns')
        .query({ ...range, businessId: businessAId })
        .set(ownerAccess)
    ]);

    expect(supplier.status).toBe(201);
    expect(productLow.status).toBe(201);
    expect(productStock.status).toBe(201);
    expect(productB.status).toBe(201);
    expect(purchase.status).toBe(201);
    expect(saleA.status).toBe(201);
    expect(saleReturn.status).toBe(201);
    expect(saleB.status).toBe(201);

    expect(taxSummary.status).toBe(200);
    expect(taxSummary.body.data).toMatchObject({
      businessCount: 2,
      dateFrom: '2026-08-28',
      dateTo: '2026-08-28',
      reportType: 'DATE_RANGE'
    });
    expect(taxSummary.body.data.rows).toEqual([
      expect.objectContaining({
        averageSaleAmount: 4120,
        businessCode: 'STORE-A',
        businessId: businessAId,
        businessName: 'Store A',
        discountAmount: 0,
        effectiveTaxRateBasisPoints: 300,
        saleCount: 1,
        subtotalAmount: 4000,
        taxAmount: 120,
        totalAmount: 4120,
        totalQuantity: 2
      }),
      expect.objectContaining({
        averageSaleAmount: 3060,
        businessCode: 'STORE-B',
        businessId: businessBId,
        businessName: 'Store B',
        discountAmount: 0,
        effectiveTaxRateBasisPoints: 200,
        saleCount: 1,
        subtotalAmount: 3000,
        taxAmount: 60,
        totalAmount: 3060,
        totalQuantity: 1
      })
    ]);

    expect(currentStock.status).toBe(200);
    expect(currentStock.body.data).toMatchObject({
      asOf: expect.any(String),
      businessCount: 1,
      businessId: businessAId
    });
    expect(currentStock.body.data.rows).toEqual([
      expect.objectContaining({
        businessCode: 'STORE-A',
        businessId: businessAId,
        currentQuantity: 7,
        isLowStock: false,
        lowStockLevel: 1,
        netMovementQuantity: 5,
        openingStock: 2,
        productId: productStock.body.data.id,
        productName: 'Report Bulk Rice'
      }),
      expect.objectContaining({
        businessCode: 'STORE-A',
        businessId: businessAId,
        currentQuantity: 4,
        isLowStock: true,
        lowStockLevel: 4,
        netMovementQuantity: -1,
        openingStock: 5,
        productId: productLow.body.data.id,
        productName: 'Report Low Cola'
      })
    ]);

    expect(lowStock.status).toBe(200);
    expect(lowStock.body.data).toMatchObject({
      asOf: expect.any(String),
      businessCount: 1,
      businessId: businessAId
    });
    expect(lowStock.body.data.rows).toEqual([
      expect.objectContaining({
        currentQuantity: 4,
        isLowStock: true,
        productId: productLow.body.data.id,
        productName: 'Report Low Cola'
      })
    ]);

    expect(stockMovement.status).toBe(200);
    expect(stockMovement.body.data).toMatchObject({
      businessCount: 1,
      businessId: businessAId,
      dateFrom: '2026-08-28',
      dateTo: '2026-08-28',
      reportType: 'DATE_RANGE'
    });
    expect(stockMovement.body.data.rows).toEqual([
      expect.objectContaining({
        branchId: branchAId,
        branchName: 'Store A Main',
        movementCount: 1,
        movementType: 'PURCHASE',
        productId: productStock.body.data.id,
        productName: 'Report Bulk Rice',
        quantityDelta: 5
      }),
      expect.objectContaining({
        branchId: branchAId,
        branchName: 'Store A Main',
        movementCount: 1,
        movementType: 'SALE',
        productId: productLow.body.data.id,
        productName: 'Report Low Cola',
        quantityDelta: -2
      }),
      expect.objectContaining({
        branchId: branchAId,
        branchName: 'Store A Main',
        movementCount: 1,
        movementType: 'SALE_RETURN',
        productId: productLow.body.data.id,
        productName: 'Report Low Cola',
        quantityDelta: 1
      })
    ]);

    expect(salesReturns.status).toBe(200);
    expect(salesReturns.body.data).toMatchObject({
      businessCount: 1,
      businessId: businessAId,
      dateFrom: '2026-08-28',
      dateTo: '2026-08-28',
      reportType: 'DATE_RANGE'
    });
    expect(salesReturns.body.data.rows).toEqual([
      expect.objectContaining({
        branchId: branchAId,
        branchName: 'Store A Main',
        productId: productLow.body.data.id,
        productName: 'Report Low Cola',
        returnCount: 1,
        returnedQuantity: 1
      })
    ]);
  });

  it('enforces report permission and business scope on the new reporting endpoints', async () => {
    const cashierAccess = await loginAs('cashier@example.com');
    const managerAccess = await loginAs('manager@example.com');
    const [forbiddenTax, forbiddenStock, scopeDeniedStock, scopeDeniedReturns] = await Promise.all([
      request(app).get('/api/v1/reports/sales/tax-summary').set(cashierAccess),
      request(app).get('/api/v1/reports/inventory/current-stock').set(cashierAccess),
      request(app)
        .get('/api/v1/reports/inventory/current-stock')
        .query({ businessId: businessBId })
        .set(managerAccess),
      request(app)
        .get('/api/v1/reports/sales/returns')
        .query({ businessId: businessBId, dateFrom: '2026-08-28', dateTo: '2026-08-28' })
        .set(managerAccess)
    ]);

    expect(forbiddenTax.status).toBe(403);
    expect(forbiddenTax.body.code).toBe('FORBIDDEN');
    expect(forbiddenStock.status).toBe(403);
    expect(forbiddenStock.body.code).toBe('FORBIDDEN');
    expect(scopeDeniedStock.status).toBe(403);
    expect(scopeDeniedStock.body.code).toBe('BRANCH_ACCESS_DENIED');
    expect(scopeDeniedReturns.status).toBe(403);
    expect(scopeDeniedReturns.body.code).toBe('BRANCH_ACCESS_DENIED');
  });

  it('keeps stock movement and sales return reports inside branch scope while current stock stays business scoped', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const managerAccess = await loginAs('manager@example.com');
    const supplier = await request(app).post('/api/v1/suppliers').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Branch Scope Supplier'
    });
    const branch = await createBranch(app, ownerAccess, {
      address: 'South Road',
      businessId: businessAId,
      code: 'BR-A2',
      name: 'Store A South'
    });
    const terminal = await createTerminal(app, ownerAccess, {
      branchId: branch.body.data.id,
      code: 'TERM-A2',
      name: 'South Counter'
    });
    const product = await createProduct(app, ownerAccess, {
      businessId: businessAId,
      lowStockLevel: 0,
      name: 'Scoped Inventory Cola',
      openingStock: 10,
      purchasePrice: 1000,
      sellingPrice: 2000,
      trackInventory: true
    });
    const saleMain = await createSale(app, ownerAccess, {
      branchId: branchAId,
      items: [{ productId: product.body.data.id, quantity: 1 }],
      occurredAt: '2026-08-28T10:00:00.000Z',
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });
    const saleSouth = await createSale(app, ownerAccess, {
      branchId: branch.body.data.id,
      items: [{ productId: product.body.data.id, quantity: 1 }],
      occurredAt: '2026-08-28T10:05:00.000Z',
      payment: { method: 'CARD' },
      terminalId: terminal.body.data.id
    });
    await createSaleReturn(app, ownerAccess, saleSouth.body.data.id as string, {
      items: [{ productId: product.body.data.id, quantity: 1 }],
      occurredAt: '2026-08-28T10:10:00.000Z'
    });
    await createPurchase(app, ownerAccess, {
      branchId: branch.body.data.id,
      items: [{ productId: product.body.data.id, quantity: 2, unitCost: 1000 }],
      occurredAt: '2026-08-28T10:15:00.000Z',
      supplierId: supplier.body.data.id
    });

    const [currentStock, stockMovement, salesReturns] = await Promise.all([
      request(app)
        .get('/api/v1/reports/inventory/current-stock')
        .query({ businessId: businessAId, productId: product.body.data.id })
        .set(managerAccess),
      request(app)
        .get('/api/v1/reports/inventory/stock-movement')
        .query({ businessId: businessAId, dateFrom: '2026-08-28', dateTo: '2026-08-28' })
        .set(managerAccess),
      request(app)
        .get('/api/v1/reports/sales/returns')
        .query({ businessId: businessAId, dateFrom: '2026-08-28', dateTo: '2026-08-28' })
        .set(managerAccess)
    ]);

    expect(saleMain.status).toBe(201);
    expect(saleSouth.status).toBe(201);
    expect(currentStock.status).toBe(200);
    expect(currentStock.body.data.rows).toEqual([
      expect.objectContaining({
        currentQuantity: 11,
        netMovementQuantity: 1,
        productId: product.body.data.id
      })
    ]);
    expect(stockMovement.status).toBe(200);
    expect(stockMovement.body.data.rows).toEqual([
      expect.objectContaining({
        branchId: branchAId,
        movementCount: 1,
        movementType: 'SALE',
        productId: product.body.data.id,
        quantityDelta: -1
      })
    ]);
    expect(salesReturns.status).toBe(200);
    expect(salesReturns.body.data.rows).toEqual([]);
  });
});

const createBranch = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  body: Record<string, unknown>
) => request(app).post('/api/v1/branches').set(access).send(body);

const createTerminal = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  body: Record<string, unknown>
) => request(app).post('/api/v1/terminals').set(access).send(body);

const createProduct = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  body: Record<string, unknown>
) => request(app).post('/api/v1/products').set(access).send(body);

const createPurchase = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  body: Record<string, unknown>
) => request(app).post('/api/v1/purchases').set(access).send(body);

const createSale = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  body: Record<string, unknown>
) => request(app).post('/api/v1/sales').set(access).send(body);

const createSaleReturn = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  saleId: string,
  body: Record<string, unknown>
) => request(app).post(`/api/v1/sales/${saleId}/returns`).set(access).send(body);
