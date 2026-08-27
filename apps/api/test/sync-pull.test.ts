import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('sync pull routes', () => {
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

  it('returns applied sync changes with an opaque next cursor', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const cashierAccess = await loginAs('cashier@example.com');
    const product = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Pull Cola',
      openingStock: 8,
      sellingPrice: 4000,
      trackInventory: true
    });

    await pushEvent(
      app,
      cashierAccess,
      buildSyncEvent(branchAId, 'evt-a-sale-1', 'sale-1', 'SALE_CREATED', {
        items: [{ productId: product.body.data.id, quantity: 1 }],
        payment: { method: 'CARD' },
        terminalId: terminalAId
      })
    );
    await pushEvent(
      app,
      cashierAccess,
      buildSyncEvent(branchAId, 'evt-b-sale-2', 'sale-2', 'SALE_CREATED', {
        items: [{ productId: product.body.data.id, quantity: 1 }],
        payment: { method: 'CARD' },
        terminalId: terminalAId
      })
    );

    const firstPage = await pullEvents(app, cashierAccess, { limit: 1 });
    const secondPage = await pullEvents(app, cashierAccess, {
      cursor: firstPage.body.data.nextCursor,
      limit: 1
    });
    const thirdPage = await pullEvents(app, cashierAccess, {
      cursor: secondPage.body.data.nextCursor,
      limit: 1
    });

    expect(product.status).toBe(201);
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data).toMatchObject({
      changes: [
        expect.objectContaining({
          branchId: branchAId,
          createdAt: '2026-08-27T09:30:00.000Z',
          eventId: 'evt-a-sale-1',
          type: 'SALE_CREATED'
        })
      ]
    });
    expect(typeof firstPage.body.data.nextCursor).toBe('string');
    expect(typeof firstPage.body.data.serverTime).toBe('string');
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data.changes.map((change: { eventId: string }) => change.eventId)).toEqual([
      'evt-b-sale-2'
    ]);
    expect(thirdPage.status).toBe(200);
    expect(thirdPage.body.data.changes).toEqual([]);
    expect(thirdPage.body.data.nextCursor).toBe(secondPage.body.data.nextCursor);
  });

  it('filters pull results to the caller branch scope and rejects out-of-scope branch filters', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const cashierAccess = await loginAs('cashier@example.com');
    const productA = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Branch A Cola',
      openingStock: 8,
      sellingPrice: 4000,
      trackInventory: true
    });
    const productB = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Branch B Cola',
      openingStock: 8,
      sellingPrice: 4000,
      trackInventory: true
    });

    await pushEvent(
      app,
      ownerAccess,
      buildSyncEvent(branchAId, 'evt-a-branch-a', 'sale-a', 'SALE_CREATED', {
        items: [{ productId: productA.body.data.id, quantity: 1 }],
        payment: { method: 'CARD' },
        terminalId: terminalAId
      })
    );
    await pushEvent(
      app,
      ownerAccess,
      buildSyncEvent(branchBId, 'evt-b-branch-b', 'sale-b', 'SALE_CREATED', {
        items: [{ productId: productB.body.data.id, quantity: 1 }],
        payment: { method: 'CARD' },
        terminalId: terminalBId
      })
    );

    const scoped = await pullEvents(app, cashierAccess);
    const denied = await pullEvents(app, cashierAccess, { branchId: branchBId });

    expect(scoped.status).toBe(200);
    expect(scoped.body.data.changes.map((change: { eventId: string }) => change.eventId)).toEqual([
      'evt-a-branch-a'
    ]);
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('BRANCH_ACCESS_DENIED');
  });

  it('returns a previously failed event after a later successful retry', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const inventoryAccess = await loginAs('inventory@example.com');
    const cashierAccess = await loginAs('cashier@example.com');
    const saleProduct = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Cursor Cola',
      openingStock: 8,
      sellingPrice: 4000,
      trackInventory: true
    });
    const purchaseProduct = await request(app).post('/api/v1/products').set(inventoryAccess).send({
      name: 'Cursor Rice',
      openingStock: 2,
      purchasePrice: 1500,
      sellingPrice: 2200,
      trackInventory: true
    });
    const supplier = await request(app).post('/api/v1/suppliers').set(inventoryAccess).send({
      name: 'Cursor Supplier'
    });

    const failedPurchase = buildSyncEvent(
      branchAId,
      'evt-z-purchase-retry',
      'purchase-1',
      'PURCHASE_CREATED',
      {
        items: [{ productId: purchaseProduct.body.data.id, quantity: 4 }],
        notes: 'Retry me',
        referenceNumber: 'SYNC-PULL-1',
        supplierId: supplier.body.data.id
      }
    );
    const visibleSale = buildSyncEvent(branchAId, 'evt-a-sale-visible', 'sale-1', 'SALE_CREATED', {
      items: [{ productId: saleProduct.body.data.id, quantity: 1 }],
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });

    const denied = await pushEvent(app, cashierAccess, failedPurchase);
    await pushEvent(app, ownerAccess, visibleSale);
    const beforeRetry = await pullEvents(app, ownerAccess);
    const retried = await pushEvent(app, inventoryAccess, failedPurchase);
    const afterRetry = await pullEvents(app, ownerAccess, {
      cursor: beforeRetry.body.data.nextCursor
    });

    expect(denied.status).toBe(403);
    expect(beforeRetry.body.data.changes.map((change: { eventId: string }) => change.eventId)).toEqual([
      'evt-a-sale-visible'
    ]);
    expect(retried.status).toBe(200);
    expect(afterRetry.status).toBe(200);
    expect(afterRetry.body.data.changes.map((change: { eventId: string }) => change.eventId)).toEqual([
      'evt-z-purchase-retry'
    ]);
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

const pushEvent = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  event: ReturnType<typeof buildSyncEvent>
) => request(app).post('/api/v1/sync/push').set(access).send({ events: [event] });

const pullEvents = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  query: Record<string, string | number> = {}
) => request(app).get('/api/v1/sync/pull').query(query).set(access);
