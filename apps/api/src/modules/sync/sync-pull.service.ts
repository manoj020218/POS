import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { resolveSyncPullBranchIds } from './sync-branch-access.js';
import { decodeSyncPullCursor, encodeSyncPullCursor } from './sync-pull-cursor.js';
import type { SyncRepository } from './sync.repository.js';
import type { SyncPullQuery, SyncPullResult } from './sync.types.js';

export const createSyncPullService = (
  repository: SyncRepository,
  tenantCoreRepository: TenantCoreRepository
) => async (context: AccessContext, query: SyncPullQuery): Promise<SyncPullResult> => {
  const branchIds = await resolveSyncPullBranchIds(context, tenantCoreRepository, query.branchId);
  const cursor = decodeSyncPullCursor(query.cursor);
  const serverTime = new Date().toISOString();

  if (branchIds.length === 0) {
    return {
      changes: [],
      nextCursor: query.cursor ?? null,
      serverTime
    };
  }

  const events = await repository.listPullEvents({
    branchIds,
    cursor,
    limit: query.limit,
    tenantId: context.tenantId
  });

  return {
    changes: events.map((event) => ({
      branchId: event.branchId,
      createdAt: event.eventCreatedAt.toISOString(),
      deviceId: event.deviceId,
      entityId: event.entityId,
      eventId: event.eventId,
      payload: event.payload,
      type: event.type,
      updatedAt: event.updatedAt.toISOString()
    })),
    nextCursor: events.length
      ? encodeSyncPullCursor({
          eventId: events[events.length - 1]!.eventId,
          updatedAt: events[events.length - 1]!.updatedAt
        })
      : query.cursor ?? null,
    serverTime
  };
};
