import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';
import { pullSyncChanges } from './helpers/sync-pull.js';

describe('sync pull catalog master changes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let businessAId: string;
  let businessBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];

  beforeEach(async () => {
    ({ app, businessAId, businessBId, loginAs } = await createCatalogTestContext());
  });

  it('returns first-class category, unit, and tax-profile changes for create and later update', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const category = await request(app).post('/api/v1/categories').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Beverages'
    });
    const unit = await request(app).post('/api/v1/units').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Bottle',
      symbol: 'btl'
    });
    const taxProfile = await request(app)
      .post('/api/v1/tax-profiles')
      .set(ownerAccess)
      .send({
        businessId: businessAId,
        name: 'GST 18',
        rateBasisPoints: 1800
      });

    const firstPull = await pullSyncChanges(app, ownerAccess);
    expect(category.status).toBe(201);
    expect(unit.status).toBe(201);
    expect(taxProfile.status).toBe(201);
    expect(firstPull.status).toBe(200);

    await request(app)
      .patch(`/api/v1/categories/${category.body.data.id}`)
      .set(ownerAccess)
      .send({ name: 'Soft Drinks' });
    await request(app)
      .patch(`/api/v1/units/${unit.body.data.id}`)
      .set(ownerAccess)
      .send({ symbol: 'bot' });
    await request(app)
      .patch(`/api/v1/tax-profiles/${taxProfile.body.data.id}`)
      .set(ownerAccess)
      .send({ rateBasisPoints: 1200 });

    const secondPull = await pullSyncChanges(app, ownerAccess, {
      cursor: firstPull.body.data.nextCursor
    });

    expect(firstPull.body.data.changes).toHaveLength(3);
    expect(firstPull.body.data.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          businessId: businessAId,
          changeType: 'CATEGORY_UPSERTED',
          source: 'SERVER',
          record: expect.objectContaining({ id: category.body.data.id, name: 'Beverages' })
        }),
        expect.objectContaining({
          businessId: businessAId,
          changeType: 'UNIT_UPSERTED',
          source: 'SERVER',
          record: expect.objectContaining({
            id: unit.body.data.id,
            name: 'Bottle',
            symbol: 'btl'
          })
        }),
        expect.objectContaining({
          businessId: businessAId,
          changeType: 'TAX_PROFILE_UPSERTED',
          source: 'SERVER',
          record: expect.objectContaining({
            id: taxProfile.body.data.id,
            name: 'GST 18',
            rateBasisPoints: 1800
          })
        })
      ])
    );
    expect(secondPull.status).toBe(200);
    expect(secondPull.body.data.changes).toHaveLength(3);
    expect(secondPull.body.data.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          businessId: businessAId,
          changeType: 'CATEGORY_UPSERTED',
          source: 'SERVER',
          record: expect.objectContaining({ id: category.body.data.id, name: 'Soft Drinks' })
        }),
        expect.objectContaining({
          businessId: businessAId,
          changeType: 'UNIT_UPSERTED',
          source: 'SERVER',
          record: expect.objectContaining({ id: unit.body.data.id, symbol: 'bot' })
        }),
        expect.objectContaining({
          businessId: businessAId,
          changeType: 'TAX_PROFILE_UPSERTED',
          source: 'SERVER',
          record: expect.objectContaining({
            id: taxProfile.body.data.id,
            rateBasisPoints: 1200
          })
        })
      ])
    );
  });

  it('limits catalog master pull changes to businesses reachable through the caller branch scope', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const cashierAccess = await loginAs('cashier@example.com');

    await request(app).post('/api/v1/categories').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Branch A Category'
    });
    await request(app).post('/api/v1/units').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Branch B Unit'
    });
    await request(app)
      .post('/api/v1/tax-profiles')
      .set(ownerAccess)
      .send({
        businessId: businessBId,
        name: 'Branch B Tax',
        rateBasisPoints: 500
      });

    const pulled = await pullSyncChanges(app, cashierAccess);

    expect(pulled.status).toBe(200);
    expect(pulled.body.data.changes).toHaveLength(1);
    expect(pulled.body.data.changes[0]).toMatchObject({
      businessId: businessAId,
      changeType: 'CATEGORY_UPSERTED',
      source: 'SERVER',
      record: expect.objectContaining({
        businessId: businessAId,
        name: 'Branch A Category'
      })
    });
  });
});
