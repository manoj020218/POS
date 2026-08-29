import type { ClientDataStore } from './client-data-store.js';
import type { ClientCustomerRecord } from './customer-repository.js';
import type { ClientProductRecord } from './product-repository.js';
import type { ClientRemoteApi } from './remote-api.js';

type UnsupportedChangeType = 'CATEGORY_UPSERTED' | 'TAX_PROFILE_UPSERTED' | 'UNIT_UPSERTED';

export const createClientSyncService = (input: {
  now?: () => Date;
  remoteApi: ClientRemoteApi;
  store: ClientDataStore;
}) => {
  const now = input.now ?? (() => new Date());

  const pullChanges = async (query: { branchId?: string; limit?: number } = {}) => {
    const result = await input.remoteApi.pullChanges({
      branchId: query.branchId,
      cursor: (await input.store.sync.getPullCursor()) ?? undefined,
      limit: query.limit ?? 50
    });
    const ignoredChanges: Partial<Record<UnsupportedChangeType, number>> = {};
    const products: ClientProductRecord[] = [];
    const customers: ClientCustomerRecord[] = [];
    let acknowledgementCount = 0;

    for (const change of result.changes) {
      switch (change.changeType) {
        case 'PRODUCT_UPSERTED':
          products.push({ ...change.record, updatedAt: new Date(change.record.updatedAt) });
          break;
        case 'CUSTOMER_UPSERTED':
          customers.push({ ...change.record, updatedAt: new Date(change.record.updatedAt) });
          break;
        case 'SYNC_EVENT_APPLIED':
          acknowledgementCount += 1;
          await input.store.sync.markEventApplied(
            change.record.eventId,
            new Date(change.updatedAt),
            new Date(change.updatedAt)
          );
          await input.store.sales.markSaleSyncStateByEventId(change.record.eventId, 'SYNCED', null);
          break;
        default:
          ignoredChanges[change.changeType] = (ignoredChanges[change.changeType] ?? 0) + 1;
          break;
      }
    }

    if (products.length > 0) {
      await input.store.products.upsertProducts(products);
    }
    if (customers.length > 0) {
      await input.store.customers.upsertCustomers(customers);
    }

    await input.store.sync.savePullCursor(result.nextCursor);

    return {
      acknowledgementCount,
      customerCount: customers.length,
      ignoredChanges,
      nextCursor: result.nextCursor,
      productCount: products.length,
      serverTime: result.serverTime
    };
  };

  const pushPendingEvents = async (limit = 50) => {
    const events = await input.store.sync.listPushableEvents(limit);
    if (events.length === 0) {
      return { appliedCount: 0, failedCount: 0, pendingCount: 0, pushedCount: 0 };
    }

    const result = await input.remoteApi.pushEvents({
      events: events.map((event) => ({
        branchId: event.branchId,
        createdAt: event.createdAt.toISOString(),
        deviceId: event.deviceId,
        entityId: event.entityId,
        eventId: event.eventId,
        payload: event.payload,
        type: event.type
      }))
    });
    let appliedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    for (const event of result.events) {
      if (event.state === 'APPLIED') {
        appliedCount += 1;
        await input.store.sync.markEventApplied(event.eventId, new Date(event.receivedAt), now());
        await input.store.sales.markSaleSyncStateByEventId(event.eventId, 'SYNCED', null);
        continue;
      }

      if (event.state === 'FAILED') {
        failedCount += 1;
        const failure = {
          code: 'REMOTE_PUSH_FAILED',
          failedAt: now(),
          message: `Remote API marked ${event.eventId} as failed`,
          statusCode: 409
        };

        await input.store.sync.markEventFailed(event.eventId, failure, failure.failedAt);
        await input.store.sales.markSaleSyncStateByEventId(event.eventId, 'FAILED', failure.message);
        continue;
      }

      pendingCount += 1;
    }

    return { appliedCount, failedCount, pendingCount, pushedCount: result.events.length };
  };

  return {
    pullChanges,
    pushPendingEvents,
    syncNow: async (query: { branchId?: string; limit?: number } = {}) => ({
      push: await pushPendingEvents(query.limit ?? 50),
      pull: await pullChanges(query)
    })
  };
};
