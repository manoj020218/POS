import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import type { SyncRepository } from '../src/modules/sync/sync.repository.js';
import type { CreateSyncEventInput } from '../src/modules/sync/sync.types.js';
import { createCatalogTestContext } from './helpers/catalog-app.js';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('sync replay failure capture', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let branchAId: string;
  let businessAId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];
  let syncRepository: SyncRepository;
  let terminalAId: string;

  beforeEach(async () => {
    ({ app, branchAId, businessAId, loginAs, syncRepository, terminalAId } =
      await createCatalogTestContext());
  });

  it('marks permission-denied replay events as FAILED and reapplies them on a later retry', async () => {
    const inventoryAccess = await loginAs('inventory@example.com');
    const cashierAccess = await loginAs('cashier@example.com');
    const product = await request(app).post('/api/v1/products').set(inventoryAccess).send({
      name: 'Synced Rice',
      openingStock: 2,
      purchasePrice: 1500,
      sellingPrice: 2200,
      trackInventory: true
    });
    const supplier = await request(app).post('/api/v1/suppliers').set(inventoryAccess).send({
      name: 'Sync Supplier'
    });
    const event = buildSyncEvent(branchAId, 'evt-purchase-1', 'purchase-1', 'PURCHASE_CREATED', {
      items: [{ productId: product.body.data.id, quantity: 4 }],
      notes: 'Synced purchase',
      referenceNumber: 'SYNC-PUR-1',
      supplierId: supplier.body.data.id
    });

    const denied = await request(app)
      .post('/api/v1/sync/push')
      .set(cashierAccess)
      .send({ events: [event] });
    const failed = await readStoredEvent(syncRepository, event);
    const applied = await request(app)
      .post('/api/v1/sync/push')
      .set(inventoryAccess)
      .send({ events: [event] });
    const recovered = await readStoredEvent(syncRepository, event);
    const purchases = await request(app)
      .get('/api/v1/purchases')
      .query({ branchId: branchAId })
      .set(inventoryAccess);
    const balances = await request(app)
      .get('/api/v1/inventory/balances')
      .query({ businessId: businessAId })
      .set(inventoryAccess);

    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('FORBIDDEN');
    expect(failed.state).toBe('FAILED');
    expect(failed.failure).toMatchObject({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
      statusCode: 403
    });
    expect(applied.status).toBe(200);
    expect(applied.body.data).toMatchObject({
      acceptedCount: 0,
      duplicateCount: 1,
      events: [
        expect.objectContaining({
          eventId: 'evt-purchase-1',
          result: 'duplicate',
          state: 'APPLIED'
        })
      ]
    });
    expect(recovered.state).toBe('APPLIED');
    expect(recovered.failure).toBeNull();
    expect(purchases.body.data).toEqual([
      expect.objectContaining({
        referenceNumber: 'SYNC-PUR-1',
        supplierName: 'Sync Supplier',
        totalAmount: 6000,
        totalQuantity: 4
      })
    ]);
    expect(balances.body.data).toEqual([
      expect.objectContaining({
        currentQuantity: 6,
        netMovementQuantity: 4,
        productId: product.body.data.id
      })
    ]);
  });

  it('marks validation failures as FAILED with stored diagnostics', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const cashierAccess = await loginAs('cashier@example.com');
    const product = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Broken Sale Cola',
      openingStock: 5,
      sellingPrice: 4000,
      trackInventory: true
    });
    const event = buildSyncEvent(branchAId, 'evt-sale-invalid-1', 'sale-invalid-1', 'SALE_CREATED', {
      items: [],
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });

    const response = await request(app)
      .post('/api/v1/sync/push')
      .set(cashierAccess)
      .send({ events: [event] });
    const failed = await readStoredEvent(syncRepository, event);

    expect(product.status).toBe(201);
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(failed.state).toBe('FAILED');
    expect(failed.failure).toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400
    });
    expect(failed.failure?.message.length).toBeGreaterThan(0);
  });
});

const readStoredEvent = async (
  repository: SyncRepository,
  event: ReturnType<typeof buildSyncEvent>
) => {
  const [result] = await repository.createReceivedEvents([toStoredEventInput(event)]);
  return result!.event;
};

const toStoredEventInput = (
  event: ReturnType<typeof buildSyncEvent>
): CreateSyncEventInput => ({
  branchId: event.branchId,
  deviceId: event.deviceId,
  entityId: event.entityId,
  eventCreatedAt: new Date(event.createdAt),
  eventId: event.eventId,
  payload: event.payload,
  tenantId,
  type: event.type
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
