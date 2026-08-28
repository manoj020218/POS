import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('purchase routes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let branchAId: string;
  let businessAId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];

  beforeEach(async () => {
    ({ app, branchAId, businessAId, loginAs } = await createCatalogTestContext());
  });

  it('creates a purchase that increases inventory and stores supplier snapshots', async () => {
    const inventoryAccess = await loginAs('inventory@example.com');
    const supplier = await request(app).post('/api/v1/suppliers').set(inventoryAccess).send({
      name: 'Stock Partner'
    });
    const productA = await request(app).post('/api/v1/products').set(inventoryAccess).send({
      name: 'Bulk Rice',
      openingStock: 4,
      purchasePrice: 2200,
      sellingPrice: 3000,
      trackInventory: true
    });
    const productB = await request(app).post('/api/v1/products').set(inventoryAccess).send({
      name: 'Bulk Flour',
      openingStock: 1,
      sellingPrice: 2500,
      trackInventory: true
    });
    const created = await request(app).post('/api/v1/purchases').set(inventoryAccess).send({
      branchId: branchAId,
      items: [
        { productId: productA.body.data.id, quantity: 3 },
        { productId: productB.body.data.id, quantity: 2, unitCost: 1500 }
      ],
      notes: 'warehouse receipt',
      referenceNumber: 'BILL-001',
      supplierId: supplier.body.data.id
    });
    const balances = await request(app)
      .get('/api/v1/inventory/balances')
      .query({ businessId: businessAId })
      .set(inventoryAccess);
    const listed = await request(app).get('/api/v1/purchases').set(inventoryAccess);

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      branchId: branchAId,
      businessId: businessAId,
      itemCount: 2,
      notes: 'warehouse receipt',
      referenceNumber: 'BILL-001',
      supplierId: supplier.body.data.id,
      supplierName: 'Stock Partner',
      totalAmount: 9600,
      totalQuantity: 5
    });
    expect(created.body.data.items).toEqual([
      expect.objectContaining({
        productId: productA.body.data.id,
        quantity: 3,
        totalCost: 6600,
        unitCost: 2200
      }),
      expect.objectContaining({
        productId: productB.body.data.id,
        quantity: 2,
        totalCost: 3000,
        unitCost: 1500
      })
    ]);
    expect(balances.status).toBe(200);
    expect(balances.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentQuantity: 7,
          netMovementQuantity: 3,
          productId: productA.body.data.id
        }),
        expect.objectContaining({
          currentQuantity: 3,
          netMovementQuantity: 2,
          productId: productB.body.data.id
        })
      ])
    );
    expect(listed.status).toBe(200);
    expect(listed.body.data[0]).toMatchObject({
      id: created.body.data.id,
      supplierName: 'Stock Partner',
      totalAmount: 9600
    });
  });

  it(
    'rejects duplicate items, missing unit costs, and non-tracked products',
    async () => {
      const inventoryAccess = await loginAs('inventory@example.com');
      const tracked = await request(app).post('/api/v1/products').set(inventoryAccess).send({
        name: 'Cost Required Product',
        openingStock: 2,
        sellingPrice: 1200,
        trackInventory: true
      });
      const nonTracked = await request(app).post('/api/v1/products').set(inventoryAccess).send({
        name: 'Service Purchase',
        openingStock: 0,
        sellingPrice: 500,
        trackInventory: false
      });

      const duplicate = await request(app).post('/api/v1/purchases').set(inventoryAccess).send({
        branchId: branchAId,
        items: [
          { productId: tracked.body.data.id, quantity: 1, unitCost: 500 },
          { productId: tracked.body.data.id, quantity: 2, unitCost: 500 }
        ]
      });
      const missingCost = await request(app).post('/api/v1/purchases').set(inventoryAccess).send({
        branchId: branchAId,
        items: [{ productId: tracked.body.data.id, quantity: 1 }]
      });
      const nonTrackedPurchase = await request(app)
        .post('/api/v1/purchases')
        .set(inventoryAccess)
        .send({
          branchId: branchAId,
          items: [{ productId: nonTracked.body.data.id, quantity: 1, unitCost: 500 }]
        });

      expect(duplicate.status).toBe(400);
      expect(duplicate.body.code).toBe('DUPLICATE_PURCHASE_PRODUCT');
      expect(missingCost.status).toBe(400);
      expect(missingCost.body.code).toBe('PURCHASE_UNIT_COST_REQUIRED');
      expect(nonTrackedPurchase.status).toBe(409);
      expect(nonTrackedPurchase.body.code).toBe('PURCHASE_PRODUCT_NOT_TRACKED');
    },
    15000
  );
});
