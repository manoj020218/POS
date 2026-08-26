import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('sale return routes', () => {
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

  it('creates corrective sale return movements and restores inventory balance', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const product = await request(app).post('/api/v1/products').set(managerAccess).send({
      lowStockLevel: 3,
      name: 'Return Cola',
      openingStock: 10,
      sellingPrice: 4000,
      trackInventory: true
    });
    const sale = await request(app).post('/api/v1/sales').set(managerAccess).send({
      branchId: branchAId,
      items: [
        {
          productId: product.body.data.id,
          quantity: 3
        }
      ],
      payment: {
        method: 'CARD'
      },
      terminalId: terminalAId
    });
    const saleReturn = await request(app)
      .post(`/api/v1/sales/${sale.body.data.id}/returns`)
      .set(managerAccess)
      .send({
        items: [
          {
            productId: product.body.data.id,
            quantity: 1
          }
        ]
      });
    const balance = await request(app)
      .get('/api/v1/inventory/balances')
      .query({ businessId: businessAId, productId: product.body.data.id })
      .set(managerAccess);

    expect(product.status).toBe(201);
    expect(sale.status).toBe(201);
    expect(saleReturn.status).toBe(201);
    expect(saleReturn.body.data).toEqual({
      branchId: branchAId,
      businessId: businessAId,
      items: [
        expect.objectContaining({
          productId: product.body.data.id,
          productName: 'Return Cola',
          quantity: 1,
          remainingQuantity: 2,
          returnedQuantityTotal: 1
        })
      ],
      occurredAt: expect.any(String),
      saleId: sale.body.data.id
    });
    expect(balance.status).toBe(200);
    expect(balance.body.data).toEqual([
      expect.objectContaining({
        currentQuantity: 8,
        netMovementQuantity: -2,
        openingStock: 10,
        productId: product.body.data.id
      })
    ]);
  });

  it('rejects duplicate return products and quantities beyond the remaining sold quantity', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const product = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Return Guard',
      openingStock: 5,
      sellingPrice: 2500,
      trackInventory: true
    });
    const sale = await request(app).post('/api/v1/sales').set(managerAccess).send({
      branchId: branchAId,
      items: [
        {
          productId: product.body.data.id,
          quantity: 2
        }
      ],
      payment: {
        method: 'CARD'
      },
      terminalId: terminalAId
    });
    const duplicate = await request(app)
      .post(`/api/v1/sales/${sale.body.data.id}/returns`)
      .set(managerAccess)
      .send({
        items: [
          {
            productId: product.body.data.id,
            quantity: 1
          },
          {
            productId: product.body.data.id,
            quantity: 1
          }
        ]
      });
    const firstReturn = await request(app)
      .post(`/api/v1/sales/${sale.body.data.id}/returns`)
      .set(managerAccess)
      .send({
        items: [
          {
            productId: product.body.data.id,
            quantity: 1
          }
        ]
      });
    const overflow = await request(app)
      .post(`/api/v1/sales/${sale.body.data.id}/returns`)
      .set(managerAccess)
      .send({
        items: [
          {
            productId: product.body.data.id,
            quantity: 2
          }
        ]
      });

    expect(duplicate.status).toBe(400);
    expect(duplicate.body.code).toBe('DUPLICATE_SALE_RETURN_PRODUCT');
    expect(firstReturn.status).toBe(201);
    expect(overflow.status).toBe(409);
    expect(overflow.body.code).toBe('RETURN_QUANTITY_EXCEEDS_SOLD');
  });

  it('enforces refund permission and branch scope on sale returns', async () => {
    const cashierAccess = await loginAs('cashier@example.com');
    const ownerAccess = await loginAs('owner@example.com');
    const managerAccess = await loginAs('manager@example.com');
    const productA = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Cashier Return Denied',
      openingStock: 4,
      sellingPrice: 1200,
      trackInventory: true
    });
    const saleA = await request(app).post('/api/v1/sales').set(ownerAccess).send({
      branchId: branchAId,
      items: [
        {
          productId: productA.body.data.id,
          quantity: 1
        }
      ],
      payment: {
        method: 'CARD'
      },
      terminalId: terminalAId
    });
    const productB = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Scoped Return Product',
      openingStock: 6,
      sellingPrice: 1400,
      trackInventory: true
    });
    const saleB = await request(app).post('/api/v1/sales').set(ownerAccess).send({
      branchId: branchBId,
      items: [
        {
          productId: productB.body.data.id,
          quantity: 1
        }
      ],
      payment: {
        method: 'CARD'
      },
      terminalId: terminalBId
    });
    const cashierDenied = await request(app)
      .post(`/api/v1/sales/${saleA.body.data.id}/returns`)
      .set(cashierAccess)
      .send({
        items: [
          {
            productId: productA.body.data.id,
            quantity: 1
          }
        ]
      });
    const scopeDenied = await request(app)
      .post(`/api/v1/sales/${saleB.body.data.id}/returns`)
      .set(managerAccess)
      .send({
        items: [
          {
            productId: productB.body.data.id,
            quantity: 1
          }
        ]
      });

    expect(cashierDenied.status).toBe(403);
    expect(cashierDenied.body.code).toBe('FORBIDDEN');
    expect(scopeDenied.status).toBe(403);
    expect(scopeDenied.body.code).toBe('BRANCH_ACCESS_DENIED');
  });
});
