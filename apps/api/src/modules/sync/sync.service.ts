import type { AccessContext } from '../tenant-core/access-context.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { CustomerRepository } from '../customer/customer.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { createSyncPullService } from './sync-pull.service.js';
import { createSyncPushService } from './sync-push.service.js';
import type { SyncRepository } from './sync.repository.js';
import type { SyncEventRecord } from './sync.types.js';

export const createSyncService = (
  repository: SyncRepository,
  catalogRepository: CatalogRepository,
  customerRepository: CustomerRepository,
  tenantCoreRepository: TenantCoreRepository,
  replayEvent: (context: AccessContext, event: SyncEventRecord) => Promise<boolean>
) => ({
  pullEvents: createSyncPullService(
    repository,
    catalogRepository,
    customerRepository,
    tenantCoreRepository
  ),
  pushEvents: createSyncPushService(repository, tenantCoreRepository, replayEvent)
});
