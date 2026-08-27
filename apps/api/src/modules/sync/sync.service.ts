import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { createSyncPullService } from './sync-pull.service.js';
import { createSyncPushService } from './sync-push.service.js';
import type { SyncRepository } from './sync.repository.js';
import type { SyncEventRecord } from './sync.types.js';

export const createSyncService = (
  repository: SyncRepository,
  tenantCoreRepository: TenantCoreRepository,
  replayEvent: (context: AccessContext, event: SyncEventRecord) => Promise<boolean>
) => ({
  pullEvents: createSyncPullService(repository, tenantCoreRepository),
  pushEvents: createSyncPushService(repository, tenantCoreRepository, replayEvent)
});
