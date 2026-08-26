import { createHttpError } from '../../lib/http-error.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import { listAccessibleBusinesses } from '../catalog/catalog-business-scope.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { InventoryRepository } from './inventory.repository.js';
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
    const accessibleBusinesses = await listAccessibleBusinesses(context, tenantCoreRepository);
    const businessIds = resolveBusinessIds(accessibleBusinesses, query.businessId);
    const products = await catalogRepository.listInventoryProducts(
      context.tenantId,
      businessIds,
      query.productId
    );

    if (query.productId && products.length === 0) {
      throw createHttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    const balances = await repository.listInventoryBalances({
      businessIds,
      productId: query.productId,
      tenantId: context.tenantId
    });
    const balanceByProductId = new Map(
      balances.map((balance) => [balance.productId, balance] as const)
    );
    const businessById = new Map(accessibleBusinesses.map((business) => [business.id, business] as const));

    return products.map((product) => {
      const business = businessById.get(product.businessId);
      if (!business) {
        throw createHttpError(404, 'BUSINESS_NOT_FOUND', 'Business not found');
      }

      const balance = balanceByProductId.get(product.id);
      const netMovementQuantity = balance?.netMovementQuantity ?? 0;
      const currentQuantity = product.openingStock + netMovementQuantity;

      return {
        businessCode: business.code,
        businessId: business.id,
        businessName: business.name,
        currentQuantity,
        isLowStock: currentQuantity <= product.lowStockLevel,
        lastMovementAt: balance?.lastMovementAt,
        lowStockLevel: product.lowStockLevel,
        netMovementQuantity,
        openingStock: product.openingStock,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        trackInventory: product.trackInventory
      };
    });
  }
});

const resolveBusinessIds = (
  businesses: Array<{ id: string }>,
  requestedBusinessId?: string
) => {
  if (!requestedBusinessId) {
    return businesses.map((business) => business.id);
  }

  if (!businesses.some((business) => business.id === requestedBusinessId)) {
    throw createHttpError(403, 'BRANCH_ACCESS_DENIED', 'Branch access denied');
  }

  return [requestedBusinessId];
};
