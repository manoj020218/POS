import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { resolveReadBusinessIds } from './catalog-business-scope.js';
import type { CatalogRepository } from './catalog.repository.js';
import type { ProductSearchQuery, ProductSearchView } from './catalog.types.js';
import { requiredRecord, toProductSearchView } from './product-view.js';

export const createProductSearchHandlers = (
  repository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  searchProducts: async (
    context: AccessContext,
    query: ProductSearchQuery
  ): Promise<ProductSearchView[]> => {
    const businessIds = await resolveReadBusinessIds(context, tenantCoreRepository, query.businessId);
    if (businessIds.length === 0) return [];
    const [businesses, products, units] = await Promise.all([
      tenantCoreRepository.listBusinesses(context.tenantId),
      repository.searchProducts(context.tenantId, businessIds, query.query, query.limit),
      repository.listUnits(context.tenantId, businessIds)
    ]);
    const businessMap = new Map(businesses.map((business) => [business.id, business]));
    const unitMap = new Map(units.map((unit) => [unit.id, unit]));

    return products.map((product) =>
      toProductSearchView(
        product,
        requiredRecord(businessMap, product.businessId, 'BUSINESS_NOT_FOUND', 'Business not found'),
        requiredRecord(unitMap, product.unitId, 'UNIT_NOT_FOUND', 'Unit not found')
      )
    );
  }
});
