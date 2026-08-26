import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('inventory balances', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let branchAId: string;
  let businessAId: string;
  let businessBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];
  let terminalAId: string;

  beforeEach(async () => {
    ({ app, branchAId, businessAId, businessBId, loginAs, terminalAId } =
      await createCatalogTestContext());
  });

  it('calculates current stock from opening stock plus immutable sale movements', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const trackedProduct = await request(app).post('/api/v1/products').set(managerAccess).send({
      lowStockLevel: 3,
      name: 'Tracked Cola',
      openingStock: 10,
      sellingPrice: 4000,
      trackInventory: true
    });
    const nonTrackedProduct = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Service Charge',
      openingStock: 7,
      sellingPrice: 500,
      trackInventory: false
    });
    const sale = await request(app).post('/api/v1/sales').set(managerAccess).send({
      branchId: branchAId,
      items: [
        {
          productId: trackedProduct.body.data.id,
          quantity: 2
        },
        {
          productId: nonTrackedProduct.body.data.id,
          quantity: 3
        }
      ],
      payment: {
        method: 'CARD'
      },
      terminalId: terminalAId
    });
    const balances = await request(app)
      .get('/api/v1/inventory/balances')
      .query({ businessId: businessAId })
      .set(managerAccess);

    expect(trackedProduct.status).toBe(201);
    expect(nonTrackedProduct.status).toBe(201);
    expect(sale.status).toBe(201);
    expect(balances.status).toBe(200);
    expect(balances.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          businessId: businessAId,
          currentQuantity: 8,
          isLowStock: false,
          lowStockLevel: 3,
          netMovementQuantity: -2,
          openingStock: 10,
          productId: trackedProduct.body.data.id,
          productName: 'Tracked Cola',
          productSku: trackedProduct.body.data.sku,
          trackInventory: true
        })
      ])
    );
    expect(
      balances.body.data.some((item: { productId: string }) => {
        return item.productId === nonTrackedProduct.body.data.id;
      })
    ).toBe(false);
  });

  it('respects business scope and supports product-specific balance lookup', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const managerAccess = await loginAs('manager@example.com');
    const productA = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Lookup Chips',
      openingStock: 4,
      sellingPrice: 1200,
      trackInventory: true
    });
    const productB = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Blocked Branch Product',
      openingStock: 9,
      sellingPrice: 900,
      trackInventory: true
    });
    const scopedBalance = await request(app)
      .get('/api/v1/inventory/balances')
      .query({ businessId: businessAId, productId: productA.body.data.id })
      .set(ownerAccess);
    const denied = await request(app)
      .get('/api/v1/inventory/balances')
      .query({ businessId: businessBId })
      .set(managerAccess);

    expect(productA.status).toBe(201);
    expect(productB.status).toBe(201);
    expect(scopedBalance.status).toBe(200);
    expect(scopedBalance.body.data).toEqual([
      expect.objectContaining({
        businessId: businessAId,
        currentQuantity: 4,
        netMovementQuantity: 0,
        openingStock: 4,
        productId: productA.body.data.id
      })
    ]);
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('BRANCH_ACCESS_DENIED');
  });
});
