import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleSyncRepository } from '../src/modules/sync/drizzle-sync.repository.js';
import { buildSyncEventPullChangeKey } from '../src/modules/sync/sync-pull-cursor.js';
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

  it('stores each tenant event once and returns applied duplicates after state updates', async () => {
    const { branchId } = await seedBranch(database.db);
    const repository = new DrizzleSyncRepository(database.db);

    const acceptedResults = await repository.createReceivedEvents([
      buildSyncEvent(branchId, 'evt-sale-1', 'sale-1', { saleId: 'sale-1' })
    ]);
    const accepted = acceptedResults[0]!;
    const applied = await repository.updateEventState(tenantA, 'evt-sale-1', {
      failure: null,
      state: 'APPLIED'
    });
    const duplicateResults = await repository.createReceivedEvents([
      buildSyncEvent(branchId, 'evt-sale-1', 'sale-1', { saleId: 'sale-1' })
    ]);
    const duplicate = duplicateResults[0]!;

    expect(accepted.result).toBe('accepted');
    expect(accepted.event.state).toBe('RECEIVED');
    expect(applied).toMatchObject({ eventId: 'evt-sale-1', state: 'APPLIED' });
    expect(duplicate.result).toBe('duplicate');
    expect(duplicate.event.id).toBe(accepted.event.id);
    expect(duplicate.event.receivedAt.toISOString()).toBe(accepted.event.receivedAt.toISOString());
    expect(duplicate.event.state).toBe('APPLIED');
    expect(duplicate.event.failure).toBeNull();
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

  it('persists and clears failure diagnostics across replay state updates', async () => {
    const { branchId } = await seedBranch(database.db);
    const repository = new DrizzleSyncRepository(database.db);
    const failedAt = new Date('2026-08-27T10:15:00.000Z');

    await repository.createReceivedEvents([
      buildSyncEvent(branchId, 'evt-sale-2', 'sale-2', { saleId: 'sale-2' })
    ]);

    const failed = await repository.updateEventState(tenantA, 'evt-sale-2', {
      failure: {
        code: 'VALIDATION_ERROR',
        failedAt,
        message: 'Too small: expected array to have >=1 items',
        statusCode: 400
      },
      state: 'FAILED'
    });
    const duplicateWhileFailed = (
      await repository.createReceivedEvents([
        buildSyncEvent(branchId, 'evt-sale-2', 'sale-2', { saleId: 'sale-2' })
      ])
    )[0]!;
    const applied = await repository.updateEventState(tenantA, 'evt-sale-2', {
      failure: null,
      state: 'APPLIED'
    });

    expect(failed).not.toBeNull();
    expect(failed?.state).toBe('FAILED');
    expect(failed?.failure).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Too small: expected array to have >=1 items',
      statusCode: 400
    });
    expect(failed?.failure?.failedAt.toISOString()).toBe(failedAt.toISOString());
    expect(duplicateWhileFailed.event.state).toBe('FAILED');
    expect(duplicateWhileFailed.event.failure?.failedAt.toISOString()).toBe(failedAt.toISOString());
    expect(applied?.state).toBe('APPLIED');
    expect(applied?.failure).toBeNull();
  });

  it('lists applied pull events by branch scope and updated-at cursor order', async () => {
    const { branchAId, branchBId } = await seedBranches(database.db);
    const repository = new DrizzleSyncRepository(database.db);

    await repository.createReceivedEvents([
      buildSyncEvent(branchAId, 'evt-a-sale-1', 'sale-1', { saleId: 'sale-1' }),
      buildSyncEvent(branchAId, 'evt-b-sale-2', 'sale-2', { saleId: 'sale-2' }),
      buildSyncEvent(branchBId, 'evt-c-sale-3', 'sale-3', { saleId: 'sale-3' })
    ]);

    await repository.updateEventState(tenantA, 'evt-a-sale-1', { failure: null, state: 'APPLIED' });
    await repository.updateEventState(tenantA, 'evt-b-sale-2', { failure: null, state: 'APPLIED' });
    await repository.updateEventState(tenantA, 'evt-c-sale-3', { failure: null, state: 'APPLIED' });

    const firstPage = await repository.listPullEvents({
      branchIds: [branchAId],
      limit: 1,
      tenantId: tenantA
    });
    const secondPage = await repository.listPullEvents({
      branchIds: [branchAId],
      cursor: {
        changeKey: buildSyncEventPullChangeKey(firstPage[0]!.eventId),
        updatedAt: firstPage[0]!.updatedAt
      },
      limit: 10,
      tenantId: tenantA
    });

    expect(firstPage.map((event) => event.eventId)).toEqual(['evt-a-sale-1']);
    expect(secondPage.map((event) => event.eventId)).toEqual(['evt-b-sale-2']);
    expect(secondPage.every((event) => event.branchId === branchAId)).toBe(true);
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

const seedBranches = async (db: Awaited<ReturnType<typeof createMemoryDatabase>>['db']) => {
  const repository = new DrizzleTenantCoreRepository(db);

  await repository.createTenant({ id: tenantA, name: 'Tenant A', slug: 'tenant-a' });
  const business = await repository.createBusiness({
    code: 'STORE-A',
    name: 'Store A',
    tenantId: tenantA
  });
  const branchA = await repository.createBranch({
    address: 'Main Road',
    businessId: business.id,
    code: 'BR-A1',
    name: 'Store A Main',
    tenantId: tenantA
  });
  const branchB = await repository.createBranch({
    address: 'Annex Road',
    businessId: business.id,
    code: 'BR-A2',
    name: 'Store A Annex',
    tenantId: tenantA
  });

  return { branchAId: branchA.id, branchBId: branchB.id };
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
