import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleSyncRepository } from '../src/modules/sync/drizzle-sync.repository.js';
import { SyncEventConflictError } from '../src/modules/sync/sync.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantA = '11111111-1111-4111-8111-111111111111';

describe('DrizzleSyncRepository', () => {
  let close: () => Promise<void>;
  let database: Awaited<ReturnType<typeof createMemoryDatabase>>;

  beforeEach(async () => {
    database = await createMemoryDatabase();
    close = database.close;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('stores each tenant event once and reports duplicates on retry', async () => {
    const { branchId } = await seedBranch(database.db);
    const repository = new DrizzleSyncRepository(database.db);

    const acceptedResults = await repository.createReceivedEvents([
      buildSyncEvent(branchId, 'evt-sale-1', 'sale-1', { saleId: 'sale-1' })
    ]);
    const duplicateResults = await repository.createReceivedEvents([
      buildSyncEvent(branchId, 'evt-sale-1', 'sale-1', { saleId: 'sale-1' })
    ]);
    const accepted = acceptedResults[0]!;
    const duplicate = duplicateResults[0]!;

    expect(accepted.result).toBe('accepted');
    expect(accepted.event.state).toBe('RECEIVED');
    expect(duplicate.result).toBe('duplicate');
    expect(duplicate.event.id).toBe(accepted.event.id);
    expect(duplicate.event.receivedAt.toISOString()).toBe(accepted.event.receivedAt.toISOString());
  });

  it('rolls back a batch when an existing event id is reused with different content', async () => {
    const { branchId } = await seedBranch(database.db);
    const repository = new DrizzleSyncRepository(database.db);
    const newEvent = buildSyncEvent(branchId, 'evt-purchase-2', 'purchase-2', {
      purchaseId: 'purchase-2'
    });

    await repository.createReceivedEvents([
      buildSyncEvent(branchId, 'evt-sale-1', 'sale-1', { saleId: 'sale-1' })
    ]);

    await expect(
      repository.createReceivedEvents([
        newEvent,
        buildSyncEvent(branchId, 'evt-sale-1', 'sale-1', { saleId: 'sale-1', totalAmount: 5200 })
      ])
    ).rejects.toBeInstanceOf(SyncEventConflictError);

    const retriedResults = await repository.createReceivedEvents([newEvent]);
    const retriedNewEvent = retriedResults[0]!;
    expect(retriedNewEvent.result).toBe('accepted');
  });
});

const seedBranch = async (db: Awaited<ReturnType<typeof createMemoryDatabase>>['db']) => {
  const repository = new DrizzleTenantCoreRepository(db);

  await repository.createTenant({ id: tenantA, name: 'Tenant A', slug: 'tenant-a' });
  const business = await repository.createBusiness({
    code: 'STORE-A',
    name: 'Store A',
    tenantId: tenantA
  });
  const branch = await repository.createBranch({
    address: 'Main Road',
    businessId: business.id,
    code: 'BR-A1',
    name: 'Store A Main',
    tenantId: tenantA
  });

  return { branchId: branch.id };
};

const buildSyncEvent = (
  branchId: string,
  eventId: string,
  entityId: string,
  payload: Record<string, unknown>
) => ({
  branchId,
  deviceId: 'device-01',
  entityId,
  eventCreatedAt: new Date('2026-08-27T09:30:00.000Z'),
  eventId,
  payload,
  tenantId: tenantA,
  type: eventId.startsWith('evt-purchase') ? 'PURCHASE_CREATED' : 'SALE_CREATED'
});
