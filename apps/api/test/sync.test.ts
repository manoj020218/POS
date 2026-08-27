import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('sync push routes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let branchAId: string;
  let branchBId: string;
  let businessAId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];
  let terminalAId: string;

  beforeEach(async () => {
    ({ app, branchAId, branchBId, businessAId, loginAs, terminalAId } =
      await createCatalogTestContext());
  });

  it('applies SALE_CREATED events once and keeps retries idempotent', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const cashierAccess = await loginAs('cashier@example.com');
    const product = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Synced Cola',
      openingStock: 5,
      sellingPrice: 4000,
      trackInventory: true
    });
    const payload = {
      events: [
        buildSyncEvent(branchAId, 'evt-sale-1', 'sale-1', 'SALE_CREATED', {
          items: [{ productId: product.body.data.id, quantity: 2 }],
          payment: { method: 'CARD' },
          terminalId: terminalAId
        })
      ]
    };

    const accepted = await request(app).post('/api/v1/sync/push').set(cashierAccess).send(payload);
    const duplicate = await request(app).post('/api/v1/sync/push').set(cashierAccess).send(payload);
    const balances = await request(app)
      .get('/api/v1/inventory/balances')
      .query({ businessId: businessAId })
      .set(ownerAccess);

    expect(product.status).toBe(201);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data).toMatchObject({
      acceptedCount: 1,
      duplicateCount: 0,
      events: [expect.objectContaining({ eventId: 'evt-sale-1', result: 'accepted', state: 'APPLIED' })]
    });
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.data).toMatchObject({
      acceptedCount: 0,
      duplicateCount: 1,
      events: [expect.objectContaining({ eventId: 'evt-sale-1', result: 'duplicate', state: 'APPLIED' })]
    });
    expect(balances.status).toBe(200);
    expect(balances.body.data).toEqual([
      expect.objectContaining({
        currentQuantity: 3,
        netMovementQuantity: -2,
        productId: product.body.data.id
      })
    ]);
  });

  it('rejects sync pushes outside the caller branch scope', async () => {
    const managerAccess = await loginAs('manager@example.com');

    const response = await request(app)
      .post('/api/v1/sync/push')
      .set(managerAccess)
      .send({
        events: [
          buildSyncEvent(branchBId, 'evt-sale-b', 'sale-b', 'SALE_CREATED', {
            items: [],
            payment: { method: 'CARD' },
            terminalId: terminalAId
          })
        ]
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('BRANCH_ACCESS_DENIED');
  });

  it('rejects event id reuse when the payload changes', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const cashierAccess = await loginAs('cashier@example.com');
    const product = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Conflict Cola',
      openingStock: 5,
      sellingPrice: 4000,
      trackInventory: true
    });
    const original = buildSyncEvent(branchAId, 'evt-sale-9', 'sale-9', 'SALE_CREATED', {
      items: [{ productId: product.body.data.id, quantity: 1 }],
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });

    const accepted = await request(app)
      .post('/api/v1/sync/push')
      .set(cashierAccess)
      .send({ events: [original] });
    const conflicted = await request(app)
      .post('/api/v1/sync/push')
      .set(cashierAccess)
      .send({
        events: [
          buildSyncEvent(branchAId, 'evt-sale-9', 'sale-9', 'SALE_CREATED', {
            items: [{ productId: product.body.data.id, quantity: 2 }],
            payment: { method: 'CARD' },
            terminalId: terminalAId
          })
        ]
      });

    expect(product.status).toBe(201);
    expect(accepted.status).toBe(200);
    expect(conflicted.status).toBe(409);
    expect(conflicted.body.code).toBe('SYNC_EVENT_CONFLICT');
  });
});

const buildSyncEvent = (
  branchId: string,
  eventId: string,
  entityId: string,
  type: string,
  payload: Record<string, unknown>
) => ({
  branchId,
  createdAt: '2026-08-27T09:30:00.000Z',
  deviceId: 'device-01',
  entityId,
  eventId,
  payload,
  type
});
