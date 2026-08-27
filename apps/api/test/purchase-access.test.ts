import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('purchase access', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let branchAId: string;
  let branchBId: string;
  let businessBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];

  beforeEach(async () => {
    ({ app, branchAId, branchBId, businessBId, loginAs } = await createCatalogTestContext());
  });

  it('enforces purchase permissions and branch scope for create and list', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const managerAccess = await loginAs('manager@example.com');
    const inventoryAccess = await loginAs('inventory@example.com');
    const supplier = await request(app).post('/api/v1/suppliers').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Branch B Supplier'
    });
    const product = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Branch B Stock',
      openingStock: 1,
      purchasePrice: 900,
      sellingPrice: 1500,
      trackInventory: true
    });

    const permissionDenied = await request(app).post('/api/v1/purchases').set(managerAccess).send({
      branchId: branchAId,
      items: [{ productId: product.body.data.id, quantity: 1, unitCost: 900 }]
    });
    const scopeDenied = await request(app).post('/api/v1/purchases').set(inventoryAccess).send({
      branchId: branchBId,
      items: [{ productId: product.body.data.id, quantity: 1, unitCost: 900 }],
      supplierId: supplier.body.data.id
    });
    const created = await request(app).post('/api/v1/purchases').set(ownerAccess).send({
      branchId: branchBId,
      items: [{ productId: product.body.data.id, quantity: 2 }],
      supplierId: supplier.body.data.id
    });
    const listDenied = await request(app)
      .get('/api/v1/purchases')
      .query({ branchId: branchBId })
      .set(inventoryAccess);
    const ownerListed = await request(app)
      .get('/api/v1/purchases')
      .query({ branchId: branchBId })
      .set(ownerAccess);

    expect(permissionDenied.status).toBe(403);
    expect(permissionDenied.body.code).toBe('FORBIDDEN');
    expect(scopeDenied.status).toBe(403);
    expect(scopeDenied.body.code).toBe('BRANCH_ACCESS_DENIED');
    expect(created.status).toBe(201);
    expect(listDenied.status).toBe(403);
    expect(listDenied.body.code).toBe('BRANCH_ACCESS_DENIED');
    expect(ownerListed.status).toBe(200);
    expect(ownerListed.body.data).toEqual([
      expect.objectContaining({
        id: created.body.data.id,
        supplierName: 'Branch B Supplier',
        totalQuantity: 2
      })
    ]);
  });
});
