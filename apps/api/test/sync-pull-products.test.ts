import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';
import { pullSyncChanges } from './helpers/sync-pull.js';

describe('sync pull product changes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let businessAId: string;
  let businessBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];

  beforeEach(async () => {
    ({ app, businessAId, businessBId, loginAs } = await createCatalogTestContext());
  });

  it('returns server-authored product upserts for create and later update', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const created = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Sync Cola',
      sellingPrice: 4000
    });
    const firstPull = await pullSyncChanges(app, managerAccess);
    const updated = await request(app)
      .patch(`/api/v1/products/${created.body.data.id}`)
      .set(managerAccess)
      .send({ name: 'Sync Cola Zero', sellingPrice: 4500 });
    const secondPull = await pullSyncChanges(app, managerAccess, {
      cursor: firstPull.body.data.nextCursor
    });

    expect(created.status).toBe(201);
    expect(firstPull.status).toBe(200);
    expect(firstPull.body.data.changes).toHaveLength(1);
    expect(firstPull.body.data.changes[0]).toMatchObject({
      businessId: businessAId,
      changeType: 'PRODUCT_UPSERTED',
      source: 'SERVER',
      record: expect.objectContaining({
        businessId: businessAId,
        id: created.body.data.id,
        name: 'Sync Cola',
        sellingPrice: 4000
      })
    });
    expect(updated.status).toBe(200);
    expect(secondPull.status).toBe(200);
    expect(secondPull.body.data.changes).toHaveLength(1);
    expect(secondPull.body.data.changes[0]).toMatchObject({
      businessId: businessAId,
      changeType: 'PRODUCT_UPSERTED',
      source: 'SERVER',
      record: expect.objectContaining({
        businessId: businessAId,
        id: created.body.data.id,
        name: 'Sync Cola Zero',
        sellingPrice: 4500
      })
    });
    expect(secondPull.body.data.changes[0].changeId).not.toBe(firstPull.body.data.changes[0].changeId);
  });

  it('limits product pull changes to businesses reachable through the caller branch scope', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const ownerAccess = await loginAs('owner@example.com');
    const cashierAccess = await loginAs('cashier@example.com');

    await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Branch A Product',
      sellingPrice: 1100
    });
    await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Branch B Product',
      sellingPrice: 2200
    });

    const pulled = await pullSyncChanges(app, cashierAccess);

    expect(pulled.status).toBe(200);
    expect(pulled.body.data.changes).toHaveLength(1);
    expect(pulled.body.data.changes[0]).toMatchObject({
      businessId: businessAId,
      changeType: 'PRODUCT_UPSERTED',
      source: 'SERVER',
      record: expect.objectContaining({
        businessId: businessAId,
        name: 'Branch A Product'
      })
    });
  });
});
