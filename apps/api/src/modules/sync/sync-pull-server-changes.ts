import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { CustomerRepository } from '../customer/customer.repository.js';
import type { CustomerUpdatedSinceInput } from '../customer/customer.types.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { listCatalogSyncPullChanges } from './sync-pull-catalog-changes.js';
import { listCustomerSyncPullChanges } from './sync-pull-customer-changes.js';
import type { SyncPullChange } from './sync.types.js';

type ServerSyncPullChange = Extract<SyncPullChange, { source: 'SERVER' }>;
type SyncPullChangeEnvelope = {
  change: ServerSyncPullChange;
  changeKey: string;
  updatedAt: Date;
};

export const listServerSyncPullChanges = async (
  catalogRepository: CatalogRepository,
  customerRepository: CustomerRepository,
  tenantCoreRepository: TenantCoreRepository,
  tenantId: string,
  businessIds: string[],
  input: CustomerUpdatedSinceInput
): Promise<SyncPullChangeEnvelope[]> => {
  const [catalogChanges, customerChanges] = await Promise.all([
    listCatalogSyncPullChanges(
      catalogRepository,
      tenantCoreRepository,
      tenantId,
      businessIds,
      input
    ),
    listCustomerSyncPullChanges(
      customerRepository,
      tenantCoreRepository,
      tenantId,
      businessIds,
      input
    )
  ]);

  return [...catalogChanges, ...customerChanges];
};
