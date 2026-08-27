import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { resolveSyncPullScope } from './sync-branch-access.js';
import {
  buildSyncEventPullChangeKey,
  buildSyncPullChangeId,
  compareSyncPullOrder,
  decodeSyncPullCursor,
  encodeSyncPullCursor
} from './sync-pull-cursor.js';
import { listServerSyncPullChanges } from './sync-pull-server-changes.js';
import type { SyncRepository } from './sync.repository.js';
import type { SyncPullQuery, SyncPullResult } from './sync.types.js';

export const createSyncPullService = (
  repository: SyncRepository,
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
) => async (context: AccessContext, query: SyncPullQuery): Promise<SyncPullResult> => {
  const scope = await resolveSyncPullScope(context, tenantCoreRepository, query.branchId);
  const cursor = decodeSyncPullCursor(query.cursor);
  const serverTime = new Date().toISOString();

  if (scope.branchIds.length === 0) {
    return {
      changes: [],
      nextCursor: query.cursor ?? null,
      serverTime
    };
  }

  const [events, serverChanges] = await Promise.all([
    repository.listPullEvents({
      branchIds: scope.branchIds,
      cursor,
      limit: query.limit,
      tenantId: context.tenantId
    }),
    listServerSyncPullChanges(
      catalogRepository,
      tenantCoreRepository,
      context.tenantId,
      scope.businessIds,
      { cursor, limit: query.limit }
    )
  ]);
  const changes = [
    ...events.map((event) => ({
      change: {
        branchId: event.branchId,
        changeId: buildSyncPullChangeId(buildSyncEventPullChangeKey(event.eventId), event.updatedAt),
        changeType: 'SYNC_EVENT_APPLIED' as const,
        record: {
          createdAt: event.eventCreatedAt.toISOString(),
          deviceId: event.deviceId,
          entityId: event.entityId,
          eventId: event.eventId,
          payload: event.payload,
          type: event.type
        },
        source: 'CLIENT' as const,
        updatedAt: event.updatedAt.toISOString()
      },
      changeKey: buildSyncEventPullChangeKey(event.eventId),
      updatedAt: event.updatedAt
    })),
    ...serverChanges
  ]
    .sort((left, right) => compareSyncPullOrder(left, right))
    .slice(0, query.limit);

  return {
    changes: changes.map((item) => item.change),
    nextCursor: changes.length
      ? encodeSyncPullCursor({
          changeKey: changes[changes.length - 1]!.changeKey,
          updatedAt: changes[changes.length - 1]!.updatedAt
        })
      : query.cursor ?? null,
    serverTime
  };
};
