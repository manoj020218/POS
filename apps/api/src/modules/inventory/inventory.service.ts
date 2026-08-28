import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { InventoryRepository } from './inventory.repository.js';
import { resolveInventoryBalanceReport } from './inventory-balance-report.js';
import type { InventoryBalanceQuery, InventoryBalanceView } from './inventory.types.js';

export const createInventoryService = (
  repository: InventoryRepository,
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  listInventoryBalances: async (
    context: AccessContext,
    query: InventoryBalanceQuery
  ): Promise<InventoryBalanceView[]> => {
    return (
      await resolveInventoryBalanceReport(
        repository,
        catalogRepository,
        tenantCoreRepository,
        context,
        query
      )
    ).rows;
  }
});
