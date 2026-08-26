import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { CustomerRepository } from '../customer/customer.repository.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { createSaleHandler } from './create-sale.js';
import { createSaleReturnHandler } from './create-sale-return.js';
import type { SaleRepository } from './sale.repository.js';

export const createSaleService = (
  repository: SaleRepository,
  catalogRepository: CatalogRepository,
  customerRepository: CustomerRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  createSale: createSaleHandler(
    repository,
    catalogRepository,
    customerRepository,
    tenantCoreRepository
  ),
  createSaleReturn: createSaleReturnHandler(repository)
});
