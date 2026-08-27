import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('sync push routes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let branchAId: string;
  let branchBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];

  beforeEach(async () => {
    ({ app, branchAId, branchBId, loginAs } = await createCatalogTestContext());
  });

  it('accepts received events once and reports duplicates on retry', async () => {
    const cashierAccess = await loginAs('cashier@example.com');
    const payload = {
      events: [
        buildSyncEvent(branchAId, 'evt-sale-1', 'sale-1', 'SALE_CREATED', { saleId: 'sale-1' }),
        buildSyncEvent(branchAId, 'evt-sale-2', 'sale-2', 'SALE_CREATED', { saleId: 'sale-2' })
      ]
    };

    const accepted = await request(app).post('/api/v1/sync/push').set(cashierAccess).send(payload);
    const duplicate = await request(app).post('/api/v1/sync/push').set(cashierAccess).send(payload);

    expect(accepted.status).toBe(200);
    expect(accepted.body.data).toMatchObject({
      acceptedCount: 2,
      duplicateCount: 0,
      events: [
        expect.objectContaining({ eventId: 'evt-sale-1', result: 'accepted', state: 'RECEIVED' }),
        expect.objectContaining({ eventId: 'evt-sale-2', result: 'accepted', state: 'RECEIVED' })
      ]
    });
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.data).toMatchObject({
      acceptedCount: 0,
      duplicateCount: 2,
      events: [
        expect.objectContaining({ eventId: 'evt-sale-1', result: 'duplicate', state: 'RECEIVED' }),
        expect.objectContaining({ eventId: 'evt-sale-2', result: 'duplicate', state: 'RECEIVED' })
      ]
    });
  });

  it('rejects sync pushes outside the caller branch scope', async () => {
    const managerAccess = await loginAs('manager@example.com');

    const response = await request(app)
      .post('/api/v1/sync/push')
      .set(managerAccess)
      .send({
        events: [
          buildSyncEvent(branchBId, 'evt-sale-b', 'sale-b', 'SALE_CREATED', { saleId: 'sale-b' })
        ]
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('BRANCH_ACCESS_DENIED');
  });

  it('rejects event id reuse when the payload changes', async () => {
    const cashierAccess = await loginAs('cashier@example.com');
    const original = buildSyncEvent(branchAId, 'evt-sale-1', 'sale-1', 'SALE_CREATED', {
      saleId: 'sale-1'
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
          buildSyncEvent(branchAId, 'evt-sale-1', 'sale-1', 'SALE_CREATED', {
            saleId: 'sale-1',
            totalAmount: 4200
          })
        ]
      });

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
