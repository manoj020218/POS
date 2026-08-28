import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';
import { pullSyncChanges } from './helpers/sync-pull.js';

describe('sync pull customer changes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let businessAId: string;
  let businessBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];

  beforeEach(async () => {
    ({ app, businessAId, businessBId, loginAs } = await createCatalogTestContext());
  });

  it('returns customer upserts for create and later update', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const created = await request(app).post('/api/v1/customers').set(managerAccess).send({
      mobile: '9876543210'
    });
    const firstPull = await pullSyncChanges(app, managerAccess);
    const firstCustomerChange = firstPull.body.data.changes.find(
      (change: { changeType: string; record: { id: string } }) =>
        change.changeType === 'CUSTOMER_UPSERTED' && change.record.id === created.body.data.id
    );
    const updated = await request(app)
      .patch(`/api/v1/customers/${created.body.data.id}`)
      .set(managerAccess)
      .send({ name: 'Alice', notes: 'priority' });
    const secondPull = await pullSyncChanges(app, managerAccess, {
      cursor: firstPull.body.data.nextCursor
    });

    expect(created.status).toBe(201);
    expect(firstPull.status).toBe(200);
    expect(firstPull.body.data.changes).toHaveLength(1);
    expect(firstCustomerChange).toMatchObject({
      businessId: businessAId,
      changeType: 'CUSTOMER_UPSERTED',
      source: 'SERVER',
      record: expect.objectContaining({
        businessId: businessAId,
        id: created.body.data.id,
        mobile: '9876543210',
        name: '9876543210'
      })
    });
    expect(updated.status).toBe(200);
    expect(secondPull.status).toBe(200);
    expect(secondPull.body.data.changes).toHaveLength(1);
    expect(secondPull.body.data.changes[0]).toMatchObject({
      businessId: businessAId,
      changeType: 'CUSTOMER_UPSERTED',
      source: 'SERVER',
      record: expect.objectContaining({
        businessId: businessAId,
        id: created.body.data.id,
        name: 'Alice',
        notes: 'priority'
      })
    });
    expect(secondPull.body.data.changes[0].changeId).not.toBe(firstCustomerChange.changeId);
  });

  it('limits customer pull changes to businesses reachable through the caller branch scope', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const ownerAccess = await loginAs('owner@example.com');
    const cashierAccess = await loginAs('cashier@example.com');

    await request(app).post('/api/v1/customers').set(managerAccess).send({
      name: 'Branch A Customer'
    });
    await request(app).post('/api/v1/customers').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Branch B Customer'
    });

    const pulled = await pullSyncChanges(app, cashierAccess);
    const customerChanges = pulled.body.data.changes.filter(
      (change: { changeType: string }) => change.changeType === 'CUSTOMER_UPSERTED'
    );

    expect(pulled.status).toBe(200);
    expect(customerChanges).toHaveLength(1);
    expect(customerChanges[0]).toMatchObject({
      businessId: businessAId,
      changeType: 'CUSTOMER_UPSERTED',
      source: 'SERVER',
      record: expect.objectContaining({
        businessId: businessAId,
        name: 'Branch A Customer'
      })
    });
  });
});
