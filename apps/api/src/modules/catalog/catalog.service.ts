import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { CatalogRepository } from './catalog.repository.js';
import { createCatalogMasterHandlers } from './catalog-master.service.js';
import { createProductHandlers } from './product-management.service.js';
import { createProductSearchHandlers } from './product-search.service.js';

export const createCatalogService = (
  repository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  ...createCatalogMasterHandlers(repository, tenantCoreRepository),
  ...createProductHandlers(repository, tenantCoreRepository),
  ...createProductSearchHandlers(repository, tenantCoreRepository)
});

export type CatalogService = ReturnType<typeof createCatalogService>;
